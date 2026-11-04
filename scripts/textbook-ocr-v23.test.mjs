import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {sha,writeNew,read} from './lib/ocr-quality-io.mjs';
import {loadPages,buildCatalog,selectPages,verifyOcr} from './lib/textbook-page-catalog.mjs';
import {runBatch} from './lib/textbook-ocr-runner.mjs';
import {inspectPage} from './lib/textbook-page-inspection.mjs';
import sharp from 'sharp';
// All fixtures are synthetic, outside textbook storage. No OCR/API call.
function fixture(subject='chemistry'){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studysignal-v23-test-'));
  const pages=[1,2,3].map(seq=>{
    const image=path.join(dir,'synthetic-'+seq+'.bin');fs.writeFileSync(image,'synthetic source '+seq,{flag:'wx'});
    return {subject,materialId:'synthetic-book',pageId:'synthetic-book/scan-'+seq,scanSeq:seq,originalFileName:path.basename(image),printedPage:seq+10,label:String(seq+10),pageNumberVerification:'estimated',
      image:{path:image,sha256:sha(fs.readFileSync(image)),bytes:fs.statSync(image).size},ocr:{status:'not_found_in_registered_runs',versions:[]}};
  });return {dir,root:path.join(dir,'run'),catalog:{schemaVersion:1,subject,materialId:'synthetic-book',pages},engine:{name:'synthetic-not-OCR',version:'1'},calls:[]};
}
function fake(f,{failOnce=false,alwaysFail=false,badSource=false}={}){return async({page,root,dir,attempt})=>{
  f.calls.push(page.scanSeq);if(alwaysFail||failOnce&&attempt===1)throw Error('synthetic failure');
  const text='H2O',artifacts={};
  for(const [n,t]of Object.entries({'raw.txt':text,'normalized.txt':text,'layout.tsv':'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n5\t1\t1\t1\t1\t1\t1\t2\t20\t10\t90\tH2O\n','blocks.json':'[]'})){
    writeNew(path.join(dir,n),t);artifacts[path.relative(root,path.join(dir,n)).replaceAll('\\','/')]=sha(Buffer.from(t));
  }
  return {seq:page.scanSeq,file:page.originalFileName,sourceSha256:badSource?'0'.repeat(64):page.image.sha256,printedPage:page.printedPage,label:page.label,verification:page.pageNumberVerification,
    attempt,image:{width:100,height:100},artifacts,elapsedMs:1,ocrMs:1,status:'ocr-completed; quality-review-pending'};
};}
const run=(f,opts={})=>runBatch({catalog:f.catalog,root:f.root,ids:[1,2,3],engine:f.engine,perform:fake(f),...opts});
test('selection supports comma lists and ranges without biology limits',()=>{const p=Array.from({length:600},(_,i)=>({scanSeq:i+1}));assert.deepEqual(selectPages('500-502,600',p),[500,501,502,600]);});
for(const selection of ['0','1,1','2-1','1-4','1.5','all'])test('reject selection '+selection,()=>assert.throws(()=>selectPages(selection,[1,2,3].map(scanSeq=>({scanSeq})))));
test('canonical adapter supports chemistry, separate statuses and hashes',()=>{
  const f=fixture();writeNew(path.join(f.dir,'pages.json'),{pages:f.catalog.pages});
  const c=buildCatalog({adapter:'canonical-pages-v1',subject:'chemistry',materialId:'synthetic-book',pagesFile:'pages.json'},f.dir);
  assert.equal(c.summary.pages,3);assert.equal(c.summary.imagesSaved,3);assert.equal(c.summary.ocrNotFound,3);
  assert(c.pages.every(p=>p.humanReview.status==='pending_human_review'&&p.kb.status==='not_imported'&&p.quality.formalCER===null));
});
test('duplicate canonical sequence is rejected',()=>{const f=fixture();writeNew(path.join(f.dir,'pages.json'),{pages:[f.catalog.pages[0],f.catalog.pages[0]]});assert.throws(()=>loadPages({adapter:'canonical-pages-v1',subject:'physics',materialId:'book',pagesFile:'pages.json'},f.dir));});
test('pause after one, restore remaining pages, then skip all',async()=>{
  const f=fixture();const a=await run(f,{stopAfter:1,batchSize:1});assert.equal(a.completed,1);assert.equal(a.paused,true);assert.deepEqual(a.unvisited,[2,3]);
  const result=path.join(f.root,'pages/0001/attempt-01/result.json'),before=fs.readFileSync(result);
  const b=await run(f,{resume:true,batchSize:2});assert.equal(b.completed,2);assert.equal(b.skipped,1);
  const c=await run(f,{resume:true});assert.equal(c.completed,0);assert.equal(c.skipped,3);assert.deepEqual(f.calls,[1,2,3]);assert.deepEqual(fs.readFileSync(result),before);
});
test('failure retry uses new attempts and preserves error',async()=>{const f=fixture();const r=await run(f,{ids:[1],perform:fake(f,{failOnce:true})});assert.equal(r.completed,1);assert.equal(r.states[0].attempt,2);assert.equal(read(path.join(f.root,'pages/0001/attempt-01/error.json')).status,'failed');});
test('retry exhaustion remains failed and bounded across resume',async()=>{const f=fixture();const r=await run(f,{ids:[1],maxAttempts:2,perform:fake(f,{alwaysFail:true})});assert.equal(r.failed,1);const b=await run(f,{ids:[1],maxAttempts:2,resume:true,perform:fake(f,{alwaysFail:true})});assert.equal(b.failed,1);assert.equal(f.calls.length,2);});
test('interrupted attempt is preserved, never overwritten',async()=>{const f=fixture();await run(f,{shouldPause:()=>true});writeNew(path.join(f.root,'pages/0001/attempt-01/started.json'),{status:'running'});const r=await run(f,{resume:true,ids:[1,2,3]});assert.equal(r.states[0].attempt,2);assert(fs.existsSync(path.join(f.root,'pages/0001/attempt-01/started.json')));});
test('completed artifact tampering prevents all subsequent OCR',async()=>{const f=fixture();await run(f,{stopAfter:1});fs.appendFileSync(path.join(f.root,'pages/0001/attempt-01/raw.txt'),'tamper');await assert.rejects(run(f,{resume:true}));assert.equal(f.calls.length,1);});
test('changed source refuses resume',async()=>{const f=fixture();await run(f,{stopAfter:1});fs.appendFileSync(f.catalog.pages[1].image.path,'tamper');await assert.rejects(run(f,{resume:true}));assert.equal(f.calls.length,1);});
test('changed engine refuses resume',async()=>{const f=fixture();await run(f,{stopAfter:1});await assert.rejects(run(f,{resume:true,engine:{name:'new'}}));});
test('existing run requires explicit resume',async()=>{const f=fixture();await run(f);await assert.rejects(run(f));});
test('active runner lock refuses second runner',async()=>{const f=fixture();await run(f);writeNew(path.join(f.root,'run.lock'),{pid:process.pid});await assert.rejects(run(f,{resume:true}));await assert.rejects(run(f,{resume:true,recoverStaleLock:true}));});
test('imported OCR is reused without invoking performer',async()=>{const f=fixture();await run(f);const p=f.catalog.pages[0],file=path.join(f.root,'pages/0001/attempt-01/result.json');p.ocr={status:'completed',versions:[verifyOcr(f.root,file,p)]};f.root=path.join(f.dir,'import-run');f.calls=[];const r=await run(f,{ids:[1]});assert.equal(r.skipped,1);assert.equal(f.calls.length,0);});
test('bad OCR source identity cannot publish result',async()=>{const f=fixture();const r=await run(f,{ids:[1],maxAttempts:1,perform:fake(f,{badSource:true})});assert.equal(r.failed,1);assert(!fs.existsSync(path.join(f.root,'pages/0001/attempt-01/result.json')));});
test('OCR verification never upgrades pagination, formulas or human status',async()=>{const f=fixture();await run(f,{ids:[1]});const p=f.catalog.pages[0],r=verifyOcr(f.root,path.join(f.root,'pages/0001/attempt-01/result.json'),p);assert.equal(r.independentHumanApproval,false);assert.equal(r.formalCER,null);assert.equal(r.formalWER,null);assert.equal(r.checks.formulas.status,'pending_human_review');assert.equal(p.pageNumberVerification,'estimated');});
test('unknown page and invalid batch limits rejected',async()=>{const f=fixture();await assert.rejects(run(f,{ids:[99]}));await assert.rejects(run(f,{batchSize:0}));await assert.rejects(run(f,{maxAttempts:0}));});
test('existing inspection rules preserve synthetic OCR and never approve formulas',async()=>{
  const f=fixture(),p=f.catalog.pages[0],png=await sharp({create:{width:100,height:100,channels:3,background:'white'}}).png().toBuffer();
  // Replace this test's own generated source before recording its digest.
  fs.writeFileSync(p.image.path,png);p.image.sha256=sha(png);p.image.bytes=png.length;
  await run(f,{ids:[1]});p.ocr={status:'completed',versions:[verifyOcr(f.root,path.join(f.root,'pages/0001/attempt-01/result.json'),p)]};
  const before=fs.readFileSync(p.ocr.versions[0].files['raw.txt'].path),a=await inspectPage(p),b=await inspectPage(p);
  assert.deepEqual(a,b);assert.equal(a.quality.status,'pending_human_review');assert.equal(a.quality.cer,null);
  assert.deepEqual(fs.readFileSync(p.ocr.versions[0].files['raw.txt'].path),before);assert(a.quality.scientificTokens.length>0);
});
