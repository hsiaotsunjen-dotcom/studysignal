// Pure, subject-independent advisory rules. Never OCR, correction, or approval.
import assert from 'node:assert/strict';
import {textEdits} from '../lib/ocr-ai-source-evidence.mjs';
import {scienceGuards} from '../lib/ocr-ai-science-guards.mjs';
import {formulaTokens,compareScientificText} from '../lib/ocr-ai-formula-evidence.mjs';
import {intersection,area} from '../lib/ocr-layout-prototype.mjs';
export const VERSION='quality-gate-prototype-1';
const rect=b=>({left:b[0],top:b[1],width:b[2],height:b[3]});
const compact=s=>s.replace(/\s/gu,'');
const hanCount=s=>[...s].filter(c=>/\p{Script=Han}/u.test(c)).length;
const valid=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>0&&b[3]>0;
const inside=(b,r)=>valid(b)&&b[0]>=r[0]&&b[1]>=r[1]&&b[0]+b[2]<=r[0]+r[2]+1e-6&&b[1]+b[3]<=r[1]+r[3]+1e-6;
const envelope=blocks=>{const l=Math.min(...blocks.map(b=>b.bbox[0])),t=Math.min(...blocks.map(b=>b.bbox[1]));return [l,t,Math.max(...blocks.map(b=>b.bbox[0]+b.bbox[2]))-l,Math.max(...blocks.map(b=>b.bbox[1]+b.bbox[3]))-t];};

// Rows are geometric hypotheses. No cell identities, merged cells or semantic GT.
export function tableGeometry(blocks){
 const rows=[];
 for(const b of [...blocks].sort((a,b)=>a.bbox[1]+a.bbox[3]/2-b.bbox[1]-b.bbox[3]/2||a.bbox[0]-b.bbox[0])){
  const cy=b.bbox[1]+b.bbox[3]/2;
  const row=rows.find(r=>Math.abs(cy-r.cy)<=.55*Math.min(b.bbox[3],r.height));
  if(row){row.blocks.push(b);row.cy=row.blocks.reduce((s,x)=>s+x.bbox[1]+x.bbox[3]/2,0)/row.blocks.length;row.height=Math.min(...row.blocks.map(x=>x.bbox[3]));}
  else rows.push({cy,height:b.bbox[3],blocks:[b]});
 }
 const originalIndex=new Map(blocks.map((b,i)=>[b.id,i]));
 const groups=rows.map((r,i)=>({row:i,block_ids:[...r.blocks].sort((a,b)=>a.bbox[0]-b.bbox[0]).map(b=>b.id),bbox:envelope(r.blocks)}));
 const candidate=groups.flatMap(r=>r.block_ids),inversions=[];
 for(let i=0;i<candidate.length;i++)for(let j=i+1;j<candidate.length;j++)if(originalIndex.get(candidate[i])>originalIndex.get(candidate[j]))inversions.push([candidate[i],candidate[j]]);
 const spanning=[];
 for(const b of blocks)for(const g of groups){if(g.block_ids.length<2||g.block_ids.includes(b.id))continue;
  const cs=g.block_ids.map(id=>blocks.find(x=>x.id===id)).filter(x=>{const a=b.bbox,d=x.bbox;return Math.max(0,Math.min(a[0]+a[2],d[0]+d[2])-Math.max(a[0],d[0]))/d[2]>.6;});
  if(cs.length>1)spanning.push({axis:'columns',block_id:b.id,peer_row:g.row,peer_block_ids:cs.map(x=>x.id)});
 }
 for(const b of blocks){
  const peerRows=groups.filter(g=>!g.block_ids.includes(b.id)).filter(g=>g.block_ids.some(id=>{
   const d=blocks.find(x=>x.id===id).bbox,a=b.bbox;
   const vertical=Math.max(0,Math.min(a[1]+a[3],d[1]+d[3])-Math.max(a[1],d[1]));
   const horizontal=Math.max(0,Math.min(a[0]+a[2],d[0]+d[2])-Math.max(a[0],d[0]));
   return vertical/d[3]>.6&&horizontal/Math.min(a[2],d[2])>.6;
  }));
  if(peerRows.length>1)spanning.push({axis:'rows',block_id:b.id,peer_rows:peerRows.map(g=>g.row)});
 }
 return {rows:groups,candidate_reading_order:candidate,inversions,spanning_candidates:spanning,status:'geometric_hypothesis_only',cells_verified:false};
}

