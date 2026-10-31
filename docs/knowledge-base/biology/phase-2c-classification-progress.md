# 生物知識庫 Phase 2C：十年題目分類進度

日期：2026-10-31。狀態：Agent 已完成本輪分類判讀，待獨立人工覆核。這份文件記錄分類進度，不代表題目圖文、答案或教材 OCR 已驗收。

## 基準與範圍

沿用 [Phase 2B 盤點](phase-2b-audit-report.md)及[交接文件](phase-2b-handoff.md)。實際基準 commit 為 `72f62352031d47cc765b06fd075cb0896a5de438`。

原分類檔 `content/knowledge-base/derived/biology/exam-topic-map-roc110-115.json` 有 300 筆紀錄：242 題已有單一節歸屬、33 題停留在章、25 題跨章未定；106～109 年的 200 題尚無紀錄。因此本輪的 258 題是「200 題新增紀錄＋58 題補判單一節」，不是 258 題均無任何紀錄。

本輪閱讀上述 258 題的既有題幹與選項，參照既有目錄及抽樣教材原圖，另建 v3 衍生分類。原 242 題單一節分類逐筆保留。未改動原題、原分類、PDF、教材圖片、OCR、索引或網站功能；未執行 OCR 或安裝套件。

## 數量與狀態

| 項目 | 數量 | 狀態及意義 |
|---|---:|---|
| 十年來源題目 | 500 | 已保存；每年轉錄題號 1～50 的連續性已程式驗證，圖文正確性尚未全面人工驗收 |
| v3 分類紀錄 | 500 | 已建立；紀錄覆蓋率 100%，不等於分類正確率 |
| 單一節歸屬 | 463 | 92.6%；包含沿用 242 題與本輪 221 題，待獨立人工覆核 |
| 章已定、節未定 | 16 | 尚未完成單一節分類 |
| 跨章未定 | 21 | 尚未完成單一節分類 |
| 合計仍待定節 | 37 | 保留候選、理由及後續查證方向，不強行歸類 |
| 新增 106～109 年紀錄 | 200 | 193 題單一節、7 題保留候選 |
| 原 58 題補判 | 58 | 28 題新增單一節歸屬、30 題保留原分類與候選 |
| 本輪處理 | 258 | 221 題新增單一節歸屬；37 題完成判讀紀錄但仍未定節 |

| 年度 | 紀錄數 | 單一節 | 章已定、節未定 | 跨章未定 |
|---|---:|---:|---:|---:|
| 106 | 50 | 49 | 0 | 1 |
| 107 | 50 | 47 | 2 | 1 |
| 108 | 50 | 48 | 1 | 1 |
| 109 | 50 | 49 | 1 | 0 |
| 110 | 50 | 45 | 3 | 2 |
| 111 | 50 | 46 | 2 | 2 |
| 112 | 50 | 48 | 1 | 1 |
| 113 | 50 | 44 | 0 | 6 |
| 114 | 50 | 45 | 2 | 3 |
| 115 | 50 | 42 | 4 | 4 |
| 合計 | 500 | 463 | 16 | 21 |

## 保存位置與驗證依據

- `content/knowledge-base/derived/biology/phase-2c-classification-decisions.json`：新增 200 題的人工判讀輸入、原未定題的補判、採用的章節及理由。`additionalResolutions` 與 `resolvedBaselineQuestions` 一同納入補判。
- `content/knowledge-base/derived/biology/exam-topic-map-roc106-115.v3.json`：500 題分類、258 筆本輪處理紀錄、逐題來源區段及 SHA-256、各章節題數與十年年度覆蓋、候選與次要章節。`assessment` 記錄動作、證據引用及下一步；`summary` 提供上述數量。
- `content/knowledge-base/derived/biology/exam-topic-map-roc106-115.v3.md`：同一資料的年度與章節統計、258 題處理明細。JSON 為完整機器可讀版本。
- `scripts/kb-biology-classification-phase2c.mjs`：以既有來源與判讀輸入重建模型並驗證。預設唯讀；`--write-new` 僅允許建立尚不存在的兩份 v3 輸出。`--refresh-derived` 僅在提供兩份輸出目前雜湊且比對成功後更新該兩份衍生檔，不適用原始資料。

來源為 `content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc106/paper.md` 至 `tve-ut-health-nursing-bio-roc115/paper.md`，以及各年度同目錄 `paper.json`。`questionSources` 保存題號、來源位置、行號與文字區段雜湊，供回查原轉錄；區段依相鄰題號切分，不宣稱已完成閱讀題群或圖表邊界驗收。各年度轉錄仍須遵守原 metadata 的 machine-extracted / needs-review 狀態。

章節代號以 `content/knowledge-base/sources/biology/shinedoc-toc-20260902/toc.json` 的 8 章、31 節為準。本輪目視查閱的 26 個教材頁面，在 v3 的 `evidence` 保存原檔名、manifest 雜湊、掃描索引與自撰簡短觀察。圖檔定位依 `content/knowledge-base/sources/biology/shinedoc-textbook-20260930-1001/scans/manifest.json` 及同教材的 `page-index.json`，未複製教材圖片或正文至本輪成果。

教材頁面證據只能支持概念確實在該處出現，不證明它只屬於該節，也不證明掃描教材與目錄的版本完全相同。部分題目仍依題幹及目錄判斷，`basis` 區分 `judgment` 與 `textbook-evidence`；兩者均非獨立人工驗收。

## 驗證方式

在專案根目錄執行：

```powershell
node --check scripts/kb-biology-classification-phase2c.mjs
node scripts/kb-biology-classification-phase2c.mjs
```

驗證涵蓋十年題號序列、500 個唯一題號、258 筆唯一處理紀錄、31 節合法引用、原 242 題紀錄逐欄不變、彙總與逐題一致、來源檔案雜湊、26 個引用掃描圖的 manifest 雜湊，以及已保存 JSON／Markdown 與重建結果一致。通過這些檢查代表資料結構與來源一致，不能取代學科內容覆核。

## 尚未完成與接手順序

1. 先讀 v3 的 37 題未定紀錄，依 `assessment.nextEvidenceNeeded` 查教材相鄰頁、完整題組或題目原 PDF。保留跨領域事實；候選不能當成已完成主分類。原本保留的候選和理由是歷史紀錄，應結合本輪證據重新覆核。
2. 人工覆核本輪 221 題單一節歸屬，優先處理 OCR 警示與圖表題。新增 200 題的題型、圖表及閱讀題群欄位未完整驗收，未知值保留 null，不能解讀為無圖表。107 年部分題幹與 108 年部分題幹仍有轉錄品質警示，詳見逐題 `review`。
3. 再規劃教材批次 OCR，先重用既有 OCR 與頁碼索引，確認工具及費用範圍後執行；本輪沒有提升 486 頁教材的 OCR 完成率或內容驗證率。
4. 在分類覆核與教材內容可追溯後，補核心概念、精確教材頁碼、學習優先級及知識地圖。v3 已重算主要章節題數與十年年度覆蓋；同題次要章節不重複計數。這不是正式知識節點、學習優先級或完整知識地圖。

後續 Agent 應先執行預設唯讀驗證並查看 Git 狀態，保留原資料與既有未提交工作。不得將舊 Phase 2B 的基準數字改寫成本輪結果；延續本文件與 v3 版本追蹤進度。重要進度僅以明確路徑暫存本輪成果，避免把既有 OCR 試驗及其他工作檔案一併提交。
