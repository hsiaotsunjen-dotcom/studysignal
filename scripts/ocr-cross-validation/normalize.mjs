// Offline response normalizers; no SDK, key access, OCR, or network transport.
import assert from 'node:assert/strict';
import {assertSource,validateRequest,digest,usageAllowed} from './core.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';
export const NORMALIZER_VERSION='ocr-b2-2-normalize-1';
const provided=(o,key)=>Object.hasOwn(o,key)?'reported':'not_reported';
const array=x=>{assert(Array.isArray(x),'Expected array');return x;};
const string=x=>{assert(typeof x==='string','Expected string');return x;};

export function anchoredText(text,anchor,indexUnit='codepoint'){
 if(typeof anchor?.content==='string'&&!anchor.textSegments?.length)return anchor.content;
 assert(anchor&&Array.isArray(anchor.textSegments),'Text anchor missing');
 const units=indexUnit==='codepoint'?Array.from(text):indexUnit==='utf16'?text:indexUnit==='utf8_byte'?Buffer.from(text):null;
 assert(units,'Explicit text offset unit required');
 const parts=anchor.textSegments.map(s=>{const start=Number(s.startIndex??0),end=Number(s.endIndex);assert(Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&end>=start&&end<=units.length,'Unsupported shard or invalid text anchor');const part=units.slice(start,end);if(indexUnit==='utf8_byte')return new TextDecoder('utf-8',{fatal:true}).decode(part);return Array.isArray(part)?part.join(''):part;});
 const value=parts.join('');if(typeof anchor.content==='string')assert.equal(value,anchor.content,'Anchor content differs from offsets');return value;
}
function context(source,warnings){
 function geometry(polygon,dimensions,unit,evidence,locator){
  const unknown=reason=>{warnings.push({type:'position_unresolved',reason,locator,severity:'high'});return {bbox:null,polygon:null,native_polygon:polygon??null,native_unit:unit??null,position_evidence:evidence};};
  if(!polygon)return unknown('No reported position');
  if(!Array.isArray(polygon)||polygon.length<3)return unknown('Invalid native polygon');
  const [rx,ry,rw,rh]=source.roi;
  const [width,height]=unit==='normalized'?[1,1]:dimensions??[];
  if(!(width>0&&height>0))return unknown('Page dimensions missing');
  if(!['normalized','pixel','inch'].includes(unit))return unknown('Unsupported native coordinate unit');
  if(unit!=='normalized'&&Math.abs((width/height)/(rw/rh)-1)>0.01)return unknown('Native page aspect differs from bound crop; no guessed transform');
  if(polygon.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[1]<0||p[0]>width||p[1]>height))return unknown('Polygon out of bounds');
  const points=polygon.map(([x,y])=>[rx+x/width*rw,ry+y/height*rh]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const bbox=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
  if(bbox[2]<=0||bbox[3]<=0)return unknown('Degenerate polygon');
  return {bbox,polygon:points,native_polygon:structuredClone(polygon),native_unit:unit,position_evidence:evidence};
 }
 return {geometry};
}
function google(raw,source,warnings,config){
 const doc=raw.document??raw;assert(!doc.shardInfo,'Sharded response not supported by ROI adapter');string(doc.text);const page=array(doc.pages);assert.equal(page.length,1,'Exactly one bound ROI page required');const p=page[0],ctx=context(source,warnings);
 const textOf=layout=>anchoredText(doc.text,layout?.textAnchor,config.google_index_unit??'codepoint');
 const position=(layout,locator)=>{
  if(layout?.orientation&&!['PAGE_UP','ORIENTATION_UNSPECIFIED'].includes(layout.orientation)){warnings.push({type:'orientation_unresolved',severity:'high',locator});return {bbox:null,polygon:null,native_layout:layout};}
  const poly=layout?.boundingPoly,norm=poly?.normalizedVertices,points=(norm??poly?.vertices)?.map(v=>[v.x??0,v.y??0]);
  return ctx.geometry(points,[p.dimension?.width,p.dimension?.height],norm?'normalized':p.dimension?.unit==='pixels'?'pixel':p.dimension?.unit,'native_ocr',locator);
 };
 const key=Array.isArray(p.lines)?'lines':Array.isArray(p.paragraphs)?'paragraphs':'blocks';
 const blocks=(p[key]??[]).map((b,i)=>({id:`g:${key}:${i}`,text:textOf(b.layout),native_locator:`pages[0].${key}[${i}]`,...position(b.layout,`${key}[${i}]`)}));
 const formulas=(p.visualElements??[]).flatMap((v,i)=>v.type==='math_formula'?[{id:'g:formula:'+i,text:textOf(v.layout),kind:'math',native_locator:`visualElements[${i}]`,...position(v.layout,`visualElements[${i}]`)}]:[]);
 const tables=(p.tables??[]).map((t,i)=>{
  const occupied=new Set(),cells=[];let structureUnresolved=false;
  [...(t.headerRows??[]),...(t.bodyRows??[])].forEach((row,r)=>{let column=0;for(const cell of row.cells??[]){while(occupied.has(r+':'+column))column++;const rs=cell.rowSpan,cs=cell.colSpan,valid=Number.isInteger(rs)&&rs>0&&Number.isInteger(cs)&&cs>0;
   if(valid&&!structureUnresolved)for(let a=r;a<r+rs;a++)for(let b=column;b<column+cs;b++){assert(!occupied.has(a+':'+b),'Overlapping native table cells');occupied.add(a+':'+b);}
   if(!valid){structureUnresolved=true;warnings.push({type:'table_span_unknown',severity:'high',locator:`tables[${i}] row ${r}`});}
   cells.push({row:r,column:valid&&!structureUnresolved?column:null,row_span:valid?rs:null,column_span:valid?cs:null,text:textOf(cell.layout),position:position(cell.layout,`table[${i}].cell[${cells.length}]`),index_evidence:structureUnresolved?'column_unresolved_due_to_prior_missing_span':'derived_from_native_row_order_and_explicit_spans'});column+=valid?cs:1;
  }});return {id:'g:table:'+i,cells,native_locator:`tables[${i}]`,...position(t.layout,`tables[${i}]`)};
 });
 return {text:doc.text,blocks,formulas,tables,captions:[],reading_order:blocks.map(b=>b.id),reported:{text:'reported',blocks:provided(p,key),formulas:provided(p,'visualElements'),tables:provided(p,'tables'),captions:'not_reported',reading_order:'native_array_order'},native_model_version:raw.processorVersion??null};
}
function azure(raw,source,warnings){
 if(Object.hasOwn(raw,'status'))assert.equal(raw.status,'succeeded','Analysis not completed');
 const r=raw.analyzeResult??raw;string(r.content);const pages=array(r.pages);assert.equal(pages.length,1,'Exactly one bound ROI page required');const p=pages[0],ctx=context(source,warnings);
 const pos=(polygon,locator)=>{assert(polygon===undefined||polygon===null||Array.isArray(polygon),'Polygon array expected');const points=polygon?.map((_,i)=>i%2===0?[polygon[i],polygon[i+1]]:null).filter(Boolean);return ctx.geometry(points,[p.width,p.height],p.unit,'native_ocr',locator);};
 const region=(obj,locator)=>{const rs=obj.boundingRegions??[];assert(rs.every(x=>x.pageNumber===p.pageNumber),'Cross-page region not supported');return pos(rs[0]?.polygon,locator);};
 const blocks=(p.lines??[]).map((b,i)=>({id:'a:line:'+i,text:string(b.content),native_spans:b.spans??null,native_locator:`pages[0].lines[${i}]`,...pos(b.polygon,`lines[${i}]`)}));
 const formulas=(p.formulas??[]).map((f,i)=>({id:'a:formula:'+i,text:string(f.value),kind:f.kind??'unknown',native_spans:f.span??null,...pos(f.polygon,`formulas[${i}]`)}));
 const tables=(r.tables??[]).map((t,i)=>({id:'a:table:'+i,row_count:t.rowCount??null,column_count:t.columnCount??null,cells:array(t.cells).map((cell,j)=>{
  const rs=cell.rowSpan??null,cs=cell.columnSpan??null;if(rs===null||cs===null)warnings.push({type:'table_span_unknown',severity:'high',locator:`tables[${i}].cells[${j}]`});
  return {row:cell.rowIndex,column:cell.columnIndex,row_span:rs,column_span:cs,text:string(cell.content),position:region(cell,`table[${i}].cell[${j}]`)};
 }),...region(t,`tables[${i}]`)}));
 const captions=(r.figures??[]).flatMap((f,i)=>f.caption?[{id:'a:caption:'+i,figure_id:f.id??null,text:string(f.caption.content),...region(f.caption,`figures[${i}].caption`)}]:[]);
 return {text:r.content,blocks,formulas,tables,captions,reading_order:blocks.map(b=>b.id),reported:{text:'reported',blocks:provided(p,'lines'),formulas:provided(p,'formulas'),tables:provided(r,'tables'),captions:provided(r,'figures'),reading_order:'native_array_order'},native_model_version:r.modelId??null,api_version:r.apiVersion??null};
}
function openai(raw,source,warnings){
 assert.equal(raw.status,'completed','Incomplete/refused response');const textParts=[];
 for(const item of array(raw.output)){if(item.type!=='message')continue;for(const content of array(item.content)){assert(content.type!=='refusal','Model refusal is not OCR');if(content.type==='output_text')textParts.push(string(content.text));}}
 assert.equal(textParts.length,1,'Exactly one structured OCR output required');const p=JSON.parse(textParts[0]);assert.equal(p.schema_version,'studysignal-ocr-content-v1');string(p.text);
 assert(!Object.hasOwn(p,'verified')&&!Object.hasOwn(p,'ground_truth_text'),'No machine Ground Truth claims');
 const ctx=context(source,warnings),[,,w,h]=source.roi;
 const pos=(b,locator)=>{warnings.push({type:'model_position_unverified',severity:'high',locator});let polygon=null;
  if(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite)){const [x,y,a,d]=b;polygon=[[x,y],[x+a,y],[x+a,y+d],[x,y+d]];}
  return ctx.geometry(polygon,[w,h],p.coordinate_space==='crop_normalized'?'normalized':p.coordinate_space==='crop_pixels'?'pixel':'unknown','model_estimated_not_native_OCR',locator);
 };
 const blocks=(p.blocks??[]).map((b,i)=>({id:string(b.id),text:string(b.text),...pos(b.bbox,`blocks[${i}]`)}));
 const formulas=(p.formulas??[]).map((f,i)=>({id:string(f.id),text:string(f.text),kind:f.kind??'unknown',...pos(f.bbox,`formulas[${i}]`)}));
 const tables=(p.tables??[]).map(t=>({id:string(t.id),cells:array(t.cells).map(cell=>structuredClone(cell))}));
 const captions=(p.captions??[]).map((f,i)=>({id:string(f.id),figure_id:f.figure_id??null,text:string(f.text),...pos(f.bbox,`captions[${i}]`)}));
 const order=p.reading_order??blocks.map(b=>b.id);array(order);assert(order.every(id=>blocks.some(b=>b.id===id))&&new Set(order).size===order.length,'Invalid reading order IDs');
 return {text:p.text,blocks,formulas,tables,captions,reading_order:order,reported:{text:'reported',blocks:provided(p,'blocks'),formulas:provided(p,'formulas'),tables:provided(p,'tables'),captions:provided(p,'captions'),reading_order:provided(p,'reading_order')},native_model_version:raw.model??null,usage:raw.usage??null};
}
export function normalizeResponse(request,c,receipt){
 validateRequest(request);assertSource(request,c);
 assert(['mock-native','local-replay','recorded-offline'].includes(receipt.mode),'Offline receipt required');
 assert.equal(receipt.provider,request.provider);assert.equal(receipt.request_key,request.cache_key);assert.equal(receipt.model_version,request.model_version);
 assert.equal(receipt.image_sha256,request.source.image_sha256);assert.equal(receipt.crop_sha256,request.source.crop_ref.sha256);
 if(receipt.mode==='mock-native')assert.equal(c.kind,'synthetic_test_only','Synthetic native fixtures cannot impersonate real provider results');
 if(receipt.mode==='recorded-offline')assert(usageAllowed(request.rights,'evaluate')&&usageAllowed(request.rights,'save')&&usageAllowed(request.provider_rights,'evaluate')&&usageAllowed(request.provider_rights,'save'),'Recorded response rights unresolved');
 string(receipt.raw_response);assert(receipt.elapsed_ms===null||Number.isFinite(receipt.elapsed_ms)&&receipt.elapsed_ms>=0,'Invalid elapsed time');
 const raw=JSON.parse(receipt.raw_response),warnings=[],parser={google,azure,openai}[request.provider];assert(parser,'Unsupported provider');
 const data=parser(raw,request.source,warnings,request.config);
 for(const key of ['blocks','formulas','tables','captions'])assert(new Set(data[key].map(x=>x.id)).size===data[key].length,'Duplicate '+key+' IDs');
 for(const table of data.tables){const occupied=new Set();for(const cell of table.cells){string(cell.text);if(![cell.row,cell.column,cell.row_span,cell.column_span].every(Number.isInteger)||cell.row<0||cell.column<0||cell.row_span<1||cell.column_span<1){warnings.push({type:'table_structure_unresolved',severity:'high',locator:table.id});continue;}
  for(let r=cell.row;r<cell.row+cell.row_span;r++)for(let col=cell.column;col<cell.column+cell.column_span;col++){const key=r+':'+col;assert(!occupied.has(key),'Overlapping table cells');occupied.add(key);}
 }}
 if(request.provider==='openai'&&data.native_model_version!==null)assert.equal(data.native_model_version,request.model_version,'Unexpected returned OpenAI model');
 if(receipt.mode==='local-replay'){
  const engine=c.engines.find(e=>e.id===receipt.replay_engine);assert(engine,'Replay engine missing');assert.equal(data.text,engine.text,'Replay changed original text');
  assert.equal(data.blocks.length,engine.blocks.length,'Replay changed segmentation');data.blocks.forEach((b,i)=>{assert.equal(b.text,engine.blocks[i].text,'Replay changed block text');if(b.bbox)assert(b.bbox.every((v,j)=>Math.abs(v-engine.blocks[i].bbox[j])<1e-6),'Replay changed coordinates');});
 }
 const positionMissing=data.blocks.filter(b=>!b.bbox).length;
 if(data.blocks.map(b=>b.text).join('').replace(/\s/gu,'')!==data.text.replace(/\s/gu,''))warnings.push({type:'block_text_sequence_difference',severity:'high',reason:'Reported block sequence differs from full raw text; raw order retained'});
 if(data.reading_order.length!==data.blocks.length)warnings.push({type:'reading_order_incomplete',severity:'high',reason:'Some text blocks lack reported reading order'});
 if(positionMissing)warnings.push({type:'unlocated_text',severity:'high',count:positionMissing});
 if(!data.blocks.length&&data.text.trim())warnings.push({type:'text_without_blocks',severity:'high'});
 return {format:NORMALIZER_VERSION,request_key:request.cache_key,source:structuredClone(request.source),provider:request.provider,model_version:request.model_version,
  receipt:structuredClone(receipt),raw_sha256:sha(Buffer.from(receipt.raw_response)),data,warnings,
  normalization_policy:{text:'byte-for-byte text retention; no NFKC/case/script substitution',coordinates:'original image pixels with native evidence retained',reading_order:'reported order retained; not repaired'},
  independence:receipt.mode==='local-replay'?'none: existing local OCR replay':receipt.mode==='mock-native'?'none: synthetic fixture':'unverified: supplier independence not established',
  validation_state:'machine-generated',content_confidence:null,verified:false,normalization_digest:digest({data,source:request.source,raw_sha256:sha(Buffer.from(receipt.raw_response)),parser:NORMALIZER_VERSION})};
}
