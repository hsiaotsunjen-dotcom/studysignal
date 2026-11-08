// B1 risk routing only: no OCR, repair, scheduler, filesystem or GT mutation.
import {alignDifferences,VERSION as P0_VERSION} from '../ocr-multi-engine-diff/core.mjs';
import {classifyComparison,VERSION as P1_VERSION} from '../ocr-multi-engine-diff/p1.mjs';
import {formulaTokens} from '../lib/ocr-ai-formula-evidence.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';import {stableStringify} from '../ocr-benchmark/core.mjs';
export const VERSION='p2b-b1-risk-routing-1';
const rank={low:0,medium:1,high:2,critical:3},compact=s=>s.replace(/\s/gu,'');
const same=(a,b)=>stableStringify(a)===stableStringify(b);
const validBox=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[0]>=0&&b[1]>=0&&b[2]>0&&b[3]>0;
export function rawRelation(a,b){
 const english=s=>s.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)??[],numbers=s=>s.match(/[0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu)??[],science=s=>formulaTokens(s).map(t=>t.original),lines=s=>s.trim()?s.trim().split(/\r?\n/).length:0;
 return {exact:a===b,compact_equal:compact(a)===compact(b),english_tokens_equal:same(english(a),english(b)),numeric_tokens_equal:same(numbers(a),numbers(b)),scientific_tokens_equal:same(science(a),science(b)),line_counts_equal:lines(a)===lines(b),
  safe_comparison_equivalence:compact(a)===compact(b)&&same(english(a),english(b))&&same(numbers(a),numbers(b))&&same(science(a),science(b))&&lines(a)===lines(b),scope:'comparison representation only; never image correctness'};
}
function category(type,categories=[]){
 if(type==='source_binding_failure'||type==='invalid_coordinates'||type==='source_integrity_unverified')return 'source_alignment';
 if(type==='abnormal_characters')return 'abnormal_characters';
 if(/unmatched|omission|text_without_locations/.test(type)||categories.includes('unmatched_region'))return 'text_missing';
 if(/table/.test(type))return 'table_structure';
 if(/reading_order|line_structure/.test(type))return 'reading_order';
 if(/text_layout|block_text_sequence|overlapping/.test(type)||categories.includes('ambiguous_many_to_many_alignment'))return 'source_alignment';
 if(/scientific|science_guard/.test(type)||categories.some(t=>t.startsWith('science:')))return 'scientific_symbols';
 if(/touches_roi_edge/.test(type))return 'boundary_context';
 if(/completeness/.test(type))return 'unobserved_content';
 return 'text_difference';
}
export function assessB1(c,{sourceVerified=false}={}){
 const before=stableStringify(c),sample=c.sample??{},bbox=validBox(sample.bounding_box)?sample.bounding_box:null;
 const source={sample_id:c.id,page_id:sample.page_id??null,scan_seq:sample.scan_seq??null,printed_page:sample.printed_page_label??null,page_number_verification:sample.page_number_verification??'unverified',image_sha256:sample.image_sha256??null,image_path:sample.image_path??null,source_fingerprint:c.fingerprint??null,roi:bbox,coordinate_space:'original_image_pixels',bbox_format:'xywh',engine_refs:(c.engines??[]).map(e=>({engine_id:e.id,version:e.version,config:e.config,raw_ref:e.raw_ref??null,result_ref:e.result_ref??null,layout_ref:e.layout_ref??null,raw_span:e.raw_span??null}))};
 const issues=new Map();const add=(key,type,level,certainty,location,reason,evidence,action,role='exception',eventID=null)=>{
  if(!issues.has(key))issues.set(key,{issue_id:key,type,severity:level,certainty,location:{bbox:validBox(location)?location:null,coordinate_space:'original_image_pixels',bbox_format:'xywh',scope:'source block envelope or ROI; not glyph-level localization'},reason,evidence:[],suggested_action:action,role,source,event_ids:[],status:'pending_human_review',auto_apply_allowed:false});
  const issue=issues.get(key);issue.evidence.push({...evidence,b1_role:role});if(eventID&&!issue.event_ids.includes(eventID))issue.event_ids.push(eventID);if(rank[level]>rank[issue.severity])issue.severity=level;
  if(role==='exception'&&issue.role!=='exception'){issue.role=role;issue.reason=reason;issue.suggested_action=action;}
 };
 let p0=null,p1=null,relation=null,sourceError=null;
 try{
  if(!sourceVerified)throw Error('Source artifact verification required');if(c.source_status!=='resolved')throw Error('Source unresolved');if(c.id!==sample.region_id)throw Error('ROI identity mismatch');if(!/^[a-f0-9]{64}$/.test(sample.image_sha256??'')||!bbox)throw Error('Image SHA or ROI missing');if(sample.coordinate_space!=='original_image_pixels'||!Number.isInteger(sample.image_width)||!Number.isInteger(sample.image_height)||sample.image_width<=0||sample.image_height<=0||bbox[0]+bbox[2]>sample.image_width||bbox[1]+bbox[3]>sample.image_height)throw Error('Image dimensions or coordinate space mismatch');
  if(c.engines?.length!==2)throw Error('Two registered engines required');for(const e of c.engines){if(typeof e.text!=='string'||!e.raw_ref||sha(Buffer.from(e.text))!==e.raw_ref.sha256)throw Error('OCR text/ref SHA mismatch');}
  p0=alignDifferences({region_id:c.id,region_type:sample.region_type,roi:bbox,source:{...source,integrity_verified:true},engines:c.engines});p1=classifyComparison(p0);relation=rawRelation(c.engines[0].text,c.engines[1].text);
 }catch(e){sourceError=e.message;add(c.id+':source','source_alignment','critical','deterministic_binding_failure',bbox,'Source validation failed; no content judgment is permitted.',{error:e.message},'Inspect source identity, SHA and coordinates; do not OCR or repair an unknown source.');}
 const safeRepresentation=!!p0&&p0.groups.length===1&&p0.groups[0].alignment_status==='GEOMETRIC_CANDIDATE'&&relation?.safe_comparison_equivalence;
 if(p1)for(const e of p1.events){const raw=e.payload,type=category(raw.type,raw.categories),locations=e.group_ids.map(id=>p0.groups.find(g=>g.id===id)?.bbox).filter(Boolean),where=locations[0]??raw.original_bbox??raw.bbox??bbox;
  let role=['boundary_context','unobserved_content'].includes(type)?'context':'exception';
  if(raw.type==='dual_engine_text_disagreement'&&p0.groups.some(g=>g.types.length))role='context';
  if(raw.type==='suspected_chinese_omission'&&p0.groups.some(g=>g.alignment_status==='UNMATCHED'))role='context';
  if(safeRepresentation&&(raw.type==='localized_engine_difference'||raw.type==='dual_engine_text_disagreement'||/^science_guard:/.test(raw.type)))role='comparison_relation';
  const scope=p0.groups.length===1?'roi':e.group_ids.length?e.group_ids.join('|'):'roi',key=c.id+':'+scope+':'+(role==='comparison_relation'?'representation':type);
  const level=type==='source_alignment'&&p0.quality_gate.source_gate==='FAIL'?'critical':type==='scientific_symbols'||type==='table_structure'||type==='text_missing'?'high':raw.severity??'medium';
  add(key,role==='comparison_relation'?'comparison_representation':type,level,raw.certainty??'uncalibrated_heuristic',where,
   role==='comparison_relation'?'Saved raw hypotheses have the same comparison representation under explicit token/line checks; this is not verified image text.':type==='text_missing'?'One-sided located text or omission risk; false detection and true omission cannot be separated without image evidence.':type==='boundary_context'?'A source box touches the ROI edge; tight crops can cause this without any text truncation.':type==='unobserved_content'?'Both engines can share errors or omit the same content.':raw.type,
   {event_type:raw.type,group_ids:e.group_ids,payload:raw,raw_refs:e.raw_refs},role==='exception'?'Compare original ROI and both hypotheses; retain uncertainty, do not automatically replace text.':'Retain evidence and include this scope in human sampling; do not mark verified.',role,e.event_id);
 }
 if(['caption','figure_text','table'].includes(sample.region_type)){const type=sample.region_type==='table'?'table_structure':'image_labels';add(c.id+':roi:'+type,type,'high','undetermined',bbox,'Text boxes cannot verify figure associations, label coverage or table semantics.',{region_type:sample.region_type,scope_note:c.definition?.scope_note??null},'Review declared structure scope against original image; no inferred graph or cell truth.');}
 if(c.engines?.some(e=>e.execution_failed===true))add(c.id+':engine-failure','execution_failure','high','explicit_execution_record',bbox,'An engine records a failed execution.',{engines:c.engines.filter(e=>e.execution_failed).map(e=>e.id)},'Investigate execution record; B1 does not initiate a retry.');
 if(p0&&c.engines.every(e=>!compact(e.text)))add(c.id+':empty-text','text_missing','high','undetermined',bbox,'Both engines returned empty text; a truly blank image has not been independently confirmed.',{engine_ids:c.engines.map(e=>e.id)},'Inspect original ROI; do not infer absence of content from empty agreeing OCR.');
 const all=[...issues.values()],exceptions=all.filter(i=>i.role==='exception'),blocked=!!sourceError||p0?.quality_gate.source_gate==='FAIL';
 const hardHuman=exceptions.some(i=>['text_missing','scientific_symbols','table_structure','image_labels','reading_order'].includes(i.type)||i.evidence.some(x=>x.payload?.categories?.includes('ambiguous_many_to_many_alignment')));
 const retryObserved=exceptions.some(i=>['abnormal_characters','execution_failure'].includes(i.type));
 const route=blocked?'SOURCE_BLOCKED':hardHuman?'HUMAN_REVIEW_REQUIRED':retryObserved?'RETRY_RECOMMENDED':exceptions.length?'HUMAN_REVIEW_REQUIRED':'SAMPLING_CANDIDATE';
 const blocks=p0?.groups.flatMap(g=>[...g.left.spans,...g.right.spans])??[],unmatched=p0?.groups.filter(g=>g.alignment_status==='UNMATCHED').flatMap(g=>[...g.left.spans,...g.right.spans]).length??0;
 const result={version:VERSION,dependencies:{p0:P0_VERSION,p1:P1_VERSION},sample_id:c.id,source,source_gate:blocked?'FAIL':'PASS',quality_route:route,
  risk_level:blocked?'critical':exceptions.reduce((level,i)=>rank[i.severity]>rank[level]?i.severity:level,'low'),calibration_status:'not_calibrated',content_confidence:null,accuracy:null,CER:null,WER:null,
  alignment_observation:{matched_block_fraction:blocks.length?(blocks.length-unmatched)/blocks.length:null,total_source_blocks:blocks.length,unmatched_source_blocks:unmatched,scope:'geometric matching only; not recognition confidence'},raw_relation:relation,issues:all,
  p0_comparison:p0,p1_classification:p1,event_coverage:{canonical_events:p1?.events.length??0,linked_events:new Set(all.flatMap(i=>i.event_ids)).size},
  automatic_actions:['source_binding_check','shared_geometric_alignment','risk_classification','event_bundling'],text_modified:false,ground_truth_created:false,auto_accept_enabled:false,auto_pass_rate:null,retry_executed:false,
  cross_model_verification:{status:'INTERFACE_RESERVED_NOT_IMPLEMENTED',required_evidence:['image_sha256','ROI','engine_version','raw_result_reference','independence_description'],agreement_is_truth:false},
  limitations:['B1 routes risks, never repairs or executes OCR.','Sampling is a review candidate, not content acceptance or Ground Truth.','No calibrated confidence, absolute completeness, pixel script or graph verification.','Batch iteration is supported; thousand-page throughput and human labor reduction are not measured.']};
 if(result.quality_route==='SAMPLING_CANDIDATE')result.risk_level='unassessed';
 if(stableStringify(c)!==before)throw Error('B1 mutated input');return structuredClone(result);
}
export async function* assessB1Batch(cases,{sourceVerified=false}={}){const ids=new Set();for await(const c of cases){if(ids.has(c.id))throw Error('Duplicate ROI in batch');ids.add(c.id);yield assessB1(c,{sourceVerified});}}
