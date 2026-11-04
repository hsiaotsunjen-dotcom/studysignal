import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {sha,read,writeNew} from './ocr-quality-io.mjs';
import {attemptWithRetry} from './kb-ocr-batch.mjs';
import {verifyOcr} from './textbook-page-catalog.mjs';

// Immutable attempts/results/checkpoints are the recovery journal; no mutable
// "last completed" pointer can accidentally hide an interrupted page.
export async function runBatch({catalog,root,ids,engine,perform,batchSize=3,maxAttempts=3,
  stopAfter=Infinity,resume=false,shouldPause=()=>false,onFailure=async()=>{},recoverStaleLock=false}){
  assert(Number.isInteger(batchSize)&&batchSize>0&&batchSize<=50);
  assert(Number.isInteger(maxAttempts)&&maxAttempts>0&&maxAttempts<=10);
  assert(stopAfter===Infinity||Number.isInteger(stopAfter)&&stopAfter>0);
  assert(ids.length&&new Set(ids).size===ids.length);
  const pages=ids.map(id=>{const p=catalog.pages.find(p=>p.scanSeq===id);assert(p);return p;});
  const config={subject:catalog.subject,materialId:catalog.materialId,engine,maxAttempts,
    pages:pages.map(p=>({seq:p.scanSeq,sha256:p.image.sha256,printedPage:p.printedPage,label:p.label,verification:p.pageNumberVerification})),
    runnerSha256:sha(fs.readFileSync(new URL('./textbook-ocr-runner.mjs',import.meta.url)))};
  const fingerprint=sha(JSON.stringify(config));root=path.resolve(root);
  if(fs.existsSync(root)){assert(resume,'Existing run requires --resume');assert.deepEqual(read(path.join(root,'run.json')).config,config,'Run source/engine/config changed');}
  else{assert(!resume,'Resume target missing');fs.mkdirSync(root,{recursive:true});writeNew(path.join(root,'run.json'),{fingerprint,config,createdAt:new Date().toISOString()});}
  const lock=path.join(root,'run.lock');
  if(fs.existsSync(lock)){
    assert(recoverStaleLock,'Lock exists; explicit stale-lock recovery required');
    const old=read(lock);let alive=true;try{process.kill(old.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}
    assert(!alive,'Runner is still alive');fs.renameSync(lock,path.join(root,'stale-lock-'+crypto.randomUUID()+'.json'));
  }
  writeNew(lock,{pid:process.pid,fingerprint});
  const start=performance.now(),session=crypto.randomUUID(),states=[];let completed=0,failed=0,skipped=0,paused=false,checkpointNumber=0;
  const checkpoint=()=>writeNew(path.join(root,'checkpoints',session+'-'+String(++checkpointNumber).padStart(4,'0')+'.json'),
    {fingerprint,session,time:new Date().toISOString(),states,completed,skipped,failed,paused,elapsedMs:performance.now()-start});
  try{
    // Validate every reusable result before ANY page is sent to OCR.
    for(const p of pages){
      assert(!p.errors?.some(e=>e.status==='invalid_result'),'Invalid existing OCR needs explicit investigation, not silent rerun');
      assert.equal(sha(fs.readFileSync(p.image.path)),p.image.sha256,'Source changed');
      for(const v of p.ocr.versions||[]){assert.equal(refHash(v.result.path),v.result.sha256,'Imported result changed');verifyOcr(path.resolve(v.result.path,'../../../..'),v.result.path,p);}
      const parent=path.join(root,'pages',String(p.scanSeq).padStart(4,'0'));
      if(fs.existsSync(parent))for(const d of fs.readdirSync(parent).filter(n=>/^attempt-\d+$/.test(n))){const f=path.join(parent,d,'result.json');if(fs.existsSync(f))verifyOcr(root,f,p);}
    }
    for(let i=0;i<pages.length;i+=batchSize){
      for(const p of pages.slice(i,i+batchSize)){
        if(shouldPause()||completed>=stopAfter){paused=true;break;}
        if(p.ocr.status==='completed'){
          states.push({seq:p.scanSeq,status:'reused_existing',result:p.ocr.versions.at(-1).result});skipped++;checkpoint();continue;
        }
        const out=await attemptWithRetry({root,seq:p.scanSeq,maxAttempts,onFailure,perform:async({dir,attempt})=>{
          assert.equal(sha(fs.readFileSync(p.image.path)),p.image.sha256,'Source changed before OCR');
          const r=await perform({page:p,dir,attempt,root});
          assert.equal(sha(fs.readFileSync(p.image.path)),p.image.sha256,'Source changed during OCR');
          // Validate layers/coordinates before publishing the completion marker.
          const candidate=path.join(dir,'candidate-result.json');writeNew(candidate,r);verifyOcr(root,candidate,p);return r;
        }});
        if(out.record){states.push({seq:p.scanSeq,status:out.resumed?'resumed_completed':'completed',attempt:out.record.attempt,elapsedMs:out.record.elapsedMs});if(out.resumed)skipped++;else completed++;}
        else{failed++;states.push({seq:p.scanSeq,status:'failed',error:out.error});}
        checkpoint();
      }
      if(paused)break;
    }
    checkpoint();
    const summary={schemaVersion:1,fingerprint,session,requested:ids.length,completed,skipped,failed,paused,
      unvisited:pages.filter(p=>!states.some(s=>s.seq===p.scanSeq)).map(p=>p.scanSeq),states,
      elapsedMs:performance.now()-start,status:failed?'failed':paused?'paused':'completed',paidCalls:0};
    writeNew(path.join(root,'sessions',session+'.json'),summary);return summary;
  }finally{fs.unlinkSync(lock);}
}
function refHash(file){return sha(fs.readFileSync(file));}
