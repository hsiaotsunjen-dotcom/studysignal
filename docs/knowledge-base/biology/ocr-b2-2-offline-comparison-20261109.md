# OCR B2-2：免費離線多供應商比較

日期：2026-11-09。本階段沒有執行新 OCR、付費 API、模型下載、正式教材寫入或 Git 提交。沒有開始 B2-3。

## 起點與安全範圍

開始時位於 StudySignal master；HEAD、origin/master 與 GitHub master 均為 `82d09c79ef497aa1338e59c74535078d4898b1f0`，確認 B2-1 已備份。既有暫存區為空。沿用 B2 規劃及 B2-1 模組，不修改舊引擎、P0、P1、P2-A、B1、B2-1 或人工 Ground Truth 儲存邏輯。

只讀 `tmp-ocr-p2a-20261108-v2/dataset.json`，SHA-256 為 `c67395075a67d951a9b762725900c3369276b7e86a02794cfa5ce871c7e0db92`。十二個 ROI 的圖片、頁碼、座標、候選及版本均由既有來源驗證器核對；原圖與所有原始結果保留。

## 新增六檔

| 完整相對路徑 | 功能 |
|---|---|
| `scripts/ocr-cross-validation/normalize.mjs` | 三供應商回應格式的離線正規化、原生位置／文字保留與異常標記 |
| `scripts/ocr-cross-validation/mock-provider.mjs` | 統一供應商介面、合成 fixture 與既有本機結果回放，live 路徑明確拒絕 |
| `scripts/ocr-cross-validation/comparison.mjs` | 本機對候選、供應商彼此比較、人工結構 ID 對應、評測接口、統一覆核清單與快取批次 |
| `scripts/ocr-cross-validation/compare-cli.mjs` | 僅十二 ROI 的可重複執行入口、新目錄輸出與重開快取驗證 |
| `scripts/ocr-cross-validation/b2-2.test.mjs` | B2-2 新增 45 項離線測試 |
| `docs/knowledge-base/biology/ocr-b2-2-offline-comparison-20261109.md` | 本報告 |

## 已實作與真正服務的區別

統一介面提供 `estimate()`、`recognize()`、供應商 ID、執行模式、normalizer 版本與策略 ID。此處 recognize 只執行 Mock 或讀取既有結果回放，沒有圖片辨識。Google、Azure、OpenAI 的 executeLive 一律拒絕；沒有 SDK、API Key 讀取或 HTTP 連線程式。

離線回應分為三類：

- `mock-native`：合成的供應商格式 fixture，只允許 synthetic 測試案例，不能冒充真實樣本結果。
- `local-replay`：把明確指定的既有 Tesseract／PaddleOCR 結果放入供應商格式，測試接口與資料流。來源引擎、版本與 raw 引用保留，必須標示沒有獨立辨識證據。
- `recorded-offline`：純函式可以解析已有回應，但須有來源及供應商的保存／評估權利。受控批次入口不執行此模式；本輪沒有匯入真實付費回應。

同一個 request source 包含原圖 SHA、crop SHA、ROI、掃描與印刷頁碼及原始 case fingerprint；各供應商共用相同來源。provider／model version／設定／prompt digest／回放策略及 normalizer 版本參與識別或快取鍵。改用另一個本機引擎或 fixture 版本，不會誤用舊快取。

## 格式與座標保留

| 供應商 | 已支援的離線格式子集 | 限制 |
|---|---|---|
| Google Document AI | Document text、單頁 lines／paragraphs／blocks、textAnchor、boundingPoly、math visualElements、傳統 headerRows/bodyRows 表格 | 不支援跨頁／shard 或新式 Layout Parser 的全部 documentLayout 結構；圖說關係未提供就標 not_reported |
| Azure Document Intelligence | 完成狀態、content、單頁 lines、formulas、tables、figures.caption、boundingRegions | 保留 spans，位置按原生 pixel／inch 與明確頁面尺寸映射；跨頁或長寬比不符不猜測 |
| OpenAI Responses | completed message 的一筆 output_text，承載自訂 `studysignal-ocr-content-v1` JSON | 此 OCR payload 是 StudySignal 定義，不是 OpenAI 原生 OCR 結果格式。拒絕 refusal、incomplete、錯模型、非 JSON 及機器 verified 宣稱 |

