# OCR AI v2.2：人工審核、派生修正與回復 MVP

日期：2026-11-04（Asia/Hong_Kong）。本輪只匯入掃描 200／印刷 205，實際人工核准 0、實際文字修正 0、API 呼叫 0。人工操作的正向修正與回復測試全部使用明確標示的合成資料，不能視為教材審核或 Ground Truth。

## 架構盤點及最小設計

|既有來源／工具|可重用部分|本輪處理|
|---|---|---|
|V2 proposal validation|精確原文錨點、分類、重疊與科學文字風險|保留結果及分類，不降低標準|
|V2.1 source evidence|原圖／raw／TSV／回應雜湊、來源框、差異、公式證據|匯入為不可覆寫的頁面審核快照|
|`scripts/lib/ocr-quality-io.mjs`|路徑範圍、SHA-256、拒絕覆寫寫入、來源保護|直接重用；不新增依賴|
|舊 human-review store／UI|人工明確確認、追加版本、拒絕過期儲存的設計|舊工具只判斷九項版面案例，未當成文字核准，也未修改舊 UI 或紀錄|
|`src/lib/knowledge-base/schema/entities.ts`、`sqlDdl.ts`|科目、來源及學習資源的關聯契約|目前是 relational skeleton，未建立本輪所需的 OCR 逐項決策／patch／回復契約；不修改正式 schema 或資料庫|

最小方案採既有專案的離線 JSON 產物慣例，增加「頁面快照 → 人工決策 → 派生文字版本 → 追加回復」狀態機。這是正式教材入庫前的隔離審核層，不是另一份正式知識庫，也不自動發布教材。

## 四類佇列及第 200 頁

|類別|數量|建議序號|
|---|---:|---|
|可自動確認|0|無|
|需要人工審核|9|1、2、3、4、5、6、11、12、13|
|來源證據不足|2|7、8|
|疑似辨識錯誤|2|9、10|

「可自動確認」沿用 V2 的未改字／機械條件含義，不授權實際文字替換。「疑似辨識錯誤」是風險類別，可能來自原 OCR 或 AI 建議，並非已證實 OCR 錯誤。

仍須人工核對：公式電荷、上下標、氣體大小寫、酵素與離子原文、胺／氨字形、圖內標籤與閱讀順序，以及其餘中文候選修改。13 項均維持 pending_human_review，沒有建立假人工核准。

## 修正及資料完整性規則

- 頁面快照綁定科目、來源 ID、掃描序號、印刷頁碼、頁碼 verification、原圖與 raw SHA-256、來源檔案證據、原始 OCR 及 AI 建議。頁碼 verified 不代表 OCR verified。
- 依穩定內容指紋識別同一頁／來源版本；重複匯入不產生另一份頁面，也不覆寫既有快照。來源或候選變動會成為不同版本，舊審核不能自動沿用。
- 人工命令必須帶入 pageFingerprint、proposalFingerprint、expectedHead，防止套錯頁面／版本或覆寫其他視窗剛保存的決策。
- accept 必須明確提供 reviewerType=human、非空 reviewerId、humanConfirmed=true、核准文字 approvedText 及理由，並逐項確認 imageCompared、textPosition、scientificNotation、readingOrder。不可省略核准文字而默認 AI 正確。
- reject／uncertain 不授權任何替換。未定位到唯一原文的建議不能接受，須另建立來源明確的新版本，不做模糊猜測。
- 每次修正須有目前有效的匹配人工接受紀錄。核准文字的 hash、建議指紋及來源版本都必須一致；重複套用或重疊 patch 會拒絕。
- 每個 patch 指向 immutable raw 的原始 span。每次從 raw 加上有效 patch 集重新產生文字，避免先前修正長度改變後讓後續偏移錯置。
- review、apply、rollback 都是新 event 檔案；event 具有前一事件 hash、序號、命令、結果與時間。每次載入重播並核對事件鏈及結果，不單靠檔名時間排序。
- event 檔案使用固定下一序號搭配 exclusive write；並行寫入只有一方成功。過期儲存、部分／損壞檔案或事件缺口停止處理，保留檔案供查證，不自動清理、覆蓋或重試。
- rollback 只能指向存在的原始／派生文字版本，會追加新版本並保留完整舊履歷。已被更新審核撤銷的接受紀錄不可用來恢復舊 patch；更改目前有效 patch 的決策前須先回復。
- 真實教材每次讀取／寫入審核前核對來源檔案 SHA-256；來源變動即阻擋。只在隔離 store 寫入，不修改 source registry、正式 KB、原圖或 raw OCR。

人工身份目前屬本機自述，沒有獨立身分驗證或簽章。hash chain 提供本機完整性檢查，不能抵抗有權重寫整個 store 的人，也不能證明使用者實際看過原圖。接受決策不會自動轉成 Ground Truth 或正式教材 verified。

## 批次能力與限制

核心 API `openReviewStore(...).importBatch(inputs, {limit})` 接受不同科目／頁面，預設每次 20 頁，上限 50；依頁面指紋去重並保存逐頁成功／失敗收據。匯入結果頁面本身即為 checkpoint，可中斷後重用；無需重新 OCR 或呼叫模型。來源失敗留在批次錯誤紀錄，已完成的其他頁面保留。

頁面各自有獨立事件鏈，佇列可重新載入，避免重複審核。批次界限不會提前消耗 generator 的下一頁。本輪多頁能力僅用 synthetic-a／synthetic-b 合成資料測試；沒有讀取其他教材頁面。

CLI prepare 刻意限制掃描 200；尚未開放全書匯入。SQLite／正式 KB 發布 adapter、多使用者身分驗證、瀏覽器文字審核介面、分頁索引及數百頁效能測試均尚未實作。不能宣稱已完成整本教材系統或已測得人工節省比例。

