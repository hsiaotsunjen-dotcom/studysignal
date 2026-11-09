// Pairwise comparisons, optional explicit human structure alignment, offline batch.
import assert from 'node:assert/strict';
import {annotationDigest,hasHumanReference,validateResult} from '../ocr-benchmark/core.mjs';
import {digest,makeRequest,bindingOf,evaluateFromReview,compareCandidate} from './core.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';
import {costRollup,MICRO} from './budget.mjs';
import {normalizeResponse,NORMALIZER_VERSION} from './normalize.mjs';
export function benchmarkModel(c,n,mapping=null,reference=null){
 assert.equal(digest(n.source),digest(bindingOf(c)),'Normalized source mismatch');
 let structure=null,alignment=null;const skipped=[];
 if(mapping){
  assert(reference&&hasHumanReference(reference),'Verified reference required for structure ID mapping');
  assert.equal(reference.sample_id,c.id);assert.equal(reference.image_sha256,c.sample.image_sha256);assert.deepEqual(reference.bounding_box,c.sample.bounding_box);
  assert.equal(mapping.annotation_digest,annotationDigest(reference));assert.equal(mapping.image_sha256,c.sample.image_sha256);assert.deepEqual(mapping.roi,c.sample.bounding_box);
  assert(mapping.status==='human-confirmed'&&mapping.reviewer_id?.trim()&&Number.isFinite(Date.parse(mapping.reviewed_at)),'Explicit human structure correspondence required');
  structure={};
  const mapList=(key,native,refList,convert)=>{if(!Object.hasOwn(mapping,key))return;const pairs=mapping[key];assert(Array.isArray(pairs));assert(new Set(pairs.map(p=>p.native_id)).size===pairs.length&&new Set(pairs.map(p=>p.reference_id)).size===pairs.length,'Duplicate mapping');
   for(const p of pairs)assert(native.some(x=>x.id===p.native_id)&&refList.some(x=>x.id===p.reference_id),'Unknown mapping ID');
   if(n.data.reported[key]==='not_reported'){skipped.push({key,reason:'Provider did not report this structure'});return;}
   if(key==='tables'&&native.some(t=>t.cells.some(cell=>![cell.row,cell.column,cell.row_span,cell.column_span].every(Number.isInteger)))){skipped.push({key,reason:'Native cell geometry incomplete'});return;}
   if(key==='captions'){
    if(pairs.some(p=>typeof p.native_figure_id!=='string'||typeof p.reference_figure_id!=='string')){skipped.push({key,reason:'Explicit figure correspondence required'});return;}
    for(const p of pairs){assert.equal(native.find(x=>x.id===p.native_id).figure_id,p.native_figure_id);assert.equal(refList.find(x=>x.id===p.reference_id).figure_id,p.reference_figure_id);}
   }
   // Unmapped native values are retained as unmatched IDs; never silently discarded.
   structure[key]=native.map(item=>convert(item,pairs.find(p=>p.native_id===item.id)?.reference_id??'unmapped:'+item.id));
  };
  const ref=reference.reference_structure??{};
  mapList('tables',n.data.tables,ref.tables??[],(t,id)=>({id,cells:t.cells.map(cell=>({row:cell.row,column:cell.column,row_span:cell.row_span,column_span:cell.column_span,text:cell.text}))}));
  mapList('captions',n.data.captions,ref.captions??[],(t,id)=>({id,figure_id:mapping.captions.find(p=>p.native_id===t.id)?.reference_figure_id??'unmapped-figure:'+t.figure_id,text:t.text}));
  if(Object.hasOwn(mapping,'critical_fields')){
   const list=mapping.critical_fields;assert(Array.isArray(list));assert(new Set(list.map(p=>p.native_id)).size===list.length&&new Set(list.map(p=>p.reference_id)).size===list.length,'Duplicate formula mapping');
   for(const p of list){const r=(ref.critical_fields??[]).find(x=>x.id===p.reference_id);assert(n.data.formulas.some(f=>f.id===p.native_id)&&r&&r.type===p.type,'Invalid formula mapping type');}
   if(n.data.reported.formulas==='not_reported')skipped.push({key:'critical_fields',reason:'Provider did not report formulas'});
   else structure.critical_fields=n.data.formulas.map(f=>{const p=list.find(p=>p.native_id===f.id);return {id:p?.reference_id??'unmapped:'+f.id,type:p?.type??'term',value:f.text};});
  }
  if(Object.hasOwn(mapping,'reading_order')){
   const list=mapping.reading_order;assert(Array.isArray(list)&&new Set(list.map(p=>p.native_id)).size===list.length&&new Set(list.map(p=>p.reference_id)).size===list.length,'Duplicate order mapping');
   for(const p of list)assert(n.data.blocks.some(b=>b.id===p.native_id)&&(ref.reading_order??[]).includes(p.reference_id),'Unknown order mapping');
   structure.reading_order=n.data.reading_order.map(id=>list.find(p=>p.native_id===id)?.reference_id??'unmapped:'+id);
  }
  alignment='benchmark_canonical_ids';
 }
 const model={result_id:digest({request:n.request_key,raw:n.raw_sha256,mapping}),sample_id:c.id,image_sha256:c.sample.image_sha256,model_family:'commercial-vision',model_id:n.provider,model_version:n.model_version,
  model_config:{normalizer:NORMALIZER_VERSION,execution_mode:n.receipt.mode,skipped_structures:skipped},execution_time:n.receipt.elapsed_ms,execution_time_unit:'ms',estimated_cost:null,actual_cost:n.receipt.mode==='recorded-offline'?null:0,currency:'USD',OCR_output:{text:n.data.text,structure,structure_alignment:alignment},benchmark_result:null};
 validateResult(model,c.sample);return model;
}
export function evaluateNormalized(loaded,c,n,mapping=null){
 loaded.verify();const b=mapping?loaded.store.benchmark(c.id):null;
 if(mapping)assert(b?.review_status==='verified'&&b.ground_truth?.is_ground_truth,'No verified source for structure mapping');
 const model=benchmarkModel(c,n,mapping,b?.ground_truth.sample??null),evaluation=evaluateFromReview(loaded,c,model);
 return {model,evaluation};
}
export function compareNormalized(c,n){
 const model=benchmarkModel(c,n),candidate={sample_id:c.id,image_sha256:c.sample.image_sha256,source_fingerprint:c.fingerprint,roi:c.sample.bounding_box,provider:n.provider,model_version:n.model_version,raw_sha256:n.raw_sha256,model,
  blocks:n.data.blocks.filter(b=>b.bbox).map(b=>({id:b.id,text:b.text,bbox:b.bbox,polygon:b.polygon}))};
 const comparison=compareCandidate(c,candidate),events=[];
 for(const pair of comparison.comparisons)for(const issue of pair.result.issues)if(issue.role==='exception')events.push({event_id:digest([pair.pair,issue.issue_id]),type:issue.type,severity:issue.severity,location:issue.location,reason:issue.reason,provider:n.provider,pair:pair.pair,source_event:issue});
 for(const warning of n.warnings)events.push({event_id:digest([n.request_key,warning]),type:warning.type,severity:warning.severity,location:{bbox:n.source.roi,scope:'ROI fallback; inspect native locator'},reason:warning.reason??warning.locator??warning.type,provider:n.provider,warning});
 for(const type of ['formulas','tables','captions'])if(n.data[type].length)events.push({event_id:digest([n.request_key,type]),type:'unverified_'+type,severity:'high',location:{bbox:n.source.roi},reason:'Native structure retained; semantic/ID correspondence not independently verified',provider:n.provider});
 return {...comparison,events,content_confidence:null,calibration_status:'not_calibrated',receipt_mode:n.receipt.mode};
}
export function reviewQueue(events){
 const groups=new Map();for(const event of events){const key=digest({type:event.type,location:event.location});
  if(!groups.has(key))groups.set(key,{id:key,type:event.type,location:event.location,severity:event.severity,status:'pending_human_review',confidence:null,auto_apply_allowed:false,events:[],suggested_action:'Compare the bound original ROI and retained candidates; do not auto-correct or verify.'});
  const g=groups.get(key);if(!g.events.some(e=>e.event_id===event.event_id))g.events.push(structuredClone(event));if(event.severity==='critical')g.severity='critical';else if(event.severity==='high'&&g.severity!=='critical')g.severity='high';
 }
 return {items:[...groups.values()],event_count:new Set(events.map(e=>e.event_id)).size,bundling_scope:'same ROI/type/location; preserve all provider and pair evidence, not proven error counts'};
}
export function compareProviderPair(c,left,right){
 assert(left.provider!==right.provider,'Different provider IDs required');
 assert.equal(digest(left.source),digest(right.source),'Cross-provider source mismatch');
 const engine={id:left.provider,version:left.model_version,config:{normalizer:NORMALIZER_VERSION},text:left.data.text,
  blocks:left.data.blocks.filter(b=>b.bbox).map(b=>({id:b.id,text:b.text,bbox:b.bbox,polygon:b.polygon})),
  raw_ref:{path:'offline-normalized:'+left.raw_sha256,sha256:sha(Buffer.from(left.data.text))},result_ref:{path:'offline-response:'+left.raw_sha256,sha256:left.raw_sha256}};
 const compared=compareNormalized({...c,engines:[engine]},right);
 return {pair:[left.provider,right.provider],source:c.id,left_normalization_digest:left.normalization_digest,right_normalization_digest:right.normalization_digest,
  comparison:compared,independence:'Not established by distinct provider labels; inspect receipt mode',verified:false};
}
export async function compareBatch({loaded,providers,journal,scenarioCapMicro=5*MICRO,maxMockCalls=36}){
 assert(Number.isSafeInteger(scenarioCapMicro)&&scenarioCapMicro>=0&&Number.isSafeInteger(maxMockCalls)&&maxMockCalls>=0,'Invalid batch caps');loaded.verify();
 assert(loaded.cases.length===12,'This controlled runner permits exactly existing twelve ROI');assert(new Set(loaded.cases.map(c=>c.id)).size===12,'Duplicate source ROI');assert(providers.length>0&&new Set(providers.map(p=>p.id)).size===providers.length,'Duplicate/empty provider set');
 const requests=[],estimates=[];
 for(const c of loaded.cases)for(const provider of providers){
  const modelVersion={google:'processor-version-pending-selection',azure:'2024-11-30:prebuilt-layout',openai:'gpt-5.4-mini-2026-03-17'}[provider.id];
  assert(provider.interface_version==='ocr-provider-offline-v2'&&['mock-native','local-replay'].includes(provider.execution_mode)&&provider.strategy_id,'Offline provider/version contract required');
  const request=makeRequest(c,provider.id,{modelVersion,config:{offline_strategy:provider.strategy_id,...(provider.id==='google'?{google_index_unit:'codepoint'}:{})}});
  const bounds=provider.id==='openai'?{input_tokens:8000,max_output_tokens:2000,input_includes_image_tokens:true}:provider.id==='google'?{pages:1,math_addon:c.definition.category==='science'}:{};
  const estimate=provider.estimate(request,bounds);requests.push({c,provider,request,estimate});estimates.push({roi_id:c.id,provider:provider.id,estimate});
 }
 const costs=costRollup(estimates);assert(Math.round(costs.known_subtotal_usd*MICRO)<=scenarioCapMicro,'Known scenario subtotal exceeds batch cap; no work started');
 const prior=journal.history(),cached=new Map(prior.map(r=>[r.event_id,r]));let calls=0,hits=0;const rows=[];
 // Refuse a too-small cap before any new replay, even though this costs zero.
 const missing=requests.filter(x=>!cached.has('b22:'+digest([x.request.cache_key,NORMALIZER_VERSION])));assert(missing.length<=maxMockCalls,'Mock request cap exceeded');
 for(const {c,provider,request,estimate}of requests){
  assert(provider.network_calls===0&&provider.actual_cost_usd===0,'Offline provider contract required');const eventId='b22:'+digest([request.cache_key,NORMALIZER_VERSION]);
  let normalized,status='new',failure=null;
  if(cached.has(eventId)){
   const record=cached.get(eventId).payload;assert.equal(record.request_key,request.cache_key);assert.equal(record.provider,provider.id);assert.equal(record.status,'normalized','Failed attempt is retained; explicit new strategy/version required');
   normalized=normalizeResponse(request,c,record.receipt);assert.equal(normalized.normalization_digest,record.normalization_digest,'Cached normalization changed');hits++;status='cache';
  }else{
   calls++;try{normalized=await provider.recognize(request,c);assert(!normalized.receipt||normalized.receipt.mode!=='recorded-offline','This runner is mock/replay only');
    // Re-parse the receipt rather than trusting a provider's normalized claims.
    normalized=normalizeResponse(request,c,normalized.receipt);
    journal.append({request_key:request.cache_key,provider:provider.id,status:'normalized',receipt:normalized.receipt,normalization_digest:normalized.normalization_digest,actual_api_cost_usd:0},{expectedRevision:journal.history().length,eventId});
   }catch(e){failure={type:'normalization_or_provider_failure',message:e.message};journal.append({request_key:request.cache_key,provider:provider.id,status:'failed',failure,receipt:e.offline_receipt??null,actual_api_cost_usd:0},{expectedRevision:journal.history().length,eventId});}
  }
  if(failure){rows.push({sample_id:c.id,provider:provider.id,status:'failed',failure,quality_route:'HUMAN_REVIEW_REQUIRED',metrics:null});continue;}
  const comparison=compareNormalized(c,normalized),scored=evaluateNormalized(loaded,c,normalized),queue=reviewQueue(comparison.events);
  rows.push({sample_id:c.id,provider:provider.id,status,normalized,comparison,evaluation:scored.evaluation,estimate,review_queue:queue,validation_state:'machine-generated',quality_route:comparison.quality_route});
 }
 const providerDifferences=[],roiQueues=[];
 for(const c of loaded.cases){const rs=rows.filter(r=>r.sample_id===c.id),successful=rs.filter(r=>r.normalized),events=successful.flatMap(r=>r.comparison.events);
  for(let i=0;i<successful.length;i++)for(let j=i+1;j<successful.length;j++){const p=compareProviderPair(c,successful[i].normalized,successful[j].normalized);providerDifferences.push(p);events.push(...p.comparison.events);}
  for(const r of rs.filter(r=>r.failure))events.push({event_id:digest([c.id,r.provider,r.failure]),type:r.failure.type,severity:'high',location:{bbox:c.sample.bounding_box},reason:r.failure.message,provider:r.provider});
  roiQueues.push({sample_id:c.id,...reviewQueue(events)});
 }
 loaded.verify();return {version:'b2-2-offline-comparison-1',rows,provider_differences:providerDifferences,roi_review_queues:roiQueues,summary:{roi_count:loaded.cases.length,providers:providers.map(p=>p.id),results:rows.length,normalized:rows.filter(r=>r.status!=='failed').length,failures:rows.filter(r=>r.status==='failed').length,provider_pair_comparisons:providerDifferences.length,unified_review_bundles:roiQueues.reduce((n,q)=>n+q.items.length,0),unified_review_events:roiQueues.reduce((n,q)=>n+q.event_count,0),
  mock_calls:calls,cache_hits:hits,network_calls:0,ocr_calls:0,actual_api_cost_usd:0,estimates:costs,scenario_cap_usd:scenarioCapMicro/MICRO,
  forecast_complete:costs.estimated_total_usd!==null,content_confidence:null,CER:null,WER:null,auto_accept_enabled:false,independence:'No new OCR; all replay/mock results are not independent OCR evidence'}};
}
