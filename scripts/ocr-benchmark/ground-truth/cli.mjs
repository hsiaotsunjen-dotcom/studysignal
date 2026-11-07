import fs from 'node:fs';import path from 'node:path';import {performance} from 'node:perf_hooks';
import {projectRoot,options,outputDir,writeNew} from '../../lib/ocr-quality-io.mjs';
import {stableStringify} from '../core.mjs';import {validateInventory} from './core.mjs';import {prepareInventory} from './io.mjs';
const args=options(process.argv.slice(2),['--out']),start=performance.now();
const loaded=await prepareInventory(projectRoot);loaded.verify();
const out=outputDir(args['--out'],'tmp-ocr-gt-foundation-');
writeNew(path.join(out,'inventory.json'),loaded.inventory);
writeNew(path.join(out,'benchmark-pending.json'),loaded.inventory.benchmark_dataset);
writeNew(path.join(out,'review-queue.json'),loaded.inventory.review_queue);
writeNew(path.join(out,'completeness.json'),loaded.report);
let md='# Ground Truth 第一批人工審核清單\n\n原始OCR與既有草稿只作參考，不是標準答案。本文不複製教材正文；候選及草稿依引用開啟。所有17個標註單位待人工審核：15個整頁範圍與2個指定ROI，不能當成17張不同頁面。\n\n';
for(const q of [...loaded.inventory.review_queue].sort((a,b)=>(a.priority==='high'?0:1)-(b.priority==='high'?0:1)||a.scan_seq-b.scan_seq)){
 md+=`## 掃描 ${q.scan_seq}／${q.region_id}\n\n樣本：${q.sample_id}；範圍：${q.scope}；ROI：${JSON.stringify(q.roi)}；既有草稿revision：${q.existing_revision??'無'}。\n\n`;
 for(const g of q.focus_groups)md+=`- 疑點 ${g.group_id}：${g.categories.join(', ')}；座標 ${JSON.stringify(g.bbox)}；${g.alignment_status}。\n`;
 if(!q.focus_groups.length)md+='- 尚無局部雙引擎對照，不表示沒有錯誤。先查看既有品質報告及原圖。\n';
 md+=`- 其他風險提示 ${q.risk_checks.length} 項（可能重疊，不是已確認錯誤數）。\n- 最後須核對整個聲明範圍的缺字、圖說、符號、結構及讀序；只看疑點不足以verified。\n- 候選來源：${q.candidate_refs.map(r=>r.path).join('；')}。\n\n`;
}
md+='## 操作與保護\n\n兩個ROI重用現有Ground Truth介面；本工具不啟動伺服器、不保存或確認人工答案。已存草稿先重新載入，不自動導入候選。其餘15頁目前僅建立待審核資料清單，未擴充UI供全頁操作。人工確認後沿用既有驗證／匯出流程，不手改inventory狀態繞過審核。estimated頁碼保持原狀；來源授權未確認，不得匯出為訓練資料。\n';
writeNew(path.join(out,'human-review-checklist.md'),md);
const reread=JSON.parse(fs.readFileSync(path.join(out,'inventory.json'),'utf8'));validateInventory(reread);if(stableStringify(reread)!==stableStringify(loaded.inventory))throw Error('Roundtrip mismatch');loaded.verify();
writeNew(path.join(out,'execution.json'),{elapsed_ms:performance.now()-start,input_refs:loaded.input_refs,source_artifacts_unchanged:true,roundtrip_validated:true,new_ocr_calls:0,paid_api_calls:0,model_downloads:0,human_ground_truth_created:0,actual_service_cost_usd:0});
console.log(JSON.stringify({out,summary:loaded.report}));
