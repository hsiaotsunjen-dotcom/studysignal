# StudySignal 生物知識庫 — Phase 2B 盤點基準

盤點日期：2026-10-31（Asia/Hong_Kong）。工作目錄：`.`。

本報告為 Phase 2B 文件化基準；數據於本次保存文件前重新讀取、計數及雜湊核對。僅新增本報告與同目錄 `phase-2b-handoff.md`，未修改現有資料、網站或執行 OCR／分類。以下專案路徑均相對於工作目錄；外部磁碟路徑另行列明。

## 1. 狀態定義與核心結論

| 狀態 | 定義 |
|---|---|
| 已保存 | 實際檔案存在且可讀；不等於已提交 Git、已有遠端備份或內容正確。 |
| 已驗證 | 已完成明確範圍的檢查，例如位元組、SHA-256、題號、引用及筆數；不得擴張為全文人工覆核。 |
| 尚未完成 | 預期成果缺少、仍為草稿或明確標記 pending。 |
| 尚未確認 | 尚無足夠證據，例如全書無缺頁、概念頁碼、逐題圖文正確率。 |

- **已保存、已驗證保存結構**：106～115 年十份 PDF、十組來源 JSON／Markdown、十份入庫文件，轉錄共 500 題，每年 Q1～Q50 連續。
- **已保存、尚未完成人工覆核**：十年 `reviewStatus` 均為 `machine-extracted; independent-human-review-pending`。圖表、序列及 OCR 疑點仍須回看原 PDF。
- **已驗證分類筆數**：242 題已有單一節分類，258 題尚無單一節分類結果。258 = 33 題章已定但節未定 + 25 題跨章未定 + 200 題尚無分類紀錄。
- **不可將 258 題全部寫成「尚無分類紀錄」**：實際已有分類紀錄 300 題，其中 58 題尚未定節；完全無現有對照紀錄的是 106～109 年 200 題。
- **已保存、已驗證清單內檔案**：教材 486 張原圖與 486 張備份，兩份各逐檔符合 manifest 大小及 SHA-256。這不證明原書所有頁面均已掃描。
- **尚未完成**：教材正文正式轉錄、人工驗收、十年完整分類、概念至教材頁碼的連結及學習優先級。

## 2. 十年考題逐年盤點

下表的年度來源根目錄為：

`content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc{年度}/`

每年均實際讀取 `paper.json`、`paper.md` 與 `paper.json.documentId` 指向的入庫 JSON；均有 `verification-report.md`、`human-review-checklist.md`。下表 PDF 路徑相對於該年度來源根目錄，入庫文件相對於 `content/knowledge-base/documents/`。

| 年度 | 已保存 PDF | 已保存轉錄方式 | 已驗證題數 | 單一節分類 | 章內未定節 | 跨章未定 | 完全無分類紀錄 | 入庫文件 |
|---|---|---|---:|---:|---:|---:|---:|---|
| 106 | `originals/106-4y-10-1生物.pdf` | PDF 文字抽取 | 50 | 0 | 0 | 0 | 50 | `doc_22de33a47df7.json` |
| 107 | `originals/107-4y-10-1生物.pdf` | 文字抽取＋第 3 頁 OCR | 50 | 0 | 0 | 0 | 50 | `doc_59d3967e0b43.json` |
| 108 | `originals/108-4y-10-1生物.pdf` | 文字抽取＋第 4～5 頁 OCR | 50 | 0 | 0 | 0 | 50 | `doc_60d611014048.json` |
| 109 | `originals/109-4y-10-1生物.pdf` | PDF 文字層解碼 | 50 | 0 | 0 | 0 | 50 | `doc_0275674ada68.json` |
| 110 | `originals/110-4y-10-1.pdf` | PDF 文字抽取 | 50 | 40 | 6 | 4 | 0 | `doc_c6d779df6901.json` |
| 111 | `originals/111-4y-10-1.pdf` | PDF 文字抽取 | 50 | 43 | 5 | 2 | 0 | `doc_0837557912ff.json` |
| 112 | `originals/112-4y-10-1.pdf` | PDF 文字抽取 | 50 | 44 | 4 | 2 | 0 | `doc_9b32d1fcc36f.json` |
| 113 | `originals/113-4y-10-1.pdf` | PDF 文字抽取 | 50 | 37 | 6 | 7 | 0 | `doc_66d1e11f6ba0.json` |
| 114 | `originals/114-4y-10-1.pdf` | PDF 文字抽取 | 50 | 43 | 2 | 5 | 0 | `doc_70444528552e.json` |
| 115 | `originals/115-4y-10-1生物.pdf` | PDF 文字抽取 | 50 | 35 | 10 | 5 | 0 | `doc_2882dd79f074.json` |
| 合計 | 10 份 PDF | 十年均有文字成果 | **500** | **242** | **33** | **25** | **200** | 10 份考題文件 |

