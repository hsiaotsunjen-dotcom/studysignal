// Portable analysis only. Defaults to synthetic data; local replay requires explicit config.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {assess,RULE_VERSION,ROUTES} from './lib/ocr-quality-routing.mjs';
import {read,sha,options,resolveProject,protectedRead,verifySnapshot,writeNew,outputDir,inside} from './lib/ocr-quality-io.mjs';
const start=performance.now(),args=options(process.argv.slice(2),['--config','--out']);
const snapshot=new Map(),json=p=>JSON.parse(protectedRead(p,snapshot).toString('utf8'));
const configFile=args['--config']?path.resolve(args['--config']):resolveProject('scripts/fixtures/ocr-quality-routing-synthetic.v1.json');
const config=json(configFile),inputs=[];
if(config.kind==='synthetic'){
 assert.equal(config.notTextbookData,true);assert.equal(config.pages.length,12);
 for(const p of config.pages)inputs.push({...p,provenance:{kind:'synthetic-not-textbook',fixtureSha256:snapshot.get(configFile)}});
}else{
 assert.equal(config.kind,'local-frozen-12','Unsupported config kind');
 const base=path.dirname(configFile),loc=p=>path.resolve(base,p);
 const manifestPath=loc(config.manifest),indexPath=loc(config.pageIndex),layoutRoot=loc(config.layoutRoot),ocrRoot=loc(config.ocrRoot);
 const manifest=json(manifestPath),index=json(indexPath);
 const ids=[2,10,19,60,200,230,317,324,325,465,472,486];
 const baseline=read(resolveProject('scripts/fixtures/ocr-quality-baseline.v1.json'));
 for(const seq of ids){
  const n=String(seq).padStart(4,'0'),layoutFile=inside(layoutRoot,`scan${n}/layout.json`),resultFile=inside(ocrRoot,`pages/${n}/attempt-01/result.json`);
  const page=json(layoutFile),r=json(resultFile),entry=index.entries.find(x=>x.seq===seq),source=manifest.scans.find(x=>x.originalFileName===page.file),expected=baseline.sources.find(x=>x.seq===seq);
  assert(entry&&source&&expected);assert.equal(page.seq,seq);assert.equal(r.seq,seq);assert.equal(r.file,page.file);assert.equal(entry.file,page.file);assert.deepEqual(entry,page.pageIndex);assert.equal(r.verification,entry.verification);
  // Optional sourceRoot overrides historical absolute paths in the PRIVATE manifest.
  const image=config.sourceRoot?inside(loc(config.sourceRoot),source.originalFileName):path.resolve(path.dirname(manifestPath),source.originalPath);
  assert.equal(sha(protectedRead(image,snapshot)),source.sha256);assert.equal(source.sha256,expected.source.sha256);assert.equal(r.sourceSha256,source.sha256);assert.equal(page.sourceSha256,source.sha256);
  assert.equal(page.width,r.image.width);assert.equal(page.height,r.image.height);assert.equal(snapshot.get(layoutFile),expected.layout.sha256);
  for(const [f,h] of Object.entries(r.artifacts))assert.equal(sha(protectedRead(inside(ocrRoot,f),snapshot)),h);
  const rawFile=inside(ocrRoot,`pages/${n}/attempt-01/raw.txt`),tsvFile=inside(ocrRoot,`pages/${n}/attempt-01/layout.tsv`);
  const raw=protectedRead(rawFile,snapshot).toString('utf8'),tsv=protectedRead(tsvFile,snapshot).toString('utf8');
  assert.equal(snapshot.get(rawFile),expected.ocr.rawSha256);assert.equal(snapshot.get(tsvFile),expected.ocr.tsvSha256);
  inputs.push({page,raw,tsv,provenance:{kind:'local-textbook',source:expected.source,pageIndex:expected.pageIndex,ocr:expected.ocr,layout:expected.layout}});
 }
}
assert.equal(new Set(inputs.map(x=>x.page.seq)).size,12,'Exactly 12 unique pages required');
const pages=inputs.map(input=>{const t=performance.now(),before=JSON.stringify(input),result=assess(input);assert.deepEqual(result,assess(input));assert.equal(before,JSON.stringify(input));return {...result,provenance:input.provenance,elapsedMs:performance.now()-t};});
const categories=['text_missing','abnormal_characters','reading_order','table_structure','figures','formulas_terms','layout'];
const counts=Object.fromEntries(Object.keys(ROUTES).map(k=>[k,pages.filter(p=>p.route===k).length]));
const riskCounts=Object.fromEntries(categories.map(k=>[k,{events:pages.reduce((n,p)=>n+p.risks.filter(r=>r.category===k).length,0),pages:pages.filter(p=>p.risks.some(r=>r.category===k)).length}]));
verifySnapshot(snapshot);
const summary={schemaVersion:1,ruleVersion:RULE_VERSION,inputKind:config.kind,notAccuracyBenchmark:true,pages:pages.length,counts,riskCounts,reproducible:true,protectedFiles:snapshot.size,protectedChanges:0,ocrExecutions:0,accuracy:null,cer:null,wer:null,elapsedMs:performance.now()-start,timingScope:'input checks and twice-run assessment; report writes excluded'};
const out=outputDir(args['--out'],'tmp-ocr-quality-routing-portable-');
for(const p of pages)writeNew(path.join(out,`scan${String(p.seq).padStart(4,'0')}.json`),p);
writeNew(path.join(out,'summary.json'),summary);
writeNew(path.join(out,'source-checksums.json'),{configSha256:snapshot.get(configFile),configKind:config.kind,sources:pages.map(p=>({seq:p.seq,provenance:p.provenance}))});
writeNew(path.join(out,'report.md'),['# OCR 品質分流執行摘要','',`輸入：${config.kind}。合成資料不是教材實測，也不證明辨識品質。`,...Object.entries(counts).map(([k,n])=>`- ${ROUTES[k]}：${n}頁。`),'',`耗時：${summary.elapsedMs.toFixed(2)} ms；保護輸入：${snapshot.size}；變更0。`,'所有結果仍待人工確認；CER/WER/accuracy=null。無OCR執行。'].join('\n')+'\n');
console.log(JSON.stringify({outputDirectory:out,...summary},null,2));
