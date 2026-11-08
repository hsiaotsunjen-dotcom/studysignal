// Source-bound P2-A adapter around the existing append-only Ground Truth store.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import sharp from 'sharp';
import {loadP0Page} from '../../ocr-multi-engine-diff/p0-validation.mjs';import {alignDifferences} from '../../ocr-multi-engine-diff/core.mjs';
import {loadGroundTruth} from '../../lib/ocr-ground-truth-review.mjs';import {openGroundTruthStore} from '../../lib/ocr-ground-truth-store.mjs';
import {stableStringify,validateDataset} from '../core.mjs';import {sha,writeNew,verifySnapshot} from '../../lib/ocr-quality-io.mjs';
import {evaluateP2Model,aggregateVerified,PROTOCOL} from './metrics.mjs';
import {buildSourceAlignment} from '../../lib/ocr-ai-source-evidence.mjs';
export const CONFIRMATION='I_COMPARED_ORIGINAL_IMAGE_AND_REVIEWED_THIS_ROI';
export const SELECTION=Object.freeze([
 {id:'p2a-text-01',category:'simple_text',seq:6,group:'g005'},
 {id:'p2a-text-02',category:'simple_text',seq:6,group:'g015'},
 {id:'p2a-text-03',category:'simple_text',seq:200,group:'g022'},
 {id:'p2a-text-04',category:'simple_text',seq:317,group:'g017'},
 {id:'p2a-science-01',category:'science',seq:200,legacy:'formula-iron'},
 {id:'p2a-science-02',category:'science',seq:200,group:'g007'},
 {id:'p2a-science-03',category:'science',seq:200,group:'g019'},
 {id:'p2a-science-04',category:'science',seq:200,group:'g021'},
 {id:'p2a-structure-01',category:'structure',seq:19,legacy:'table-nucleic-acids',scope_note:'Existing partial table ROI, not the complete DNA/RNA table'},
 {id:'p2a-structure-02',category:'structure',seq:200,group:'g030',scope_note:'Caption ROI only, not the associated figure'},
 {id:'p2a-special-01',category:'special_error',seq:200,group:'g061',scope_note:'Single-engine text hypothesis; true omission not confirmed'},
 {id:'p2a-special-02',category:'special_error',seq:317,group:'g008',scope_note:'Existing engine sequence/content discrepancy, not repaired'}
]);
const digest=x=>sha(Buffer.from(stableStringify(x)));
export function extractLocatedText(engine,selected,project,width,height){
 const indices=selected.map(b=>engine.blocks.findIndex(x=>x.id===b.id));assert(indices.every(i=>i>=0),'Unknown source block');assert(indices.every((v,i)=>i===0||v===indices[i-1]+1),'Non-contiguous source blocks require manual extraction');if(!indices.length)return {text:'',blocks:[],raw_span:null};
 let start,end;
 if(engine.id==='tesseract'){
  const alignment=buildSourceAlignment({raw:engine.text,tsv:fs.readFileSync(path.resolve(project,engine.layout_ref.path),'utf8'),width,height});assert.equal(alignment.status,'exact_nonwhitespace_sequence');assert.equal(alignment.words.length,engine.blocks.length);
  for(const i of indices){assert.equal(alignment.words[i].text,engine.blocks[i].text);const r=alignment.words[i].rect;assert.deepEqual([r.left,r.top,r.width,r.height],engine.blocks[i].bbox);}
  const chosen=new Set(indices),offsets=alignment.rawOffsets.filter((_,i)=>chosen.has(alignment.owners[i]));start=offsets[0];end=offsets.at(-1)+1;
 }else{
  let offset=0;const spans=engine.blocks.map(b=>{const p=engine.text.indexOf(b.text,offset);assert(p>=offset&&!engine.text.slice(offset,p).trim(),'Unresolved engine raw sequence');const s={start:p,end:p+b.text.length};offset=s.end;return s;});start=spans[indices[0]].start;end=spans[indices.at(-1)].end;
 }
 return {text:engine.text.slice(start,end),blocks:selected,raw_span:{start,end,offset_unit:'UTF-16',parent_raw_ref:engine.raw_ref}};
}
export async function prepareP2A(project,out){
 project=path.resolve(project);out=path.resolve(out);assert(out.startsWith(project+path.sep),'Dataset must remain inside project');assert(!fs.existsSync(out),'Refuse existing dataset directory');
 const dataset=JSON.parse(fs.readFileSync(path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json'))),legacy=await loadGroundTruth(project,path.join(project,'tmp-ocr-ground-truth-v1')),cache=new Map(),references=new Map(),cases=[],unresolved=[];
 const ref=file=>{const absolute=path.resolve(file),value={path:absolute,sha256:sha(fs.readFileSync(absolute))};references.set(absolute,value);return value;};
 ref(path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json'));
 for(const def of SELECTION){try{
  if(!cache.has(def.seq)){const p=loadP0Page(def.seq,project);cache.set(def.seq,{...p,comparison:alignDifferences(p.input)});for(const [f,h]of p.snapshot)references.set(f,{path:f,sha256:h});}
  const page=cache.get(def.seq),base=dataset.samples.find(s=>s.scan_seq===def.seq);assert(base,'Sample outside existing15');assert.equal(page.p.image_sha256,base.image_sha256);
  const old=def.legacy?legacy.cases.find(c=>c.id===def.legacy):null,g=def.group?page.comparison.groups.find(g=>g.id.endsWith(':'+def.group)):null;assert(old||g,'Registered ROI missing');if(old)assert.equal(old.sample.image_sha256,base.image_sha256);
  const bbox=old?.sample.bounding_box??g.bbox,meta=await sharp(page.p.original).metadata();assert.equal(meta.width,base.image_width);assert.equal(meta.height,base.image_height);
  const regionType=def.category==='science'?'formula':def.legacy==='table-nucleic-acids'?'table':def.category==='structure'?'caption':'text';
  const sample={...structuredClone(base),sample_id:def.id,region_id:def.id,region_type:regionType,bounding_box:bbox,polygon:null,reference_text:null,reference_structure:null,reference_origin:null,annotation_status:'pending_human_review',reviewer:null,reviewed_at:null,annotation_version:'1',approval:null,dataset_split:'development',training_consent:false};
  const sourceEngines=old?.engines??page.input.engines.map((e,i)=>{const side=i===0?g.left:g.right,ids=new Set(side.spans.map(s=>s.block_id));return {...e,...extractLocatedText(e,e.blocks.filter(b=>ids.has(b.id)),project,base.image_width,base.image_height)};});
  const prior=[];if(old)for(const r of legacy.store.history(old.id)){const f=path.join(project,'tmp-ocr-ground-truth-v1',old.id,String(r.revision).padStart(9,'0')+'.json');prior.push({revision:r.revision,status:r.review_status,record_ref:ref(f)});}
  const quality={issues:[{issue_id:def.id+':scope',type:'roi_scope_requires_human_confirmation',severity:'medium',original_bbox:bbox,evidence:{scope:def.scope_note??'Exactly the registered ROI; not whole-page Ground Truth',source_group:g?.id??old.id}}]};
  cases.push({id:def.id,kind:'real',sample,originalPath:page.p.original,definition:def,quality,quality_sha256:digest(quality),parent_engines:sourceEngines,prior_history:prior,
   extraction:old?'existing ROI OCR, unchanged text':'Exact contiguous substring of saved full-page raw; original whitespace retained; UTF-16 span recorded',source_status:'resolved',ground_truth_status:'pending_human_review'});
 }catch(e){unresolved.push({...def,source_status:'source_unresolved',reason:e.message});}}
 legacy.verify();for(const [f,h]of legacy.snapshot??[])references.set(f,{path:f,sha256:h});
 if(unresolved.length){fs.mkdirSync(out,{recursive:true});writeNew(path.join(out,'source-unresolved.json'),{status:'source_unresolved',samples:unresolved,ground_truth_created:false});return {status:'source_unresolved',unresolved};}
 assert.equal(cases.length,12);validateDataset({...dataset,samples:cases.map(c=>c.sample)});
 for(const c of cases)for(const e of c.parent_engines)for(const r of [e.raw_ref,e.result_ref,e.layout_ref].filter(Boolean)){const f=path.resolve(project,r.path);assert.equal(ref(f).sha256,r.sha256);}
 for(const c of cases){const [x,y,w,h]=c.sample.bounding_box;assert([x,y,w,h].every(Number.isInteger),'Preview requires exact integer ROI');assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=c.sample.image_width&&y+h<=c.sample.image_height);}
 const sourceVerify=()=>verifySnapshot(new Map([...references.values()].map(r=>[r.path,r.sha256])));sourceVerify();
 fs.mkdirSync(out,{recursive:true});
 for(const c of cases){c.engines=[];for(const e of c.parent_engines){const folder=path.join(out,'candidates',c.id),raw=path.join(folder,e.id+'.txt'),result=path.join(folder,e.id+'.json');writeNew(raw,e.text);writeNew(result,{engine_id:e.id,version:e.version,config:e.config,text:e.text,blocks:e.blocks,parent_raw_ref:e.raw_ref,parent_result_ref:e.result_ref,parent_layout_ref:e.layout_ref,raw_span:e.raw_span??null,extraction:c.extraction,image_sha256:c.sample.image_sha256,bbox:c.sample.bounding_box});c.engines.push({...e,raw_ref:ref(raw),result_ref:ref(result),layout_ref:ref(result)});}delete c.parent_engines;
  const [left,top,width,height]=c.sample.bounding_box,preview=path.join(out,'previews',c.id+'.png');fs.mkdirSync(path.dirname(preview),{recursive:true});fs.writeFileSync(preview,await sharp(c.originalPath).extract({left,top,width,height}).png().toBuffer(),{flag:'wx'});c.preview_ref=ref(preview);c.fingerprint=digest({sample:c.sample,engines:c.engines,quality_sha256:c.quality_sha256,prior_history:c.prior_history});
 }
 sourceVerify();
 const manifest={format:'studysignal-p2a-dataset-1',protocol:PROTOCOL,dataset_split:'development',source_family:'same-book-development-not-independent-test',cases,references:[...references.values()],unresolved:[],formal_ground_truth:0};manifest.dataset_digest=digest(manifest);writeNew(path.join(out,'dataset.json'),manifest);
 const loaded=openP2A(out);for(const c of loaded.cases)writeNew(path.join(out,'templates',c.id+'.json'),loaded.template(c.id));
 const packet=['# P2-A 人工核對清單','所有候選均非 Ground Truth。請完整核對指定 ROI；不要將局部確認當成全頁確認。','表格樣本是既有局部 ROI，並非完整 DNA/RNA 表格。',''];
 for(const c of cases){packet.push('## '+c.id,'掃描 '+c.sample.scan_seq+'；索引印刷頁 '+c.sample.printed_page_label+'（'+c.sample.page_number_verification+'）','ROI xywh：'+JSON.stringify(c.sample.bounding_box),'SHA-256：'+c.sample.image_sha256,'範圍：'+(c.definition.scope_note??'Exactly this ROI'),'![ROI](previews/'+c.id+'.png)','[完整原圖]('+c.originalPath.replaceAll('\\','/')+')','候選提取方式：'+c.extraction);for(const e of c.engines)packet.push('### '+e.id+'（版本 '+JSON.stringify(e.version)+'）','```text',e.text,'```');packet.push('人工答案：請編輯 templates/'+c.id+'.json；保持 draft，未逐字核圖不得 confirm。','舊版引用：'+JSON.stringify(c.prior_history),'');}
 writeNew(path.join(out,'human-review-packet.md'),packet.join('\n'));writeNew(path.join(out,'progress.json'),loaded.progress());writeNew(path.join(out,'evaluation.pending.json'),loaded.evaluate());return {status:'prepared',samples:cases.length,verified:0,out};
}
export function openP2Cases(cases,root,verify){
 const store=openGroundTruthStore(root,cases,verify,{profile:'benchmark-regions'});
 const template=id=>{const c=store.selected(id),r=store.latest(id);return {sample_id:id,source_fingerprint:c.fingerprint,source_image_sha256:c.sample.image_sha256,expected_revision:r?.revision??0,ground_truth_text:r?.ground_truth_text??'',ground_truth_structure:r?.ground_truth_structure??null,reviewer_id:r?.reviewer_id??'',notes:r?.notes??'',uncertainties:r?.uncertainties??[],risk_audit:r?.risk_audit??{labels:[],misses:[],scope_complete:false}};};
 function submit(id,body,operation){assert(['draft','pending','reject','confirm'].includes(operation));assert.equal(body.sample_id,id,'Wrong sample ID');const {sample_id,human_confirmation,checks,request_id,...payload}=body;
  if(operation==='confirm'){assert.equal(human_confirmation,CONFIRMATION,'Explicit human operation required');assert(checks?.roi_only===true&&checks.image_compared===true&&checks.text_complete===true&&checks.science_checked===true,'Human source/text/science/scope checks required');}
  return store.save(id,{...payload,request_id:request_id??crypto.randomUUID(),review_status:{draft:'draft',pending:'pending_human_review',reject:'rejected',confirm:'verified'}[operation],checks:operation==='confirm'?checks:null});
 }
 const progress=()=>({samples:cases.map(c=>{const r=store.latest(c.id);return {sample_id:c.id,source_status:c.source_status??'resolved',status:r?.review_status??'pending_human_review',revision:r?.revision??0,previous_revision:r?.previous_revision??null,image_sha256:c.sample.image_sha256,bbox:c.sample.bounding_box};}),verified:cases.filter(c=>store.latest(c.id)?.is_ground_truth===true).length});
 const evaluateAll=()=>{const rows=[];for(const c of cases){const r=store.latest(c.id),trusted=r?.review_status==='verified'&&r?.is_ground_truth===true,exported=trusted?store.benchmark(c.id):null;for(const e of c.engines){const model=exported?.results.find(x=>x.engine_id===e.id)?.model;const result=trusted?evaluateP2Model(exported.ground_truth.sample,model,{realHumanVerified:true}):evaluateP2Model(c.sample,null);rows.push({sample_id:c.id,engine_id:e.id,revision:r?.revision??0,...result});}}
  const engines=[...new Set(rows.map(r=>r.engine_id))];return {protocol:PROTOCOL,status:progress().verified>=3?'DEVELOPMENT_SUBSET_ONLY':'insufficient_verified_samples',verified_roi_count:progress().verified,rows,aggregate:engines.map(id=>({engine_id:id,...aggregateVerified(rows.filter(r=>r.engine_id===id))})),formal_platform_accuracy:null};};
 return {cases,store,verify,template,submit,progress,evaluate:evaluateAll};
}
export function openP2A(directory){const root=path.resolve(directory),file=path.join(root,'dataset.json'),bytes=fs.readFileSync(file),manifest=JSON.parse(bytes),{dataset_digest,...body}=manifest;assert.equal(manifest.format,'studysignal-p2a-dataset-1');assert.equal(dataset_digest,digest(body),'Dataset digest mismatch');assert.equal(manifest.cases.length,12);assert.equal(manifest.unresolved.length,0);const snapshot=new Map([[file,sha(bytes)]]);for(const r of manifest.references){assert.equal(sha(fs.readFileSync(r.path)),r.sha256,'Source SHA mismatch');snapshot.set(r.path,r.sha256);}
 for(const c of manifest.cases){assert.equal(c.sample.dataset_split,'development');assert.equal(c.source_status,'resolved');assert.equal(c.sample.scan_seq,c.definition.seq);assert.equal(path.basename(c.originalPath),c.sample.image_path,'Image identity mismatch');assert.equal(sha(fs.readFileSync(c.originalPath)),c.sample.image_sha256,'Image SHA mismatch');assert.equal(c.quality_sha256,digest(c.quality));assert.equal(c.fingerprint,digest({sample:c.sample,engines:c.engines,quality_sha256:c.quality_sha256,prior_history:c.prior_history}),'Case fingerprint mismatch');for(const e of c.engines){assert.equal(sha(Buffer.from(e.text)),e.raw_ref.sha256,'Candidate text differs from raw source');assert.equal(fs.readFileSync(e.raw_ref.path,'utf8'),e.text);const r=JSON.parse(fs.readFileSync(e.result_ref.path));assert.equal(r.image_sha256,c.sample.image_sha256);assert.deepEqual(r.bbox,c.sample.bounding_box);assert.equal(r.text,e.text);assert.deepEqual(r.blocks,e.blocks);}}
 const verify=()=>verifySnapshot(snapshot);return openP2Cases(manifest.cases,path.join(root,'reviews'),verify);}