### 2.1 500 題「結構化保存」的實際含義

已保存的是 PDF、來源中繼資料 `paper.json`、整卷轉錄 `paper.md`，以及含整卷 `content` 的入庫 JSON。**不能據此宣稱已存在 500 筆獨立、含完整題幹／選項／圖片／答案的題目 JSON。**來源 `paper.json` 主要是整卷中繼資料；目前可讀的逐題分類陣列只有六年 300 筆。

本次重新檢查十年資料：

1. 依各年 `paper.json.originals[].path` 讀取 PDF，逐檔比較實際大小與 `bytes`、重算 SHA-256 與 `sha256`：10/10 符合。
2. 讀取 `paper.md` 的數字題號行，排除前置封面注意事項；最後 50 個題號逐一等於 1～50：10/10 年通過，共 500 題。此方法確認題號結構，不證明圖文無缺漏。
3. 重算 `paper.md` 的 SHA-256，與對應 document 的 `rawChecksum` 比較：10/10 符合。
4. 重算 document 的 `content` SHA-256，與 `normalizedChecksum` 比較：10/10 符合。本次前一輪唯讀盤點另已依 `src/lib/knowledge-base/import/normalizeText.ts` 規則核對 Markdown 正規化後等於入庫內容；原文與正規化內容不要求逐位元相同。
5. 比對 `content/knowledge-base/metadata/source-registry.json` 的來源 ID 與 checksum：十年均存在且符合。registry 共 11 筆：10 筆考題、1 筆目錄，沒有正式教材正文來源。

### 2.2 尚未完成與尚未確認的考題內容

以下問題來自各年度 `verification-report.md`、`human-review-checklist.md` 及 `paper.json`。它們是既有待辦證據，並非本次重新人工覆核每道原題的結果。

| 年度 | 尚未完成／尚未確認項目 |
|---|---|
| 106 | Q43 有專門人工核對紀錄，其餘 49 題尚未獨立逐題覆核；不標記整卷完成。 |
| 107 | Q12～Q21 為 OCR 恢復；Q13 維管束圖未抽取。舊報告把其餘題數寫成 30，實為 40。 |
| 108 | Q19～Q34 OCR 待覆核；Q27、Q32 圖未抽取；「針眉」「甲 >> 乙」「刺激肝臟釋放和葡萄糖」及頁首雜訊等仍待核對。 |
| 109 | Q4、Q5、Q11 圖未抽取；部分格式及序列仍待覆核。 |
| 110 | Q14 為圖像選項；Q43 圖及標記位置、Q33 序列、Q44 等上下標待覆核。 |
| 111 | Q19 序列與親緣樹、Q36、Q38、Q49～Q50 圖表及部分上下標待覆核。 |
| 112 | Q5、Q13、Q14、Q19、Q32、Q35、Q38、Q41、Q43～Q44、Q49～Q50 等 12 題圖表待覆核。 |
| 113 | Q7、Q9、Q29、Q31～Q34、Q43～Q44、Q49～Q50 圖表及圖形選項待覆核。 |
| 114 | Q11、Q26、Q33、Q38、Q45～Q46 圖表，以及 Q40(B)「洒吞」待核對。 |
| 115 | 圖一～圖五、表一～表二未完整轉錄，需回看 PDF；全卷仍待人工覆核。 |

106 Q43 人工核對依據：`docs/kb-import-reviews/roc106-q43-human-verification.md`。該文件開頭仍保留早期「尚未入庫」敘述，應視為歷史背景；當前入庫狀態以現存 registry、年度來源及 document 為準。

114 年 `verification-report.md` 也仍寫尚未入庫，但本次確認 `doc_70444528552e.json` 與 registry 已存在。另有 `content/knowledge-base/sources/biology/roc114/originals/114-4y-10-1.pdf`；前一輪唯讀盤點已核對它與標準年度目錄 PDF 的 SHA-256 相同。兩份都須保留，本報告不執行去重。

## 3. 486 張教材原圖、manifest 與頁碼索引

