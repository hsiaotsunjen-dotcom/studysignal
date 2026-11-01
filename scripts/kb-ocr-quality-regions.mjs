// Bounded local OCR experiments. Existing full-page OCR and original scans are read-only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import sharp from 'sharp';
import {createWorker} from 'tesseract.js';
import {sha,exclusive,verifyArtifacts,attemptWithRetry} from './lib/kb-ocr-batch.mjs';
import {normalizeOcrText} from '../src/lib/knowledge-base/import/normalizeText.ts';
const require=createRequire(import.meta.url),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const args=process.argv.slice(2);assert(args.every(a=>['--execute','--resume'].includes(a)));
const planPath='scripts/ocr-biology-quality-regions-plan.json',plan=read(planPath),root=plan.outputDirectory;
const oldRun=read(plan.baselineRun+'/run.json'),manifest=read(oldRun.config.manifest.path);
assert(plan.regions.length===12);assert.equal(new Set(plan.regions.map(r=>r.id)).size,12);
const jobs=plan.variants.flatMap(v=>plan.regions.filter(r=>!v.types||v.types.includes(r.type)).map(r=>({region:r,variant:v})));
assert(jobs.length<=40,'Region pilot only; refuse expanded run');
for(const {region:r} of jobs){assert(oldRun.config.pages.some(p=>p.seq===r.seq),'Region outside original pilot');}
console.log(JSON.stringify({preflight:'PASS',regions:12,sourcePages:new Set(plan.regions.map(r=>r.seq)).size,experimentJobs:jobs.length,groundTruthStatus:'pending_human_review',formalCER:null,formalWER:null}));
if(!args.includes('--execute'))process.exit(0);
const workRoot=path.join(root,'experiments'),runFile=path.join(workRoot,'run.json');
const models=Object.fromEntries(['eng','chi_tra'].map(l=>[l,sha(fs.readFileSync(l+'.traineddata'))]));
const config={planSha256:sha(fs.readFileSync(planPath)),baselineRunSha256:sha(fs.readFileSync(plan.baselineRun+'/run.json')),scriptSha256:sha(fs.readFileSync('scripts/kb-ocr-quality-regions.mjs')),engine:require('tesseract.js/package.json').version,core:require('tesseract.js-core/package.json').version,sharp:JSON.parse(fs.readFileSync('node_modules/sharp/package.json')).version,models,variants:plan.variants,regions:plan.regions};
if(fs.existsSync(runFile)){assert(args.includes('--resume'));assert.deepEqual(read(runFile).config,config,'Resume source/parameters changed');}
else{assert(!args.includes('--resume'));fs.mkdirSync(workRoot,{recursive:true});exclusive(runFile,JSON.stringify({config,fingerprint:sha(JSON.stringify(config)),status:'machine-extracted; pending_human_review'},null,2)+'\n');}
const workers=new Map();
async function worker(langs){const key=langs.join('+');if(!workers.has(key)){workers.set(key,await createWorker(langs,1,{workerPath:require.resolve('tesseract.js/src/worker-script/node/index.js'),langPath:process.cwd(),cachePath:process.cwd(),cacheMethod:'readOnly',gzip:false,errorHandler:()=>{}}));}return workers.get(key);}
function baselineRegion(r){
  const dir=plan.baselineRun+'/pages/'+String(r.seq).padStart(4,'0')+'/attempt-01',meta=read(dir+'/result.json');verifyArtifacts(plan.baselineRun,meta);
  const lines=new Map();
  for(const line of fs.readFileSync(dir+'/layout.tsv','utf8').split(/\r?\n/)){
    const a=line.split('\t');if(a[0]!=='5'||!a[11]?.trim())continue;
    const x=+a[6]+ +a[8]/2,y=+a[7]+ +a[9]/2,b=r.rect;
    if(x<b.left||x>b.left+b.width||y<b.top||y>b.top+b.height)continue;
    const key=a.slice(1,5).join('/');if(!lines.has(key))lines.set(key,[]);lines.get(key).push(a[11]);
  }
  return {text:[...lines.values()].map(a=>a.join(' ')).join('\n'),method:'existing full-page TSV word-center intersection; preserves old reading order',sourceResultSha256:sha(fs.readFileSync(dir+'/result.json'))};
}
const records=[];const started=performance.now();
try{
  for(const [i,{region:r,variant:v}] of jobs.entries()){
    const out=await attemptWithRetry({root:workRoot,seq:i+1,maxAttempts:3,onFailure:async()=>{const key=v.languages.join('+');if(workers.has(key)){await workers.get(key).terminate();workers.delete(key);}},perform:async({dir,attempt})=>{
      const t=performance.now(),e=oldRun.config.pages.find(p=>p.seq===r.seq),s=manifest.scans.find(s=>s.originalFileName===e.file),b=fs.readFileSync(s.originalPath);assert.equal(sha(b),e.sourceSha256);
      const reviewFile=path.join(root,plan.reviewDirectory,r.id+'.png');const reviewBytes=fs.readFileSync(reviewFile);
      const actual=await sharp(b).extract(r.rect).png().toBuffer();assert.equal(sha(actual),sha(reviewBytes),'Review crop/source mismatch');
      const image=await sharp(reviewBytes).resize({width:r.rect.width*v.scale}).grayscale().normalize({lower:1,upper:99}).sharpen({sigma:1}).png().toBuffer();
      const w=await worker(v.languages);await w.setParameters({tessedit_pageseg_mode:String(v.psm),preserve_interword_spaces:'1'});
      let timer;const data=await Promise.race([w.recognize(image,{}, {text:true,tsv:true,blocks:true}).then(x=>x.data),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Region OCR timeout')),180000);})]).finally(()=>clearTimeout(timer));
      const normalized=normalizeOcrText(data.text||''),baseline=baselineRegion(r),artifacts={};
      const bodies={'raw.txt':data.text||'','normalized.txt':normalized.normalizedText,'layout.tsv':data.tsv||'','blocks.json':JSON.stringify(data.blocks||[],null,2)+'\n','baseline-region.txt':baseline.text};
      for(const [name,body] of Object.entries(bodies)){const f=path.join(dir,name);exclusive(f,body);artifacts[path.relative(workRoot,f).replaceAll('\\','/')]=sha(Buffer.from(body));}
      return {schemaVersion:1,job:i+1,regionId:r.id,sourceSeq:r.seq,file:e.file,sourceSha256:e.sourceSha256,printedPage:e.printedPage,verification:e.verification,rect:r.rect,reviewImageSha256:sha(reviewBytes),variant:v,attempt,elapsedMs:performance.now()-t,confidence:data.confidence,baselineMethod:baseline.method,baselineResultSha256:baseline.sourceResultSha256,normalizedChecksum:normalized.report.normalizedChecksum,rawChecksum:normalized.report.rawChecksum,artifacts,status:'pending_human_review',humanApproved:false,formalCER:null,formalWER:null};
    }});
    records.push(out.record||{job:i+1,regionId:r.id,variant:v.id,error:out.error});
    exclusive(path.join(workRoot,'checkpoints',`${String(i+1).padStart(3,'0')}-${Date.now()}.json`),JSON.stringify({job:i+1,resumed:out.resumed,completed:!!out.record,region:r.id,variant:v.id,fingerprint:sha(JSON.stringify(config))})+'\n');
    console.log(JSON.stringify({job:i+1,region:r.id,variant:v.id,resumed:out.resumed,confidence:out.record?.confidence,seconds:out.record?+(out.record.elapsedMs/1000).toFixed(3):null,error:out.error}));
  }
}finally{for(const w of workers.values())await w.terminate();}
for(const [l,h] of Object.entries(models))assert.equal(sha(fs.readFileSync(l+'.traineddata')),h);
const summary={schemaVersion:1,regions:12,jobs:jobs.length,completed:records.filter(r=>!r.error).length,sessionElapsedMs:performance.now()-started,records,status:'pending_human_review',formalCER:null,formalWER:null,humanApprovals:0};
exclusive(path.join(workRoot,`summary-${Date.now()}.json`),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({summary:{regions:12,jobs:jobs.length,completed:summary.completed,sessionSeconds:summary.sessionElapsedMs/1000,formalCER:null,formalWER:null}}));
if(summary.completed!==jobs.length)process.exitCode=1;
