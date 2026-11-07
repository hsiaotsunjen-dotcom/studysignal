// Two-region, local-only review adapter. No inference, AI proposals, or KB writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha,writeNew} from './ocr-quality-io.mjs';
import {textEdits} from './ocr-ai-source-evidence.mjs';
import {VERSION,stableStringify,annotationDigest,validateSample,validateDataset,evaluate} from '../ocr-benchmark/core.mjs';
import {checkedRef} from '../ocr-benchmark/io.mjs';

export const TEXT_REGIONS=Object.freeze(['table-nucleic-acids','formula-iron']);
const regionRoot='content/knowledge-base/ocr-pilot/biology-quality-regions-20261101-v1';
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const digest=x=>sha(Buffer.from(stableStringify(x)));
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function loadTextReviewCases(project) {
  const datasetFile=path.join(project,'scripts/ocr-benchmark/datasets/biology-development.v1.json');
  const dataset=read(datasetFile);validateDataset(dataset);
  const definitionFile=path.join(project,regionRoot,'ground-truth-candidates.json'),definitions=read(definitionFile);
  const runFile=path.join(project,regionRoot,'experiments/run.json'),run=read(runFile);
  assert(typeof run.config.engine==='string'&&run.config.engine,'Missing historical engine version');
  const cases=TEXT_REGIONS.map(id=>{
    const definitionsForId=definitions.regions.filter(r=>r.id===id);assert.equal(definitionsForId.length,1,'Ambiguous region');
    const r=definitionsForId[0],pages=dataset.samples.filter(s=>s.scan_seq===r.seq);assert.equal(pages.length,1);
    const page=pages[0],manifestFile=checkedRef(project,page.sources.image_manifest),manifest=read(manifestFile);
    const matches=manifest.scans.filter(x=>x.originalFileName===r.file);assert.equal(matches.length,1);
    assert.equal(page.image_sha256,r.sourceSha256);assert.equal(matches[0].sha256,r.sourceSha256);assert.equal(page.image_path,r.file);
    const job=id==='table-nucleic-acids'?'0008':'0005';
    const resultFile=path.join(project,regionRoot,'experiments/pages',job,'attempt-01/result.json'),result=read(resultFile);
    assert.equal(result.regionId,id);assert.equal(result.sourceSeq,r.seq);assert.equal(result.file,r.file);
    assert.equal(result.sourceSha256,page.image_sha256);assert.equal(result.printedPage,page.printed_page);
    assert.equal(result.verification,page.page_number_verification);assert.equal(result.reviewImageSha256,r.imageSha256);
    assert.deepEqual(result.rect,r.rect);assert.equal(result.baselineResultSha256,page.sources.ocr_result.sha256);
    const rawFile=path.join(path.dirname(resultFile),'raw.txt'),rawHash=result.artifacts[`pages/${job}/attempt-01/raw.txt`];
    assert.equal(result.rawChecksum,rawHash);
    const refs=[{path:runFile,sha256:sha(fs.readFileSync(runFile))},{path:datasetFile,sha256:sha(fs.readFileSync(datasetFile))},
      {path:definitionFile,sha256:sha(fs.readFileSync(definitionFile))},{path:manifestFile,sha256:page.sources.image_manifest.sha256},
      {path:matches[0].originalPath,sha256:page.image_sha256},{path:path.join(project,r.image),sha256:r.imageSha256},
      {path:resultFile,sha256:sha(fs.readFileSync(resultFile))},{path:rawFile,sha256:rawHash}];
    checkedRef(project,page.sources.ocr_result);
    const sample={...structuredClone(page),sample_id:page.sample_id+'--'+id,region_id:id,
      region_type:id==='formula-iron'?'formula':'table',bounding_box:[r.rect.left,r.rect.top,r.rect.width,r.rect.height],
      reference_text:null,reference_structure:null,annotation_status:'pending_human_review',reviewer:null,reviewed_at:null,
      annotation_version:'1',approval:null,reference_origin:null};validateSample(sample);
    const binding={sample_id:sample.sample_id,page_id:sample.page_id,region_id:id,image_sha256:page.image_sha256,
      crop_sha256:r.imageSha256,raw_sha256:rawHash,result_sha256:sha(fs.readFileSync(resultFile)),bounding_box:sample.bounding_box,
      run_sha256:sha(fs.readFileSync(runFile)),region_definition_sha256:sha(fs.readFileSync(definitionFile)),sample_seed_sha256:digest(sample)};
    const c={id,kind:'real',sample,source_index:dataset.source_index,source_fingerprint:digest(binding),binding,
      refs,originalPath:matches[0].originalPath,cropPath:path.join(project,r.image),rawPath:rawFile,
      original_ocr_text:fs.readFileSync(rawFile,'utf8'),engine:result.variant,engine_version:run.config.engine,execution_time:result.elapsedMs,
      text_ref:{path:path.relative(project,rawFile).replaceAll('\\','/'),sha256:rawHash}};
    verifyTextSource(c);return c;
  });return cases;
}
export function verifyTextSource(c) {
  assert(TEXT_REGIONS.includes(c.id),'Region outside approved scope');validateSample(c.sample);
  for(const ref of c.refs)assert.equal(sha(fs.readFileSync(ref.path)),ref.sha256,'Source SHA mismatch; review blocked');
  assert.equal(fs.readFileSync(c.rawPath,'utf8'),c.original_ocr_text,'OCR source changed');
  assert.equal(c.sample.region_id,c.id);assert.equal(c.sample.image_sha256,c.binding.image_sha256);
  assert.deepEqual(c.sample.bounding_box,c.binding.bounding_box);assert.equal(digest(c.binding),c.source_fingerprint);
  if(c.binding.sample_seed_sha256)assert.equal(digest(c.sample),c.binding.sample_seed_sha256,'Benchmark source sample changed');
  return true;
}
const recordDigest=r=>{const {annotation_digest,...body}=r;return digest(body);};
function checkRecord(r,c,previous,index) {
  assert(r.kind==='ocr-benchmark-text-review-v11' && r.data_kind===c.kind,'Wrong review format/simulation scope');
  assert.equal(r.revision,index);assert.equal(r.previous_digest,previous?.annotation_digest??null,'Broken review chain');
  assert.equal(r.annotation_digest,recordDigest(r),'Annotation digest mismatch');
  for(const key of ['sample_id','source_id','page_id','region_id','image_sha256'])assert.equal(r[key],c.sample[key],'Cross-region/source review');
  assert.equal(r.source_fingerprint,c.source_fingerprint);assert.equal(r.original_ocr_text,c.original_ocr_text);
  assert.equal(r.crop_sha256,c.binding.crop_sha256);assert.equal(r.original_ocr_sha256,c.binding.raw_sha256);
  assert.deepEqual(r.bounding_box,c.sample.bounding_box);assert.deepEqual(r.ocr_source,c.text_ref);
  assert(typeof r.corrected_text==='string'&&r.corrected_text.length<=10000);
  assert(['pending_human_review','human_confirmed'].includes(r.annotation_status));
  if(r.annotation_status==='human_confirmed') {
    assert(r.human_confirmed===true&&typeof r.reviewer_id==='string'&&r.reviewer_id.trim());
    assert(Number.isFinite(Date.parse(r.reviewed_at)));assert(r.checks.image_compared===true&&r.checks.region_text_complete===true);
  }else assert(r.human_confirmed===false&&r.reviewed_at===null);
  return r;
}
export function openTextReviewStore(root,cases) {
  assert.equal(cases.length,2);assert.deepEqual([...cases.map(c=>c.id)].sort(),[...TEXT_REGIONS].sort());
  const kinds=new Set(cases.map(c=>c.kind));assert(kinds.size===1&&['real','synthetic_test_only'].includes(cases[0].kind));
  const marker={kind:'ocr-benchmark-text-review-v11-store',data_kind:cases[0].kind,schema_version:1};
  root=path.resolve(root);
  const directory=dir=>{const s=fs.lstatSync(dir);assert(s.isDirectory()&&!s.isSymbolicLink(),'Unsafe review directory');};
  function checkRoot(){if(fs.existsSync(root)){directory(root);assert(!fs.lstatSync(path.join(root,'store.json')).isSymbolicLink(),'Unsafe store marker');assert.deepEqual(read(path.join(root,'store.json')),marker,'Not this review store');}}
  checkRoot();
  const selected=id=>{const c=cases.find(x=>x.id===id);if(!c)fail('Unknown region',404);verifyTextSource(c);return c;};
  function latest(id) {
    const c=selected(id);checkRoot();const dir=path.join(root,id);if(!fs.existsSync(dir))return null;directory(dir);
    const files=fs.readdirSync(dir).sort();assert(files.every(f=>/^\d{9}\.json$/.test(f)),'Unexpected review file');let previous=null;
    for(const [i,file]of files.entries()) {
      assert.equal(file,String(i+1).padStart(9,'0')+'.json','Missing revision');
      const full=path.join(dir,file);assert(!fs.lstatSync(full).isSymbolicLink(),'Unsafe review file');
      previous=checkRecord(read(full),c,previous,i+1);
    }return previous;
  }
  function save(id,body) {
    const c=selected(id),previous=latest(id);
    const allowed=['action','source_fingerprint','expected_revision','corrected_text','reviewer_id','human_confirmed','checks'];
    assert(body&&Object.keys(body).every(k=>allowed.includes(k)),'Unexpected submission fields');
    assert(['draft','confirm'].includes(body.action));assert.equal(body.source_fingerprint,c.source_fingerprint,'Wrong source/region fingerprint');
    if(body.expected_revision!==(previous?.revision??0))fail('Review changed; reload before saving',409);
    assert(typeof body.corrected_text==='string'&&body.corrected_text.length<=10000,'Invalid corrected text');
    assert(typeof body.reviewer_id==='string'&&body.reviewer_id.length<=256);
    const confirmed=body.action==='confirm';
    assert(body.human_confirmed===confirmed,'Explicit matching human confirmation required');
    if(confirmed){assert(body.reviewer_id.trim(),'Reviewer ID required');assert(body.corrected_text.trim(),'Both selected regions contain text; empty transcription must remain pending');assert(body.checks?.image_compared===true&&body.checks?.region_text_complete===true,'Both image and whole-region text checks required');}
    const now=new Date().toISOString(),r={kind:'ocr-benchmark-text-review-v11',data_kind:c.kind,
      sample_id:c.sample.sample_id,source_id:c.sample.source_id,page_id:c.sample.page_id,region_id:c.id,
      image_sha256:c.sample.image_sha256,crop_sha256:c.binding.crop_sha256,original_ocr_sha256:c.binding.raw_sha256,
      source_fingerprint:c.source_fingerprint,bounding_box:c.sample.bounding_box,ocr_source:c.text_ref,
      image_source:{file:c.sample.image_path,manifest:c.sample.sources?.image_manifest??null},
      original_ocr_text:c.original_ocr_text,corrected_text:body.corrected_text,
      reviewer_id:body.reviewer_id.trim()||null,reviewed_at:confirmed?now:null,saved_at:now,
      annotation_status:confirmed?'human_confirmed':'pending_human_review',human_confirmed:confirmed,
      checks:confirmed?{image_compared:true,region_text_complete:true}:null,
      revision:(previous?.revision??0)+1,previous_digest:previous?.annotation_digest??null,
      difference:textEdits(c.original_ocr_text,body.corrected_text),is_ground_truth:false};
    r.annotation_digest=recordDigest(r);checkRecord(r,c,previous,r.revision);verifyTextSource(c);
    if(!fs.existsSync(root)){fs.mkdirSync(root);writeNew(path.join(root,'store.json'),marker);}checkRoot();
    const dir=path.join(root,id);if(!fs.existsSync(dir))fs.mkdirSync(dir);directory(dir);
    try{writeNew(path.join(dir,String(r.revision).padStart(9,'0')+'.json'),r);}catch(e){if(e.code==='EEXIST')fail('Concurrent save; reload',409);throw e;}
    return r;
  }
  function benchmark(id) {
    const c=selected(id),r=latest(id);if(!r||r.annotation_status!=='human_confirmed')fail('No confirmed human reference; NOT_EVALUATED',409);
    const sample={...structuredClone(c.sample),reference_text:r.corrected_text,reference_structure:null,
      annotation_status:'human_confirmed',reviewer:r.reviewer_id,reviewed_at:r.reviewed_at,annotation_version:String(r.revision),
      reference_origin:'human_checked_against_image',data_kind:c.kind,
      review_provenance:{annotation_digest:r.annotation_digest,source_fingerprint:r.source_fingerprint},approval:null};
    sample.approval={reviewer_type:'human',confirmed:true,annotation_sha256:annotationDigest(sample)};validateSample(sample);
    const dataset={schema_version:1,benchmark_version:VERSION,dataset_id:'biology-v11-two-regions',source_index:c.source_index,samples:[sample]};validateDataset(dataset);
    const model={result_id:sample.sample_id+'-existing-region',sample_id:sample.sample_id,image_sha256:sample.image_sha256,
      model_family:'tesseract.js',model_id:'tesseract.js-region-experiment',model_version:c.engine_version,model_config:c.engine,
      execution_time:c.execution_time,execution_time_unit:'ms',estimated_cost:0,actual_cost:0,currency:'USD',
      OCR_output:{text:c.original_ocr_text,text_ref:c.text_ref,structure:null,structure_alignment:null},benchmark_result:null};
    model.benchmark_result=evaluate(sample,model);
    return {kind:'ocr-benchmark-v11-human-export',simulation:c.kind!=='real',
      is_ground_truth:c.kind==='real',dataset,model_result:model,annotation_digest:r.annotation_digest,
      scope:'Confirmed text in this crop only; table structure, full-page completeness and scientific semantics not verified'};
  }
  return {root,latest,save,benchmark,selected};
}
