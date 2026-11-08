# OCR 品質改善 P0：排序與匹配一致性

日期：2026-11-08（Asia/Hong_Kong）。本輪只使用既有四頁輸出，不執行 OCR、付費 API、模型下載或正式資料庫變更。

## 來源與範圍

實驗清冊：`tmp-ocr-fourpage-dual-20261107-v1/inputs.json`；原圖 manifest：`content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json`。

| 掃描序號 | 原圖檔名 | 索引印刷頁 | 原頁碼狀態 |
|---:|---|---:|---|
| 6 | IMG_2026_09_30_23_25_05R.jpg | 11 | verified |
| 19 | IMG_2026_09_30_23_26_09L.jpg | 24 | estimated |
| 200 | IMG_2026_09_30_23_48_04R.jpg | 205 | verified |
| 317 | IMG_2026_09_30_23_55_32L.jpg | 322 | estimated |

estimated 保持 estimated。每頁核對 manifest、原圖 SHA、共同預處理圖 SHA、page_id、兩引擎 raw/result/layout 檔案 SHA，以及結果中的原圖／輸入 SHA 與 blocks；每頁 11 個來源檔案受到驗證。另以唯讀檢查逐頁比對 `page-index.json` 的 seq/file/label/verification 及 manifest 中的掃描順序，四頁均一致。實際本機原圖路徑由 manifest 取得，報告不重複個人絕對路徑。

原始結果分別位於實驗目錄的 `tesseract/NNNN/`、`paddle/NNNN/`；歷史差異為 `comparisons/NNNN.json`。本輪未改寫以上資料。

## 根本原因與最小修正

1. 舊版差異工具對每個連通群組呼叫 `tableGeometry` 重新排序，將幾何行候選當成比較文字順序。小框高度與基線差異導致原本位於同一段落的框被拆行、提前或延後。掃描 200 的 g009、g014 可重現。
2. 舊 Quality Gate 使用交集／當前框面積 > 10%，差異工具卻使用交集／較小框面積 >= 15%。字框對長行框時，前者會把已配對長行誤列 unmatched。

新增 `scripts/lib/ocr-block-matching.mjs` 作共用幾何匹配及來源順序工具；新比較版本為 `multi-engine-difference-2-p0`，Quality Gate 為 `quality-gate-prototype-2-p0`。

- 比較文字保留引擎原始框序列；幾何閱讀順序仍可作警告，但不自動改寫工作文字。
- 兩模組使用同一 `symmetric-overlap-v1`：交集／較小框面積 >= 15%。沿用原差異工具門檻，不因測試結果調低閾值。
- 一對一、一對多、多對一使用同一候選圖；每個框只進入一個連通群組。多對多仍保留 AMBIGUOUS，無重疊不以文字相同強配。
- 保留 bbox、polygon、原框 ID、原字串、UTF-16 差異位置與來源引用；不對科學符號執行 NFKC 或大小寫折疊。
- 舊版只供明確指定版本的歷史重現；第 200 頁載入器依保存版本重現，避免改變舊草稿來源綁定。不默默將舊報告替換為新候選。

## 測試先行證據

只新增初版失敗測試，尚未改核心時：15 項，4 PASS、11 FAIL。失敗涵蓋 g009/g014、合成多欄標題／正文／圖說、一對多／多對一與門檻判準矛盾，以及四頁來源順序檢查。

完成修正及補充保護測試後：P0 專屬 25 PASS、0 FAIL；完整相關回歸 **396 PASS、0 FAIL、0 SKIP**。

```powershell
node --test scripts/ocr-multi-engine-diff/p0.test.mjs
```

完整回歸指令：

```powershell
node --test --test-reporter=tap --test-skip-pattern="^(real adapters|real server|real HTTP|HTTP interface|two real regions|real two-region)" scripts/ocr-review-stage2.test.mjs scripts/ocr-ground-truth-candidates.test.mjs scripts/ocr-ground-truth-table.test.mjs scripts/ocr-ground-truth.test.mjs scripts/ocr-benchmark-text-review.test.mjs scripts/ocr-human-review.test.mjs scripts/ocr-quality-gate/quality-gate.test.mjs scripts/ocr-merge-split-reliability.test.mjs scripts/ocr-multi-engine-diff/diff.test.mjs scripts/ocr-benchmark/benchmark.test.mjs scripts/ocr-benchmark/ground-truth/ground-truth.test.mjs scripts/ocr-page-ground-truth.test.mjs scripts/ocr-scan200-difference-review.test.mjs scripts/ocr-multi-engine-diff/p0.test.mjs
```

