// Advisory geometry alignment only. No engine, network, annotation or correction writes.
import assert from 'node:assert/strict';
import {assessRegion,tableGeometry} from '../ocr-quality-gate/core.mjs';
import {textEdits} from '../lib/ocr-ai-source-evidence.mjs';
import {scienceGuards} from '../lib/ocr-ai-science-guards.mjs';
export const VERSION='multi-engine-difference-1';
const compact=s=>s.replace(/\s/gu,'');
const valid=b=>Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)&&b[2]>0&&b[3]>0;
const area=b=>b[2]*b[3];
const intersection=(a,b)=>Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
const envelope=bs=>{const x=Math.min(...bs.map(b=>b.bbox[0])),y=Math.min(...bs.map(b=>b.bbox[1]));return [x,y,Math.max(...bs.map(b=>b.bbox[0]+b.bbox[2]))-x,Math.max(...bs.map(b=>b.bbox[1]+b.bbox[3]))-y];};
function ordered(bs){const ids=tableGeometry(bs).candidate_reading_order;return ids.map(id=>bs.find(b=>b.id===id));}
function sequence(bs){let offset=0;const spans=bs.map(b=>{const s={block_id:b.id,start:offset,end:offset+b.text.length,bbox:b.bbox,polygon:b.polygon??null};offset=s.end;return s;});return {text:bs.map(b=>b.text).join(''),spans};}
function locate(s,start,end){let bs=s.spans.filter(b=>b.start<end&&b.end>start);const boundary=start===end;if(boundary)bs=s.spans.filter(b=>b.start<=start&&b.end>=start);return {offset_unit:'UTF-16',start,end,blocks:bs,scope:boundary?'adjacent_block_anchor_not_missing_glyph_position':'overlapping_source_blocks_not_glyph_coordinates'};}
export function alignDifferences(input){
 const gate=assessRegion(input); // reuse existing validation, science, table/order and shared-error guards
 const base={version:VERSION,region_id:input.region_id,page_id:input.source.page_id,roi:input.roi,source:input.source,engine_refs:input.engines.map(e=>({id:e.id,version:e.version,config:e.config,raw_ref:e.raw_ref,result_ref:e.result_ref,layout_ref:e.layout_ref})),status:'pending_human_review',auto_apply_allowed:false,CER:null,WER:null,quality_gate:gate};
 if(gate.source_gate!=='PASS')return {...base,alignment_status:'BLOCKED',groups:[],review_items:[{id:input.region_id+':blocked',type:'source_or_coordinates_invalid',status:'pending_human_review',auto_apply_allowed:false}]};
 const [a,b]=input.engines,n=a.blocks.length,all=[...a.blocks,...b.blocks],edges=all.map(()=>[]);
 for(let i=0;i<n;i++)for(let j=0;j<b.blocks.length;j++){
  // No text-similarity matching: repeated terms must not link disjoint image locations.
  const x=a.blocks[i].bbox,y=b.blocks[j].bbox;
  if(intersection(x,y)/Math.min(area(x),area(y))>=.15){edges[i].push(n+j);edges[n+j].push(i);}
 }
 const seen=new Set(),groups=[];
 for(let i=0;i<all.length;i++){if(seen.has(i))continue;const todo=[i],members=[];seen.add(i);while(todo.length){const k=todo.pop();members.push(k);for(const p of edges[k])if(!seen.has(p)){seen.add(p);todo.push(p);}}
  const left=ordered(members.filter(k=>k<n).map(k=>all[k])),right=ordered(members.filter(k=>k>=n).map(k=>all[k]));
  const l=sequence(left),r=sequence(right),ambiguous=left.length>1&&right.length>1;
  const difference=textEdits(l.text,r.text),types=[];
  if(!left.length||!right.length)types.push('unmatched_region');
  if(ambiguous)types.push('ambiguous_many_to_many_alignment');
  if(l.text!==r.text&&compact(l.text)===compact(r.text))types.push('whitespace_or_segmentation_difference');
  else if(l.text!==r.text){types.push('text_difference');if(/\p{Script=Han}/u.test(l.text+r.text))types.push('chinese_difference');if(/[A-Za-z]/.test(l.text+r.text))types.push('latin_case_or_term_difference');if(/[0-9]/.test(l.text+r.text))types.push('number_or_unit_difference');}
  for(const risk of scienceGuards({before:l.text,after:r.text,category:input.region_type==='formula'?'scientific_terms':input.region_type}))types.push('science:'+risk.code);
  groups.push({id:input.region_id+':g'+String(groups.length+1).padStart(3,'0'),bbox:envelope(members.map(k=>all[k])),alignment_status:!left.length||!right.length?'UNMATCHED':ambiguous?'AMBIGUOUS':'GEOMETRIC_CANDIDATE',coordinate_space:'original_image_pixels',bbox_format:'xywh',left:{engine:a.id,...l},right:{engine:b.id,...r},types:[...new Set(types)],difference:{...difference,localized_edits:difference.edits?.map(e=>({...e,left_location:locate(l,e.beforeStart,e.beforeEnd),right_location:locate(r,e.afterStart,e.afterEnd)}))??null},status:'pending_human_review',image_content_verified:false});
 }
 const review_items=groups.filter(g=>g.types.length).map(g=>({id:g.id,type:'localized_engine_difference',categories:g.types,bbox:g.bbox,group_id:g.id,status:'pending_human_review',severity:g.types.some(t=>t.startsWith('science:'))?'high':'medium',action:'Compare both hypotheses at original image coordinates; do not choose an engine automatically.',auto_apply_allowed:false}));
 for(const issue of gate.issues)if(!['dual_engine_text_disagreement','unmatched_ocr_block'].includes(issue.type))review_items.push({...issue,id:issue.issue_id});
 const reading_order=input.engines.map(e=>({engine_id:e.id,original_order:e.blocks.map(b=>b.id),...tableGeometry(e.blocks),scope:'geometric row-major hypothesis; not confirmed semantic order'}));
 for(const order of reading_order)if(order.inversions.length&&input.region_type!=='table')review_items.push({id:input.region_id+':order:'+order.engine_id,type:'reading_order_risk',engine_id:order.engine_id,evidence:order,bbox:input.roi,status:'pending_human_review',severity:'medium',action:'Compare engine order with original page; row-major order may be invalid for complex layouts.',auto_apply_allowed:false});
 const tables=gate.table_candidates;
 if(tables.length===2&&JSON.stringify(tables[0].rows.map(r=>r.block_ids.length))!==JSON.stringify(tables[1].rows.map(r=>r.block_ids.length)))review_items.push({id:input.region_id+':table-partition',type:'table_partition_disagreement',evidence:tables.map(t=>({engine:t.engine_id,rows:t.rows.length,blocks_per_row:t.rows.map(r=>r.block_ids.length)})),bbox:input.roi,status:'pending_human_review',severity:'high',action:'Verify cell boundaries and merged cells; word/line segmentation differences are not confirmed table errors.',auto_apply_allowed:false});
 assert(groups.flatMap(g=>g.left.spans).length===a.blocks.length&&groups.flatMap(g=>g.right.spans).length===b.blocks.length,'Block loss');
 return {...base,alignment_status:'ADVISORY_ONLY',groups,review_items,reading_order,limitations:['Spatial overlap and row grouping are uncalibrated hypotheses, not semantic or glyph alignment.','One-to-many groups preserve every original block. Many-to-many groups require manual review.','Agreement cannot reveal shared errors or omissions. No corrections or verified annotations are created.','No image-only semantic recognition, table truth or character baseline analysis; structural accuracy NOT_EVALUATED.']};
}
