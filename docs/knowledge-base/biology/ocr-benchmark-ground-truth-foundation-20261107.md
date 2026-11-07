# OCR Benchmark Ground Truth 第一階段：資料管理基礎

## 範圍與原則

重用現有 Benchmark v1、15頁清單、兩ROI人工校正、來源驗證及多引擎差異定位，不另建正式Schema，不修改OCR引擎、人工介面、既有資料或正式知識庫。此階段只建立待審核快照與清單，不建立verified答案。

沒有經人工逐字核對原圖的文字或結構，不得進入正式Ground Truth。OCR、AI與人工草稿均僅作參考。辨識準確率、正式CER/WER、人工時間節省仍未驗證。

## 新增工具

|檔案|用途|
|---|---|
|`scripts/ocr-benchmark/ground-truth/core.mjs`|待審核清單組裝、來源／ROI綁定、格式與摘要雜湊驗證；不提供確認或覆寫功能|
|`scripts/ocr-benchmark/ground-truth/io.mjs`|重用既有15頁來源檢查與兩ROI歷史驗證；歷史、OCR及模型資訊以路徑和SHA引用|
|`scripts/ocr-benchmark/ground-truth/cli.mjs`|產生獨立新目錄、完整度報告、審核清單及重載驗證|
|`scripts/ocr-benchmark/ground-truth/ground-truth.test.mjs`|合成資料安全、版本、分組、不可覆寫及無真值行為測試|

## 資料格式

`benchmark-pending.json` 直接沿用 `studysignal-ocr-benchmark-v1` 與 `schema_version: 1`，每筆保留：

- 圖片來源：`source_id`、`material_id`、`image_path`、`image_sha256`、`sources.image_manifest`。
- 位置：`page_id`、`scan_seq`、`printed_page_label`、`page_number_verification`、`region_id`、`bounding_box`、`coordinate_space`、`polygon`。
- 內容類型：`region_type`、`coverage_tags`。
- 答案欄位：`reference_text`、`reference_structure`；本次均為null。
- 審核：`annotation_status`、`reviewer`、`reviewed_at`、`annotation_version`、`reference_origin`、`approval`。
- 分組與權利：`dataset_split`、`parent_image_sha256`、`derived_from`、`source_license_status`、`training_consent`。

全部新資料保持pending，沒有人工審核者或審核時間，不捏造確認紀錄。既有標準答案可使用現有Benchmark格式表達，但本批沒有正式答案。

`inventory.json` 是獨立管理封裝：`format: studysignal-ground-truth-inventory-v1`、`inventory_revision: 1`、`previous_inventory: null`、`inventory_digest`、`entries`及`review_queue`。摘要用於偵測修改，不是人工身分認證或人工確認證據。

管理封裝中`annotation_version: 1`代表新待審核樣本；既有草稿的revision獨立保存在`existing_review`與`history_refs`，不能混成同一版本序列。每次CLI執行建立新目錄，既有原始儲存仍採其原有append-only版本規則。

## 第一批完整度

|項目|實際結果|
|---|---|
|來源可追溯頁數|15/15；核對圖片SHA、尺寸、OCR資料層與頁碼綁定|
|詳細ROI|2個：table-nucleic-acids、formula-iron|
|待審核單位|17個：15個整頁範圍＋2個詳細ROI，不是17張不同頁面|
|原始圖片缺失|0|
|印刷頁碼狀態|4 verified、10 estimated、1 unnumbered|
|無印刷頁碼|掃描486為unnumbered；原圖存在，不判定資料遺失|
|局部差異群組|10組；為待確認假設，不是10個已確認錯誤|
|正式Ground Truth|0；CER/WER為null|
|資料分組|全部development；沒有新增validation/test|
|訓練授權|仍unconfirmed／training_consent=false，不得拿來訓練|

本批掃描序號：2、6、10、19、21、60、200、230、317、318、324、325、465、472、486。

### 既有校正紀錄

- table-nucleic-acids：Ground Truth歷史9版，最新revision 9、previous_revision 8、draft、九格uncertain；另有舊版文字審核紀錄1版，分開引用，不合併版本號、不轉成真值。
- formula-iron：來源及既有雙引擎結果可追溯；目前Ground Truth歷史與舊版文字審核歷史均為0版。不能宣稱已有人工校正完成。

來源SHA、ROI、完整版本鏈與候選輸出先經既有工具核驗；管理清單不複製草稿正文，也不改寫既有紀錄。

## 人工審核方式

優先處理兩個ROI的10組定位疑點；風險提示按區域列出，避免把重疊事件當作多個已確認錯誤。候選來源有引擎、版本、raw/layout/result路徑與SHA，不自動載入為標準答案。

兩ROI沿用現有Ground Truth介面：先重新載入已存草稿，再對照原圖修正；不確定項目保持draft/pending。只有完成整個聲明ROI的文字、符號、結構與完整性核對，才能經既有明確確認流程產生verified版本。只查兩引擎差異不能排除共同漏字。

其餘15個整頁項目目前是來源與待審核範圍清單，不代表已有逐段精細ROI，也不代表現有兩區域介面已能編輯所有頁面。後續若要增加精細區域或擴充UI，需另行批准。詳細ROI與所屬整頁需協調標註範圍，避免重複人工工作。

## 執行與產物

```powershell
node scripts/ocr-benchmark/ground-truth/cli.mjs
```

預設建立新的`tmp-ocr-gt-foundation-*`目錄。`--out`只能指向尚不存在的目錄；不覆寫既有快照。

- `inventory.json`：管理封裝、來源／歷史引用與摘要。
- `benchmark-pending.json`：17筆相容Benchmark的待審核樣本。
- `review-queue.json`：15整頁＋2詳細ROI的任務、差異位置與檢查項目。
- `completeness.json`：15頁逐頁完整度與兩ROI歷史摘要。
- `human-review-checklist.md`：優先人工工作清單，不含教材OCR正文。
- `execution.json`：時間、來源雜湊引用、重載驗證及零OCR/API費用紀錄。

產物保留本機，不代表已核准提交GitHub；其中含內部來源／草稿參照，公開前仍須獨立檢查。

## 測試與限制

新增28項合成測試，涵蓋來源、ROI、SHA、歷史版本、資料分組、候選文字隔離、pending保護、不可覆寫、重新載入及可重現性。相關回歸命令：

```powershell
node --test --test-reporter=tap --test-skip-pattern="^(real adapters|real server|real HTTP|HTTP interface|two real regions|real two-region)" scripts/ocr-review-stage2.test.mjs scripts/ocr-ground-truth-candidates.test.mjs scripts/ocr-ground-truth-table.test.mjs scripts/ocr-ground-truth.test.mjs scripts/ocr-benchmark-text-review.test.mjs scripts/ocr-human-review.test.mjs scripts/ocr-quality-gate/quality-gate.test.mjs scripts/ocr-merge-split-reliability.test.mjs scripts/ocr-multi-engine-diff/diff.test.mjs scripts/ocr-benchmark/benchmark.test.mjs scripts/ocr-benchmark/ground-truth/ground-truth.test.mjs
```

本次321項工程測試通過（既有222項＋Benchmark既有71項＋新增28項），不是OCR準確率。排除的7個既有真實來源測試範圍與前輪一致；真實15頁及歷史資料由CLI唯讀核驗。

仍缺：正式人工答案、獨立validation/test資料、全頁精細區域審核介面、審核者身分治理、經校準的誤報／漏報及人工時間資料。工具不自動確認、不自動匯出verified答案、不產生訓練資料，不修改正式Schema或Knowledge Base。
