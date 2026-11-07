# OCR 自動化品質改善第一階段：多引擎差異定位

## 範圍與結果

本階段僅讀取既有 15 頁 development 資料，不執行 OCR、API、模型下載或正式入庫。兩引擎一致不代表正確，差異也不代表某一引擎錯誤。全部結果保留 `pending_human_review`，無自動修改或 verified。

- 15 頁圖片 SHA、尺寸、頁碼綁定、OCR 結果及資料層通過既有驗證流程。
- 掃描頁：2、6、10、19、21、60、200、230、317、318、324、325、465、472、486。
- 已登錄的雙引擎結果只有 `table-nucleic-acids`（掃描19）與 `formula-iron`（掃描200）兩個 ROI，不是兩張完整頁面。
- 其餘13頁未找到已登錄的 PaddleOCR ROI 結果；15頁皆沒有已登錄的完整頁面雙引擎結果。此結論限於既有清冊及本次輸入，不表示其他位置確定不存在資料。
- 兩區域形成10組對齊候選：7組具有雙側框、3組僅有PaddleOCR框。10組均有文字或配對差異，並不等於10個已確認錯誤。
- 共32項人工複核事件：表格22項、公式10項。包含重疊的文字、結構及完整性風險，不能當成獨立錯誤數或人工操作數。
- 正式 CER、WER、已確認錯誤數、誤報率、漏報率均為 `null`。人工時間節省尚未測量。

## 架構與重用

新增 `scripts/ocr-multi-engine-diff/`，不修改現有引擎、UI、儲存或正式 schema：

- `core.mjs`：重用 Quality Gate、文字差異及科學符號保護；依原圖像素框建立跨引擎連通群組，保留詞框對行框的一對多關係，將多對多明示為歧義。
- `io.mjs`：重用 Benchmark 的15頁來源準備與兩區域既有來源轉換器。核對圖片、文字、TSV、模型與版本雜湊；不以整頁文字對比局部ROI。
- `cli.mjs`：輸出不可覆寫的新目錄，保存JSON、人工清單及時間／費用紀錄；重算確認結果可重現。
- `diff.test.mjs`：獨立合成測試，不建立真實人工答案。

每組保存左右引擎原文、原始block ID、bbox／polygon、模型版本、設定及來源檔案雜湊。差異使用UTF-16跨度，回連來源框；刪除／插入處只標示鄰近來源框，不能冒充缺字的真實字形位置。幾何排序只用於比對，保留原引擎閱讀順序，不改寫原始輸出。

## 實際定位案例

下列僅描述差異類型，不公開教材原文或實際 OCR 文字，也不是人工確認答案；座標為原圖像素 `[x,y,width,height]`。

|區域／群組|座標|通用差異描述|需要確認|
|---|---|---|---|
|table-nucleic-acids:g001|[280,277,322,67]|兩引擎的中英文混排及符號辨識不一致|核對原圖，不自動選擇任一引擎答案|
|table-nucleic-acids:g007|[136,285,78,56]|僅單側引擎存在文字框，另一側無配對框|可能漏檢或誤檢，不能自動補入|
|formula-iron:g001|[1355,487.5,80,41]|兩引擎出現字母／數字及科學排版差異|電荷及上下標須查原圖，不推定正確公式|

表格另有列分組／閱讀順序差異。既有Word框與Line框粒度不同，分區差異不是已確認儲存格錯誤。公式區域兩引擎均無獨立字形基線證據，不能確定電荷是否遺漏。

## 輸出與執行方式

```powershell
node scripts/ocr-multi-engine-diff/cli.mjs
```

預設建立新的 `tmp-ocr-multi-engine-diff-*` 目錄；可使用 `--out` 指定尚不存在的目錄，若已存在則拒絕覆寫。

本次最終輸出：

- `tmp-ocr-multi-engine-diff-j86GZT/report.json`：15頁來源盤點、兩區域差異、Quality Gate與複核清單。
- `tmp-ocr-multi-engine-diff-j86GZT/review.md`：本機人工審核清單，含OCR片段，勿直接當公開教材。
- `tmp-ocr-multi-engine-diff-j86GZT/execution.json`：實測約1.62秒，含來源核對與記憶體內影像溯源檢查，不是OCR辨識時間；API費用0美元。
- `tmp-ocr-multi-engine-diff-j86GZT/tests.tap`、`tests.json`：本次自動化測試結果。

第一次開發試跑另存於 `tmp-ocr-multi-engine-diff-SG8kmg/`，完整保留，不作最終版本依據。

## 自動化驗證

新增24項測試，全數通過。涵蓋中文差異、英文大小寫、數字混淆、科學上下標、Unicode跨度、一對多／多對多、無配對區域、越界阻擋、閱讀順序、表格分組、不可變性、不可覆寫及重複執行一致性。

完整回歸：既有198項加新增24項，共 **222 PASS、0 FAIL，100%**。這是工程測試通過率，不是OCR準確率。

```powershell
node --test --test-reporter=tap --test-skip-pattern="^(real adapters|real server|real HTTP|HTTP interface|two real regions|real two-region)" scripts/ocr-review-stage2.test.mjs scripts/ocr-ground-truth-candidates.test.mjs scripts/ocr-ground-truth-table.test.mjs scripts/ocr-ground-truth.test.mjs scripts/ocr-benchmark-text-review.test.mjs scripts/ocr-human-review.test.mjs scripts/ocr-quality-gate/quality-gate.test.mjs scripts/ocr-merge-split-reliability.test.mjs scripts/ocr-multi-engine-diff/diff.test.mjs
```

沿用上一輪合成資料測試範圍，排除7個會讀取真實來源的既有測試；真實資料由本次CLI唯讀驗證，不對人工草稿執行保存測試。

## 限制及下一步

幾何重疊門檻0.15為未校準的對齊啟發式，不是信心或準確率。大框可能將相鄰內容連成群組；多對多必須人工確認。現有科學字串規則可能把一般大寫縮寫當成公式風險。合法跨欄、複雜讀序、有效但錯誤的中文字、共同漏字、圖中分支及符號基線尚不能自動驗證。

本階段只完成差異清單，未將它接入UI或自動匯入草稿。下一階段可在另行批准後，把group ID與來源座標連結至現有人工介面，保護已存草稿，再獨立核對兩ROI以校準誤報／漏報及人工耗時。未取得獨立人工答案前不計算正式CER／WER，不擴大至剩餘471頁。
