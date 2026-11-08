// Scan200-only adapter: existing experiment outputs, no inference or source writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {importExistingTesseract,checkedRef} from '../ocr-benchmark/io.mjs';
import {stableStringify} from '../ocr-benchmark/core.mjs';
import {alignDifferences} from '../ocr-multi-engine-diff/core.mjs';
import {buildPageSourceCase,pageProgress} from './ocr-page-ground-truth-review.mjs';
import {openGroundTruthStore} from './ocr-ground-truth-store.mjs';
import {protectedRead,verifySnapshot,sha} from './ocr-quality-io.mjs';
export function openDifferenceReview(cases,root,verify){
 const store=openGroundTruthStore(root,cases,verify,{profile:'scan200-differences'});
 return {store,cases,verify,profile:'scan200-differences',progress:()=>({...pageProgress(cases,store),profile:'scan200-differences'})};
}
export async function loadDifferenceReview(project,root){
 const snapshot=new Map(),bytes=f=>protectedRead(f,snapshot),json=f=>JSON.parse(bytes(f)),relative=f=>path.relative(project,f).replaceAll('\\','/');
 const dataset=json(path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json')),samples=dataset.samples.filter(s=>s.scan_seq===200);assert.equal(samples.length,1);const s=samples[0];assert.equal(s.printed_page_label,'205');
 const subset={...dataset,samples},imported=await importExistingTesseract(project,subset),model=imported.outputs[0];assert(model);
 for(const ref of [...dataset.provenance,s.sources.image_manifest,s.sources.ocr_result,s.sources.ocr_run,...Object.values(s.sources.ocr_layers)])bytes(checkedRef(project,ref));
 const manifest=json(checkedRef(project,s.sources.image_manifest)),scans=manifest.scans.filter(p=>p.originalFileName===s.image_path);assert.equal(scans.length,1);const original=scans[0].originalPath;assert.equal(sha(bytes(original)),s.image_sha256);
 const report=json(path.join(project,'docs/knowledge-base/biology/ocr-v23-stage2-quality-validation-20261104.json')),raw=bytes(checkedRef(project,s.sources.ocr_layers['raw.txt'])).toString('utf8'),tsv=bytes(checkedRef(project,s.sources.ocr_layers['layout.tsv'])).toString('utf8');
 const historicalCase=buildPageSourceCase(s,model,raw,tsv,report.pages.find(p=>p.scanSeq===200),original),baselineRoot=path.join(project,'tmp-ocr-ground-truth-pages-v1');
 const verifySources=()=>verifySnapshot(snapshot),historical=openGroundTruthStore(baselineRoot,[historicalCase],verifySources,{profile:'existing15-pages',readOnly:true});
 const history=historical.history(historicalCase.id),baseline=history.at(-1),historyDir=path.join(baselineRoot,historicalCase.id),historyFiles=fs.existsSync(historyDir)?fs.readdirSync(historyDir).sort():[];
 if(fs.existsSync(path.join(baselineRoot,'store.json')))bytes(path.join(baselineRoot,'store.json'));
 for(const file of historyFiles)bytes(path.join(historyDir,file));
 const baselineFile=baseline?path.join(historyDir,String(baseline.revision).padStart(9,'0')+'.json'):null,baselineRef=baselineFile?{path:relative(baselineFile),sha256:sha(bytes(baselineFile))}:null;
 const exp=path.join(project,'tmp-ocr-fourpage-dual-20261107-v1'),plan=json(path.join(exp,'inputs.json')),selected=plan.pages.filter(p=>p.seq===200);assert.equal(selected.length,1);const page=selected[0];assert.equal(page.image_sha256,s.image_sha256);assert.equal(page.file,s.image_path);assert.equal(page.width,s.image_width);assert.equal(page.height,s.image_height);assert.equal(sha(bytes(path.join(exp,'inputs/0200.png'))),page.input_sha256);
 const comparisonFile=path.join(exp,'comparisons/0200.json'),comparison=json(comparisonFile),comparisonSHA=sha(bytes(comparisonFile));assert.equal(comparison.page_id,s.page_id);assert.deepEqual(comparison.roi,s.bounding_box);assert.equal(comparison.source.image_sha256,s.image_sha256);assert.equal(comparison.source.common_input_sha256,page.input_sha256);assert.equal(comparison.source_gate??comparison.quality_gate.source_gate,'PASS');
 const engines=comparison.quality_gate.engine_inputs;assert.deepEqual(engines.map(e=>e.id),['tesseract','paddle']);
 for(const e of engines){const text=bytes(checkedRef(project,e.raw_ref)).toString('utf8'),record=json(checkedRef(project,e.result_ref));bytes(checkedRef(project,e.layout_ref));assert.equal(text,e.text);assert.equal(record.text,text);assert.equal(record.input_sha256,page.input_sha256);assert.equal(record.image_sha256,s.image_sha256);assert.deepEqual(record.blocks,e.blocks);assert.deepEqual(record.version,e.version);}
 const input={region_id:comparison.region_id,region_type:comparison.quality_gate.region_type,roi:comparison.roi,source:comparison.source,engines};assert.equal(stableStringify(alignDifferences(input,{version:comparison.version})),stableStringify(comparison),'Saved comparison does not reproduce');
 const fingerprint=sha(Buffer.from(stableStringify({sample:s,comparison_sha256:comparisonSHA,baseline_ref:baselineRef}))),c={...historicalCase,fingerprint,engines,quality:comparison.quality_gate,quality_sha256:comparisonSHA,
  baseline_draft:baseline?{text:baseline.ground_truth_text,structure:baseline.ground_truth_structure,revision:baseline.revision,status:baseline.review_status,record_ref:baselineRef,history_versions:history.length}:null,
  difference_review:{snapshot_sha256:comparisonSHA,source_ref:{path:relative(comparisonFile),sha256:comparisonSHA},groups:comparison.groups,summary:{total_groups:comparison.groups.length,difference_groups:comparison.groups.filter(g=>g.types.length).length,agreement_groups:comparison.groups.filter(g=>!g.types.length).length,unmatched_groups:comparison.groups.filter(g=>g.alignment_status==='UNMATCHED').length,ambiguous_groups:comparison.groups.filter(g=>g.alignment_status==='AMBIGUOUS').length},agreement_is_correctness:false}};
 const verify=()=>{verifySnapshot(snapshot);const now=fs.existsSync(historyDir)?fs.readdirSync(historyDir).sort():[];assert.deepEqual(now,historyFiles,'Historical draft changed; reload sources before continuing');};verify();return openDifferenceReview([c],root,verify);
}
