// Four existing pages only; independent outputs, no OCR or annotation writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {performance} from 'node:perf_hooks';
import {PAGES,validateP0} from './p0-validation.mjs';import {classifyComparison,VERSION} from './p1.mjs';import {writeNew} from '../lib/ocr-quality-io.mjs';
import {sha} from '../lib/ocr-quality-io.mjs';import {stableStringify} from '../ocr-benchmark/core.mjs';
const project=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
export function validateP1(seq){const {candidate,summary:p0}=validateP0(seq),start=performance.now(),classification=classifyComparison(candidate),elapsed=performance.now()-start;
 const ref=file=>({path:file,sha256:sha(fs.readFileSync(path.join(project,file)))});
 classification.provenance={implementation:ref('scripts/ocr-multi-engine-diff/p1.mjs'),runner:ref('scripts/ocr-multi-engine-diff/p1-validation.mjs'),p0_core:ref('scripts/ocr-multi-engine-diff/core.mjs'),saved_historical_comparison:ref('tmp-ocr-fourpage-dual-20261107-v1/comparisons/'+String(seq).padStart(4,'0')+'.json'),p0_comparison_sha256:sha(Buffer.from(stableStringify(candidate)))};
 assert.equal(classification.summary.suspected_missing,p0.after.unmatched_groups);assert.equal(classification.groups.length,p0.after.groups);assert.equal(classification.summary.confirmed_missing,0);
 const beforeTypes={};for(const g of candidate.groups)for(const t of g.types)beforeTypes[t]=(beforeTypes[t]??0)+1;
 return {classification,summary:{scan_seq:seq,page_id:p0.page_id,image_filename:p0.image_filename,image_sha256:p0.image_sha256,printed_page:p0.printed_page,page_number_verification:p0.page_number_verification,
  before:{baseline:'P0 candidate, not pre-P0 historical report',groups:p0.after.groups,difference_groups:p0.after.difference_groups,review_items:p0.after.review_items,quality_events:p0.after.quality_events,type_flags:beforeTypes},
  after:classification.summary,classification_runtime_ms:elapsed,source_integrity:'verified by existing P0 preflight',confirmed_missing:null,confirmed_false_alarms:null,CER:null,WER:null,manual_time_savings:null,api_cost_usd:0}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--output','Use --output <new-directory>');const out=path.resolve(args[1]);assert(out.startsWith(project+path.sep),'Output must remain inside project');assert(!fs.existsSync(out),'Refuse existing output directory');
 const results=PAGES.map(validateP1);fs.mkdirSync(out,{recursive:true});for(const r of results)writeNew(path.join(out,String(r.summary.scan_seq).padStart(4,'0')+'.classification.json'),r.classification);
 const report={version:VERSION,scope:'Only existing scan 6,19,200,317; no OCR, no GT',pages:results.map(r=>r.summary),api_cost_usd:0,formal_quality:'NOT_EVALUATED'};writeNew(path.join(out,'summary.json'),report);console.log(JSON.stringify(report));
}
