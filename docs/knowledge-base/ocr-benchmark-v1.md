# StudySignal OCR Benchmark v1

日期：2026-11-04。這是獨立、免費、離線的評測模組；不執行 OCR、模型訓練或 API，不修改 OCR v2.3、正式 Knowledge Base 或原始檔案。現有 15 頁是 development，不是獨立 test。教材內容指標目前均未經獨立人工參考答案驗證。

## 模組與重用

| 檔案 | 用途 |
|---|---|
| `scripts/ocr-benchmark/core.mjs` | 樣本／模型輸出契約與 runtime validation、標註閘門、資料洩漏檢查、指標與比較 |
| `scripts/ocr-benchmark/io.mjs` | 來源雜湊驗證、現有 Tesseract 匯入、通用結果匯入與參考式保存 |
| `scripts/ocr-benchmark/cli.mjs` | prepare、evaluate、compare；全部只讀取既有辨識資料 |
| `scripts/ocr-benchmark/benchmark.test.mjs` | 合成文字／結構、資料洩漏、匯入、不可覆寫及無 GT 行為測試 |
| `scripts/ocr-benchmark/datasets/biology-development.v1.json` | 15 頁來源清單與空白標註欄位；不包含原圖或教材正文 |

重用 `scripts/lib/ocr-quality-metrics.mjs` 的 edit distance／SHA，與 `textbook-page-catalog.mjs` 的 `verifyOcr`（含既有附件及 raw→TSV 對齊檢查）。沒有修改這些既有程式。Sharp 僅讀取圖片尺寸，沒有辨識或輸出新圖片。

來源報告：`docs/knowledge-base/biology/ocr-v23-stage2-quality-validation-20261104.json`。來源清冊：`tmp-ocr-v23-stage1-20261104/catalog.final.json`。原始圖片由 manifest 的 `originalFileName` 精確對應到 `originalPath`；公開清單只保存檔名、manifest 相對路徑及雜湊，不寫入個人絕對路徑。

## 資料契約

`core.mjs` 的 `validateSample`、`validateDataset`、`validateResult` 是可執行的 v1 格式驗證器；本版不宣稱另有 JSON Schema 引擎。

每筆樣本必填：

- 身分：`sample_id`、`source_id`、`material_id`、`page_id`、`region_id`、`region_type`。
- 圖片：`image_sha256`、`image_path`、`image_width`、`image_height`、`coordinate_space`、`bounding_box`、`polygon`。座標為原圖像素，bbox 是 `[x,y,width,height]`；bbox／polygon 至少一項非 null，均須在圖片範圍內。
- 切分：`dataset_split` 必須為 development／validation／test。
- 參考答案：`reference_text`、`reference_structure`、`annotation_status`、`reviewer`、`reviewed_at`、`annotation_version`、`reference_origin`、`approval`。
- 權利及追溯：`source_license_status`、`training_consent`、`parent_image_sha256`、`derived_from`；可另有 `leakage_group_id`。

現有 15 頁的 `image_path` 是原始檔名，搭配 `image_path_resolution=source_index_manifest_originalPath` 與頂層 `source_index` 精確解析；不是假設圖片已搬入專案。其他教材／經授權手機樣本可以用專案相對圖片路徑。禁止以檔名猜測不存在的來源。

人工確認需要 `annotation_status=human_confirmed`、`reference_origin=human_checked_against_image`、審核者、時間及 `approval={reviewer_type:'human',confirmed:true,annotation_sha256:...}`。`annotationDigest(sample)` 綁定來源、區域、文字、結構、版本與審核者。改動任一已綁定欄位就必須重新確認。

雜湊只能偵測內容變動，不能證明真有人工看過原圖；審核者身分、權限及簽核流程仍須管理。單獨設定 `human_confirmed`、AI reviewer 或把 `reference_origin` 寫成 OCR 輸出，都不能通過閘門。測試中的人工旗標只用於明確標示的 synthetic fixture，不是教材 Ground Truth。

`reference_structure` 可部分標註，只對已確認的欄位評分：

```json
{
  "critical_fields": [{"id":"field-1","type":"chemical_formula","value":"自編參考公式"}],
  "content_units": [{"id":"block-1","text":"自編參考段落"}],
  "reading_order": ["block-1","block-2"],
  "questions": [{"id":"question-1","number":"1","stem":"自編題幹","options":[{"label":"A","text":"自編選項"}]}],
  "tables": [{"id":"table-1","cells":[{"row":0,"column":0,"row_span":1,"column_span":1,"text":"自編儲存格"}]}],
  "captions": [{"id":"caption-1","figure_id":"figure-1","text":"自編圖說"}]
}
```

以上只是欄位範例，不是已審核標註。缺少某欄位不等於確認沒有該內容；只有人工明確確認空集合時才填 `[]`。

## 模型輸出與公平比較

