// Read existing P2-A only. Produces new B1 reports, never OCR or retry tasks.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {performance} from 'node:perf_hooks';
import {openP2A} from '../ocr-benchmark/p2a/workflow.mjs';import {assessB1Batch,VERSION} from './b1.mjs';import {writeNew,sha} from '../lib/ocr-quality-io.mjs';
const project=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
export async function runB1({dataset,output}){
 const local=p=>{const value=path.resolve(p);assert(value.startsWith(project+path.sep),'Path outside project');return value;},input=local(dataset),out=local(output);assert(!fs.existsSync(out),'Refuse existing output directory');
 const started=performance.now(),loaded=openP2A(input);assert.equal(loaded.cases.length,12,'B1 limited to existing twelve ROI');loaded.verify();const digest=sha(fs.readFileSync(path.join(input,'dataset.json'))),reports=[];
 for await(const report of assessB1Batch(loaded.cases,{sourceVerified:true}))reports.push(report);
 loaded.verify();assert(reports.every(r=>r.event_coverage.canonical_events===r.event_coverage.linked_events),'Diagnostic event lost');
 const routes={},types={};for(const r of reports){routes[r.quality_route]=(routes[r.quality_route]??0)+1;for(const i of r.issues)types[i.type]=(types[i.type]??0)+1;}
 const refs=['scripts/ocr-quality-gate/b1.mjs','scripts/ocr-quality-gate/b1-batch.mjs','scripts/ocr-multi-engine-diff/core.mjs','scripts/ocr-multi-engine-diff/p1.mjs'].map(file=>({path:file,sha256:sha(fs.readFileSync(path.join(project,file)))}));
 const summary={version:VERSION,scope:'Existing twelve P2-A ROI only',dataset_ref:{path:path.relative(project,path.join(input,'dataset.json')).replaceAll('\\','/'),sha256:digest},implementation_refs:refs,
  roi_count:reports.length,routes,issue_types:types,results:reports.map(r=>({sample_id:r.sample_id,source_gate:r.source_gate,quality_route:r.quality_route,risk_level:r.risk_level,issue_count:r.issues.length,exception_count:r.issues.filter(i=>i.role==='exception').length,context_count:r.issues.filter(i=>i.role!=='exception').length,canonical_events:r.event_coverage.canonical_events,linked_events:r.event_coverage.linked_events})),
  automatic_acceptance_enabled:false,content_confidence:null,auto_pass_rate:null,CER:null,WER:null,ocr_calls:0,paid_calls:0,api_cost_usd:0,retry_executed:false,source_verification:'PASS before and after analysis',elapsed_ms:performance.now()-started};
 fs.mkdirSync(out,{recursive:true});for(const r of reports)writeNew(path.join(out,r.sample_id+'.risk.json'),r);writeNew(path.join(out,'summary.json'),summary);
 const md=['# B1 十二 ROI 自動風險檢查','僅為未校準風險分流，不是正確率、已修正內容或 Ground Truth。','| ROI | 來源 | 分流 | 風險 | 例外 | 背景／比較關係 |','|---|---|---|---|---:|---:|',...summary.results.map(r=>'| '+[r.sample_id,r.source_gate,r.quality_route,r.risk_level,r.exception_count,r.context_count].join(' | ')+' |'),'','每筆 *.risk.json 保留問題位置、原因、嚴重度、建議、來源版本、P0/P1 原始事件與連結。SAMPLING_CANDIDATE 仍需人工抽查；RETRY_RECOMMENDED 不執行 OCR。','目前 content_confidence、CER、WER、自動通過率均為 null，未校準；沒有建立 verified，沒有啟動 B2／B3／B4。'];writeNew(path.join(out,'report.md'),md.join('\n'));return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),opts={};try{assert(args.length===4,'Use --dataset <existing> --out <new-directory>');for(let i=0;i<args.length;i+=2){assert(['--dataset','--out'].includes(args[i])&&!Object.hasOwn(opts,args[i]));opts[args[i]]=args[i+1];}assert(opts['--dataset']&&opts['--out']);runB1({dataset:opts['--dataset'],output:opts['--out']}).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',error:e.message}));process.exitCode=1;});}catch(e){console.error(e.message);process.exitCode=1;}
}
