# 第 200 頁 AI OCR 建議驗證改善 v2

日期：2026-11-04（Asia/Hong_Kong）。僅離線使用掃描 200／印刷 205 的既有 API 回應，沒有新 API 呼叫、重新 OCR 或正式教材變更。

## 結果摘要

|項目|實測結果|解讀限制|
|---|---:|---|
|程式測試|56／56 通過（100%）|軟體測試通過率，不是 OCR 正確率|
|精確文字錨點|13／13|before 在 immutable raw 中唯一出現；不證明 after 正確|
|原模型錯誤偏移|12／13|保留原值，另存確定性定位，不靜默改寫|
|座標欄位統一且框在原圖範圍|13／13|未證明框住正確文字；不推測縮放比例|
|錨點文字區間重疊|0|只檢查文字替換範圍，不代表版面閱讀順序正確|
|接受／套用修改|0|沒有候選被提升為教材或 Ground Truth|
|本次 API 呼叫／費用|0／US$0|以前單頁費用未改寫|
|CER、WER、真實修復數、新增錯誤數|null|缺少獨立人工標準答案|

最終機器結果：`tmp-ocr-ai-proposal-validation-v2-76P938/validation.json`；同目錄 `report.md` 提供逐項分類與風險代碼。實際單頁重播及檔案核對約 10.62 ms，不是 API 生成時間。兩次相同純函式輸入得到完全相同驗證結果；時間戳與執行時間不屬可重現性比較欄位。

先前中間產物 `tmp-ocr-ai-proposal-validation-v2-qLxocv/` 也保留。它僅使用機械規則，當時為 11 項人工審核、2 項可能錯誤；最終版本加入可追溯的先前視覺觀察，保留其中 2 項證據不足，不能把它們當作已解決。

## 根因與已實作修正

1. 原提示要求 `original-pixel bbox`，但驗證器讀取 `bbox`。新契約統一欄位 `bbox`，並以 strict JSON schema 指定欄位；單頁入口不再將它覆寫成寬鬆 `json_object`。原圖像素尺寸及確定性的來源行 ID 一併提供。
2. 舊回應使用相容 adapter 讀取；原始物件、舊欄位名與座標完整保留。若兩種欄位同時出現且不一致（包括明確 null 與數值框衝突），標為可能錯誤。無框為證據不足；非數值、零面積、越界框會阻擋。
3. 原模型偏移不可信。以 before 的精確字串匹配 immutable raw，固定 UTF-16 code units、end exclusive；不正規化空白、換行、大小寫或科學符號。唯一命中才另建 canonical span；零命中、多命中、空錨點或切斷 surrogate pair 均不能自動定位。原始偏移仍保留並列出錯誤。
4. 新增跨建議文字區間重疊檢查、來源行 ID 一致性檢查及逐項問題清單，避免只看到首項通用錯誤。
5. 未來單頁入口接上逐項分類；格式不合的回應仍保留原始 response，不會套用。此次只測過離線請求組裝及本機驗證，strict schema 的遠端接受情況及新的付費入口尚未端到端驗證，不能宣稱 API 已驗收。