`importModelResult(input,sample)` 接收已完成的結果，不接收 API key、模型物件或推論 callback。支援 family：tesseract.js、paddleocr、paddleocr-vl、commercial-vision、studysignal-finetuned。

必填 `result_id`、`sample_id`、`image_sha256`、`model_family`、`model_id`、`model_version`、`model_config`、`execution_time`、`execution_time_unit='ms'`、`estimated_cost`、`actual_cost`、`currency='USD'`、`OCR_output`、`benchmark_result`。未知時間／成本用 null，不能冒充零。`OCR_output.text` 是匯入時的文字，`structure` 沒有則為 null。

實際文字另存不可變檔案，以 `OCR_output.text_ref={path,sha256}` 引用。`readResultRecords` 核對來源雜湊；若同時給 inline text，必須與引用檔案完全相符。保存比較結果時移除文字本文，留下引用及 `benchmark_result`，避免複製教材正文。重新匯入時會讀回引用，不需要重跑 OCR。

不同 family／model ID／版本／設定各為不同實驗組；設定物件 key 順序不影響分組。結果依固定 sample 排序，同組重複結果拒絕匯入。比較相同樣本與相同標註版本，不將缺少模型輸出的頁面視為零錯誤。不產生任意綜合排名。

結構輸出必須有 `structure_alignment='benchmark_canonical_ids'`，並已對齊 benchmark 的區域／結構 ID；否則 NOT_EVALUATED。這個欄位是 adapter 的明確契約，並非自動證明對齊正確。v1 尚未自動解決模型框之間的匹配，需人工或另經驗證的 adapter 對齊；不能將文字不同的區域硬配。

## 指標與限制

| 指標 | v1 能力 | 限制 |
|---|---|---|
| 整體 CER | NFC、移除空白、保留大小寫／標點／符號；edit distance / 參考字元數 | 不做 NFKC 或自動文字修正 |
| 中文 CER | Han 字元投影後評分 | 不能替代中英文整體順序、數字或完整性評分 |
| 英文 WER | ASCII 英文詞；主指標大小寫敏感，另列不敏感結果 | 數字、單位與符號須搭配整體 CER／critical_fields |
| 科學關鍵資訊 | 公式、數值、單位、上下標、術語分組 exact comparison，記錄缺失／替換／多出 | 不以化學合理性證明原圖內容，不自動抽取正確答案 |
| 題號／選項 | 題幹與號碼比對、缺少／多出選項標籤清單 | 需人工結構與對齊的模型輸出 |
| 內容缺漏 | 已標註 content_units 的 missing／替換／多出 | 不具備從原圖自動證明全文完整的能力 |
| 閱讀順序 | 區塊成對順序、缺失配對、額外／缺失 ID | 語意與跨頁接續不能靠此自動確認 |
| 表格 | 對齊表格的 cell 文字、row／column／span 完整 exact comparison | 尚無 TEDS、cell adjacency F1 或自動結構抽取 |
| 圖說 | 文字與 figure_id 關聯比對 | 生物圖拓撲不包含在圖說評分中 |
| 概念圖節點／分支評分 | NOT_IMPLEMENTED | 尚未實作 |
| 手機缺陷偵測 | NOT_IMPLEMENTED | 尚未實作；來源格式可容納手機樣本 |
| 未申報旋轉／裁切近似去重 | NOT_IMPLEMENTED | SHA 與申報來源關係無法發現全部視覺衍生圖 |

沒有有效人工參考答案、缺少某項結構，或模型沒有提供該結構時，一律 NOT_EVALUATED／null，不算成功或零錯誤。模型 confidence 不參與準確率計算，也不導致 OCR 自動核准。

空白參考答案的 CER／WER 分母為零，rate 保持 null，仍保留插入數。語料層 micro rate 將這些插入計入錯誤總數，若整組仍無非零分母則 rate 依然 null。沒有參考答案時，連 errors 也為 null。

結構錯誤率為（missing＋substitutions＋insertions）／參考單位數，可大於 1；這不是 accuracy。表格是每個 table 是否完全一致的粗粒度結果，題目是每題是否完全一致，不能冒充逐格／逐選項錯誤率。

## 防洩漏與訓練資格

以 material_id（整本書）、source_id、page_id、圖片 SHA、父圖片 SHA、derived_from 及 leakage_group_id 的連通群組檢查分割。群組跨 development／validation／test 即拒絕。相同圖片及相同區域幾何重複時，即使更名 sample／region ID 也拒絕；同頁不同區域在相同 split 可保留。

只認得確切雜湊與已申報衍生關係，不能保證來源不明的旋轉／裁切已全部去重。新資料仍須來源審核與近似圖檢查；material_id 必須使用穩定書籍身分，不能任意換名繞過整本書分組。

`trainingEligible` 只在人工確認、source_license_status=training_permitted、training_consent=true 且 development 時回傳 true；validation／test 不得匯出為訓練資料。本版只有資格判斷，未建立訓練匯出器，也沒有執行訓練。學生資料的解題授權不視為訓練同意。

