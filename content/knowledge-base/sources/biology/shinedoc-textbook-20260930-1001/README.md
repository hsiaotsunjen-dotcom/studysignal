# 正式生物教材來源：全書掃描（486 張）

本來源是使用者提供的生物教材全書掃描圖，共 486 張，不是 fixture、mock 或測試資料。
教材正式書名、出版社、版次、出版年尚未從內頁確認，保留 `null`；資料標題只是識別用標籤。
本資料夾目前有**掃描清單**與**頁碼索引**，尚無任何轉錄內容，也尚未接入 KB。

## 頁碼索引（page-index.json / page-index.csv）

依 45 張直接讀取頁碼的掃描圖與掃描順序一致性檢查，486 張掃描圖的頁碼對應如下：

| 掃描 seq | 印刷頁碼 | 格式 | offset | 驗證 |
|---|---|---|---|---|
| 1–2 | 4–5（目錄） | 阿拉伯數字 | `+3` | seq 2 直接讀取 |
| 3–452 | 8–457（正文） | 阿拉伯數字 | `+5` | 兩端與 43 個抽樣點直接讀取 |
| 453 | 無（版權頁／ISBN） | 無 | — | 直接判讀 |
| 454–485 | 附-1 – 附-32 | 附錄格式 | `附-N = seq − 453` | seq 455–485 直接讀取 |
| 486 | 無（空白頁） | 無 | — | 直接判讀 |

驗證狀態分布：`verified` 45 筆、`estimated` 439 筆、`unnumbered` 2 筆。

掃描序列完整性檢查全數通過：無重複檔名、無拍攝時間倒序、無 L/R 對應異常。

### 異常與注意事項

- **印刷頁 6–7 疑未拍攝**：印刷頁 5 的目錄止於 7-3（397），而印刷頁 8 已是 1-1 正文。
  已讀到的目錄完全缺第 8 章與附錄，但掃描 seq 400 確實是「8-1-3 群集」，
  故 6–7 極可能是未拍的目錄續頁（待補拍確認）。
- **目錄缺第 8 章與附錄**：seq 1–2 的目錄只列到第 7 章，與內頁實際內容不符。
- **offset 不可外推**：`+5` 僅經 `seq 3–452` 驗證；不可用於 452 之後。
- **seq 486 不可推定**為附-33，該頁為空白且未印任何頁碼。
- **seq 1 與 454 為推得值**：該兩頁未印可見頁碼，分別由 facing-page 配對
  （L=4 / R=5）與 `附-N = seq − 453` 反推，索引中標為 `estimated`。

## 掃描來源

| 項目 | 內容 |
|---|---|
| 原始資料夾 | `D:\Documents\ShineDoc\sources` |
| 檔案數 | 486（0 個子資料夾） |
| 總大小 | 325,232,198 bytes（約 310.17 MB） |
| 安全備份 | `F:\StudySignal-Backup\Biology-Book-Scan-Original` |
| 備份驗證 | 已驗證：486 檔、檔名差異 0、逐檔大小一致、總 bytes 一致 |

原始掃描檔**未被修改、移動、重新命名或刪除**；備份為複製，非移動。

## 掃描批次與命名

檔名格式：`IMG_<YYYY>_<MM>_<DD>_<HH>_<mm>_<ss><L|R>.jpg`，
尾端 `L` / `R` 為左右頁。

| 掃描日期 | 張數 |
|---|---|
| 2026_09_30 | 386 |
| 2026_10_01 | 100 |
| 合計 | 486 |

首檔 `IMG_2026_09_30_23_21_37L.jpg`；末檔 `IMG_2026_10_01_00_05_09R.jpg`。
與既有來源 `shinedoc-toc-20260902`（2026_09_02 掃描）為不同掃描批次，
故獨立建檔，不併入該來源。

## 原圖不納入 Git

`scans/manifest.json` 是本來源的唯一追蹤檔，逐筆記錄
`originalFileName` / `originalPath` / `archivePath` / `sha256` / `bytes`。

**原圖 486 張（約 310 MB）刻意不提交進 Git**：

- 既有 `shinedoc-toc-20260902` 的 3 張掃描圖有進 Git，但僅約 1.4 MB；
  本來源規模為其數百倍，會使 `.git` 由 18.61 MB 膨脹至 330 MB 以上，
  且二進位一旦進入版本歷史便不可逆。
- 需要原圖時，依 `manifest.json` 的 `archivePath` 取得
  （已驗證與原圖逐檔大小一致的備份），或由 `originalPath` 取得原始檔。
- `sha256` 為完整性基準，可用於日後逐檔比對，取代直接攜帶圖檔。

## 目錄結構

| 路徑 | 用途 | 狀態 |
|---|---|---|
| `scans/manifest.json` | 486 筆掃描清單與 SHA-256 | 已建立 |
| `page-index.json` / `page-index.csv` | 486 筆頁碼對應索引（印刷頁／附錄頁、offset、驗證狀態、缺頁與異常） | 已建立 |
| `text/` | 章節視讀轉錄成果（md + json） | 空，待轉錄 |
| `review/` | 待人工覆核佇列、`unreadable` 標記、疑義記錄 | 空 |

## 資料及追溯原則

- 轉錄時每個章節須標註對應的掃描檔名與印刷頁碼，不推算未印出的頁碼。
- 章標題或欄位未印目標頁碼時，以 `page: null` / `pageStatus: not-listed` 表示。
- 無法辨讀的欄位一律標記 `unreadable`，**不推測文字**。
- 轉錄不得新增課綱、知識點、答案或解析；本階段只做原文轉錄。
- 未經獨立人工覆核前，狀態一律標示為待覆核。

## 目前狀態

- 已建立 486 筆頁碼索引（`page-index.json` / `page-index.csv`）。
- 尚未 OCR。
- 尚未視讀轉錄，`text/` 與 `review/` 為空。
- 尚未登錄 `metadata/source-registry.json`，尚未產生 `documents/doc_*.json`。
- 尚未接入 Tutor，未修改既有生物骨架或考題對照表。
- 尚未 commit／push。

## 既有 KB 接入（後續階段才執行）

轉錄完成後沿用既有管線：
`text/*.md` → Stage 10 候選驗證（`kbIngestionBoundary`）→ Stage 11 `importKbCandidate`
→ Stage 2/3 文件，來源以 `subject=biology`、`sourceType=textbook` 登錄。
正式資料僅在 `content/knowledge-base/`。

注意 Stage 10 的既有限制：`KB_INGESTION_MAX_CONTENT_LENGTH` 為 200,000 字元、
`KB_INGESTION_MAX_PATH_LENGTH` 為 260、`KB_INGESTION_ALLOWED_EXTENSIONS` 僅 `.txt` 與 `.md`。
故全書不宜單檔匯入，需依章節切分後逐檔匯入。