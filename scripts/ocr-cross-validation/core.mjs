// Offline contracts around existing P0/P1/B1 and P2-A. Never inference or GT creation.
import assert from 'node:assert/strict';
import {stableStringify,validateSample,validateResult} from '../ocr-benchmark/core.mjs';
import {evaluateP2Model} from '../ocr-benchmark/p2a/metrics.mjs';
import {assessB1} from '../ocr-quality-gate/b1.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';
export const VERSION='ocr-cross-validation-b2-1';
export const digest=value=>sha(Buffer.from(stableStringify(value)));
export const PROVIDERS=Object.freeze({
 google:{credential_env:['GOOGLE_APPLICATION_CREDENTIALS'],model:'enterprise-document-ocr',transport:'NOT_IMPLEMENTED'},
 azure:{credential_env:['AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT','AZURE_DOCUMENT_INTELLIGENCE_KEY'],model:'prebuilt-layout',transport:'NOT_IMPLEMENTED'},
 openai:{credential_env:['OPENAI_API_KEY'],model:'gpt-5.4-mini-2026-03-17',transport:'NOT_IMPLEMENTED'}
});
export function unknownRights(){return {evaluate:'unknown',save:'unknown',train:'unknown',cloud_process:'unknown',redistribute:'unknown',evidence_refs:[],reviewed_by:null,reviewed_at:null};}
export function validateRights(r){
 assert(r&&['evaluate','save','train','cloud_process','redistribute'].every(k=>['allowed','denied','unknown'].includes(r[k])),'Explicit usage rights required');
 assert(Array.isArray(r.evidence_refs),'Rights evidence required');
 if(Object.values(r).includes('allowed'))assert(r.evidence_refs.length&&r.evidence_refs.every(x=>typeof x==='string'&&x.trim())&&r.reviewed_by?.trim()&&Number.isFinite(Date.parse(r.reviewed_at)),'Allowed rights require reviewed evidence');
 return r;
}
export function usageAllowed(r,purpose){validateRights(r);assert(['evaluate','save','train','cloud_process','redistribute'].includes(purpose));return r[purpose]==='allowed';}
export function bindingOf(c){
 validateSample(c.sample);assert(c.source_status==='resolved','Unresolved source');assert(c.id===c.sample.region_id&&/^[a-f0-9]{64}$/.test(c.fingerprint),'Source identity missing');
 assert(c.preview_ref?.path&&/^[a-f0-9]{64}$/.test(c.preview_ref.sha256),'Crop reference missing');
 const s=c.sample,b=s.bounding_box;assert(s.coordinate_space==='original_image_pixels'&&Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=0&&b[1]>=0&&b[2]>0&&b[3]>0&&b[0]+b[2]<=s.image_width&&b[1]+b[3]<=s.image_height,'Invalid ROI');
 return {source_id:s.source_id,material_id:s.material_id,page_id:s.page_id,region_id:c.id,image_sha256:s.image_sha256,image_path:s.image_path,scan_seq:s.scan_seq??null,printed_page:s.printed_page_label??null,page_verification:s.page_number_verification??'unverified',roi:[...b],image_size:[s.image_width,s.image_height],crop_ref:structuredClone(c.preview_ref),source_fingerprint:c.fingerprint,dataset_split:s.dataset_split};
}
export function makeRequest(c,provider,{modelVersion,config={},prompt='Transcribe only visible content; retain scientific symbols and unknowns.',rights=unknownRights(),providerRights=unknownRights()}={}){
 assert(Object.hasOwn(PROVIDERS,provider),'Unknown provider');assert(typeof modelVersion==='string'&&modelVersion.trim(),'Pin model/API version');validateRights(rights);validateRights(providerRights);
 assert(config&&typeof config==='object'&&!Array.isArray(config));
 // Credentials may only be supplied by a future transport's environment, never config.
 assert(!/"(?:api[_-]?key|password|token|authorization|secret)"\s*:/i.test(JSON.stringify(config)),'Credential in config');
 const source=bindingOf(c),base={format:VERSION,provider,model_version:modelVersion,config:structuredClone(config),prompt_digest:digest(prompt),source};
 return {...base,cache_key:digest(base),rights:structuredClone(rights),provider_rights:structuredClone(providerRights),mode:'offline_only',live_enabled:false};
}
export function validateRequest(req){
 const {cache_key,rights,provider_rights,mode,live_enabled,...base}=req;assert.equal(base.format,VERSION);assert(Object.hasOwn(PROVIDERS,base.provider));assert.equal(digest(base),cache_key,'Request/cache binding changed');validateRights(rights);validateRights(provider_rights);assert(mode==='offline_only'&&live_enabled===false,'Live requests disabled');return req;
}
export function assertSource(req,c){validateRequest(req);assert.deepEqual(req.source,bindingOf(c),'Result source/ROI mismatch');}
export function reviewState(record){
 if(!record)return 'machine-generated';
 if(record.review_status==='verified'&&record.is_ground_truth===true)return 'verified';
 return record.reviewer_id?.trim()?'human-reviewed':'machine-generated';
}
export function evaluateFromReview(loaded,c,model){
 loaded.verify();assert.equal(loaded.store.selected(c.id).fingerprint,c.fingerprint,'Review case mismatch');validateResult(model,c.sample);
 const record=loaded.store.latest(c.id),state=reviewState(record);
 let sample=c.sample,trusted=false;
 if(state==='verified'){
  const exported=loaded.store.benchmark(c.id);assert(exported.ground_truth?.is_ground_truth&&exported.review_status==='verified','Verified store export required');
  sample=exported.ground_truth.sample;assert.equal(sample.image_sha256,c.sample.image_sha256);assert.deepEqual(sample.bounding_box,c.sample.bounding_box);trusted=true;
 }
 const metrics=evaluateP2Model(sample,model,{realHumanVerified:trusted});
 const units=metrics.benchmark?.metrics?.content_units;
 let tableExact={status:'NOT_EVALUATED',value:null,reason:'Verified canonical table topology required'};
 const tables=sample.reference_structure?.tables,hyp=model.OCR_output.structure?.tables;
 if(trusted&&tables?.length&&Array.isArray(hyp)&&model.OCR_output.structure_alignment==='benchmark_canonical_ids'){
  const topology=t=>t.cells.map(cell=>[cell.row,cell.column,cell.row_span,cell.column_span].join(':')).sort();
  const correct=tables.filter(t=>{const found=hyp.find(h=>h.id===t.id);return found&&stableStringify(topology(t))===stableStringify(topology(found));}).length;
  tableExact={status:'EVALUATED',value:correct/tables.length,correct_tables:correct,reference_tables:tables.length,extra_tables:hyp.filter(h=>!tables.some(t=>t.id===h.id)).length,scope:'exact topology of declared ROI tables; text separately scored'};
 }
 return {validation_state:state,review_scope:state==='human-reviewed'?'draft/review activity; not independently confirmed text':state,review_revision:record?.revision??null,metrics,
  content_omission_rate:units?.reference_units?{status:'EVALUATED',value:units.missing/units.reference_units,missing:units.missing,reference_units:units.reference_units,scope:'explicit canonical content units only'}:{status:'NOT_EVALUATED',value:null,reason:'Verified canonical content units required'},
  table_exact_match:tableExact,model_output_is_ground_truth:false,confidence:null,calibration_status:'not_calibrated'};
}
export function compareCandidate(c,candidate){
 assert.equal(candidate.sample_id,c.id);assert.equal(candidate.image_sha256,c.sample.image_sha256);assert.equal(candidate.source_fingerprint,c.fingerprint);assert.deepEqual(candidate.roi,c.sample.bounding_box);
 const results=[];
 for(const local of c.engines){
  const input={...c,engines:[local,{id:candidate.provider,version:candidate.model_version,config:candidate.model.model_config,text:candidate.model.OCR_output.text,blocks:candidate.blocks,raw_ref:{path:'offline-candidate:'+candidate.raw_sha256,sha256:sha(Buffer.from(candidate.model.OCR_output.text))},result_ref:{path:'offline-candidate:'+candidate.raw_sha256,sha256:candidate.raw_sha256},layout_ref:null}]};
  const result=assessB1(input,{sourceVerified:true});results.push({pair:[local.id,candidate.provider],result});
 }
 // Pair-specific events stay distinct; no claim that two providers independently prove text.
 return {comparisons:results,issue_count:results.reduce((n,x)=>n+x.result.issues.length,0),deduplication_scope:'B1 within each pair; cross-pair semantic deduplication NOT_IMPLEMENTED',quality_route:results.some(x=>x.result.quality_route==='SOURCE_BLOCKED')?'SOURCE_BLOCKED':'HUMAN_REVIEW_REQUIRED',auto_accept_enabled:false};
}
export function learningRecord(c,{rights=unknownRights(),providerRights=unknownRights(),paidResults=[],comparisons=[],suggestions=[],review=null}={}){
 validateRights(rights);validateRights(providerRights);for(const p of paidResults){assert.equal(p.sample_id,c.id);assert.equal(p.image_sha256,c.sample.image_sha256);assert.equal(p.source_fingerprint,c.fingerprint);assert.deepEqual(p.roi,c.sample.bounding_box);}
 return {format:VERSION,source:bindingOf(c),local_ocr:structuredClone(c.engines),paid_ocr:structuredClone(paidResults),comparisons:structuredClone(comparisons),error_classification:comparisons.flatMap(x=>x.comparisons??[]).flatMap(x=>x.result?.issues??[]).map(i=>structuredClone(i)),
  correction_suggestions:suggestions.map(s=>{assert(s&&typeof s.before==='string'&&typeof s.after==='string'&&s.reason&&s.location);return {...structuredClone(s),status:'pending_human_review',auto_apply_allowed:false};}),
  prior_review_refs:structuredClone(c.prior_history??[]),human_review_ref:review?{revision:review.revision,annotation_digest:review.annotation_digest,review_status:review.review_status}:null,
  validation_state:reviewState(review),rights:structuredClone(rights),provider_rights:structuredClone(providerRights),confidence:null,calibration_status:'not_calibrated',training_eligible:false,
  training_note:'Eligibility requires independently verified annotation AND all source/provider permissions; never inferred from OCR or ownership.'};
}
export async function invokePaid(req,{approval=null}={}){
 validateRequest(req);assert(approval?.explicit===true&&approval?.approved_by?.trim()&&approval?.request_key===req.cache_key,'Explicit request-scoped approval required');
 assert(usageAllowed(req.rights,'cloud_process')&&usageAllowed(req.rights,'save')&&usageAllowed(req.rights,'evaluate')&&usageAllowed(req.provider_rights,'save')&&usageAllowed(req.provider_rights,'evaluate'),'Usage rights unresolved');
 throw Error('B2-1 offline only: paid transport NOT_IMPLEMENTED; no credentials read or network sent');
}
