import path from 'node:path';import {performance} from 'node:perf_hooks';
import {stableStringify} from '../ocr-benchmark/core.mjs';
import {projectRoot,options,outputDir,writeNew,sha} from '../lib/ocr-quality-io.mjs';
import {inspectExisting15} from './io.mjs';import {alignDifferences} from './core.mjs';
const args=options(process.argv.slice(2),['--out']),start=performance.now();
const {report,verify}=await inspectExisting15(projectRoot);
for(const r of report.regions){const input={region_id:r.region_id,region_type:r.quality_gate.region_type,roi:r.roi,source:r.source,engines:r.quality_gate.engine_inputs};if(stableStringify(alignDifferences(input))!==stableStringify(r))throw Error('Non-deterministic comparison');}
verify();const out=outputDir(args['--out'],'tmp-ocr-multi-engine-diff-');
writeNew(path.join(out,'report.json'),report);
let md='# 多引擎差異定位第一階段\n\n僅既有15頁；雙引擎僅兩個 ROI。差異不是已確認錯誤，一致也不是正確證據。全部 pending_human_review；CER/WER 尚未評估。本文含短小 OCR 假設片段，僅供本機審核。\n\n|掃描頁|印刷索引|頁碼狀態|雙引擎範圍|\n|---|---|---|---|\n';
for(const p of report.pages)md+=`|${p.scan_seq}|${p.printed_page}|${p.page_number_verification}|${p.region_comparisons.map(r=>r.region_id).join(', ')||'未找到已登錄 PaddleOCR 結果，未比對'}|\n`;
for(const r of report.regions){md+=`\n## ${r.region_id}\n\n原圖 SHA：${r.source.image_sha256}；ROI ${JSON.stringify(r.roi)}。原始像素座標 xywh；引擎版本、參數及來源檔案雜湊見 report.json。\n\n`;
 for(const g of r.groups.filter(g=>g.types.length))md+=`- ${g.id}／${g.alignment_status}／${g.types.join(', ')}\n  - 位置：${JSON.stringify(g.bbox)}\n  - ${g.left.engine}：${JSON.stringify(g.left.text)}\n  - ${g.right.engine}：${JSON.stringify(g.right.text)}\n  - 請依原圖確認；文字跨度與來源框詳見 JSON，非逐字形定位。\n`;
 md+='\n其他風險：\n';for(const item of r.review_items.filter(i=>i.type!=='localized_engine_difference'))md+=`- ${item.type}：${item.suggested_action??item.action}\n`;
}
md+='\n## 限制與後續\n\n13頁未找到已登錄的第二引擎 ROI 結果，不能比較；其餘2頁也僅比較指定 ROI，不代表全頁。無新增 OCR、API、下載或自動修正。行列及閱讀順序是幾何假設，不能確認語義。詞框與行框一對多匹配可能誤報；多對多、漏字位置、共同錯誤、公式基線及合法跨欄需人工確認。已有校正介面與版本保存可供後續接入，本階段只產出獨立清單，沒有改動草稿或 UI。先人工校準兩區域，不據此推論全書準確率或節省工時。\n';
writeNew(path.join(out,'review.md'),md);
writeNew(path.join(out,'execution.json'),{elapsed_ms:performance.now()-start,source_artifacts_unchanged:true,reproducible:true,report_sha256:sha(Buffer.from(stableStringify(report))),ocr_calls:0,paid_api_calls:0,actual_api_cost_usd:0,downloads:0});
console.log(JSON.stringify({out,summary:report.summary,regions:report.regions.map(r=>({id:r.region_id,groups:r.groups.length,differences:r.groups.filter(g=>g.types.length).length,review_items:r.review_items.length}))}));
