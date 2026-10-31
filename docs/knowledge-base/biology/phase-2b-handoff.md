# StudySignal 生物知識庫 — Phase 2B 交接

基準日期：2026-10-31（Asia/Hong_Kong）。工作目錄：`.`。

詳細數據、逐年表及驗證方法見 [Phase 2B 盤點報告](phase-2b-audit-report.md)。本文件供後續 Codex 或其他 Agent 接手；是進度基準，不是開始 Phase 2C 的執行授權。

## 1. 目前階段與授權界線

Phase 2B 唯讀盤點已完成，現將結果保存為兩份 Markdown。Phase 2C「批次 OCR、題目分類與知識地圖補全」尚未開始。

本次只允許新增本文件、`phase-2b-audit-report.md` 與必要目錄。未修改 PDF、圖片、OCR、JSON、既有 Markdown、網站功能；未清理、移動或重新命名資料；未 commit、push。後續需先閱讀最新使用者指示，再決定可寫入的範圍。

## 2. 已完成成果與狀態

| 成果 | 已保存 | 已驗證 | 尚未完成／尚未確認 |
|---|---|---|---|
| 十年考題 | 每年 PDF、paper.json、paper.md、入庫 document | 10 份 PDF 大小／SHA-256；每年 Q1～Q50；文件與 registry checksum | 全卷人工覆核均 pending；圖表及部分 OCR 有缺漏。 |
| 500 題文字 | 保存於十份整卷轉錄與入庫內容 | 題號總計 500 | 不等於已有 500 筆完整獨立題目 JSON。 |
| 題目分類 | 110～115 年 300 筆唯一紀錄 | 242 section、33 unit、25 ambiguous | 106～109 年 200 題無紀錄；既有 58 題尚未定節。 |
| 教材原圖與備份 | 原圖及備份各 486 張 | 各 486 張大小及 SHA-256 符合 manifest | 全書無缺頁、無內容重拍尚未確認。 |
| 頁碼索引 | JSON／CSV 已保存 | JSON 486 筆；45 verified、439 estimated、2 unnumbered | 章節有錯標；大部分頁碼尚未直接驗證。 |
| OCR 試作 | 五張的 raw／normalized 文字 | 五組檔案對應到 seq 2、10、465、472、486 | 含空白頁雜訊；摘要只有一筆結果；有效完成率尚未確認。 |
| 教材正式正文 | text/、review/ 目錄存在 | 已確認皆空 | 正式轉錄與驗收尚未完成。 |
| 知識地圖 | 分類檔有 8 章、31 節，summary 子主題 127 | 分類 JSON 實際 version=2 | 缺十年頻率、概念正文頁碼、優先級及人工覆核。 |

關鍵統計必須保留兩種口徑：

- **242 題已有單一節分類、258 題尚未完成單一節分類**，合計 500。
- **300 題已有分類紀錄、200 題完全無分類紀錄**，合計 500。
- 258 = 33 題章內未定節 + 25 題跨章未定 + 200 題無紀錄。不得抹除或重做這 58 題已有候選分類的工作。

`snapshots/biology.skeleton.v1.json` 只是 2 單元、3 知識節點、1 題佔位題的示範骨架。任務口語中的「知識地圖 v1」不能用來改寫現有分類 JSON 的 version=2，也不能宣稱 500 題已接入骨架。

## 3. 接手必讀檔案

所有下列專案路徑均相對於工作目錄：

1. `docs/knowledge-base/biology/phase-2b-audit-report.md`：本次完整盤點、數據口徑及限制。
2. `content/knowledge-base/metadata/source-registry.json`：11 筆來源，十年考題＋一筆目錄。
3. `content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc{106..115}/paper.json`、`paper.md`、`verification-report.md`、`human-review-checklist.md`：逐年來源及待辦。`{106..115}` 是範圍說明，不是字面檔名。
4. `content/knowledge-base/documents/`：實際入庫 JSON；以年度 paper.json.documentId 定位，不另編造 ID。
5. `content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json`、`page-index.json`、`page-index.csv`：教材實體路徑、雜湊、頁碼與疑似缺頁。
6. `content/knowledge-base/sources/biology/shinedoc-toc-20260902/toc.json`、`toc.md`、`scans/`：不同批次的目錄，不要未核版本就合併。
7. `content/knowledge-base/ocr-pilot/biology-5pages/`、`single-image-test/`：已有試作、摘要與保留備份。
8. `content/knowledge-base/derived/biology/exam-topic-map-roc110-115.json`、同名 `.md`、`proposed-course-map-roc110-115.md`：可重用的分類及課程結構。
9. `docs/kb-import-reviews/roc106-q43-human-verification.md`：僅 Q43 的既有人工作證，不代表全卷通過。
10. `src/lib/knowledge-base/import/normalizeText.ts`、`biologyExamPaper.ts` 與 `scripts/kb-biology-exam.ts`：需理解既有 checksum、ID、匯入規則時閱讀；先檢查副作用，未獲授權不得直接執行寫入流程。

## 4. 必須保留的原始資料

