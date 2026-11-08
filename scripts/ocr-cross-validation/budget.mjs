// Offline, persistent budget simulation. No inference permission is granted here.
import assert from 'node:assert/strict';
import {estimateMiniCost,model as miniModel} from '../lib/ocr-ai-correction-trial.mjs';
import {validateRequest,digest} from './core.mjs';
export const MICRO=1_000_000;
const money=n=>{assert(Number.isSafeInteger(n)&&n>=0,'Nonnegative integer micro-USD required');return n;};
const safeSum=values=>money(values.reduce((a,b)=>a+money(b),0));
export function estimateCost(request,bounds){
 validateRequest(request);let usd,reason;
 if(request.provider==='openai'){
  assert.equal(request.model_version,miniModel,'Unknown model price');
  assert(bounds?.input_includes_image_tokens===true,'Image token allowance required');
  assert(Number.isSafeInteger(bounds.input_tokens)&&bounds.input_tokens>=0&&Number.isSafeInteger(bounds.max_output_tokens)&&bounds.max_output_tokens>=0);
  usd=estimateMiniCost({input_tokens:bounds.input_tokens,output_tokens:bounds.max_output_tokens}).estimatedFromReturnedUsage;
  reason='Existing mini standard-price calculator; declared input includes image tokens, not yet a measured or certified bound';
 }else if(request.provider==='google'){
  assert(Number.isSafeInteger(bounds?.pages)&&bounds.pages>=1);assert(typeof bounds.math_addon==='boolean');
  usd=bounds.pages*(1.5+(bounds.math_addon?6:0))/1000;reason='B2 planning OCR/add-on marginal page rates; no free tier assumed';
 }else return {status:'QUOTE_REQUIRED',estimated_usd:null,micro_usd:null,currency:'USD',reason:'Azure account/region/SKU price unconfirmed'};
 const micro_usd=money(Math.ceil(usd*MICRO));return {status:'SCENARIO_ESTIMATE',estimated_usd:micro_usd/MICRO,micro_usd,currency:'USD',bounds:structuredClone(bounds),reason,price_verified_for_execution:false,extra_storage_tax_network_excluded:true};
}
export function costRollup(rows){
 const unknown=rows.some(r=>r.estimate.micro_usd===null),byROI={};
 for(const r of rows){const key=r.roi_id;byROI[key]??={micro_usd:0,unknown:false};if(r.estimate.micro_usd===null)byROI[key].unknown=true;else byROI[key].micro_usd=safeSum([byROI[key].micro_usd,r.estimate.micro_usd]);}
 return {estimated_total_usd:unknown?null:safeSum(rows.map(r=>r.estimate.micro_usd))/MICRO,known_subtotal_usd:safeSum(rows.filter(r=>r.estimate.micro_usd!==null).map(r=>r.estimate.micro_usd))/MICRO,by_roi:byROI,cost_status:unknown?'PARTIAL_QUOTE_REQUIRED':'SCENARIO_ESTIMATE',actual_api_cost_usd:0};
}
export function openBudget(journal,policy){
 policy=structuredClone(policy);
 money(policy.global_limit);money(policy.batch_limit);money(policy.per_roi_limit);assert(policy.global_limit<=100*MICRO,'Exploration ceiling is USD 100');assert(policy.batch_limit<=policy.global_limit&&policy.per_roi_limit<=policy.batch_limit);
 assert(policy.historical_spend===null||Number.isSafeInteger(policy.historical_spend)&&policy.historical_spend>=0);assert(Number.isSafeInteger(policy.max_requests)&&policy.max_requests>0);assert(Number.isSafeInteger(policy.max_attempts)&&policy.max_attempts>0);
 const policyId=digest(policy);
 function state(){
  const rows=journal.history(),jobs=new Map();for(const r of rows){const e=r.payload;assert.equal(e.policy_id,policyId,'Budget policy changed; explicit migration required');
   if(e.type==='reserve'){assert(!jobs.has(e.key));jobs.set(e.key,{...e,status:'reserved',actual:null});}
   else{const job=jobs.get(e.key);assert(job&&job.status==='reserved','Invalid budget transition');assert(e.type==='settle');job.status='settled';job.actual=e.actual;}
  }
  const charged=[...jobs.values()].reduce((n,j)=>safeSum([n,j.status==='reserved'?j.amount:j.actual]),0);
  return {rows,jobs,charged,overrun:[...jobs.values()].some(j=>j.actual!==null&&j.actual>j.amount),historical_reconciled:policy.historical_spend!==null};
 }
 function reserve({key,roi,engine,amount,attempt=1}){
  money(amount);assert(amount>0);assert(/^[a-f0-9]{64}$/.test(key)&&typeof roi==='string'&&roi&&typeof engine==='string'&&engine);assert(Number.isSafeInteger(attempt)&&attempt>=1&&attempt<=policy.max_attempts,'Retry cap');
  const s=state(),old=s.jobs.get(key);if(old){assert.equal(old.roi,roi);assert.equal(old.engine,engine);assert.equal(old.amount,amount);assert.equal(old.attempt,attempt);return {status:'CACHE_OR_INFLIGHT',job:old};}
  assert(!s.overrun,'Recorded cost overrun blocks new work');assert(s.historical_reconciled,'Historical spend not reconciled');assert(s.jobs.size<policy.max_requests,'Request cap');
  const same=[...s.jobs.values()].filter(j=>j.roi===roi&&j.engine===engine);assert.equal(attempt,same.length+1,'Retry sequence');assert(same.every(j=>j.status==='settled'),'Unknown/inflight charge blocks retry');assert(same.length<policy.max_attempts,'Retry cap');
  assert(safeSum([s.charged,amount])<=policy.batch_limit,'Batch budget exceeded');assert(safeSum([policy.historical_spend,s.charged,amount])<=policy.global_limit,'Global budget exceeded');
  const roiSpent=[...s.jobs.values()].filter(j=>j.roi===roi).reduce((n,j)=>safeSum([n,j.status==='reserved'?j.amount:j.actual]),0);assert(safeSum([roiSpent,amount])<=policy.per_roi_limit,'ROI budget exceeded');
  journal.append({type:'reserve',policy_id:policyId,key,roi,engine,amount,attempt},{expectedRevision:s.rows.length,eventId:'reserve:'+key});return {status:'RESERVED_SIMULATION_ONLY'};
 }
 function settle(key,actual){money(actual);const s=state(),j=s.jobs.get(key);assert(j,'Unknown reservation');if(j.status==='settled'){assert.equal(j.actual,actual);return;}
  if(actual>j.amount){journal.append({type:'settle',policy_id:policyId,key,actual},{expectedRevision:s.rows.length,eventId:'settle:'+key});throw Error('Cost overrun recorded; stop and investigate');}
  journal.append({type:'settle',policy_id:policyId,key,actual},{expectedRevision:s.rows.length,eventId:'settle:'+key});
 }
 return {state,reserve,settle,live_execution_enabled:false};
}
