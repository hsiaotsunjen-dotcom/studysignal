// Read-only validation by default; --write-new creates one immutable comparison.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sha,exclusive,verifyArtifacts} from './lib/kb-ocr-batch.mjs';
import {approvedMetric} from './lib/ocr-quality-metrics.mjs';
const args=process.argv.slice(2);assert(args.every(a=>a==='--write-new'));
const root='content/knowledge-base/ocr-pilot/biology-quality-regions-20261101-v1';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const plan=read('scripts/ocr-biology-quality-regions-plan.json');
const gt=read(root+'/ground-truth-candidates.json');
const run=read(root+'/experiments/run.json');
assert.equal(sha(fs.readFileSync('scripts/ocr-biology-quality-regions-plan.json')),run.config.planSha256);
assert.equal(sha(fs.readFileSync('scripts/kb-ocr-quality-regions.mjs')),run.config.scriptSha256);
assert.equal(gt.regions.length,12);assert.equal(new Set(gt.regions.map(r=>r.id)).size,12);
const manifest=read('content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json');
const index=read('content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/page-index.json');
for(const r of gt.regions){
  assert.equal(r.verification_status,'pending_human_review');assert.equal(r.humanApproved,false);
  assert.equal(sha(fs.readFileSync(r.image)),r.imageSha256);
  const s=manifest.scans.find(s=>s.originalFileName===r.file);assert(s);assert.equal(sha(fs.readFileSync(s.originalPath)),r.sourceSha256);assert.equal(s.sha256,r.sourceSha256);
  const e=index.entries.find(e=>e.seq===r.seq);assert.equal(e.file,r.file);assert.equal(e.verification,r.verification);assert.equal(e.printedPage,r.printedPage);
}
const records=[];
for(const job of fs.readdirSync(root+'/experiments/pages').sort()){
  const dir=root+'/experiments/pages/'+job;
  const successes=fs.readdirSync(dir).filter(a=>fs.existsSync(dir+'/'+a+'/result.json'));
  assert.equal(successes.length,1);
  const d=dir+'/'+successes[0],r=read(d+'/result.json');verifyArtifacts(root+'/experiments',r);
  const region=gt.regions.find(x=>x.id===r.regionId);assert(region);assert.equal(region.imageSha256,r.reviewImageSha256);assert.equal(region.sourceSha256,r.sourceSha256);
  assert.equal(r.humanApproved,false);assert.equal(r.status,'pending_human_review');
  const baseline=fs.readFileSync(d+'/baseline-region.txt','utf8'),output=fs.readFileSync(d+'/raw.txt','utf8');
  const metricKind=region.type==='chinese-prose'?'CER':region.type==='english-terms'?'WER':null;
  const metric=metricKind?approvedMetric({region,approval:null,hypothesis:output,kind:metricKind}):null;
  if(metric)assert.equal(metric.value,null);
  records.push({job:r.job,regionId:r.regionId,sourceSeq:r.sourceSeq,variant:r.variant,elapsedMs:r.elapsedMs,confidence:r.confidence,baseline,output,baselineMethod:r.baselineMethod,metricKind,metric,status:'pending_human_review',flags:[...(region.type==='blank-control'&&output.trim()?['blank-control-nonempty-output-regression']:[]),...(['chemical-symbols','greek-symbols','table','figure-labels'].includes(region.type)?['requires-symbol-or-layout-review']:[])],resultPath:d+'/result.json'});
}
assert.equal(records.length,20);assert.equal(new Set(records.map(r=>r.regionId)).size,12);
const report={schemaVersion:1,scope:'12 regions / 9 existing pilot source pages; no full-book OCR',humanGroundTruthStatus:'pending_human_review',humanApprovals:0,formalCER:null,formalWER:null,qualityPassed:false,executionChecksPassed:true,regions:12,completedJobs:records.length,experimentJobSeconds:records.reduce((n,r)=>n+r.elapsedMs/1000,0),baselineCaveat:'Baseline is word-center intersection of previous full-page TSV; crop boundaries and layout differ. No accuracy gain is established without human reference.',sources:{plan:'scripts/ocr-biology-quality-regions-plan.json',planSha256:run.config.planSha256,candidates:root+'/ground-truth-candidates.json',candidateSha256:sha(fs.readFileSync(root+'/ground-truth-candidates.json'))},records};
if(args.includes('--write-new'))exclusive(root+'/quality-comparison-v2.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({executionChecksPassed:true,regions:12,jobs:20,formalCER:null,formalWER:null,humanApprovals:0,qualityPassed:false,experimentJobSeconds:report.experimentJobSeconds,output:args.includes('--write-new')?root+'/quality-comparison-v2.json':null}));
