// Import existing artifacts only: no OCR engine or network client is invoked.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {VERSION,validateDataset,validateResult,compare,stableStringify} from './core.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';
import {verifyOcr} from '../lib/textbook-page-catalog.mjs';

export const readJSON = file => JSON.parse(fs.readFileSync(file,'utf8'));
const relative=(root,file)=>path.relative(root,file).replaceAll('\\','/');
export function projectFile(root,file) {
  assert(typeof file==='string' && file && !path.isAbsolute(file),'Project-relative path required');
  const resolved=path.resolve(root,file),rel=path.relative(root,resolved);
  assert(rel && !rel.startsWith('..') && !path.isAbsolute(rel),'Path outside project');
  // Reject symlink escapes as well as lexical traversal.
  const realRoot=fs.realpathSync(root),real=fs.realpathSync(resolved),actual=path.relative(realRoot,real);
  assert(actual && !actual.startsWith('..') && !path.isAbsolute(actual),'Source symlink outside project');
  return resolved;
}
export function checkedRef(root,ref) {
  const file=projectFile(root,ref.path);assert.equal(sha(fs.readFileSync(file)),ref.sha256,'Source hash mismatch: '+ref.path);return file;
}
const ref=(root,file)=>({path:relative(root,file),sha256:sha(fs.readFileSync(file))});

export async function prepareDevelopment({project,reportPath,catalogPath}) {
  const reportFile=projectFile(project,reportPath),catalogFile=projectFile(project,catalogPath);
  const report=readJSON(reportFile),catalog=readJSON(catalogFile);
  assert(report.kind==='ocr-v23-stage2-existing15-quality-validation');
  assert(report.pages.length===15 && new Set(report.pages.map(p=>p.scanSeq)).size===15,'Expected existing 15-page audit');
  for(const source of report.sourceRefs)checkedRef(project,source);
  assert(report.sourceRefs.some(r=>r.path===catalogPath && r.sha256===ref(project,catalogFile).sha256),'Catalog not bound to audit');
  const manifestPath=report.pages[0].image.manifest,manifestFile=projectFile(project,manifestPath),manifest=readJSON(manifestFile);
  const sourceId=catalog.materialId, samples=[];
  for(const p of report.pages) {
    assert(p.image.manifest===manifestPath,'Mixed manifests require another source adapter');
    const matches=manifest.scans.filter(s=>s.originalFileName===p.image.file);assert.equal(matches.length,1,'Ambiguous image source');
    const scan=matches[0], page=catalog.pages.find(x=>x.scanSeq===p.scanSeq);assert(page,'Missing catalog page');
    assert.equal(page.pageId,p.pageId);assert.equal(page.originalFileName,p.image.file);assert.equal(page.image.path,scan.originalPath);
    assert.equal(scan.sha256,p.image.sha256);assert.equal(page.image.sha256,scan.sha256);
    assert.equal(sha(fs.readFileSync(scan.originalPath)),scan.sha256,'Image changed');
    for(const k of ['printedPage','label','pageNumberVerification'])assert.deepEqual(page[k],p[k],'Pagination differs');
    const resultFile=checkedRef(project,p.ocr.result);
    for(const layer of Object.values(p.ocr.layers))checkedRef(project,layer);
    const verified=verifyOcr(path.resolve(path.dirname(resultFile),'../../..'),resultFile,page);
    const runFile=path.resolve(path.dirname(resultFile),'../../../run.json');
    assert(fs.existsSync(runFile),'Missing OCR model/run provenance');
    assert.equal(verified.integrity.status,'PASS','Existing OCR integrity failure');
    const metadata=await sharp(scan.originalPath).metadata();
    assert.equal(metadata.width,verified.image.width);assert.equal(metadata.height,verified.image.height);
    const imageRef=ref(project,manifestFile);
    samples.push({sample_id:sourceId+'-scan-'+String(p.scanSeq).padStart(4,'0')+'-page',
      source_id:sourceId, material_id:catalog.materialId,page_id:p.pageId,
      image_sha256:p.image.sha256,image_path:p.image.file,image_path_resolution:'source_index_manifest_originalPath',
      image_width:verified.image.width,image_height:verified.image.height,
      dataset_split:'development',region_id:'full-page',region_type:'page',
      coordinate_space:'original_image_pixels',bounding_box:[0,0,verified.image.width,verified.image.height],polygon:null,
      reference_text:null,reference_structure:null,reference_origin:null,
      annotation_status:'pending_human_review',reviewer:null,reviewed_at:null,annotation_version:'1',approval:null,
      source_license_status:'unconfirmed',training_consent:false,leakage_group_id:catalog.materialId,
      parent_image_sha256:[],derived_from:[],scan_seq:p.scanSeq,printed_page:p.printedPage,printed_page_label:p.label,
      page_number_verification:p.pageNumberVerification,coverage_tags:p.categories,
      annotation_tasks:[...p.categories,'text_completeness','reading_order'],
      sources:{image_manifest:imageRef,ocr_result:p.ocr.result,ocr_layers:p.ocr.layers,ocr_run:ref(project,runFile)},
      existing_observation:{severity:p.severity,status:'agent_observation_not_ground_truth'}});
  }
  const dataset={schema_version:1,benchmark_version:VERSION,dataset_id:'biology-existing15-development-v1',
    source_index:[{source_id:sourceId,manifest:ref(project,manifestFile),resolution:'Exact originalFileName match; read originalPath; never copy image'}],
    provenance:[ref(project,reportFile),ref(project,catalogFile)],samples};
  validateDataset(dataset);return dataset;
}

