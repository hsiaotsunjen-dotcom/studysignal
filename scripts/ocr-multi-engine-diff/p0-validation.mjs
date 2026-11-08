// Four registered existing pages only. No OCR, API, annotations, or source writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {alignDifferences} from './core.mjs';import {writeNew} from '../lib/ocr-quality-io.mjs';
const root=path.resolve(fileURLToPath(new URL('../../',import.meta.url))),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export const PAGES=Object.freeze([6,19,200,317]);
export function loadP0Page(seq,project=root){
 assert(PAGES.includes(seq),'Page outside approved P0 scope');const snapshot=new Map(),read=f=>{const b=fs.readFileSync(f);snapshot.set(f,sha(b));return b;},json=f=>JSON.parse(read(f));
 const exp=path.join(project,'tmp-ocr-fourpage-dual-20261107-v1'),p=json(path.join(exp,'inputs.json')).pages.find(p=>p.seq===seq);assert(p,'Registered scan required');
 const manifest=json(path.join(project,'content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json')),scan=manifest.scans.find(s=>s.originalFileName===p.file);assert(scan);assert.equal(scan.sha256,p.image_sha256);assert.equal(scan.originalPath,p.original);
 assert.equal(sha(read(p.original)),p.image_sha256);const inputFile=path.join(exp,'inputs',String(seq).padStart(4,'0')+'.png');assert.equal(sha(read(inputFile)),p.input_sha256);
 const old=json(path.join(exp,'comparisons',String(seq).padStart(4,'0')+'.json'));assert.equal(old.page_id,p.page_id);assert.equal(old.source.image_sha256,p.image_sha256);assert.equal(old.source.common_input_sha256,p.input_sha256);
 const engines=old.quality_gate.engine_inputs;for(const e of engines){for(const ref of [e.raw_ref,e.layout_ref,e.result_ref])assert.equal(sha(read(path.resolve(project,ref.path))),ref.sha256);assert.equal(fs.readFileSync(path.resolve(project,e.raw_ref.path),'utf8'),e.text);const r=json(path.resolve(project,e.result_ref.path));assert.equal(r.input_sha256,p.input_sha256);assert.equal(r.image_sha256,p.image_sha256);assert.deepEqual(r.blocks,e.blocks);}
 return {p,old,input:{region_id:old.region_id,region_type:old.quality_gate.region_type,roi:old.roi,source:old.source,engines},snapshot};
}
function stats(r){const map=new Map();for(const g of r.groups)for(const side of ['left','right'])for(const s of g[side].spans)map.set(g[side].engine+':'+s.block_id,g);
 const q=r.quality_gate.issues.filter(i=>i.type==='unmatched_ocr_block');return {groups:r.groups.length,difference_groups:r.groups.filter(g=>g.types.length).length,agreement_groups:r.groups.filter(g=>!g.types.length).length,unmatched_groups:r.groups.filter(g=>g.alignment_status==='UNMATCHED').length,ambiguous_groups:r.groups.filter(g=>g.alignment_status==='AMBIGUOUS').length,gate_unmatched_blocks:q.length,gate_unmatched_in_matched_group:q.filter(i=>map.get(i.engine_id+':'+i.block_ids[0])?.alignment_status!=='UNMATCHED').length,quality_events:r.quality_gate.issues.length,review_items:r.review_items.length,CER:r.CER,WER:r.WER};}
function orderChanges(input,r){const changes=[];for(const g of r.groups)for(const [side,e] of [['left',input.engines[0]],['right',input.engines[1]]]){const ids=new Set(g[side].spans.map(s=>s.block_id)),expected=e.blocks.filter(b=>ids.has(b.id)).map(b=>b.id),actual=g[side].spans.map(s=>s.block_id);if(JSON.stringify(expected)!==JSON.stringify(actual))changes.push({group:g.id,engine:e.id,source_order:expected,comparison_order:actual});}return changes;}
export function validateP0(seq,project=root){const {p,old,input,snapshot}=loadP0Page(seq,project),before=JSON.stringify(input),start=performance.now(),candidate=alignDifferences(input),elapsed=performance.now()-start;
 assert.deepEqual(alignDifferences(input,{version:old.version}),old,'Historical comparison must still reproduce');assert.equal(JSON.stringify(input),before);
 for(const [file,digest] of snapshot)assert.equal(sha(fs.readFileSync(file)),digest,'Source changed');const changes=orderChanges(input,candidate);assert.equal(changes.length,0,'Candidate changed source order');const after=stats(candidate);assert.equal(after.gate_unmatched_in_matched_group,0);
 // Connected component membership and unmatched regions must not be changed to hide differences.
 const membership=r=>r.groups.map(g=>['left','right'].map(side=>g[side].spans.map(s=>s.block_id).sort()));assert.deepEqual(membership(candidate),membership(old));
 return {candidate,summary:{scan_seq:seq,page_id:p.page_id,image_filename:p.file,image_sha256:p.image_sha256,printed_page:p.printed_page,page_number_verification:p.page_number_verification,source_files_verified:snapshot.size,before:stats(old),after,before_order_changes:orderChanges(input,old),after_order_changes:changes,candidate_runtime_ms:elapsed,source_bytes_unchanged:true,status:'pending_human_review',formal_accuracy:'NOT_EVALUATED',manual_time_savings:null}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);assert(args.length===2&&args[0]==='--output','Use --output <new-directory>');const out=path.resolve(args[1]);assert(out.startsWith(root+path.sep),'Output must remain inside project');assert(!fs.existsSync(out),'Refuse existing output directory');
 const results=PAGES.map(seq=>validateP0(seq)); // preflight all sources before any output
 fs.mkdirSync(out,{recursive:true});for(const {candidate,summary} of results)writeNew(path.join(out,String(summary.scan_seq).padStart(4,'0')+'.candidate.json'),candidate);
 const report={scope:'Existing four pages only; no OCR or annotations',pages:results.map(r=>r.summary),api_cost_usd:0,engineering_tests_are_not_accuracy:true};writeNew(path.join(out,'summary.json'),report);console.log(JSON.stringify(report));
}