文字不重組、不排序、不變更大小寫或上下標；完整原始回應、原生定位與未辨識欄位保留。正規化位置為原圖像素 polygon／bbox，ROI 位移及原生單位均可追溯。座標未知、越界或長寬比無法對應時保留文字與原生證據，位置回 null 並標高風險，不自動裁掉錯誤。

Google textAnchor 的字元單位明確記錄於設定，測試包含 code point、UTF-16 及 UTF-8 byte 邊界；真正上線前仍須用實際處理器回應驗證 offset／Unicode 慣例。OpenAI 定位一律標為模型估計，不能因框線合理就視為原生 OCR 定位證據。

表格保留儲存格位置、跨度與文字。Google 跨列佔位可追蹤；一旦跨度缺失，後續欄位不猜測，保留未知。Azure 缺少跨度亦保留未知。表格重疊會被拒絕。圖說與 figure ID 關係不自行補寫。

官方欄位依據：[Google Document](https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/Document)、[Azure Layout](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/layout?view=doc-intel-4.0.0)、[Azure Get Analyze Result](https://learn.microsoft.com/en-us/rest/api/aiservices/document-models/get-analyze-result?view=rest-aiservices-v4.0%20(2024-11-30))、[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[OpenAI Responses](https://developers.openai.com/api/reference/resources/responses/methods/retrieve)。本輪只驗證已實作子集，不宣稱真實 API 端到端相容。

## 比較、Ground Truth 與品質接口

沿用 B2-1 compareCandidate、B1、P0/P1，不新增另一套文字排序／幾何匹配演算法。每個候選與兩個本機引擎比較，也建立供應商彼此的成對比較。所有比較都保留原始事件、位置、供應商與來源雜湊，不把不同供應商標籤當成獨立證據。

沿用現有 verified store 的來源／修訂檢查與 Benchmark 指標，支援全文／中文 CER、英文 CER／WER、公式 exact-match、表格 topology F1／整表拓樸 exact-match、圖說與閱讀順序。結構評測還需要明確人工 canonical ID 對應，綁定 annotation digest、原圖 SHA、ROI、審核人與時間；圖說另外要求 figure ID 對應。不得自動把相同字串或相同框當作同一結構。

沒有 GT 就回 null；沒有提供結構不是零錯誤；只有一個閱讀區塊沒有可比較的先後對，順序分數亦為 null。缺少 native 結構或儲存格幾何不完整時保留 NOT_EVALUATED，不懲罰成零準確率。未映射的已提供結構保留，避免悄悄刪掉候選內容美化分數。

公式 exact-match 是已宣告文字表示的精確比較，不是化學語義或渲染等價證明。LaTeX 與 Unicode 的等價轉換、字形基線及電荷語義校驗尚未實作；不得把格式差異直接宣稱為真正的公式辨識錯誤。

覆核事件按同一 ROI、類型與位置整理，保留各 pair、provider 及原事件。狀態為 pending_human_review、confidence 為 null／未校準、auto_apply_allowed 為 false。共同辨識錯誤、公式語義、圖示關係及原文缺漏仍不能僅靠模型一致自動證明。

## 十二 ROI 實際執行結果

最終本機產物：`tmp-ocr-b22-20261109-v3/`，包括十二份 ROI JSON、summary、人工可讀報告、36 份 append-only replay journal 及測試／執行摘要。先前 v1、v2 輸出保留，不覆寫。這些目錄含原始 OCR 引用、文字與本機路徑，不應直接公開提交。

本輪真實樣本全部回放既有 PaddleOCR，不是 Google／Azure／OpenAI 新辨識：

- 來源可追溯：12／12，verified GT：0。
- 正規化結果：36，失敗：0。
- 供應商彼此比較：36 組；另有 72 組本機對候選比較。
- 三個供應商分開看的覆核群組合計 93；加入跨供應商證據後，統一清單為 39 組，保留 140 個唯一事件。
- 重開 journal 與 provider 後：36 次快取命中、0 次新回放；比較資料與統一清單可重現。
- network calls、OCR calls 與實際 API 費用均為 0。
- CER、WER、confidence 與正式品質分數均為 null，沒有內容自動接受。

| ROI | 掃描序號／索引頁 | 統一覆核群組／事件 |
|---|---|---:|
| p2a-text-01 | 6／11，頁碼 verified | 1／1 |
| p2a-text-02 | 6／11，頁碼 verified | 2／4 |
| p2a-text-03 | 200／205，頁碼 verified | 1／1 |
| p2a-text-04 | 317／322，estimated | 3／7 |
| p2a-science-01 | 200／205，頁碼 verified | 3／13 |
| p2a-science-02 | 200／205，頁碼 verified | 2／10 |
| p2a-science-03 | 200／205，頁碼 verified | 2／10 |
| p2a-science-04 | 200／205，頁碼 verified | 2／10 |
| p2a-structure-01 | 19／24，estimated | 15／60 |
| p2a-structure-02 | 200／205，頁碼 verified | 3／13 |
| p2a-special-01 | 200／205，頁碼 verified | 2／4 |
| p2a-special-02 | 317／322，estimated | 3／7 |

93 與 39 是不同清單組織方式，不能換算 OCR 改善率或人工時間節省率；140 個事件也不等於 140 個真實錯誤。頁碼 verified 不等於內容 verified。局部表格與窄公式 ROI 的範圍限制依舊存在。

## 測試、費用與執行方式

B2-2 新增 45 PASS、0 FAIL、0 SKIP；既有 570 項回歸不退化，合計 **615 PASS、0 FAIL、0 SKIP**。最終完整測試約 26.55 秒；十二 ROI 回放、來源驗證、重新評測及重開快取約 19.58 秒，並非 OCR／API 延遲。

初輪測試發現新增 Mock Provider 的括號語法錯誤，已修正；另一項單區塊順序測試原本預期 1，但正確分母是零，調整新增斷言為 null，並補上雙區塊逆序測試。未修改既有標準答案、測試或正式資料。其餘測試涵蓋 Unicode、原始資料不可變、座標／跨頁、表格跨度／重疊、圖說對應、拒答／截斷、錯來源、授權、快取策略、失敗原始回應保存及禁止盲目重試。

```powershell
node --test scripts/ocr-cross-validation/b2-2.test.mjs
node scripts/ocr-cross-validation/compare-cli.mjs --dataset tmp-ocr-p2a-20261108-v2 --out tmp-ocr-b22-NEW-RUN
```

輸出必須為專案內尚不存在的目錄。批次入口限制十二 ROI，最多 36 個新 Mock 任務；可讀的來源與 cache 必須吻合。重用 B2-1 的費用估算與總帳測試；已知情境小計超過批次上限會在回放前拒絕，Azure 未報價使 forecast_complete 為 false。即使 Mock 免費，不會把未知費用當作已批准的正式執行預算。

本輪實際 API 支出 US$0。2026-11-09 官方公開費率仍可支持既有情境假設：Google 十二次 OCR 加四個 add-on 約 US$0.042；mini 若每 ROI 總輸入（含圖片換算）8,000 token、輸出2,000 token，十二次約 US$0.18；已知小計 US$0.222，未含稅、儲存及傳輸。Azure 須取得帳號／區域／SKU 報價，因此完整總價維持 null。token 數不是實測或硬上界。

價格依據：[Google Document AI](https://cloud.google.com/products/document-ai/pricing)、[GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)、[Azure 價格](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/)。US$100 是探索總上限，尚須扣歷史支出；先前 US$5 小實驗上限也不等於付款授權。

## 尚未完成與下一步

- 尚無獨立人工 GT、供應商實際辨識結果、真實用量／帳單或準確率；無法證明人工工作量已下降。
- 真實 transport、完整 API schema／版本／Unicode／旋轉回應驗證與帳單級總額管控尚未完成；解析長度、巨大表格及分散式作業的資源限制仍需生產化驗證。
- 公式、數值單位與上下標、完整表格／圖片關聯及內容缺漏，仍需可核圖的證據。現有字形基線／概念圖能力沒有因此自動完成。
- 教材雲端處理權、供應商輸出保存／評估／訓練用途、學生資料同意及保留政策須另行核定。權利沿用 B2-1 的 unknown-deny 規則，不因付費或模型一致就可訓練。
- 程式合約可供其他科目重用，但本受控入口未擴大到其他頁、其他科目或手機拍照；沒有測量千頁吞吐量。

建議先人工驗收本輪離線結果，再決定是否備份 GitHub。之後若要實際付費，必須另行批准一個服務、單 ROI、來源授權、具體版本、費用上界與停止條件；尚不允許啟動剩餘 471 頁或 B2-3。
