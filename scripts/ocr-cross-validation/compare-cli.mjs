// Existing 12 ROI, local replay only. Independent real-provider quality NOT measured.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {openP2A} from '../ocr-benchmark/p2a/workflow.mjs';
import {openJournal} from './journal.mjs';
import {createOfflineProvider} from './mock-provider.mjs';
import {compareBatch} from './comparison.mjs';
import {writeNew,sha} from '../lib/ocr-quality-io.mjs';
const project=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
export async function runOfflineComparison({dataset,output}){
 const out=path.resolve(output),root=path.resolve(dataset);assert(out.startsWith(project+path.sep)&&root.startsWith(project+path.sep),'Paths must remain inside project');
 assert(!fs.existsSync(out),'Refuse existing output directory');const parent=fs.realpathSync(path.dirname(out));assert(parent===project||parent.startsWith(project+path.sep),'Output symlink escape');
 const loaded=openP2A(root);loaded.verify();assert.equal(loaded.cases.length,12);const started=performance.now();
 const providers=['google','azure','openai'].map(id=>createOfflineProvider(id)),journal=openJournal(path.join(out,'replay-journal'),'learning-candidates');
 const first=await compareBatch({loaded,providers,journal});
 // Reopen journal and providers to exercise persisted cache, not an in-memory cache.
 const reopened=['google','azure','openai'].map(id=>createOfflineProvider(id));
 const second=await compareBatch({loaded,providers:reopened,journal:openJournal(path.join(out,'replay-journal'),'learning-candidates')});
 assert.equal(second.summary.mock_calls,0);assert.equal(second.summary.cache_hits,36);
 const canonical=rows=>rows.map(({status,...r})=>r);assert.deepEqual(canonical(first.rows),canonical(second.rows),'Reopened comparison differs');loaded.verify();
 assert.deepEqual(first.roi_review_queues,second.roi_review_queues);assert.deepEqual(first.provider_differences,second.provider_differences);
 const summary={...first.summary,verified_gt:loaded.progress().verified,review_bundles:first.rows.reduce((n,r)=>n+(r.review_queue?.items.length??0),0),review_events:first.rows.reduce((n,r)=>n+(r.review_queue?.event_count??0),0),
  cache_reopen:{mock_calls:second.summary.mock_calls,hits:second.summary.cache_hits,reproducible:true},elapsed_ms:performance.now()-started,
  dataset_ref:{path:path.relative(project,path.join(root,'dataset.json')).replaceAll('\\','/'),sha256:sha(fs.readFileSync(path.join(root,'dataset.json')))},
  implementation_refs:['normalize.mjs','mock-provider.mjs','comparison.mjs','compare-cli.mjs'].map(f=>({path:'scripts/ocr-cross-validation/'+f,sha256:sha(fs.readFileSync(path.join(project,'scripts/ocr-cross-validation',f)))}))};
 for(const c of loaded.cases)writeNew(path.join(out,c.id+'.json'),{sample_id:c.id,source_verification:'PASS',results:first.rows.filter(r=>r.sample_id===c.id),provider_differences:first.provider_differences.filter(p=>p.source===c.id),unified_review_queue:first.roi_review_queues.find(q=>q.sample_id===c.id)});
 writeNew(path.join(out,'summary.json'),summary);
 writeNew(path.join(out,'report.md'),['# B2-2 離線多供應商比較','此為既有 PaddleOCR 回放，三個服務都沒有重新辨識，不是獨立付費輸出。','來源十二 ROI，verified GT 為 '+summary.verified_gt+'；正式品質指標保持 null。',
  '| ROI | 結果數 | 供應商別群組合計 | 統一覆核群組 | 唯一事件 | 狀態 |','|---|---:|---:|---:|---:|---|',...loaded.cases.map(c=>{const rows=first.rows.filter(r=>r.sample_id===c.id),queue=first.roi_review_queues.find(q=>q.sample_id===c.id);return `| ${c.id} | ${rows.length} | ${rows.reduce((n,r)=>n+(r.review_queue?.items.length??0),0)} | ${queue.items.length} | ${queue.event_count} | machine-generated |`;}),
  '','重開快取 36 命中、0 新回放。實際 API 費用 US$0。','本機報告含原 OCR 證據與路徑，不能直接公開至 GitHub。'].join('\n'));
 return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);try{assert(args.length===4&&args[0]==='--dataset'&&args[2]==='--out','Use --dataset <existing-P2A> --out <new-directory>');
  runOfflineComparison({dataset:args[1],output:args[3]}).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',message:e.message}));process.exitCode=1;});
 }catch(e){console.error(e.message);process.exitCode=1;}
}