教材來源根目錄：`content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/`。

| 項目 | 實際來源 | 狀態與結果 |
|---|---|---|
| 原始圖片 | `D:/Documents/ShineDoc/sources/`；精確路徑見 manifest 的 `originalPath` | 已保存、已驗證：486/486 路徑存在、大小相符、SHA-256 相符。 |
| 備份圖片 | `F:/StudySignal-Backup/Biology-Book-Scan-Original/`；見 `archivePath` | 已保存、已驗證：486/486 路徑存在、大小相符、SHA-256 相符。 |
| 檔案清單 | `scans/manifest.json` | 已保存、已驗證：486 筆，共 325,232,198 bytes，486 個不同 SHA-256。 |
| JSON 頁碼索引 | `page-index.json` | 已保存、已驗證結構：486 筆、486 個不同 seq；檔名均對應 manifest。 |
| CSV 頁碼索引 | `page-index.csv` | 已保存：487 行，含標頭與 486 資料列；本次未逐欄比對 CSV 與 JSON。 |
| 正式正文 | `text/` | 尚未完成：目錄存在但無檔案。 |
| 正式覆核 | `review/` | 尚未完成：目錄存在但無檔案。 |

486 是已保存掃描圖片數，並非已驗證完整的 486 頁教材正文。原圖不在該來源的 `scans/` 內；該目錄目前只有 manifest。日後複製專案或拉取 Git，不能假設會連同外部磁碟原圖取得。

頁碼索引內的狀態重新計數為：`verified` 45 筆、`estimated` 439 筆、`unnumbered` 2 筆。45/486 約 9.26% 是**既有索引標記比例**，不是本次重新視讀驗證比例。

索引記錄 seq 1～2 對應目錄印刷頁 4～5、seq 3～452 對應正文 8～457、seq 453 為無頁碼版權頁、seq 454～485 為附-1～附-32、seq 486 為空白無頁碼頁。大部分頁碼是推估，不能外推為內容完整證據。

### 3.1 缺頁、重複與章節標籤問題

- **尚未確認全書無缺頁**：`page-index.json.missingPrintedPages` 列印刷頁 1～3 未拍攝、6～7 疑似缺失。需比對實書及版本，不能只看檔名連續判定完整。
- **已驗證沒有位元完全相同的重複圖片**：manifest 的 486 個雜湊均不同且本次原圖全數符合；不同照片拍到同一頁的內容重複仍尚未確認。
- **前一輪已視讀的索引錯誤**：seq 400，`D:/Documents/ShineDoc/sources/IMG_2026_10_01_00_00_39R.jpg`，實際印刷頁 405 顯示「第八章 生態與資源利用」「8-1-3 群集」，索引卻標為 `7-素養試題`。本次重新讀取索引確認錯誤標籤仍在；未修改。
- **前一輪已視讀的書籍資料**：seq 453，`D:/Documents/ShineDoc/sources/IMG_2026_10_01_00_03_20L.jpg`，有書名「升科大四技－生物（適用農業群、衛生與護理類）」、出版者「全華圖書股份有限公司」、ISBN `9786264013765`。現有 README 的「書名、出版社未確認」落後於原圖證據；版次與出版年月尚未確認。

### 3.2 另一批目錄資料

`content/knowledge-base/sources/biology/shinedoc-toc-20260902/toc.json`、`toc.md` 與三張 `scans/*.jpg` 已保存。重新計數為 8 章、31 個 `kind: section` 條目；另有 16 個習題索引條目，不列入 31 節。三張目錄圖的 SHA-256 本次均符合 toc.json，既有標記為印刷頁 4、5、6。

這與 486 張教材是不同掃描批次。兩批是否同版、缺失目錄頁是否能直接互補，**尚未確認**；不得自動合併或套用頁碼。

## 4. OCR 現況與完成率

| 指標 | 可確認數量 | 解讀 |
|---|---:|---|
| 考題文字成果保存 | 500/500 題，100% | 題號與文字成果已保存；包含 PDF 文字抽取及部分 OCR，不是 OCR 正確率。 |
| 全卷人工覆核完成狀態 | 0/10 卷 | 所有年度 reviewStatus 仍 pending；已找到 106 Q43 個別人工紀錄。 |
| 教材 OCR 試作檔案覆蓋 | 5/486 張，約 1.03% | 五組 raw／normalized 非備份文字存在；不是有效正文完成率。 |
| 教材有效 OCR 驗收比例 | 尚未確認 | 尚無完整逐頁驗收資料，不能估算正確率或宣告完成。 |

