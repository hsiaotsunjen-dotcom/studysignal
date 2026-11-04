// Isolated local JSON store. Event files are immutable CAS slots, no deletes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inside,projectRoot,sha,writeNew} from './ocr-quality-io.mjs';
import {createReviewPage,initialState,advanceState,createEvent,reviewQueue,fingerprint,textHash} from './ocr-ai-review-v22.mjs';
function checkDirectory(dir){assert(!fs.lstatSync(dir).isSymbolicLink(),'Store directories must not be symlinks');}
export function verifySources(page){
  if(page.body.dataKind==='synthetic')return;
  for(const ref of page.body.sourceRefs){
    assert(/^[a-f0-9]{64}$/.test(ref.sha256),'Invalid source digest');
    let file;
    if(ref.kind==='project-file')file=inside(projectRoot,ref.path);
    else if(ref.kind==='manifest-image'){
      const manifest=JSON.parse(fs.readFileSync(inside(projectRoot,ref.manifest),'utf8'));
      const source=manifest.scans.find(s=>s.originalFileName===ref.file);assert(source,'Image not in manifest');assert.equal(source.sha256,ref.sha256);file=source.originalPath;
    }else throw Error('Unknown source reference');
    const bytes=fs.readFileSync(file);assert.equal(sha(bytes),ref.sha256,'Source drift: '+ref.role);
    if(ref.role==='raw'){assert.equal(textHash(page.body.raw),ref.sha256);assert.equal(bytes.toString('utf8'),page.body.raw);}
    if(ref.role==='image')assert.equal(ref.sha256,page.body.imageSha256);
  }
}
export function openReviewStore(root,{create=false}={}){
  root=path.resolve(root);const marker=path.join(root,'store.json');
  if(create){assert(!fs.existsSync(root),'New store directory must not exist');fs.mkdirSync(root,{recursive:true});writeNew(marker,{kind:'ocr-ai-review-store-v22',schemaVersion:1});fs.mkdirSync(path.join(root,'pages'));}
  checkDirectory(root);assert.deepEqual(JSON.parse(fs.readFileSync(marker,'utf8')),{kind:'ocr-ai-review-store-v22',schemaVersion:1});
  checkDirectory(path.join(root,'pages'));
  const pageFile=id=>{assert(typeof id==='string'&&/^[a-f0-9]{64}$/.test(id),'Invalid page fingerprint');return inside(root,'pages/'+id+'.json');};
  function loadPage(id){const file=pageFile(id);assert(!fs.lstatSync(file).isSymbolicLink());const page=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(page.fingerprint,id);assert.equal(fingerprint(page.body),id,'Page snapshot changed');verifySources(page);return page;}
  function readState(id){
    const page=loadPage(id);let state=initialState(page);const dir=inside(root,'events/'+id);
    if(fs.existsSync(dir)){
      checkDirectory(path.join(root,'events'));checkDirectory(dir);
      const files=fs.readdirSync(dir).sort();assert(files.every(f=>/^\d{9}\.json$/.test(f)),'Unexpected event file; inspect preserved files');
      for(const [i,file] of files.entries()){
        assert.equal(file,String(i+1).padStart(9,'0')+'.json','Missing event');const full=path.join(dir,file);assert(!fs.lstatSync(full).isSymbolicLink());state=advanceState(page,state,JSON.parse(fs.readFileSync(full,'utf8')));
      }
    }
    return {page,state,queue:reviewQueue(page,state)};
  }
  function importPage(input){
    const page=createReviewPage(input);verifySources(page);const file=pageFile(page.fingerprint);
    if(fs.existsSync(file)){const current=loadPage(page.fingerprint);assert.equal(fingerprint(current.body),fingerprint(page.body));return {pageFingerprint:page.fingerprint,created:false};}
    try{writeNew(file,page);}catch(error){if(error.code!=='EEXIST')throw error;loadPage(page.fingerprint);return {pageFingerprint:page.fingerprint,created:false};}
    return {pageFingerprint:page.fingerprint,created:true};
  }
  function dispatch(id,command){
    const {page,state}=readState(id),event=createEvent(page,state,command),dir=inside(root,'events/'+id);
    const parent=path.join(root,'events');if(!fs.existsSync(parent))fs.mkdirSync(parent);checkDirectory(parent);
    if(!fs.existsSync(dir))fs.mkdirSync(dir);checkDirectory(dir);verifySources(page);
    // Concurrent clients with the same head both select this slot. Only one
    // exclusive creation succeeds; no retry or silent overwrite is performed.
    writeNew(path.join(dir,String(event.sequence).padStart(9,'0')+'.json'),event);
    return {eventHash:event.eventHash,textRevision:event.command.action==='review'?state.textRevision:event.eventHash,state:advanceState(page,state,event)};
  }
  function importBatch(inputs,{limit=20}={}){
    assert(Number.isInteger(limit)&&limit>0&&limit<=50,'Batch bound must be 1..50');
    const iterator=inputs[Symbol.iterator](),results=[];
    while(results.length<limit){const next=iterator.next();if(next.done)break;const input=next.value;try{results.push({...importPage(input),status:'ok'});}catch(error){results.push({pageId:input?.pageId??null,status:'error',reason:error.message});}}
    const batch={results,processed:results.length,failures:results.filter(r=>r.status==='error').length};
    const dir=path.join(root,'batches');if(!fs.existsSync(dir))fs.mkdirSync(dir);checkDirectory(dir);
    const receipt=path.join(dir,randomUUID()+'.json');writeNew(receipt,{kind:'review-import-batch-receipt',savedAt:new Date().toISOString(),...batch});
    return {...batch,receipt};
  }
  const list=()=>fs.readdirSync(path.join(root,'pages')).filter(f=>/^[a-f0-9]{64}\.json$/.test(f)).map(f=>{const {page,state,queue}=readState(f.slice(0,-5));return {pageFingerprint:page.fingerprint,subject:page.body.subject,pageId:page.body.pageId,head:state.head,textRevision:state.textRevision,queue};});
  return {root,importPage,importBatch,readState,dispatch,list};
}
