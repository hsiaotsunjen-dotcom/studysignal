import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {validateDataset} from '../core.mjs';
import {checkedRef} from '../io.mjs';
import {inspectExisting15} from '../../ocr-multi-engine-diff/io.mjs';
import {loadGroundTruth} from '../../lib/ocr-ground-truth-review.mjs';
import {loadTextReviewCases,openTextReviewStore} from '../../lib/ocr-benchmark-text-review.mjs';
import {sha,protectedRead,verifySnapshot} from '../../lib/ocr-quality-io.mjs';
import {buildInventory} from './core.mjs';
export async function prepareInventory(project){
 const snapshot=new Map(),bytes=f=>protectedRead(f,snapshot),relative=f=>path.relative(project,f).replaceAll('\\','/');
 const datasetFile=path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json'),dataset=JSON.parse(bytes(datasetFile));validateDataset(dataset);assert.equal(dataset.samples.length,15);assert(dataset.samples.every(s=>s.dataset_split==='development'));
 const checked=await inspectExisting15(project);
 for(const s of dataset.samples){const p=checked.report.pages.find(p=>p.page_id===s.page_id);assert(p);assert.equal(s.image_sha256,p.image_sha256);assert.equal(s.scan_seq,p.scan_seq);assert.equal(s.printed_page_label,p.printed_page);assert.equal(s.page_number_verification,p.page_number_verification);for(const ref of [s.sources.image_manifest,s.sources.ocr_result,...Object.values(s.sources.ocr_layers),s.sources.ocr_run])bytes(checkedRef(project,ref));}
 const storeRoot=path.join(project,'tmp-ocr-ground-truth-v1'),loaded=await loadGroundTruth(project,storeRoot);
 const originalCases=loadTextReviewCases(project),legacyRoot=path.join(project,'tmp-ocr-benchmark-v11-human-corrections');
 const legacyStore=fs.existsSync(legacyRoot)?openTextReviewStore(legacyRoot,originalCases):null;
 const hashRecord=f=>({path:relative(f),sha256:sha(bytes(f))});
 for(const root of [storeRoot,legacyRoot])if(fs.existsSync(path.join(root,'store.json')))bytes(path.join(root,'store.json'));
 const rois=loaded.cases.map(c=>{
  const history=loaded.store.history(c.id).map(r=>({revision:r.revision,previous_revision:r.previous_revision,status:r.review_status,saved_at:r.saved_at,reviewed_at:r.reviewed_at,annotation_digest:r.annotation_digest,uncertain_cells:r.ground_truth_structure?.tables?.flatMap(t=>t.cells).filter(c=>c.uncertain===true).length??0,record_ref:hashRecord(path.join(storeRoot,c.id,String(r.revision).padStart(9,'0')+'.json'))}));
  const legacyLatest=legacyStore?.latest(c.id),legacyHistory=[];
  if(legacyLatest){for(const file of fs.readdirSync(path.join(legacyRoot,c.id)).filter(f=>/^\d{9}\.json$/.test(f)).sort())legacyHistory.push(hashRecord(path.join(legacyRoot,c.id,file)));}
  return {sample:c.sample,sourceFingerprint:c.fingerprint,history,legacyHistory,candidateRefs:c.engines.flatMap(e=>[{engine:e.id,layer:'raw',version:e.version,...e.raw_ref},{engine:e.id,layer:'layout',version:e.version,...e.layout_ref},{engine:e.id,layer:'result',version:e.version,...e.result_ref}])};
 });
 const inventory=buildInventory(dataset,rois,checked.report.regions);
 const report={...inventory.summary,source_traceable_pages:checked.report.pages.length,source_verification:'PASS: image SHA/dimensions, OCR layers, page bindings and source versions; not recognition quality',page_number_status_counts:checked.report.pages.reduce((a,p)=>(a[p.page_number_verification]=(a[p.page_number_verification]??0)+1,a),{}),pages:checked.report.pages.map(p=>({scan_seq:p.scan_seq,page_id:p.page_id,printed_page:p.printed_page,page_number_verification:p.page_number_verification,source_status:p.tesseract.source_status,annotation_status:'pending_human_review'})),rois:inventory.entries.filter(e=>e.scope==='roi_only').map(e=>({region_id:e.region_id,scan_seq:e.scan_seq,existing_review:e.existing_review,history_versions:e.history_refs.length,legacy_versions:e.legacy_history_refs.length,annotation_status:e.annotation_status})),limitations:['No OCR, AI correction, model download, paid API, human confirmation or formal KB write.','Pending page/ROI geometry does not imply verified image content or page-number labels.','Queue prioritizes differences but full declared scope still requires human checking.','No new UI, identity authentication or automatic verified export.','All real samples are development; no independent validation/test set.'],internal_only:true};
 const verify=()=>{verifySnapshot(snapshot);checked.verify();loaded.verify();};verify();
 return {inventory,report,verify,input_refs:[...snapshot].map(([file,h])=>({path:relative(file),sha256:h}))};
}
