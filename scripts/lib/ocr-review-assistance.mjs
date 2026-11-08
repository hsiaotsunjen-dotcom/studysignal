// Geometry-only suggestions. No recognition, inference service or correctness claim.
import {tableGeometry} from '../ocr-quality-gate/core.mjs';
import {sha} from './ocr-quality-io.mjs';import {stableStringify} from '../ocr-benchmark/core.mjs';
const hash=x=>sha(Buffer.from(stableStringify(x)));
export function tableProposal(c,engine,candidateSHA){
 if(c.sample.region_type!=='table'||!engine.blocks?.length)return null;
 const b=engine.blocks;if(b.some(x=>!Array.isArray(x.bbox)||x.bbox.length!==4||!x.bbox.every(Number.isFinite)||x.bbox[2]<=0||x.bbox[3]<=0))return null;
 const rows=tableGeometry(b).rows;if(!rows.length||rows.length>100)return null;
 const tolerance=c.sample.bounding_box[2]*.035,columns=[];
 for(const block of [...b].sort((x,y)=>x.bbox[0]-y.bbox[0])){const last=columns.at(-1);if(last&&block.bbox[0]-last.mean<tolerance){last.values.push(block.bbox[0]);last.mean=last.values.reduce((s,x)=>s+x,0)/last.values.length;}else columns.push({mean:block.bbox[0],values:[block.bbox[0]]});}
 if(columns.length>50)return null;
 const origin={algorithm:'ocr-box-grid-v1',engine_id:engine.id,candidate_sha256:candidateSHA,source_fingerprint:c.fingerprint};
 const cells=[];for(let r=0;r<rows.length;r++)for(let col=0;col<columns.length;col++){
  const blocks=rows[r].block_ids.map(id=>b.find(x=>x.id===id)).filter(x=>columns.map((z,i)=>({i,d:Math.abs(z.mean-x.bbox[0])})).sort((x,y)=>x.d-y.d||x.i-y.i)[0].i===col).sort((x,y)=>x.bbox[0]-y.bbox[0]);
  cells.push({row:r,column:col,row_span:1,column_span:1,text:blocks.map(x=>x.text).join(' '),uncertain:true,
   source_block_ids:blocks.map(x=>x.id),source_boxes:blocks.map(x=>x.bbox),ambiguity:blocks.length===1?'unverified_cell_assignment':blocks.length?'multiple_blocks_in_cell':'missing_ocr_candidate'});
 }
 const body={id:'ocr-table-'+engine.id,row_count:rows.length,column_count:columns.length,source_scope:'roi',cells,proposal_origin:origin};
 const proposal_id=hash(body);return {...body,proposal_origin:{...origin,proposal_id},status:'pending_human_review',
  limitations:['Rows and columns inferred from OCR boxes; not verified cells.','Missing text cannot be reconstructed.','Spans are not automatically inferred.']};
}
export function riskHints(c){
 const classify=(type='')=>type.includes('chinese')?'中文文字差異':type.includes('latin')||type.includes('terminology')?'英文與專有名詞':type.includes('table')?'表格結構':type.includes('scient')||type.includes('symbol')||type.includes('formula')?'化學式與上下標':type.includes('unmatched')||type.includes('completeness')||type.includes('edge')?'遺漏文字風險':'文字／位置差異';
 const hints=(c.quality?.issues??[]).map(i=>({id:i.issue_id,category:classify(i.type),message:i.type,severity:i.severity,bbox:i.original_bbox??c.sample.bounding_box,evidence:i.evidence,status:'pending_human_review'}));
 const numbers=c.engines.map(e=>({engine:e.id,tokens:e.text.match(/\d+(?:\.\d+)?\s*(?:mg|kg|g|mL|ml|L|mmHg|mm|nm|cm|mol|%)(?![A-Za-z])/gu)??[],numerals:e.text.match(/\b\d+(?:\.\d+)?\b/gu)??[]}));
 if(numbers.length===2&&JSON.stringify(numbers[0].tokens)!==JSON.stringify(numbers[1].tokens))hints.push({id:'number-unit-disagreement',category:'數字與單位',message:'兩引擎的數值／單位片段不同，須對照原圖',severity:'high',bbox:c.sample.bounding_box,evidence:numbers,status:'pending_human_review'});
 return hints;
}