測試名稱篩選排除讀取本輪四頁外的舊實際資料案例；Node 最後統計為 396 個執行案例、0 SKIP，不代表所有歷史測試均執行。合成資料測試寫入各自的 OS 暫存目錄，不寫入人工草稿。

新增測試包含：兩個實際錯序案例、多欄保序、六種匹配形態、四頁順序／座標／字串不可變性、四頁歷史重現及群組成員不變、四頁既有一致與歧義狀態不退化、未知頁面／版本拒絕、既有輸出目錄拒絕覆寫、Unicode 科學符號保護。

## 實際修正前後

「重排」是比較文字的框順序偏離引擎來源的群組－引擎項目數，不等於已人工證明的語義錯誤數。

| 掃描 | 比較重排前→後 | QG unmatched 框前→後 | 與配對群組矛盾前→後 | UNMATCHED 群組前→後 | 差異群組前→後 |
|---:|---:|---:|---:|---:|---:|
| 6 | 5→0 | 21→12 | 9→0 | 12→12 | 37→37 |
| 19 | 6→0 | 16→14 | 2→0 | 14→14 | 57→57 |
| 200 | 2→0 | 45→32 | 13→0 | 32→32 | 57→57 |
| 317 | 7→0 | 35→26 | 9→0 | 26→26 | 40→39 |

四頁所有連通群組成員保持不變，共 225 個群組；84 個 UNMATCHED 群組保持不變。QG unmatched 框事件 117→84，消除 33 個「已配對卻又 unmatched」矛盾事件。這不是 33 個已修正的 OCR 字元，也不是準確率提升。

掃描 317 的 g013 在恢復來源順序後，兩引擎字串一致，差異群組減少 1；仍是 pending_human_review，不代表原圖文字已 verified。原本一致的群組沒有轉成差異；原本歧義狀態全部保留。

QG 全部事件四頁合計 158→125；差異工具 review_items 236→235。後者原本就排除了逐框 unmatched，因此不能聲稱整個工作臺警告減少 33。其餘同源風險去重屬 P1，尚未實作。

## 結果位置與重現

候選輸出只存於獨立本機目錄：

- `tmp-ocr-p0-validation-20261108-v1/0006.candidate.json`
- `tmp-ocr-p0-validation-20261108-v1/0019.candidate.json`
- `tmp-ocr-p0-validation-20261108-v1/0200.candidate.json`
- `tmp-ocr-p0-validation-20261108-v1/0317.candidate.json`
- `tmp-ocr-p0-validation-20261108-v1/summary.json`

候選 JSON 含來源 OCR，應留本機，不因本報告自動取得公開授權。`summary.json` 包含每頁 before/after、舊新框順序、來源完整性及單次比較耗時。

使用未存在的新目錄重現：

```powershell
node scripts/ocr-multi-engine-diff/p0-validation.mjs --output tmp-ocr-p0-validation-another-run
```

工具限定四頁，先驗證所有來源再新增輸出；目錄已存在即拒絕。不下載、不推論、不更改 Ground Truth。單次比較耗時約：6 頁 167ms、19 頁 173ms、200 頁 349ms、317 頁 89ms；不含完整來源驗證與測試時間，非 OCR 速度或穩定效能基準。API 費用 US$0。

## 資料保護、驗收邊界與下一步

來源驗證前後 SHA 相同；既有第 200 頁人工草稿仍 revision 2／draft，新差異保存目錄無紀錄。歷史四頁報告逐項深度重現通過。工作區既有 2,698 個非 Paddle 虛擬環境待提交項目中，僅本輪必要修改的來源載入器發生內容變動，其餘 2,697 項的內容與狀態一致，沒有刪除；兩個原先乾淨的 tracked 核心程式另產生本輪預期修改。原有四個 tracked 修改保持原狀。Paddle 虛擬環境未執行或寫入；不進行 Git 寫入。

已驗收的是「比較程式不再額外重排」、「匹配判準一致」、「不遺失或重複分配來源框」，不是「OCR 已正確」。原引擎閱讀順序本身、表格儲存格與圖表分支的語義正確性尚未驗證；沒有人工 Ground Truth，CER／WER 保持 null，工時節省尚未測量。

既有工作臺仍綁定歷史比較，不自動套用本輪候選；需要另行批准新候選的版本化載入與人工檢視。沒有停止／重新啟動其他服務。

P1 建議依序：以實際編輯片段分類、整合重複風險事件 ID、正文／側欄／圖內標籤分層呈現、對第 200 頁新舊候選做人工比較與計時。不得將一致自動升級 verified，也不得因警告數量下降宣稱準確率提高。