## 實際本機工作包

隔離 store：

`tmp-ocr-ai-review-v22-ee3f1ab3-3c21-4e75-8fb0-90bfef2101b4/`

頁面指紋：

`aaf09698b435b0a8102b76d021327b1f1bffe7b3f63acccef0180c429f975867`

產物包括：

- `store.json`：store 類型及版本。
- `pages/<pageFingerprint>.json`：immutable 頁面快照，含原始／候選文字、來源及分類。
- `review-packet-<pageFingerprint>.md`：13 項原文、候選、定位、公式及差異證據。
- `review-command-template.json`：預設 humanConfirmed=false、所有檢查 false、decision=uncertain 的安全範本；不能直接用來核准。
- `software-test-results.json`：本輪 124 項軟體測試摘要。
- 實際人工操作後才會出現 `events/<pageFingerprint>/000000001.json` 等事件；目前沒有任何實際教材事件或派生修正。

工作包含教材文字及人工紀錄用途欄位，只供本機查證，不應直接公開提交。原圖不複製到工作包；依既有 manifest 找到原始圖片。既有證據來源：`tmp-ocr-ai-source-evidence-v21-Za6Ve1/evidence.json` 及其已綁定的來源檔案。

## 操作方式

先讀取目前佇列與版本，無需 API：

```powershell
node scripts/ocr-ai-review-v22.mjs --mode list --store tmp-ocr-ai-review-v22-ee3f1ab3-3c21-4e75-8fb0-90bfef2101b4
node scripts/ocr-ai-review-v22.mjs --mode status --store tmp-ocr-ai-review-v22-ee3f1ab3-3c21-4e75-8fb0-90bfef2101b4 --page aaf09698b435b0a8102b76d021327b1f1bffe7b3f63acccef0180c429f975867
```

人工對照原圖及工作包後，在 store 內另建命令檔案，不覆寫範本。每次命令先重新讀取 status，填入最新 expectedHead；首次為 null，其後為最新事件 hash。接受某項時，複製該項 proposal ID／fingerprint、填入明確核准文字、四項來源檢查與理由，才可 dispatch。

以下是將來人工完成後使用的入口；本輪沒有對真實教材執行接受、apply 或 rollback：

```powershell
node scripts/ocr-ai-review-v22.mjs --mode dispatch --store tmp-ocr-ai-review-v22-ee3f1ab3-3c21-4e75-8fb0-90bfef2101b4 --page aaf09698b435b0a8102b76d021327b1f1bffe7b3f63acccef0180c429f975867 --command human-command.json
```

核准 review 不會自動 apply。後續 apply 命令欄位為 action、pageFingerprint、proposalFingerprint、proposalId、expectedHead、actorId。rollback 命令欄位為 action、pageFingerprint、expectedHead、targetRevision、actorId、reason；原始版本的 targetRevision 為頁面指紋。兩者都只建立本機派生版本，不改正式教材。

## 測試與實際驗證

```text
node --test scripts/ocr-ai-review-v22.test.mjs scripts/ocr-ai-source-evidence.test.mjs scripts/ocr-ai-formula-evidence.test.mjs scripts/ocr-ai-proposal-evidence.test.mjs scripts/ocr-ai-proposal-validation.test.mjs scripts/ocr-ai-proposal-audit.test.mjs scripts/ocr-ai-correction-trial.test.mjs scripts/ocr-quality-metrics.test.mjs
```

新增 34 項，加上原有 90 項，共 124／124 通過，失敗／略過皆 0。這是軟體測試，不是文字準確率；CER／WER 維持 null。

覆蓋原文定位、公式／Unicode 上下標及中英文混排、明確人工接受門檻、拒絕與未定、跨頁／跨版本錯用、修正長度變化、重疊、重複套用、過期命令、hash chain、檔案損壞／缺口、重新開啟、回復及合成批次去重。合成事件標記 synthetic_human_simulation、isSimulation=true，不建立實際人工核准。

第 200 頁另外實測：

- 13 項均匯入；10 個輸入來源雜湊核對，變更 0。
- 對同一 store 再次 prepare，created=false，store 檔案內容雜湊完全一致。
- 實際提交未確認範本會被拒絕，store 雜湊仍完全一致，沒有新增事件。
- prepare 指定 201 會在讀取該頁前拒絕，沒有處理其他教材頁面。
- head=null、review events=0、text corrections=0；所有 13 項保持 pending。

## 新增檔案與後續

本輪新增 5 個程式／測試／文件檔案：

1. `scripts/lib/ocr-ai-review-v22.mjs`：頁面指紋、分類佇列、人工命令、patch、回復及事件重播。
2. `scripts/lib/ocr-ai-review-store-v22.mjs`：獨立 JSON store、來源核對、追加寫入、批次收據及恢復。
3. `scripts/ocr-ai-review-v22.mjs`：本機 prepare／list／status／dispatch 入口；prepare 只允許 200。
4. `scripts/ocr-ai-review-v22.test.mjs`：34 項合成測試。
5. 本報告。

另有上述隔離 store 的 5 個實際工作包檔案；合成磁碟測試另存作業系統暫存目錄，不清理任何既有資料。既有 V2／v2.1、原圖、OCR、考題分類及正式 KB 均未修改，未執行 git add、commit、push、付費 API 或 Phase 2F。

下一步建議：先由使用者逐項完成本頁少量 review，驗證核准文字及回復操作的可用性，再決定是否加入瀏覽器對照介面。整本擴充前仍需完成正式入庫 adapter、真實人工試用及效能量測，維持目前人工確認與完整性標準。
