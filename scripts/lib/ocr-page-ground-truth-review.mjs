// Existing15 page adapter for the existing human-review UI/store. No OCR or approvals.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {prepareDevelopment,checkedRef,importExistingTesseract} from '../ocr-benchmark/io.mjs';
import {stableStringify} from '../ocr-benchmark/core.mjs';
import {buildSourceAlignment} from './ocr-ai-source-evidence.mjs';
import {sha,protectedRead,verifySnapshot} from './ocr-quality-io.mjs';
import {openGroundTruthStore} from './ocr-ground-truth-store.mjs';
import {tableGeometry} from '../ocr-quality-gate/core.mjs';
export function openPageReview(cases,outputDirectory,verify){
 const store=openGroundTruthStore(outputDirectory,cases,verify,{profile:'existing15-pages'});
 return {store,cases,verify,profile:'existing15-pages',progress:()=>pageProgress(cases,store)};
}
export function buildPageSourceCase(s,model,raw,tsv,observation,originalPath){
 const alignment=buildSourceAlignment({raw,tsv,width:s.image_width,height:s.image_height});assert.equal(alignment.invalidWordIds.length,0);assert(!raw.trim()||alignment.status==='exact_nonwhitespace_sequence');
 const id='scan-'+String(s.scan_seq).padStart(4,'0')+'-full-page',sample={...structuredClone(s),region_id:id};assert(observation);
 const blocks=alignment.words.map(w=>({id:w.id,text:w.text,bbox:[w.rect.left,w.rect.top,w.rect.width,w.rect.height]}));
 const issues=(observation.locators??[]).map((loc,i)=>({issue_id:id+':observation-'+i,type:'existing_observation_needs_review',severity:observation.severity,original_bbox:loc.sourceGeometry?.sourceBBox??s.bounding_box,evidence:{categories:observation.categories,source:'stage2_agent_observation_not_ground_truth',anchor_offset:loc.offsetUtf16}}));
 issues.push({issue_id:id+':full-scope',type:'image_content_completeness_undetermined',severity:'medium',original_bbox:s.bounding_box,evidence:{second_engine_available:false,full_scope_human_check_required:true}});
 const quality={issues,table_candidates:[],scientific_comparison:null,source_scope:'full_page',annotation_status:'pending_human_review'},quality_sha256=sha(Buffer.from(stableStringify(quality)));
 const fingerprint=sha(Buffer.from(stableStringify({sample_id:s.sample_id,region_id:id,image_sha256:s.image_sha256,roi:s.bounding_box,sources:s.sources,quality_sha256})));
 return {id,kind:'real',sample,fingerprint,quality_sha256,quality,originalPath,cropPath:originalPath,
  engines:[{id:'tesseract',version:model.model_version,config:model.model_config,text:raw,blocks,raw_ref:s.sources.ocr_layers['raw.txt'],result_ref:s.sources.ocr_result,layout_ref:s.sources.ocr_layers['layout.tsv']}],
  page_review:{content_types:s.coverage_tags,reading_order:{...tableGeometry(blocks),scope:'OCR geometry hypothesis, not confirmed reading order'},source_version:s.sources.ocr_run,blank_control:!raw.trim(),checklist:['繁體中文、英文大小寫與混排','題號與選項；不存在時明確記錄不適用','公式、上下標、數值與單位','表格、圖說、圖片標籤及概念圖分支','段落、閱讀順序、全文缺漏及頁碼']}};
}
export async function loadPageReview(project,outputDirectory){
 const snapshot=new Map(),bytes=f=>protectedRead(f,snapshot),reportPath='docs/knowledge-base/biology/ocr-v23-stage2-quality-validation-20261104.json';
 const dataset=await prepareDevelopment({project,reportPath,catalogPath:'tmp-ocr-v23-stage1-20261104/catalog.final.json'}),imported=await importExistingTesseract(project,dataset);
 const report=JSON.parse(bytes(path.join(project,reportPath))),cases=[];
 for(const s of dataset.samples){
  const model=imported.outputs.find(m=>m.sample_id===s.sample_id);assert(model);const manifest=JSON.parse(bytes(checkedRef(project,s.sources.image_manifest))),scans=manifest.scans.filter(x=>x.originalFileName===s.image_path);assert.equal(scans.length,1);const originalPath=scans[0].originalPath;assert.equal(sha(bytes(originalPath)),s.image_sha256);
  for(const ref of [s.sources.ocr_result,s.sources.ocr_run,...Object.values(s.sources.ocr_layers)])bytes(checkedRef(project,ref));
  const raw=bytes(checkedRef(project,s.sources.ocr_layers['raw.txt'])).toString('utf8'),tsv=bytes(checkedRef(project,s.sources.ocr_layers['layout.tsv'])).toString('utf8');
  cases.push(buildPageSourceCase(s,model,raw,tsv,report.pages.find(p=>p.pageId===s.page_id),originalPath));
 }
 const verify=()=>verifySnapshot(snapshot);verify();return openPageReview(cases,outputDirectory,verify);
}
export function pageProgress(cases,store){
 const pages=cases.map(c=>{const r=store.latest(c.id),missing=[];
  if(!r)missing.push('尚無人工校正版本');else if(r.review_status!=='verified')missing.push('最新版本尚未逐字確認');
  if(c.sample.page_number_verification!=='verified')missing.push('印刷頁碼仍為'+c.sample.page_number_verification);
  if(!c.engines.some(e=>e.id==='paddle'))missing.push('無全頁PaddleOCR結果，無法全頁雙引擎比對');
  if(!r?.ground_truth_structure)missing.push('結構尚未標註，不能認定表格、圖說、題目或讀序已驗證');
  if(c.page_review?.blank_control)missing.push('空白OCR控制頁，需人工確認是否真正空白；目前不支援空文字verified');
  return {id:c.id,scan_seq:c.sample.scan_seq,page_id:c.sample.page_id,printed_page:c.sample.printed_page_label,page_number_verification:c.sample.page_number_verification,status:r?.review_status??'pending_human_review',revision:r?.revision??0,previous_revision:r?.previous_revision??null,scope:'full_page',verification_scope:r?.verification_scope??null,source_image_sha256:c.sample.image_sha256,missing,formal_accuracy:null};
 });
 return {profile:'existing15-pages',pages,summary:{total:pages.length,saved:pages.filter(p=>p.revision>0).length,verified:pages.filter(p=>p.status==='verified').length,pending:pages.filter(p=>p.status!=='verified').length,formal_accuracy:null},limitations:['Verified text does not imply unannotated figures/tables are verified.','Engineering test success is not OCR accuracy.','Existing two-ROI drafts are in a separate unchanged store.']};
}
export async function pageReviewImage(c,mode,highlight=null){
 assert(['original','roi','regions'].includes(mode),'Unknown image mode');const raw=fs.readFileSync(c.originalPath);assert.equal(sha(raw),c.sample.image_sha256,'Image SHA changed');if(mode==='original')return raw;
 if(!highlight)return sharp(raw).composite([{input:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+c.sample.image_width+'" height="'+c.sample.image_height+'"><rect x="1" y="1" width="'+(c.sample.image_width-2)+'" height="'+(c.sample.image_height-2)+'" fill="none" stroke="#d00000" stroke-width="3"/></svg>')}]).png().toBuffer();const issue=c.quality.issues.find(i=>i.issue_id===highlight),group=c.difference_review?.groups.find(g=>g.id===highlight);assert(issue||group,'Unknown risk highlight');const [x,y,w,h]=issue?.original_bbox??group.bbox;assert([x,y,w,h].every(Number.isFinite)&&w>0&&h>0&&x>=0&&y>=0&&x+w<=c.sample.image_width&&y+h<=c.sample.image_height);
 return sharp(raw).composite([{input:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+c.sample.image_width+'" height="'+c.sample.image_height+'"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="none" stroke="#ff9800" stroke-width="6"/></svg>')}]).png().toBuffer();
}
