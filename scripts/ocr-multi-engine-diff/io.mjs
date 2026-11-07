// Fixed existing15 development adapter. All inputs immutable; no OCR execution.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {prepareDevelopment,checkedRef} from '../ocr-benchmark/io.mjs';
import {loadSources} from '../ocr-quality-gate/sources.mjs';
import {sha,verifySnapshot} from '../lib/ocr-quality-io.mjs';
import {buildSourceAlignment} from '../lib/ocr-ai-source-evidence.mjs';
import {alignDifferences,VERSION} from './core.mjs';
export async function inspectExisting15(project){
 const snapshot=new Map(),capture=file=>{const bytes=fs.readFileSync(file);snapshot.set(file,sha(bytes));return bytes;};
 const reportPath='docs/knowledge-base/biology/ocr-v23-stage2-quality-validation-20261104.json',catalogPath='tmp-ocr-v23-stage1-20261104/catalog.final.json';
 const dataset=await prepareDevelopment({project,reportPath,catalogPath});
 assert(dataset?.samples?.length===15,'Expected 15 samples');
 for(const ref of dataset.provenance)capture(checkedRef(project,ref));
 const catalog=JSON.parse(capture(path.join(project,catalogPath))),pages=[];
 for(const s of dataset.samples){
  const cp=catalog.pages.find(p=>p.pageId===s.page_id);assert(cp);capture(cp.image.path);
  const refs=[s.sources.image_manifest,s.sources.ocr_result,...Object.values(s.sources.ocr_layers),s.sources.ocr_run];for(const ref of refs)capture(checkedRef(project,ref));
  const raw=capture(checkedRef(project,s.sources.ocr_layers['raw.txt'])).toString('utf8'),tsv=capture(checkedRef(project,s.sources.ocr_layers['layout.tsv'])).toString('utf8');
  const alignment=buildSourceAlignment({raw,tsv,width:s.image_width,height:s.image_height});
  assert.equal(alignment.invalidWordIds.length,0);assert(!raw.trim()||alignment.status==='exact_nonwhitespace_sequence');
  pages.push({scan_seq:s.scan_seq,page_id:s.page_id,source_id:s.source_id,image_filename:s.image_path,image_sha256:s.image_sha256,image_manifest:s.sources.image_manifest,printed_page:s.printed_page_label,page_number_verification:s.page_number_verification,tesseract:{source_status:'HASH_DIMENSIONS_LAYOUT_VERIFIED',raw_ref:s.sources.ocr_layers['raw.txt'],result_ref:s.sources.ocr_result,layout_ref:s.sources.ocr_layers['layout.tsv'],run_ref:s.sources.ocr_run,word_count:alignment.words.length},full_page_dual_engine_status:'NOT_EVALUATED',paddle_full_page_status:'NOT_FOUND_IN_REGISTERED_INPUTS',region_comparisons:[],annotation_status:'pending_human_review'});
 }
 const loaded=await loadSources(project);assert.equal(loaded.regions.length,2);
 const regions=loaded.regions.map(input=>{assert(pages.some(p=>p.page_id===input.source.page_id),'Region outside existing15');return alignDifferences(input);});
 for(const p of pages)p.region_comparisons=regions.filter(r=>r.page_id===p.page_id).map(r=>({region_id:r.region_id,roi:r.roi,scope:'ROI_ONLY_NOT_FULL_PAGE',alignment_status:r.alignment_status,review_items:r.review_items.length}));
 const verify=()=>{verifySnapshot(snapshot);loaded.verify();};verify();
 return {report:{version:VERSION,scope:'Existing15 development pages; dual-engine comparisons only for two saved ROIs',pages,regions,summary:{pages:pages.length,tesseract_pages:pages.length,full_page_dual_engine_pages:0,roi_dual_engine_pages:pages.filter(p=>p.region_comparisons.length).length,roi_comparisons:regions.length,pages_without_dual_engine_roi:pages.filter(p=>!p.region_comparisons.length).map(p=>p.scan_seq),review_items:regions.reduce((n,r)=>n+r.review_items.length,0),verified_created:0,CER:null,WER:null,confirmed_error_count:null,false_positive_rate:null,miss_rate:null},source_refs:[...snapshot,...loaded.snapshot].map(([file,h])=>({path:path.relative(project,file).replaceAll('\\','/'),sha256:h})),internal_only:true},verify};
}
