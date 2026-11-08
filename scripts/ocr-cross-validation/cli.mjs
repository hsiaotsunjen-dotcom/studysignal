// Prepare existing twelve ROI for offline comparison. No network/OCR/GT writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {openP2A} from '../ocr-benchmark/p2a/workflow.mjs';
import {assessB1} from '../ocr-quality-gate/b1.mjs';
import {sha,writeNew} from '../lib/ocr-quality-io.mjs';
import {makeRequest,PROVIDERS,reviewState,evaluateFromReview,VERSION} from './core.mjs';
import {estimateCost,costRollup} from './budget.mjs';
const project=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
function newOutput(p){
 const out=path.resolve(p);assert(out.startsWith(project+path.sep),'Output must stay inside project');assert(!fs.existsSync(out),'Refuse existing output');
 const real=fs.realpathSync(path.dirname(out));assert(real===project||real.startsWith(project+path.sep),'Output parent outside project');return out;
}
export function prepare({dataset,output}){
 const out=newOutput(output),started=performance.now(),root=path.resolve(dataset);assert(root.startsWith(project+path.sep),'Dataset must stay inside project');
 const loaded=openP2A(root);assert.equal(loaded.cases.length,12,'Only existing twelve ROI allowed');loaded.verify();
 const versions={google:'processor-version-pending-selection',azure:'2024-11-30:prebuilt-layout',openai:'gpt-5.4-mini-2026-03-17'},rows=[],estimates=[];
 for(const c of loaded.cases){
  const baseline=assessB1(c,{sourceVerified:true}),review=loaded.store.latest(c.id),tasks=[];
  for(const provider of Object.keys(PROVIDERS)){
   const req=makeRequest(c,provider,{modelVersion:versions[provider]}),estimate=estimateCost(req,provider==='openai'?{input_tokens:8000,max_output_tokens:2000,input_includes_image_tokens:true}:provider==='google'?{pages:1,math_addon:c.definition.category==='science'}:{});
   estimates.push({roi_id:c.id,provider,estimate});tasks.push({request:req,estimate,execution_status:'BLOCKED_OFFLINE_ONLY',blocking_reasons:['No paid execution authorization','Usage rights not reviewed','No live transport',...(provider==='google'?['Processor version not selected']:[]),...(provider==='azure'?['Price quote not verified']:[])]});
  }
  const metrics=c.engines.map(e=>{
   const model={result_id:c.id+'-'+e.id,sample_id:c.id,image_sha256:c.sample.image_sha256,model_family:e.id==='tesseract'?'tesseract.js':'paddleocr',model_id:e.id,model_version:typeof e.version==='string'?e.version:e.version.paddleocr,model_config:e.config,execution_time:null,execution_time_unit:'ms',estimated_cost:0,actual_cost:0,currency:'USD',OCR_output:{text:e.text,structure:null,structure_alignment:null},benchmark_result:null};
   return {engine:e.id,evaluation:evaluateFromReview(loaded,c,model)};
  });
  rows.push({sample_id:c.id,source_status:'resolved',validation_state:reviewState(review),source:tasks[0].request.source,source_texts_retained_in_originals:true,
   local_ocr_refs:c.engines.map(e=>({engine:e.id,version:e.version,config:e.config,raw_ref:e.raw_ref,result_ref:e.result_ref,layout_ref:e.layout_ref,text_sha256:sha(Buffer.from(e.text))})),
   prior_review_refs:c.prior_history??[],human_review_ref:review?{revision:review.revision,digest:review.annotation_digest,status:review.review_status}:null,
   baseline_risk:baseline,metrics,tasks,paid_results:[],differences:[],correction_suggestions:[],training_eligible:false});
 }
 loaded.verify();
 const summary={format:VERSION,scope:'existing twelve development ROI only',dataset_ref:{path:path.relative(project,path.join(root,'dataset.json')).replaceAll('\\','/'),sha256:sha(fs.readFileSync(path.join(root,'dataset.json')))},
  counts:{source_resolved:rows.length,validation_states:rows.reduce((a,r)=>(a[r.validation_state]=(a[r.validation_state]??0)+1,a),{}),task_placeholders:rows.length*3,actual_provider_results:0},
  estimates:costRollup(estimates),historical_spend_reconciled:false,execution_budget_usd:0,proposed_B2_2_batch_cap_usd:5,live_enabled:false,api_calls:0,ocr_calls:0,actual_api_cost_usd:0,formal_accuracy:null,elapsed_ms:performance.now()-started,
  limitations:['Scenario estimates are not price quotes or certified cost bounds.','Real provider transport and native response parsers are NOT_IMPLEMENTED.','Unknown rights block cloud use, training and candidate persistence.','No verified GT or independent test set; no automatic acceptance.']};
 fs.mkdirSync(out);for(const r of rows)writeNew(path.join(out,r.sample_id+'.json'),r);writeNew(path.join(out,'summary.json'),summary);
 writeNew(path.join(out,'report.md'),['# B2-1 離線實驗準備','沒有送出任何付費請求。技術來源可追溯不代表文字已驗證。','| ROI | 來源 | 驗證狀態 | 本機風險分流 |','|---|---|---|---|',...rows.map(r=>`| ${r.sample_id} | ${r.source_status} | ${r.validation_state} | ${r.baseline_risk.quality_route} |`),'','正式 CER／WER 與結構品質無人工基準時保持 null。','此目錄包含本機來源引用及 OCR 證據，不應直接加入 Git。'].join('\n'));
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const a=process.argv.slice(2);assert(a.length===4&&a[0]==='--dataset'&&a[2]==='--out','Use --dataset <existing-P2A> --out <new-directory>');console.log(JSON.stringify(prepare({dataset:a[1],output:a[3]}),null,2));}
 catch(e){console.error(JSON.stringify({status:'SOURCE_OR_CONFIG_BLOCKED',message:e.message}));process.exitCode=1;}
}
