// P1 advisory classification. Never recognizes pixels, corrects text or verifies GT.
import assert from 'node:assert/strict';
import {VERSION as P0_VERSION} from './core.mjs';
import {formulaTokens} from '../lib/ocr-ai-formula-evidence.mjs';
import {stableStringify} from '../ocr-benchmark/core.mjs';
export const VERSION='block-omission-classification-p1-1';
const compact=s=>s.replace(/\s/gu,'');
const rank={low:0,medium:1,high:2,critical:3};
function classifyGroup(g,comparison){
 const l=g.left.text,r=g.right.text,paired=g.left.spans.length>0&&g.right.spans.length>0,hasText=!!compact(l+r),exact=l===r;
 const units=/\d+(?:\.\d+)?\s*(?:mg|kg|mL|ml|L|mmHg|mm|nm|cm|mol|%)(?![A-Za-z])/u.test(l+'\n'+r);
 const tokens=formulaTokens(l+'\n'+r),scientific=units||/[₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⇌↔→←±×÷]/u.test(l+r)||tokens.some(t=>/[0-9+−?]/u.test(t.original)||t.status==='parsed_limited_syntax'||t.reason==='opaque_biochemical_abbreviation')||comparison.quality_gate.region_type==='formula';
 const contentType=comparison.quality_gate.region_type,structure=['table','figure_text','caption','heading'].includes(contentType)||/^(?:第[一二三四五六七八九十\d]+章|[▲△Δ]?圖\s*\d+)/u.test(l)||/^(?:第[一二三四五六七八九十\d]+章|[▲△Δ■]?圖\s*\d+)/u.test(r);
 const ls=g.left.spans.map(s=>l.slice(s.start,s.end)),rs=g.right.spans.map(s=>r.slice(s.start,s.end));
 const permutation=paired&&ls.length>1&&rs.length>1&&!exact&&stableStringify([...ls].sort())===stableStringify([...rs].sort());
 const whitespaceOnly=paired&&!exact&&compact(l)===compact(r),boundarySensitive=whitespaceOnly&&(/[A-Za-z0-9]/.test(l+r)||scientific);
 const equivalent=paired&&g.alignment_status!=='AMBIGUOUS'&&!boundarySensitive&&(exact||whitespaceOnly)&&(ls.length!==rs.length||whitespaceOnly);
 const facets=[];if(!paired&&hasText)facets.push('single_engine_only');if(structure)facets.push('structure_or_label_context');if(scientific)facets.push('scientific_typography_context');if(units)facets.push('numeric_unit_context');if(paired&&!exact&&l.toLowerCase()===r.toLowerCase())facets.push('latin_case_difference');if(permutation)facets.push('block_sequence_permutation');if(equivalent)facets.push('segmentation_equivalent');if(boundarySensitive)facets.push('whitespace_boundary_sensitive');if(g.alignment_status==='AMBIGUOUS')facets.push('ambiguous_alignment');if(exact&&paired)facets.push('engine_agreement_not_verified');
 let category='undetermined';
 if(!paired&&hasText)category='missing_text_candidate';
 else if(permutation)category='position_or_order_candidate';
 else if(equivalent)category='segmentation_equivalent';
 else if(scientific)category='scientific_review';
 else if(structure)category='structure_or_label_candidate';
 const level=scientific||category==='missing_text_candidate'?'high':'medium';
 return {group_id:g.id,category,facets,risk_level:level,status:'pending_human_review',confirmed_missing:false,
  relation_status:equivalent?'COMPARISON_EQUIVALENCE_ONLY':'UNCONFIRMED',image_content_verified:false,auto_apply_allowed:false,
  source:{...comparison.source,region_id:comparison.region_id,group_id:g.id,bbox:g.bbox,coordinate_space:g.coordinate_space,bbox_format:g.bbox_format,engine_refs:comparison.engine_refs},
  evidence:{alignment_status:g.alignment_status,left:g.left,right:g.right,source_types:g.types,scientific_context_tokens:tokens,region_type:contentType,
   exact_text:exact,whitespace_only:whitespaceOnly,block_counts:[ls.length,rs.length],same_token_multiset_different_order:permutation},
  reason:category==='missing_text_candidate'?'Only one engine has a located hypothesis; omission versus false detection is NOT determined from pixels.':equivalent?'Source text is equivalent under the stated comparison rule; image correctness and completeness remain unverified.':'Context and differences are advisory; compare original image before correction.',
  suggested_action:scientific?'Check formula, charge, case, units and script positions against original pixels.':category==='missing_text_candidate'?'Inspect this original location for missing content or false detection.':'Review original image and source layout; do not infer missing text.'};
}
function family(type){if(type==='dual_engine_text_disagreement')return 'engine_difference_overview';if(/science|scientific/.test(type))return 'scientific_context';if(/reading_order/.test(type))return 'reading_order';if(/completeness/.test(type))return 'image_completeness';return type;}
export function classifyComparison(comparison){
 assert.equal(comparison.version,P0_VERSION,'Use current P0 output; preserve historical report separately');
 const before=stableStringify(comparison),groups=comparison.groups.map(g=>classifyGroup(g,comparison)),byGroup=new Map(groups.map(g=>[g.group_id,g]));assert.equal(byGroup.size,groups.length,'Duplicate group ID');
 const blockGroup=new Map();for(const g of comparison.groups)for(const side of ['left','right'])for(const b of g[side].spans){const k=g[side].engine+':'+b.block_id;assert(!blockGroup.has(k),'Source block assigned twice');blockGroup.set(k,g.id);}
 const raw_events={quality_gate:structuredClone(comparison.quality_gate.issues),review_items:structuredClone(comparison.review_items)},events=new Map();
 for(const [collection,items] of Object.entries(raw_events))for(const [index,raw] of items.entries()){
  const id=raw.issue_id??raw.id;assert(typeof id==='string'&&id.length,'Event ID required');const key=(raw.issue_id?'quality:':'review:')+id,{id:alias,...payload}=raw;
  if(events.has(key)){const e=events.get(key);assert.equal(stableStringify(e.payload),stableStringify(payload),'Conflicting duplicate event identity');e.raw_refs.push({collection,index});continue;}
  const ids=raw.group_id?[raw.group_id]:(raw.block_ids??[]).map(b=>blockGroup.get(raw.engine_id+':'+b)).filter(Boolean);for(const id of ids)assert(byGroup.has(id),'Unknown event group');
  events.set(key,{event_id:key,payload,raw_refs:[{collection,index}],group_ids:[...new Set(ids)].sort()});
 }
 const tasks=new Map(),context=[];
 const taskFor=(key,groupIDs=[],topic=null)=>{if(!tasks.has(key))tasks.set(key,{task_id:key,scope:groupIDs.length?'group':'page',group_ids:groupIDs,topic,event_ids:[],risk_level:groupIDs.length?byGroup.get(groupIDs[0]).risk_level:'medium',status:'pending_human_review',auto_apply_allowed:false});return tasks.get(key);};
 for(const g of comparison.groups)if(g.types.length)taskFor('group:'+g.id,[g.id]);
 for(const e of events.values()){
  if(e.payload.type==='dual_engine_text_disagreement'){
   // This whole-page diff is contextual evidence, not an extra localized error.
   e.owner_id='context:engine_difference_overview';context.push(e.event_id);continue;
  }
  const key=e.group_ids.length?'group:'+e.group_ids[0]:'page:'+family(e.payload.type),t=taskFor(key,e.group_ids,family(e.payload.type));
  t.group_ids=[...new Set([...t.group_ids,...e.group_ids])].sort();t.event_ids.push(e.event_id);e.owner_id=key;if((rank[e.payload.severity]??1)>rank[t.risk_level])t.risk_level=e.payload.severity;
 }
 for(const g of groups)g.event_ids=[...events.values()].filter(e=>e.group_ids.includes(g.group_id)).map(e=>e.event_id);
 const ledger=[...events.values()],queue=[...tasks.values()].sort((a,b)=>rank[b.risk_level]-rank[a.risk_level]||a.task_id.localeCompare(b.task_id));
 assert.equal(ledger.flatMap(e=>e.raw_refs).length,raw_events.quality_gate.length+raw_events.review_items.length,'Raw event lost');
 assert.equal(queue.flatMap(t=>t.event_ids).length+context.length,ledger.length,'Event ownership lost or duplicated');
 const counts={};for(const g of groups)counts[g.category]=(counts[g.category]??0)+1;
 assert.equal(stableStringify(comparison),before,'Input mutated');
 return structuredClone({version:VERSION,comparison_version:comparison.version,source:comparison.source,region_id:comparison.region_id,groups,raw_events,events:ledger,review_queue:queue,context_event_ids:context,
  summary:{groups:groups.length,classification_counts:counts,confirmed_missing:0,suspected_missing:counts.missing_text_candidate??0,comparison_equivalent_groups:counts.segmentation_equivalent??0,confirmed_image_false_alarms:null,
   pending_human_review:groups.length,raw_event_count:raw_events.quality_gate.length+raw_events.review_items.length,canonical_event_count:ledger.length,duplicate_event_aliases:ledger.reduce((s,e)=>s+e.raw_refs.length-1,0),
   before_review_items:comparison.review_items.length,after_review_tasks:queue.length,agreement_without_priority_task:groups.filter(g=>!queue.some(t=>t.group_ids.includes(g.group_id))).length},
  status:comparison.quality_gate.source_gate==='PASS'?'ADVISORY_ONLY':'BLOCKED',CER:null,WER:null,auto_apply_allowed:false,ground_truth_created:false,
  limitations:['No pixel or independently reviewed reference: true omissions and false detections remain unconfirmed.','Comparison equivalence is not image correctness or permission to skip human verification.','Context flags are not proven scientific or structural errors. Page-level event bundling retains distinct evidence.','Task counts are presentation units, not accuracy or measured labor savings.']});
}