export function importModelResult(input,sample) {
  // Generic adapter contract: callers supply outputs, never credentials or an
  // inference callback. A model config identifies an experimental arm.
  const result=structuredClone(input);validateResult(result,sample);return result;
}
export async function verifyImages(project,dataset) {
  validateDataset(dataset);const verified=[];
  for(const s of dataset.samples) {
    let imageFile;
    if(s.image_path_resolution==='source_index_manifest_originalPath') {
      const sources=dataset.source_index.filter(x=>x.source_id===s.source_id);assert.equal(sources.length,1,'Unknown/ambiguous image source');
      const manifest=readJSON(checkedRef(project,sources[0].manifest));
      const scans=manifest.scans.filter(x=>x.originalFileName===s.image_path);assert.equal(scans.length,1,'Unknown/ambiguous image');
      assert.equal(scans[0].sha256,s.image_sha256);imageFile=scans[0].originalPath;
    } else imageFile=projectFile(project,s.image_path);
    assert.equal(sha(fs.readFileSync(imageFile)),s.image_sha256,'Image source changed');
    const meta=await sharp(imageFile).metadata();assert.equal(meta.width,s.image_width);assert.equal(meta.height,s.image_height);
    verified.push({sample_id:s.sample_id,image_sha256:s.image_sha256,status:'PASS',scope:'Image hash/dimensions only; not recognition accuracy'});
  }
  return verified;
}
export function readResultRecords(project,dataset,records) {
  validateDataset(dataset);assert(Array.isArray(records));
  return records.map(record=>{
    const s=dataset.samples.find(x=>x.sample_id===record.sample_id);assert(s,'Unknown imported sample');
    const r=structuredClone(record);
    if(r.OCR_output?.text_ref) {
      const raw=fs.readFileSync(checkedRef(project,r.OCR_output.text_ref),'utf8');
      if(Object.hasOwn(r.OCR_output,'text'))assert.equal(r.OCR_output.text,raw,'Inline OCR does not match immutable text ref');
      r.OCR_output.text=raw;
    }
    return importModelResult(r,s);
  });
}
export async function importExistingTesseract(project,dataset) {
  validateDataset(dataset); const outputs=[],integrity=[];
  for(const source of dataset.provenance||[])checkedRef(project,source);
  for(const s of dataset.samples) {
    const index=dataset.source_index.filter(x=>x.source_id===s.source_id);assert.equal(index.length,1,'Ambiguous source index');
    const manifest=readJSON(checkedRef(project,index[0].manifest));
    const matches=manifest.scans.filter(x=>x.originalFileName===s.image_path);assert.equal(matches.length,1,'Missing/ambiguous image');
    assert.equal(matches[0].sha256,s.image_sha256);assert.equal(sha(fs.readFileSync(matches[0].originalPath)),s.image_sha256);
    const resultFile=checkedRef(project,s.sources.ocr_result),old=readJSON(resultFile);
    const page={scanSeq:s.scan_seq,image:{sha256:s.image_sha256},originalFileName:s.image_path,
      printedPage:s.printed_page,label:s.printed_page_label,pageNumberVerification:s.page_number_verification};
    const verified=verifyOcr(path.resolve(path.dirname(resultFile),'../../..'),resultFile,page);
    assert.equal(verified.integrity.status,'PASS');
    const meta=await sharp(matches[0].originalPath).metadata();assert.equal(meta.width,s.image_width);assert.equal(meta.height,s.image_height);
    for(const layer of Object.values(s.sources.ocr_layers))checkedRef(project,layer);
    const textFile=checkedRef(project,s.sources.ocr_layers['raw.txt']);
    const storedEngine=old.engine;
    // Run metadata is independently hashed; model provenance is never guessed.
    const run=readJSON(checkedRef(project,s.sources.ocr_run));
    const engine=storedEngine || run?.engine || run?.config?.engine;
    assert(engine?.name==='tesseract.js' && typeof engine.version==='string','Unknown model provenance: stop');
    const result=importModelResult({result_id:s.sample_id+'::tesseract-existing',sample_id:s.sample_id,image_sha256:s.image_sha256,
      model_family:'tesseract.js',model_id:'tesseract.js',model_version:engine.version,
      model_config:{languages:engine.languages,models:engine.models,oem:engine.oem,psm:String(engine.psm),core_version:engine.coreVersion,
        preprocessing:run.config?.preprocessing??engine.preprocessing??null,
        runner_sha256:run.config?.runnerSha256??engine.adapterSha256??null,
        normalization_sha256:run.config?.normalization?.sha256??engine.normalizationSha256??null,output_layer:'immutable_raw'},
      execution_time:old.elapsedMs??null,execution_time_unit:'ms',estimated_cost:0,actual_cost:0,currency:'USD',
      cost_scope:'local OCR API/service charges only; electricity/labour excluded; imported historical execution',
      OCR_output:{text:fs.readFileSync(textFile,'utf8'),text_ref:s.sources.ocr_layers['raw.txt'],structure:null,structure_alignment:null},
      source_result:s.sources.ocr_result,source_run:s.sources.ocr_run,benchmark_result:null},s);
    outputs.push(result);integrity.push({sample_id:s.sample_id,image_sha256:s.image_sha256,
      result_sha256:s.sources.ocr_result.sha256,raw_sha256:s.sources.ocr_layers['raw.txt'].sha256,
      status:'PASS',scope:'Hash, pagination, dimensions and same-source alignment only; not content accuracy'});
  }
  return {outputs,integrity};
}
export function publicResult(result) {
  const out=structuredClone(result);
  assert(out.OCR_output.text_ref,'Persist real textbook text by reference only');
  delete out.OCR_output.text;return out;
}
export function markdownReport(comparison,integrity) {
  const rows=comparison.models.flatMap(m=>m.rows);
  return '# OCR Benchmark v1 本機驗證結果\n\n'+
    '僅匯入既有 OCR；沒有重新辨識、API 呼叫或人工標註。來源完整性 PASS 不代表文字正確。\n\n'+
    `來源檢查：${integrity.length} 頁；模型設定組：${comparison.models.length}。\n\n`+
    '| sample_id | split | 標註 | CER | 英文 WER |\n|---|---|---|---|---|\n'+
    rows.map(r=>`| ${r.sample_id} | ${r.dataset_split} | ${r.reference_status} | ${r.metrics.cer.value??'null / NOT_EVALUATED'} | ${r.metrics.english_wer.value??'null / NOT_EVALUATED'} |`).join('\n')+
    '\n\n尚無獨立人工參考答案，不排名、不宣稱準確率。結構評分需人工結構標註與 canonical ID 對齊；概念圖評分、手機缺陷偵測、未申報衍生圖近似去重為 NOT_IMPLEMENTED。\n';
}
export function evaluateImported(dataset,outputs) {
  const comparison=compare(dataset,outputs);
  const lookup=new Map(comparison.models.flatMap(m=>m.rows.map(r=>[r.sample_id+'\0'+m.model_family+'\0'+r.model_id+'\0'+r.model_version+'\0'+stableStringify(m.model_config),r])));
  return {comparison,results:outputs.map(r=>({...r,benchmark_result:lookup.get(r.sample_id+'\0'+r.model_family+'\0'+r.model_id+'\0'+r.model_version+'\0'+stableStringify(r.model_config))}))};
}