- 十年標準來源目錄的所有 `originals/*.pdf`、paper.md、paper.json、既有 review 文件及入庫 documents。
- `content/knowledge-base/sources/biology/roc114/originals/114-4y-10-1.pdf`：雖與標準 114 PDF 相同，未獲授權不得刪除。
- `D:/Documents/ShineDoc/sources/` 的 manifest 所列 486 張原圖。
- `F:/StudySignal-Backup/Biology-Book-Scan-Original/` 的對應 486 張備份。
- manifest 的原始雜湊、bytes、originalPath、archivePath，以及頁碼索引的 verified／estimated／unnumbered 區別。
- 另一批目錄原圖、OCR raw／normalized、`.bak`、既有腳本、暫存裁圖與人工核對紀錄。未追蹤不代表可刪除。
- 所有既有 Git 修改及未追蹤資料，不執行 reset、clean、restore、checkout 或批次搬移清理。

外部原圖不隨專案 Git 自動取得。換機或重開工作階段時，先確認 D／F 槽清單路徑可讀，不能只看專案內 scans/ 有 manifest 就宣稱原圖仍存在。

## 5. 已知風險與不能沿用的推論

- 頁碼索引 seq 400 的 section 是 `7-素養試題`，但已視讀原圖 `IMG_2026_10_01_00_00_39R.jpg` 為印刷頁 405、第八章、8-1-3 群集；章節標籤不可直接供批次分類使用。
- 索引記錄印刷頁 1～3 未拍攝、6～7 疑缺；是否可由另一批資料補齊以及兩批是否同版，尚未確認。
- seq 453 原圖 `IMG_2026_10_01_00_03_20L.jpg` 已有書名、全華出版者及 ISBN 證據；README 尚未整理，不能只信舊文字說完全無書籍資訊。
- seq 486 原圖 `IMG_2026_10_01_00_05_09R.jpg` 是空白頁，OCR 卻有 1,136 字元雜訊。
- 兩個 OCR pilot-summary 都寫 totalPages=5 但 results.length=1；confidence=43 不可當五頁正確率。
- 114 舊報告寫未入庫，但實際 registry 及 doc_70444528552e.json 已存在；先查實體資料再決定待辦。
- 「沒有 U+FFFD」「題號連續」「雜湊一致」都不能證明原文完整正確；direct 分類也不是人工簽核。
- 初始工作區已有 `.gitignore`、registry、package.json、package-lock.json 修改，以及大量未追蹤成果。不要把它們當成本次文件變更，也不要順便整理。

## 6. Phase 2C 建議執行順序

以下僅為後續計畫，本次不開始 OCR 或分類。

1. **讀取授權與確認基準**：先看使用者最新範圍、適用 AGENTS.md、這兩份文件；執行唯讀 Git status，保留原有變更。重新核對來源可讀與關鍵計數。
2. **確認教材版本及來源對應**：檢查兩批目錄、疑似缺頁、章節錯標；先提供具體差異，取得必要寫入授權後再修正衍生索引。
3. **驗收已有 OCR**：逐張檢查五頁原圖與文字，處理空白頁及摘要錯誤。保留既有 raw、來源雜湊與驗收狀態；先找可重用內容。
4. **分批補缺少的 OCR**：只處理尚缺且需要文字的頁，逐批記錄來源檔名、頁碼可信度、工具版本、結果與待核對項目；不重掃、不直接覆蓋已完成內容。
5. **覆核考題高風險內容**：先 107／108 OCR，再圖像選項、共用圖表、序列、上下標。重用原 PDF、裁圖與既有 Q43 紀錄，不重建整套題庫。
6. **補分類**：先接續 106～109 年 200 題，再解決既有 33＋25 題未定節；沿用原題 ID、來源及候選分類。既有 242 題仍保留人工覆核需求。
7. **補知識地圖欄位**：概念連結實際教材頁與原圖，重算十年頻率，再制定學習優先級；正式成果與示範 skeleton 分開。
8. **驗證並更新交接**：逐項列已保存、已驗證、尚未完成、尚未確認；檢查計數與引用一致，依授權新增後續階段紀錄。commit／push 另依明確授權處理。

## 7. 後續 Agent 的最小驗證方式

先使用唯讀方法重新計數，不盲信報告摘要：

- 十年 paper.md 排除封面序號後，Q1～Q50 各一次；原 PDF 依各年 paper.json.originals 重算 SHA-256 與 bytes。
- paper.md 雜湊對 document.rawChecksum，document.content 雜湊對 normalizedChecksum，來源 ID／checksum 對 registry。
- 分類 questions 以唯一 ID、year、status 重算；核對 `242+33+25+200=500`、`33+25+200=258`。
- 教材 manifest 逐檔核對兩個路徑、bytes、SHA-256；索引計數與原圖內容檢查分開，不能只驗檔名。
- 不將 .bak、single-image-test 重複試作或空白頁 OCR 算作新完成正文。
- 執行任何現有腳本前先讀程式，確認是否寫檔、呼叫服務或更新 registry；本次沒有授權執行它們。

完成文件保存後，向使用者回報新增文件及 Git 狀態，等待確認。不要自動進入 Phase 2C。