API 格式依據：[OpenAI Structured Outputs 官方文件](https://developers.openai.com/api/docs/guides/structured-outputs)（2026-11-04 查閱）。Schema 約束資料結構，不保證內容與圖片一致。本次沒有修改正式 Knowledge Base schema。

## 科學內容保護規則

規則只提出風險，不自動更正，也不把詞庫當成原文證據：

- 公式樣式與離子電荷變動：保留原／新 token，標記需要圖片覆核。
- Unicode 上下標與 ASCII 公式：例如 Fe²⁺ 轉 Fe2+、HCO₃⁻ 轉 HCO3- 均需審核；不做 NFKC 轉換。
- 希臘字母、箭頭、平衡符號及運算符：標記科學符號風險。
- 英文術語及大小寫變動、中英文混合長區段替換：標記人工審核，避免順帶改錯鄰近內容。
- 專有名詞：可注入科目詞表；變動僅觸發審核，不根據常識補字。
- 「胺／氨」互換：保守列為可能錯誤，需確認教材實際用字。
- 圖／表內公式樣式 token 被刪去、大量刪字：列為可能錯誤；誤辨雜訊也可能觸發，需看原圖。
- 換行數改變：標記段落／閱讀順序審核，不直接認定錯誤。

實測訊號（可同時命中，不可相加作為錯誤總數）：公式樣式 9、ASCII 科學記法 7、Latin token 變動 4、中英文混排 9、專有名詞 10、換行結構 2。規則尚未經獨立人工校準，不能由此估計真實錯誤率、precision 或 recall。公式 regex 也可能把頁首失真大寫字串當成公式，需後續校準；它不是化學式解析器。

## 四類判定與 13 項結果

優先順序：可能錯誤 → 證據不足 → 人工審核 → 可自動確認。高 confidence 不改變此順序。

「可自動確認」目前只允許文字完全未變、位置與框等機械條件均通過的 no-op；確認範圍僅是「沒有改字」，不代表 OCR 正確。任何實際改字至少需要原圖／人工確認。所有記錄仍保留 pending_human_review、semanticVerified=false、autoApplyAllowed=false。

|類別|數量|項目|
|---|---:|---|
|可自動確認|0|無|
|需要人工審核|9|1、2、3、4、5、6、11、12、13|
|證據不足|2|7、8：沿用先前酵素／離子與跨行段落未充分核對的觀察|
|可能錯誤|2|9：胺／氨替換；10：圖內公式樣式標籤刪除|

先前觀察來源為 `tmp-ocr-ai-proposal-audit-xhWuPU/proposal-audit.json`，是 Agent 視覺觀察，**不是人工核准**。重播前核對該觀察的圖片、raw 及 response 雜湊，再逐一匹配完整原始建議，避免把舊判斷套到另一個版本。核心分類規則不硬編碼頁碼或建議序號；本機重播入口刻意限制第 200 頁。

## 原始資料與版本追溯

來源：

- `scripts/fixtures/ocr-quality-baseline.v1.json`：既有來源與 OCR 版本雜湊。
- `content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json` 及 `page-index.json`：圖片來源、掃描序號、印刷頁碼。
- `content/knowledge-base/ocr-pilot/biology-12pages-20261101-v2/pages/0200/attempt-01/`：raw、result、TSV。
- `tmp-ocr-ai-correction-paid-firstpage-v1/response.json` 及 `summary.json`：原始 API 回應與使用紀錄。
- 前述舊版 audit：先前視覺評估依據。

單頁重播保護 10 個輸入檔案，輸出前後核對雜湊，變更 0。圖片只從 manifest 指定的來源讀取；不複製原圖、不改寫 OCR，不修改舊回應、audit 或報告。所有輸出使用新的暫存目錄及拒絕覆寫寫入模式。JSON 中含原始／候選教材文字，僅供本機審核，不應直接公開提交。

## 測試及限制

```text
node --test scripts/ocr-ai-proposal-validation.test.mjs scripts/ocr-ai-proposal-audit.test.mjs scripts/ocr-ai-correction-trial.test.mjs scripts/ocr-quality-metrics.test.mjs
node scripts/ocr-ai-proposal-validation.mjs
node scripts/ocr-ai-correction-single-page.mjs --budget-usd 0.25
```

最後一條沒有 `--execute approved`，僅離線組裝第 200 頁請求。本次沒有重新呼叫 API、處理其餘 11 頁、執行全書 OCR、Phase 2F、git add、commit 或 push。

目前仍無法自動判斷：框與實際文字是否對齊、原書術語的確切字形、公式上下標忠實度、圖表分支完整性及閱讀順序。CER／WER 繼續依既有人工作者／區域／圖片／參考文字雜湊核對機制，無獨立人工 reference 則為 null；英文 tokenizer 不能驗證公式，另需科學符號與結構審核。未建立或修改 Ground Truth。

下一步優先：以本頁少量公式、圖標與術語做人工確認，校準風險規則；驗證原圖座標對齊與固定來源行 ID；補足表格／圖形結構指標。完成前不擴大付費處理。

## 本次檔案範圍

修改：

- `scripts/lib/ocr-ai-proposal-audit.mjs`：共用座標契約、Unicode 邊界保護。
- `scripts/lib/ocr-ai-correction-trial.mjs`：統一 prompt/schema、來源行及原圖尺寸、舊格式相容驗證。
- `scripts/ocr-ai-correction-single-page.mjs`：保留 strict schema，接上逐項驗證，固定單頁及既有預算鎖不變。

新增：

- `scripts/lib/ocr-ai-proposal-contract.mjs`：共用欄位／座標／來源行契約。
- `scripts/lib/ocr-ai-science-guards.mjs`：科學文字風險規則。
- `scripts/lib/ocr-ai-proposal-validation.mjs`：定位、重疊與四類分類。
- `scripts/ocr-ai-proposal-validation.mjs`：單頁離線重播及另存結果。
- `scripts/ocr-ai-proposal-validation.test.mjs`：新增 29 項保護測試；原 27 項回歸保留，共 56 項。
- 本報告，以及兩個獨立暫存目錄中的 JSON／Markdown 結果。
