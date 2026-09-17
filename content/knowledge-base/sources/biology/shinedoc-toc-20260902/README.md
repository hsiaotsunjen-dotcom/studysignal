# 正式生物教材來源：三頁目錄

本來源是使用者確認的同一本生物教材目錄，不是 fixture、mock 或完整教材正文。
教材正式書名、出版社、版次、出版年未見於三張掃描圖，保留 null；資料標題只是識別用標籤。

## 掃描來源

原始資料夾：`C:\Users\tjhsi\OneDrive\文件\ShineDoc\sources`。

| 原始檔名 | 目錄印刷頁碼 | 範圍 |
|---|---|---|
| IMG_2026_09_02_23_43_41L.jpg | 4 | 第01–03章、第04章 4-1 至 4-4 |
| IMG_2026_09_02_23_43_41R.jpg | 5 | 第04章續頁 4-5 至 4-7 與試題索引、第05–07章 |
| IMG_2026_09_02_23_44_46L.jpg | 6 | 第08章與附錄 |

`scans/` 是三張原圖的逐位元相同副本；原始檔未修改、移動或刪除。
下一張 `IMG_2026_09_02_23_44_46R.jpg` 是印刷第7頁 Chapter 01「生物體的構造與功能」，
僅用於確認目錄結束，不納入來源內容。其他掃描圖及其 TXT/DOCX 不納入。

## 資料及追溯

- `toc.md`：依原圖視讀轉錄，保留每頁掃描檔名、目錄印刷頁碼、章節與目標頁碼。省略導引點線及排版空白。
- `toc.json`：同一來源的結構化附件，不是另一套 KB。記錄現有 KB 的 sourceId/documentId、轉錄 checksum、三張圖的 SHA-256、原始位置與副本位置，並以 chapters → entries 保留階層。
- `toc.json` 中的 `page` 是目錄指向的正文頁碼；`tocPrintedPage` 是該條目所在的目錄頁碼。第04章的跨頁條目仍屬同一章。
- 8章、31個編號節、16個章內試題索引、1個附錄；「歷屆試題」只是目錄索引，沒有匯入考題內容，更不代表十年試題已入庫。
- 章標題及附錄未印目標頁碼，以 `page: null`、`pageStatus: not-listed` 表示。沒有推算章起始頁或任何結束頁。
- 本次可辨讀條目均已轉錄，`unreadable: []`。若後續遇到無法辨讀的欄位，必須標記 unreadable，不推測文字。
- 轉錄由 Codex 檢視原圖完成；尚未經獨立人工覆核。

## 既有 KB 接入

`toc.md` → Stage 10 候選驗證 → Stage 11 `importKbCandidate` → Stage 2/3 文件。
使用既有 `buildSourceRecord` / `appendSourceRecord` 更新 `metadata/source-registry.json`；
使用既有文件序列化與路徑函式產生 `documents/doc_*.json`。
registry 的 sourcePath 指向 `toc.md`，notes 指向含原始圖檔追溯資訊的 `toc.json`。

來源以 `subject=biology`、`sourceType=toc` 登錄。正式資料僅在 `content/knowledge-base/`。
沒有把目錄轉為已審核課綱／知識點，沒有更動原有生物骨架，也沒有接入或修改 Tutor。

## 驗證及重現

在專案根目錄執行唯讀驗證：

```powershell
node node_modules/vite-node/vite-node.mjs scripts/kb-biology-toc.ts
```

加上 `--sources 'C:\Users\tjhsi\OneDrive\文件\ShineDoc\sources'`，可同時比對原始掃描檔。
首次建檔另加 `--write`；再次執行不新增重複來源，遇到內容不同的既存產物會停止，不覆寫它。

驗證包括三張副本 checksum、Stage 11 重建一致性、章節數與跨頁關係、registry/document 一致性、
Stage 6 讀回、Stage 7/8 所有章節及附錄標題檢索、Stage 9 完整性稽核。

已知既有檢索限制：Stage 2 會把全形 ASCII 標點正規化為半形，Stage 4/7 不會對查詢做同樣轉換。
本驗證對查詢使用既有 `normalizeOcrText`，再送入檢索。原始轉錄保留全形冒號，KB 文件保留正規化結果。
