import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import sharp from 'sharp';
import {createWorker,PSM} from 'tesseract.js';
import {normalizeOcrText} from '../../src/lib/knowledge-base/import/normalizeText.ts';
const require=createRequire(import.meta.url);
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function exclusive(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data,{flag:'wx'});}
const json=(file,value)=>exclusive(file,JSON.stringify(value,null,2)+'\n');
export function parsePages(value){const ids=value.split(',').map(s=>Number(s.trim()));assert(ids.length && ids.length<=12,'This pilot permits 1–12 selected pages only');assert(ids.every(n=>Number.isInteger(n)&&n>=1&&n<=486),'Invalid scan sequence');assert.equal(new Set(ids).size,ids.length,'Duplicate scan sequence');return ids;}
export function selection(ids,index,manifest){const rows=ids.map(seq=>{const e=index.entries.find(e=>e.seq===seq);assert(e);const s=manifest.scans.find(s=>s.originalFileName===e.file);assert(s);const b=fs.readFileSync(s.originalPath);assert.equal(sha(b),s.sha256,'Original hash differs from manifest');assert.equal(b.length,s.bytes);return {...e,sourceSha256:s.sha256,sourceBytes:s.bytes};});assert.equal(new Set(rows.map(r=>r.file)).size,rows.length);return rows;}
export function verifyArtifacts(root,record){for(const [file,hash] of Object.entries(record.artifacts)){const resolved=path.resolve(root,file);assert(resolved.startsWith(path.resolve(root)+path.sep));assert.equal(sha(fs.readFileSync(resolved)),hash,`Resume refuses changed/missing artifact: ${file}`);}}
export async function attemptWithRetry({root,seq,maxAttempts=3,perform,onFailure=async()=>{}}){
  const parent=path.join(root,'pages',String(seq).padStart(4,'0'));fs.mkdirSync(parent,{recursive:true});
  const dirs=fs.readdirSync(parent).filter(n=>/^attempt-\d+$/.test(n)).sort();
  for(const dir of dirs){const meta=path.join(parent,dir,'result.json');if(fs.existsSync(meta)){const r=read(meta);verifyArtifacts(root,r);return {record:r,resumed:true};}}
  for(let n=dirs.length+1;n<=maxAttempts;n++){
    const dir=path.join(parent,`attempt-${String(n).padStart(2,'0')}`);fs.mkdirSync(dir);
    json(path.join(dir,'started.json'),{seq,attempt:n,startedAt:new Date().toISOString(),status:'running'});
    try{const record=await perform({dir,attempt:n});verifyArtifacts(root,record);json(path.join(dir,'result.json'),record);return {record,resumed:false};}
    catch(e){json(path.join(dir,'error.json'),{seq,attempt:n,message:e.message,time:new Date().toISOString(),status:'failed'});await onFailure(e);}
  }
  return {record:null,resumed:false,error:'Attempts exhausted; manual review required'};
}
async function withTimeout(promise,ms){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`OCR timeout (${ms} ms)`)),ms);})]);}finally{clearTimeout(timer);}}
export async function main(args=process.argv.slice(2)){
  const start=performance.now();const allowed=new Set(['--pages','--out','--execute','--resume','--stop-after','--help']);
  for(let i=0;i<args.length;i++){assert(allowed.has(args[i]),`Unknown option ${args[i]}`);if(['--pages','--out','--stop-after'].includes(args[i])){assert(args[i+1]&&!args[i+1].startsWith('--'));i++;}}
  if(args.includes('--help')){console.log('node scripts/ocr-pilot-biology-5pages.mjs --pages 2,10,... --out <new-run-directory> [--execute] [--resume] [--stop-after N]\nDefault is read-only preflight. At most 12 pages; --execute required for OCR.');return;}
  const option=k=>args[args.indexOf(k)+1];
  const ids=parsePages(args.includes('--pages')?option('--pages'):'2,10,465,472,486');
  const manifestPath='content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json';
  const indexPath='content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/page-index.json';
  const manifest=read(manifestPath),index=read(indexPath),pages=selection(ids,index,manifest);
  console.log(JSON.stringify({preflight:'PASS',selectedPages:pages.map(({seq,file,label,printedPage,verification})=>({seq,file,label,printedPage,verification})),duplicatePages:0},null,2));
  if(!args.includes('--execute'))return;
  assert(args.includes('--out'),'--out required for execution');
  const root=path.resolve(option('--out')),allowedRoot=path.resolve('content/knowledge-base/ocr-pilot');
  assert(root.startsWith(allowedRoot+path.sep),'Output must be a new child directory under ocr-pilot');
  assert(!['biology-5pages','single-image-test'].includes(path.basename(root)),'Existing pilot directories are protected');
  const models=Object.fromEntries(['eng','chi_tra'].map(lang=>{const file=path.resolve(lang+'.traineddata');assert(fs.existsSync(file),'Local language model missing; no download allowed');return [lang,{bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file))}];}));
  const workerPath=require.resolve('tesseract.js/src/worker-script/node/index.js');
  const corePath=path.dirname(require.resolve('tesseract.js-core/package.json'));
  const config={schemaVersion:1,kind:'local-textbook-ocr-pilot',subject:'biology',status:'machine-extracted; independent-human-review-pending',internalOnly:true,pages,manifest:{path:manifestPath,sha256:sha(fs.readFileSync(manifestPath))},pageIndex:{path:indexPath,sha256:sha(fs.readFileSync(indexPath))},engine:{name:'tesseract.js',version:require('tesseract.js/package.json').version,coreVersion:require('tesseract.js-core/package.json').version,languages:['eng','chi_tra'],oem:1,psm:PSM.AUTO,localOnly:true,cacheMethod:'readOnly',models},preprocessing:{engine:'sharp',version:read('node_modules/sharp/package.json').version,steps:['EXIF-auto-orientation','grayscale','normalize-1%-99%','sharpen-sigma1','PNG-in-memory'],deskew:false,sourceImagesSavedOrChanged:false},normalization:{path:'src/lib/knowledge-base/import/normalizeText.ts',sha256:sha(fs.readFileSync('src/lib/knowledge-base/import/normalizeText.ts'))},runnerSha256:sha(fs.readFileSync('scripts/lib/kb-ocr-batch.mjs')),maxAttempts:3,timeoutMs:180000,independentHumanApprovals:0};
  const fingerprint=sha(JSON.stringify(config));
  if(fs.existsSync(root)){assert(args.includes('--resume'),'Existing run: use --resume; never overwrite');assert.deepEqual(read(path.join(root,'run.json')).config,config,'Resume configuration/source/engine changed');}
  else{assert(!args.includes('--resume'),'Resume target does not exist');fs.mkdirSync(root,{recursive:true});json(path.join(root,'run.json'),{fingerprint,createdAt:new Date().toISOString(),config});}
  const lock=path.join(root,'run.lock');
  if(fs.existsSync(lock)){const old=read(lock);let alive=true;try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}assert(!alive,'Another runner owns this run');fs.renameSync(lock,path.join(root,`stale-lock-${crypto.randomUUID()}.json`));}
  json(lock,{pid:process.pid,time:new Date().toISOString()});
  let worker=null,initMs=0;
  async function dispose(){if(worker){const current=worker;worker=null;await current.terminate();}}
  async function getWorker(){if(!worker){const t=performance.now();worker=await withTimeout(createWorker(['eng','chi_tra'],1,{workerPath,corePath,langPath:process.cwd(),cachePath:process.cwd(),cacheMethod:'readOnly',gzip:false,errorHandler:()=>{}}),180000);await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});initMs+=performance.now()-t;}return worker;}
  const records=[];let completedThisSession=0;
  try{
    // Read-only resume checks precede worker initialization and any new OCR.
    for(const page of pages){
      const out=await attemptWithRetry({root,seq:page.seq,maxAttempts:3,onFailure:dispose,perform:async({dir,attempt})=>{
        const t=performance.now(),source=manifest.scans.find(s=>s.originalFileName===page.file),b=fs.readFileSync(source.originalPath);
        assert.equal(sha(b),page.sourceSha256,'Original changed during run');
        const metadata=await sharp(b).metadata();
        const tPre=performance.now();const processed=await sharp(b,{failOn:'warning'}).rotate().grayscale().normalize({lower:1,upper:99}).sharpen({sigma:1}).png().toBuffer();const preprocessMs=performance.now()-tPre;
        const w=await getWorker();const tOcr=performance.now();
        const {data}=await withTimeout(w.recognize(processed,{}, {text:true,tsv:true,blocks:true}),180000);const ocrMs=performance.now()-tOcr;
        const normalized=normalizeOcrText(data.text||'');const artifacts={};
        for(const [name,body] of Object.entries({'raw.txt':data.text||'','normalized.txt':normalized.normalizedText,'layout.tsv':data.tsv||'','blocks.json':JSON.stringify(data.blocks||[],null,2)+'\n'})){const file=path.join(dir,name);exclusive(file,body);artifacts[path.relative(root,file).replaceAll('\\','/')]=sha(Buffer.from(body));}
        assert.equal(sha(fs.readFileSync(source.originalPath)),page.sourceSha256);
        const text=data.text||'',words=text.match(/[A-Za-z]+/g)||[];
        const flags=['human-review-required','layout-and-formulas-not-verified'];
        if(data.confidence<70)flags.push('low-engine-confidence');
        if(page.numberFormat==='none' && text.trim())flags.push('unnumbered-page-produced-text; blank-or-copyright-review-required');
        if(text.replace(/\s/g,'').length<30)flags.push('little-text');
        return {schemaVersion:1,seq:page.seq,file:page.file,sourceSha256:page.sourceSha256,sourceBytes:page.sourceBytes,printedPage:page.printedPage,label:page.label,verification:page.verification,section:page.section,sheet:page.sheet,side:page.side,attempt,status:'ocr-completed; quality-review-pending',reviewerType:'machine',needsHumanReview:true,independentHumanApproval:false,engineConfidence:data.confidence,elapsedMs:performance.now()-t,ocrMs,preprocessMs,completedAt:new Date().toISOString(),image:{width:metadata.width,height:metadata.height},textStatistics:{characters:text.length,nonWhitespaceCharacters:text.replace(/\s/g,'').length,chineseCharacters:(text.match(/[\u4e00-\u9fff]/g)||[]).length,englishTokens:words.length},qualityFlags:flags,normalizationReport:normalized.report,artifacts};
      }});
      if(out.record)records.push(out.record);
      const checkpoint={schemaVersion:1,fingerprint,time:new Date().toISOString(),completed:records.map(r=>r.seq),lastSeq:page.seq,lastStatus:out.record?'completed':'failed',resumed:out.resumed,error:out.error||null};
      json(path.join(root,'checkpoints',`${Date.now()}-${crypto.randomUUID()}.json`),checkpoint);
      console.log(JSON.stringify({seq:page.seq,resumed:out.resumed,status:checkpoint.lastStatus,elapsedSeconds:out.record?+(out.record.elapsedMs/1000).toFixed(2):null,confidence:out.record?.engineConfidence,error:out.error}));
      if(out.record&&!out.resumed)completedThisSession++;
      if(args.includes('--stop-after') && completedThisSession>=Number(option('--stop-after')))break;
    }
  }finally{await dispose();fs.unlinkSync(lock);}
  const summary={schemaVersion:1,fingerprint,requestedPages:pages.length,completedPages:records.length,completedThisSession,sessionElapsedMs:performance.now()-start,workerInitializationMs:initMs,aggregateOcrMs:records.reduce((n,r)=>n+r.ocrMs,0),records:records.map(r=>({seq:r.seq,label:r.label,verification:r.verification,attempt:r.attempt,elapsedMs:r.elapsedMs,ocrMs:r.ocrMs,confidence:r.engineConfidence,characters:r.textStatistics.characters,flags:r.qualityFlags})),status:records.length===pages.length?'pilot-complete; not-human-verified':'pilot-incomplete',estimated486SerialOcrMs:records.length?records.reduce((n,r)=>n+r.ocrMs,0)/records.length*486:null,independentHumanApprovals:0};
  json(path.join(root,`summary-${Date.now()}-${crypto.randomUUID()}.json`),summary);
  assert.equal(sha(fs.readFileSync(manifestPath)),config.manifest.sha256);assert.equal(sha(fs.readFileSync(indexPath)),config.pageIndex.sha256);
  for(const [lang,model] of Object.entries(models))assert.equal(sha(fs.readFileSync(lang+'.traineddata')),model.sha256);
  console.log(JSON.stringify({sessionSummary:summary},null,2));
  if(records.length!==pages.length&&!args.includes('--stop-after'))process.exitCode=1;
}