OCR 試作根目錄：`content/knowledge-base/ocr-pilot/biology-5pages/`。本次實際讀取 raw／normalized 檔案與摘要，五張對應索引為：

| seq | 原圖檔名 | 索引頁碼 |
|---:|---|---|
| 2 | `IMG_2026_09_30_23_21_37R.jpg` | 5 |
| 10 | `IMG_2026_09_30_23_25_24R.jpg` | 15 |
| 465 | `IMG_2026_10_01_00_03_54L.jpg` | 附-12 |
| 472 | `IMG_2026_10_01_00_04_17R.jpg` | 附-19 |
| 486 | `IMG_2026_10_01_00_05_09R.jpg` | 無頁碼、空白 |

重要問題：

1. `biology-5pages/pilot-summary.json` 寫 `totalPages: 5`，但 `results` 只有 1 筆，confidence 為 43；不能把這個信心值當成五頁平均或正確率。
2. `single-image-test/pilot-summary.json` 也寫 totalPages 5、results 1；其 raw／normalized 是同一張 seq 2 的試作，不能再算一張新頁。
3. 前一輪實際視讀確認 seq 486 是空白頁，但其 `normalized_IMG_2026_10_01_00_05_09R_jpg.txt` 有 1,136 字元雜訊；不能當作有效教材文字。
4. 摘要的 `verification: verified` 不能據此解讀為 OCR 文字已完成人工驗收。`.bak` 是保留檔，不算新增頁數。
5. 教材來源 README 仍寫「尚未 OCR」，應區分「已有試作」與「正式正文尚未完成」。本次不更新該 README。

## 5. 分類與知識地圖進度

主要分類來源：

- `content/knowledge-base/derived/biology/exam-topic-map-roc110-115.json`
- `content/knowledge-base/derived/biology/exam-topic-map-roc110-115.md`
- `content/knowledge-base/derived/biology/proposed-course-map-roc110-115.md`

重新讀取 JSON 的 `questions` 陣列：300 筆、300 個唯一 ID，僅 110～115 年；按 `status` 重算為 section 242、unit 33、ambiguous 25。六年來源 Markdown 重算雜湊均符合 `sources.exams[].sha256`。

| 分類口徑 | 數量 | 占 500 題比例 | 狀態 |
|---|---:|---:|---|
| 有單一節分類 | 242 | 48.4% | 已保存、已驗證筆數；尚未獨立人工驗證分類正確性。 |
| 未完成單一節分類 | 258 | 51.6% | 包含下列 33＋25＋200。 |
| 章已定、節未定 | 33 | 6.6% | 已有紀錄，尚未完成定節。 |
| 跨章未定 | 25 | 5.0% | 已有紀錄，尚未完成定節。 |
| 完全無分類紀錄 | 200 | 40.0% | 106～109 年，尚未完成。 |
| 所有已有分類紀錄 | 300 | 60.0% | 242＋33＋25，不可與「單一節完成數」混用。 |

242 題單一節分類內，`mappingBasis` 為 direct 218 題、judgment 24 題；這些是既有機器／Agent 分類依據標記，不是人工核准標記。

### 5.1 「知識地圖 v1」名稱與實際版本

不能把本次報告基準、示範骨架和正式分類檔的版本混為一談：

- `content/knowledge-base/snapshots/biology.skeleton.v1.json` 確實是 v1 名稱的骨架：1 個 curriculum、2 個 curriculumUnits、3 個 knowledgeNodes、1 題佔位題、1 條 questionKnowledge、1 條 knowledgeRelations。它不是正式 500 題知識地圖。
- 現有考題分類 JSON 的 `version` 實為 **2**，`status` 為 `second-pass; agent classification; independent-human-review-pending`；不能因任務稱「知識地圖 v1」便改寫其版本。
- 以下為實際可重用的課程／分類結構：8 章、31 節；summary 記錄 127 個子主題。127 是分類成果內的子主題統計，並非已驗收教材核心概念總數。