export function assessRegion(input){
 assert(input&&typeof input.region_id==='string'&&valid(input.roi));
 assert(Array.isArray(input.engines)&&input.engines.length===2);
 assert(new Set(input.engines.map(e=>e.id)).size===2,'Duplicate engine IDs');
 for(const e of input.engines){assert(typeof e.text==='string'&&Array.isArray(e.blocks));assert(new Set(e.blocks.map(b=>b.id)).size===e.blocks.length,'Duplicate block IDs');for(const b of e.blocks)assert(typeof b.text==='string');}
 const issues=[],checks=[],tables=[];
 const add=(type,severity,evidence,action,{engine=null,blocks=[],certainty='heuristic'}={})=>{
  const e=engine?input.engines.find(e=>e.id===engine):null,selected=e?.blocks.filter(b=>blocks.includes(b.id)&&valid(b.bbox))??[];
  issues.push({issue_id:`${input.region_id}:q${String(issues.length+1).padStart(3,'0')}`,type,severity,certainty,
   evidence,engine_id:engine,block_ids:blocks,original_bbox:selected.length?envelope(selected):input.roi,
   source:{...input.source,region_id:input.region_id,roi:input.roi,coordinate_space:'original_image_pixels',bbox_format:'xywh'},
   suggested_action:action,status:'pending_human_review',auto_apply_allowed:false});
 };
 if(input.source?.integrity_verified!==true)add('source_integrity_unverified','critical',{},'Stop processing; verify source SHA and version bindings.',{certainty:'deterministic'});
 const good=new Map();
 for(const e of input.engines){
  const bad=e.blocks.filter(b=>!inside(b.bbox,input.roi));good.set(e.id,e.blocks.filter(b=>inside(b.bbox,input.roi)));
  if(bad.length)add('invalid_coordinates','critical',{block_ids:bad.map(b=>b.id)},'Reject invalid coordinates; inspect adapter and original artifacts.',{engine:e.id,certainty:'deterministic'});
  checks.push({engine_id:e.id,check:'coordinate_bounds',status:bad.length?'FAIL':'PASS',scope:'geometry only'});
  const invalid=[...e.text.matchAll(/\ufffd|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu)].map(m=>({offset:m.index,text:m[0]}));
  if(invalid.length)add('abnormal_characters','high',{spans:invalid},'Compare original pixels; do not invent replacement text.',{engine:e.id,certainty:'deterministic'});
  checks.push({engine_id:e.id,check:'invalid_codepoints',status:invalid.length?'FAIL':'PASS',scope:'does not detect valid but wrong Chinese characters'});
  if(compact(e.text)&&!e.blocks.length)add('text_without_locations','high',{},'Recover saved coordinates; human review if unavailable.',{engine:e.id});
  if(!compact(e.text)&&e.blocks.some(b=>compact(b.text)))add('text_layout_inconsistent','high',{},'Inspect raw/box export without replacing either.',{engine:e.id});
  if(compact(e.text)!==compact(e.blocks.map(b=>b.text).join('')))add('block_text_sequence_mismatch','high',{scope:'same-engine nonwhitespace consistency'},'Inspect export and segmentation; this is not image-level completeness.',{engine:e.id});
  const edge=good.get(e.id).filter(b=>b.bbox[0]-input.roi[0]<.5||b.bbox[1]-input.roi[1]<.5||input.roi[0]+input.roi[2]-b.bbox[0]-b.bbox[2]<.5||input.roi[1]+input.roi[3]-b.bbox[1]-b.bbox[3]<.5);
  if(edge.length)add('text_touches_roi_edge','medium',{tolerance_original_pixels:.5,scope:'may be legitimate tight crop or truncated text'},'Review crop boundary without expanding scope or changing source.',{engine:e.id,blocks:edge.map(b=>b.id)});
  const overlaps=[];const bs=good.get(e.id);
  for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++)if(intersection(rect(bs[i].bbox),rect(bs[j].bbox))/Math.min(area(rect(bs[i].bbox)),area(rect(bs[j].bbox)))>.8)overlaps.push([bs[i].id,bs[j].id]);
  if(overlaps.length)add('overlapping_text_blocks','medium',{pairs:overlaps,scope:'possible duplicate/fragmented segmentation, not proven repeated content'},'Compare overlapping source boxes; preserve all tokens pending review.',{engine:e.id,blocks:overlaps.flat()});
  const science=formulaTokens(e.text),scientific=input.region_type==='formula'||science.some(t=>/[0-9₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻+−]/u.test(t.original));
  if(scientific)add('scientific_typography_unverified','high',{tokens:science,character_geometry_available:false},'Verify charge, subscripts, superscripts, numbers and units against pixels. Syntax is not evidence.',{engine:e.id});
  if(input.region_type==='table'){
   const geom=tableGeometry(good.get(e.id));tables.push({engine_id:e.id,...geom});
   if(geom.inversions.length)add('table_reading_order_risk','high',{inversions:geom.inversions,candidate_reading_order:geom.candidate_reading_order,rows:geom.rows},'Review row/column relations; preserve engine sequence and do not automatically reorder.',{engine:e.id,blocks:geom.inversions.flat()});
   if(geom.spanning_candidates.length)add('table_spanning_or_merge_risk','medium',{candidates:geom.spanning_candidates},'Verify legitimate spanning cells versus merged OCR lines.',{engine:e.id});
   add('table_cell_structure_unverified','medium',{row_count_candidate:geom.rows.length,blocks_per_row:geom.rows.map(r=>r.block_ids.length),merged_cells:'NOT_EVALUATED'},'Annotate cell relations/reading order; word boxes alone cannot verify tables.',{engine:e.id,certainty:'undetermined'});
  }
 }
 const [a,b]=input.engines,diff=textEdits(a.text,b.text),science=compareScientificText(a.text,b.text);
 if(diff.status!=='computed'||diff.distance>0){
  add('dual_engine_text_disagreement','medium',{difference:diff,engine_ids:[a.id,b.id]},'Compare both hypotheses with source pixels. Neither engine is the reference.');
  const counts=[hanCount(a.text),hanCount(b.text)];
  if(Math.max(...counts)>=2&&Math.min(...counts)<Math.max(...counts)*.5)add('suspected_chinese_omission','high',{han_counts:counts,engine_ids:[a.id,b.id],scope:'could be missing Chinese or false Chinese insertion'},'Review missing-script spans; do not copy the more verbose engine automatically.');
  const alias=s=>compact(s).replace(/[lI1|]/g,'!').replace(/[O0]/g,'@');
  if(alias(a.text)===alias(b.text)&&compact(a.text)!==compact(b.text))add('latin_digit_confusion','high',{before:a.text,after:b.text},'Check I/l/1 and O/0 using original pixels; no automatic substitution.');
  for(const risk of scienceGuards({before:a.text,after:b.text,category:input.region_type==='table'?'table':input.region_type==='formula'?'scientific_terms':'text'})){
   add('science_guard:'+risk.code,risk.severity==='potential_error'?'high':'medium',risk.evidence,'Review engine disagreement against source; preserve case and script structure.');
  }
 }
 const spatial=[];
 for(const e of input.engines){
  const other=input.engines.find(x=>x.id!==e.id),candidates=[];
  for(const block of good.get(e.id)){
   const matches=good.get(other.id).map(peer=>({block_id:peer.id,overlap_fraction:intersection(rect(block.bbox),rect(peer.bbox))/area(rect(block.bbox))})).filter(m=>m.overlap_fraction>.1);
   candidates.push({block_id:block.id,peer_candidates:matches});
   if(!matches.length)add('unmatched_ocr_block','medium',{peer_engine:other.id,scope:'overlap candidate only; word and line granularities differ'},'Inspect unmatched original pixels; may be omission or false detection.',{engine:e.id,blocks:[block.id]});
  }spatial.push({engine_id:e.id,peer_engine:other.id,candidates,scope:'bounding-box overlap, not glyph or semantic alignment'});
 }
 // Agreement cannot expose a shared omission; explicitly retain this blind spot.
 add('image_content_completeness_undetermined','medium',{engines_agree:a.text===b.text,pixel_text_reference_available:false},'Use independently human-checked samples to evaluate common omissions and true correctness.',{certainty:'undetermined'});
 checks.push(...['image_text_completeness','terminology_correctness','unit_value_correctness','formula_image_fidelity','table_semantic_structure'].map(check=>({check,status:'NOT_EVALUATED',reason:'No independent human-confirmed reference'})));
 const critical=issues.some(i=>i.severity==='critical');
 return {version:VERSION,region_id:input.region_id,source:input.source,roi:input.roi,region_type:input.region_type,
  source_gate:critical?'FAIL':'PASS',content_gate:critical?'FAIL':'NEEDS_REVIEW',annotation_status:'pending_human_review',
  quality_score:null,CER:null,WER:null,false_positive_rate:null,miss_rate:null,auto_apply_allowed:false,
  engine_inputs:input.engines,checks,issues,dual_engine_difference:diff,scientific_comparison:science,spatial_candidates:spatial,table_candidates:tables,
  limitations:['Heuristics are uncalibrated; findings are not confirmed OCR errors.','No image semantic recognition or cell/polygon ground truth.','Shared engine mistakes cannot be excluded.','No corrections, OCR, model calls or human confirmations are produced.']};
}
