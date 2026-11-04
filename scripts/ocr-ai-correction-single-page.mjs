// Single page only. No network unless --execute approved is explicitly supplied.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {read,resolveProject,sha,options,writeNew,protectedRead,verifySnapshot} from './lib/ocr-quality-io.mjs';
import {model,prepareRequest,reserveBudget,estimateMiniCost} from './lib/ocr-ai-correction-trial.mjs';
import {validateProposals} from './lib/ocr-ai-proposal-validation.mjs';
const args=options(process.argv.slice(2),['--execute','--budget-usd']);
assert(!args['--execute']||args['--execute']==='approved','Explicit approval required');
assert(!args['--budget-usd']||args['--budget-usd']==='0.25','Fixed USD 0.25 limit');
const snapshot=new Map(),seq=200;
const source=read(resolveProject('scripts/fixtures/ocr-quality-baseline.v1.json')).sources.find(s=>s.seq===seq);
const manifest=JSON.parse(protectedRead(resolveProject(source.source.manifest),snapshot));
const scan=manifest.scans.find(s=>s.originalFileName===source.source.file);
const image=protectedRead(scan.originalPath,snapshot);assert.equal(sha(image),source.source.sha256);
const rawBytes=protectedRead(resolveProject(source.ocr.raw),snapshot);assert.equal(sha(rawBytes),source.ocr.rawSha256);
const resultBytes=protectedRead(resolveProject(source.ocr.result),snapshot);assert.equal(sha(resultBytes),source.ocr.sha256);
const result=JSON.parse(resultBytes),raw=rawBytes.toString('utf8');
const payload=prepareRequest({seq,raw,imageBytes:image,imageSize:result.image});
payload.service_tier='default';payload.reasoning={effort:'low'};
verifySnapshot(snapshot);
if(!args['--execute']){
  console.log(JSON.stringify({mode:'offline',seq,model,apiKeyPresent:Boolean(process.env.OPENAI_API_KEY),budgetUsd:0.25,maxOutputTokens:payload.max_output_tokens,paidCalls:0,tokenCount:'not_requested',requestPrepared:true},null,2));
}else{
  assert(process.env.OPENAI_API_KEY,'API key not available in this process; never paste it into chat');
  const dir=resolveProject('tmp-ocr-ai-correction-paid-firstpage-v1');
  // One permanent exclusive reservation across invocations. Never auto-retry an
  // uncertain response or overwrite this ledger, even when the process crashes.
  fs.mkdirSync(dir,{recursive:true});
  writeNew(path.join(dir,'reservation.json'),{createdAt:new Date().toISOString(),seq,model,budgetUsd:0.25,status:'locked-before-network'});
  async function post(endpoint,body){
    let response;
    try{response=await fetch('https://api.openai.com/v1/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});}catch{throw new Error('Network failure; no automatic retry. Reservation retained.');}
    // Never log request headers, payload or server error bodies.
    assert(response.ok,'API HTTP '+response.status+'; reservation retained; no retry');
    return {data:await response.json(),requestId:response.headers.get('x-request-id')};
  }
  const count=await post('responses/input_tokens',{model,input:payload.input,text:payload.text,reasoning:payload.reasoning});
  const budget=reserveBudget({inputTokens:count.data.input_tokens,maxOutputTokens:payload.max_output_tokens});
  writeNew(path.join(dir,'budget.json'),{...budget,inputTokens:count.data.input_tokens,priceDate:'2026-11-03',model});
  const started=performance.now();
  const response=await post('responses',payload);
  const elapsedMs=performance.now()-started;
  writeNew(path.join(dir,'response.json'),response.data);
  let mechanical={status:'pending_human_review',mechanicalChecksPassed:false};
  try{
    assert.equal(response.data.status,'completed');
    const text=(response.data.output??[]).flatMap(item=>item.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
    const candidate=JSON.parse(text);
    const evaluation=validateProposals(candidate.changes,{raw,...result.image});
    mechanical={status:'pending_human_review',verified:false,autoApplyAllowed:false,
      mechanicalChecksPassed:evaluation.records.every(r=>r.validation?.textAnchorResolved&&r.imageLocator?.boundsValid&&!r.imageLocator.aliasConflict&&!r.issues.some(i=>['overlapping_text_span','source_line_reference_mismatch'].includes(i.code))),
      classificationCounts:evaluation.counts};
    writeNew(path.join(dir,'candidate.json'),{seq,model:response.data.model,sourceSha256:sha(image),rawSha256:sha(rawBytes),candidate,evaluation,verification:mechanical});
  }catch{mechanical.issue='Incomplete or invalid proposals; inspect saved response; do not apply';}
  verifySnapshot(snapshot);
  const cost=estimateMiniCost(response.data.usage);
  writeNew(path.join(dir,'summary.json'),{seq,requestId:response.requestId,model:response.data.model,elapsedMs,usage:response.data.usage??null,cost,budget,verification:mechanical,cer:null,wer:null,correctRepairs:null,newErrors:null});
  console.log(JSON.stringify({seq,output:dir,elapsedMs,cost,status:'pending_human_review'},null,2));
}