| 目標欄位 | 已保存／已驗證的現況 | 尚未完成／尚未確認 |
|---|---|---|
| 章 | `units` 8 筆 | 正文掃描的章節索引仍有錯誤。 |
| 單元 | `units[].topics` 合計 31 筆 | 58 題尚未定到單一節。 |
| 核心概念 | 有 subtopics，summary 為 127 | 不是全教材逐頁驗證的正式概念庫。 |
| 十年考題對應 | 六年 300 筆分類紀錄 | 缺四年 200 筆，且既有分類仍待人工覆核。 |
| 出題頻率 | 有 questionCount、yearsTested、yearCoverage，以六年為分母 | 尚無十年完整頻率；不能把 `/6` 當 `/10`。 |
| 教材頁碼 | 節層級有 `tocPage` 起始頁 | 缺每個概念的實際正文頁碼、範圍及可靠原圖對應。 |
| 學習優先級 | method.noRanking 明示不排序重要性 | 尚未建立。 |

## 6. 尚未完成工作與建議順序

以下為 Phase 2C 建議，**本次未開始執行**。後續先確認授權範圍，再進行會改變資料的工作。

1. **先固定來源與版本**：保留 manifest 與原圖；比對兩批教材版本，確認缺頁及 seq 400 等章節錯標；不能因已有估計頁碼直接批次套用。
2. **先驗收既有 OCR 試作**：處理摘要筆數不一致、空白頁雜訊、圖表文字及品質判定，決定可用成果，避免不經檢查重跑全部 486 張。
3. **補未完成 OCR**：在來源對應可靠且取得寫入授權後，以缺少且需要文字的頁面為單位，分批處理並保留來源、checksum、工具版本與覆核狀態；不重新掃描。
4. **覆核高風險考題內容**：優先 107／108 OCR、圖像選項、共用圖表、化學上下標與序列；不得把只通過題號檢查的卷標為人工完成。
5. **接續分類而非重建**：重用既有 300 筆，優先補 106～109 年 200 題，再處理 33＋25 題未定節；既有 242 題仍保留來源與覆核需求。
6. **補全知識地圖**：把概念連到正文頁碼及原圖，重算十年頻率，制定可解釋的學習優先級；與骨架示範資料分開。
7. **維護進度與保存**：獲授權後更新過時狀態說明；另行確認 Git／備份方案，不能把本機未追蹤資料視為已遠端保存。

## 7. 可重做的驗證依據與安全範圍

本次使用唯讀 Node.js 檔案讀取、JSON.parse、SHA-256 計算、目錄列舉與 `git --no-optional-locks status`。未執行專案 importer、OCR、分類、測試或 build，以免產生資料或快取；未安裝套件。

| 重要數據 | 實際依據 | 驗證方法 |
|---|---|---|
| 500 題、每年 50 | 十年來源 `paper.md` | 排除封面序號，逐年比較最後 50 題號是否依序 1～50。 |
| PDF 保存一致 | 十年 `paper.json.originals` 與實體 PDF | 重算大小及 SHA-256，全部符合。 |
| 十年入庫保存 | `paper.json.documentId`、`documents/doc_*.json`、`metadata/source-registry.json` | 核對檔案、ID、rawChecksum、normalizedChecksum、registry checksum。 |
| 242／33／25／200 | 分類 JSON 的 questions 與十年題目範圍 | 按 year、status 計數；唯一 ID 300；500−300=200，500−242=258。 |
| 486 張及 325,232,198 bytes | 教材 manifest 的 scans | 計數、加總 bytes、兩份位置逐檔重算 SHA-256；每份 486/486 符合。 |
| 45／439／2 | 教材 page-index.json 的 entries | 按 verification 計數；此為索引標記，不是全文驗收。 |
| OCR 五張 | ocr-pilot/biology-5pages 的非備份 txt | raw／normalized 配對，對回索引檔名；摘要另查 results.length。 |
| 8 章、31 節 | toc.json 與分類 JSON | chapters.length、kind=section、units.length、topics 總數。 |
| 骨架 v1 節點數 | snapshots/biology.skeleton.v1.json | 各資料陣列實際長度；內容明示佔位用途。 |

前一輪目視檢查僅涵蓋本文明列的原圖樣本；本次文件化重新核對檔案、統計與清單，沒有重新逐頁視讀全部教材或逐題人工驗證 PDF。全書缺頁／內容重複、完整 OCR 正確率、分類正確率及網站實際使用這些成果的程度均尚未確認。

開始時 Git 已有修改：`.gitignore`、`content/knowledge-base/metadata/source-registry.json`、`package-lock.json`、`package.json`；亦有 OCR 試作、108 入庫文件、驗證報告、腳本及暫存圖等未追蹤項目。這些均屬既有工作，須保留。此次授權僅新增本報告與交接文件；不 commit、不 push。