## 15 頁清單與本次驗證

全部 annotation_status=pending_human_review，reference_text／reference_structure／reviewer／reviewed_at／approval 均為 null；source_license_status=unconfirmed、training_consent=false。正式 CER／WER 為 null，訓練資格 0。

| 掃描 | 索引印刷頁 | 頁碼狀態 | 主要待標註範圍 |
|---:|---|---|---|
| 2 | 5 | verified | 目錄、繁中與英文、章節頁碼關係 |
| 6 | 11 | verified | 正文、英文名詞、圖片圖說 |
| 10 | 15 | estimated | 細胞圖標、表格、缺漏 |
| 19 | 24 | estimated | 表格、科學符號、閱讀順序；印刷頁碼仍待確認 |
| 21 | 26 | estimated | 化學式、流程圖、正文缺漏；印刷頁碼仍待確認 |
| 60 | 65 | verified | 章節標題、多欄圖說順序 |
| 200 | 205 | verified | 公式、氣體名稱、圖示標籤 |
| 230 | 235 | estimated | 電荷與希臘字母、圖文混排 |
| 317 | 322 | estimated | 概念圖、RNA 術語、正文順序 |
| 318 | 323 | estimated | 尺度／單位、圖標、表格 |
| 324 | 329 | estimated | 英文術語、方向／上下標、轉錄圖 |
| 325 | 330 | estimated | 專有名詞、符號、大段正文缺漏 |
| 465 | 附-12 | estimated | 題號、選項、題幹缺漏 |
| 472 | 附-19 | estimated | 多題順序、圖標、科學符號 |
| 486 | 無 | unnumbered | 空白負向控制，仍需人工確認 |

主要依據是既有第二階段報告，以上不是新增人工標註，也不因目視觀察而升級 estimated。4 verified／10 estimated／1 unnumbered。原圖與全頁 OCR 各 15 份、必要 OCR 層 60 份經讀取／雜湊及既有 verifyOcr 檢查；不是再次 OCR。

本機測試：Benchmark 71 項＋重用 metrics 4 項，共 75／75 通過。測試文字為自編合成內容，包含插入／刪除／替換、繁中、大小寫、數值單位、上下標、空白／無 GT、結構錯誤、同源洩漏、模型匯入及不可覆寫等；不代表教材準確率達標。Node 有既有 TS 模組類型警告；未為消除警告修改 package.json。

本輪保留初次及中間執行的隔離產物，不覆寫它們。最終驗證位置及可重現性資料見 `tmp-ocr-benchmark-v1-20261104-verified/`；新輸出一律使用新的目錄名稱。15 頁有兩組不同歷史執行設定，不視為兩個 OCR 模型，也不把不同頁面組的成績拿來排名。

## 本機操作

需求：現有 Node.js 24 與已安裝專案依賴。純合成測試不需要 API 或外部原圖；15 頁實際匯入需要本機 manifest、兩個既有 OCR run 及清冊，這些受保護資料不是乾淨 Git checkout 自動附帶的教材。

```powershell
node --test scripts/ocr-benchmark/benchmark.test.mjs scripts/ocr-quality-metrics.test.mjs

# 匯入現有 15 頁；out 必須不存在
node scripts/ocr-benchmark/cli.mjs evaluate --dataset scripts/ocr-benchmark/datasets/biology-development.v1.json --out tmp-ocr-benchmark-my-run

# 重新載入先前已保存的模型結果；也可換成符合契約的其他模型結果 JSON
node scripts/ocr-benchmark/cli.mjs compare --dataset scripts/ocr-benchmark/datasets/biology-development.v1.json --results tmp-ocr-benchmark-my-run/model-results.json --out tmp-ocr-benchmark-my-comparison
```

evaluate 是既有 Tesseract adapter；compare 是通用匯入，均不辨識圖片。prepare 是本次舊 15 頁來源 adapter，不是通用新教材建庫程式。已保存 dataset 不可用 prepare 覆寫；若需要另一份來源清單，必須使用新的檔名。既有欄位及來源不明時拒絕，不猜測。

## 下一步人工標準答案

先在獨立新版本檔案中建立少量有代表性的 region 標註：繁中正文、英文術語、帶電荷與上下標的公式、表格、題號／選項及閱讀順序。人工對照原圖逐項確認；科學關鍵欄位建議第二人複核。記錄來源 SHA、幾何、審核者、時間、版本與審核範圍，再計算 digest。不要先拿整頁 OCR 複製成已核准答案。

既有 15 頁僅供 development；validation／test 必須使用其他來源書籍或自編／授權樣本，不能從同一本書另抽頁就宣稱完全獨立。未確認教材訓練權利前，標註仍不能自動成為訓練資料。先完成人工參考與 adapter 對齊，再進行跨模型實驗。
