# ROC108 生物試卷 — 驗證報告

## 摘要
原始 PDF 第 6–8 頁已透過文字層提取取得 Q35–Q50，併入 paper.md；paper.json 已更新。  
Q1–Q50 題號連續、無重複；每題 A–D 選項完整。  
reviewStatus 維持 `machine-extracted; independent-human-review-pending`，尚未人工逐題覆核。

**2026-10-19 正式入庫**：已使用專案既有 importer（`scripts/kb-biology-exam.ts --year 108 --write`）完成 Source Registry、documents、manifest 登記；ID 由專案既有規則依 `paper.md` checksum 推導產生，未手動編造。OCR 未確認內容保留現狀並記錄於「待人工複核項目」，未阻擋本次登記。

## 驗證項目與結果

| 項目 | 結果 |
|------|------|
| Q1–Q50 題號完整 | ✓ 通過（50/50，無缺漏） |
| 題號重複 | ✓ 無重複 |
| 每題 A–D 選項完整 | ✓ 通過（50/50） |
| PDF 頁面標記 | PAGE 1–8 齊全 |
| paper.md 與 paper.json 一致 | ✓ 一致 |
| 原始 PDF SHA256 | `d47bdc7b93c34c5e6e1a034cd330f7d1f9263bfb011ca0920982441da3d14d78` |
| 原始 PDF 大小 | 1,425,975 bytes |
| 原始 PDF 未修改 | ✓ 未修改 |
| reviewStatus | `machine-extracted; independent-human-review-pending` |

## 提取說明

- **Q1–Q18**：PDF 第 1–3 頁有文字層，由 `pdftotext` (Poppler) 直接提取。
- **Q19–Q34**：PDF 第 4–5 頁為掃描影像（無文字層），由 `pdftoppm` 300 DPI 渲染 + `tesseract.js` OCR (`chi_tra`) 恢復。OCR 無法辨識之內容標記待人工核對，不猜測任何字元。
- **Q35–Q50**：PDF 第 6–8 頁有文字層，由 `pdftotext` (Poppler) 直接提取。

## KB 正式入庫紀錄（2026-10-19）

| 項目 | 值 |
|------|-----|
| Source Registry 條目 | `src_biology-exam_paper-408e3b757e99` |
| Document | `doc_60d611014048`（`content/knowledge-base/documents/doc_60d611014048.json`） |
| paper.md SHA-256（raw） | `408e3b757e99f996391e90d7c379b21d4b10f6e423f2f92410e58cc71f509d31`（17,605 bytes） |
| normalizedChecksum | `60d6110140488a6d5c783d6e7d6e9d1312d0043d617c135fd19d70a023cf4ea4` |
| 原始 PDF SHA-256 | `d47bdc7b93c34c5e6e1a034cd330f7d1f9263bfb011ca0920982441da3d14d78`（1,425,975 bytes，未修改） |
| importer importedAt | `2026-10-19T14:33:25.444Z` |
| seriesId | `tve-ut-health-nursing-bio-roc106-115` |

- ID 產生方式：移除 `paper.json` 內先前手填的暫時 `sourceId` / `documentId`（`src_biology-exam_paper-roc108` / `doc_roc108-biology`），改由 importer 依 `paper.md` checksum 與既有 `src/lib/knowledge-base/utils/ids.ts` 規則推導產生，未手動編造 ID。
- Source Registry 由 10 筆增至 11 筆，僅新增本筆，既有條目未變更（純附加）。
- Manifest 檢核（`buildKbManifest`）：documents 目錄 11 個檔案／11 筆有效文件，`issues: []`（無 duplicate-document / duplicate-checksum / registry-orphan / missing-registry）。
- 匯入具冪等性：重跑 `--write` 產生相同 `sourceId` / `documentId`，`issues: []`，無重複建立。
- 全系列（106–115）verify-only 全部通過；`src/lib/knowledge-base` 測試 53/53 通過。

## 待人工複核項目（未確認）

1. **Q27 圖(一)**：光合作用速率與溫度關係圖（位於第 4–5 頁掃描影像，未抽取圖片，以原 PDF 為準）。
2. **Q32 圖(二)**：皇帝豆種子與玉米果實內部構造圖（位於第 4–5 頁掃描影像，未抽取圖片，以原 PDF 為準）。
3. **Q19–Q34 OCR 內容**：由 tesseract.js OCR 恢復，OCR 無法辨識之處已標記，需人工逐題比對原 PDF 掃描影像。
4. **Q35–Q50**：文字層提取，建議人工逐題比對原 PDF 第 6–8 頁。
5. **publisher**：未確認，paper.json 保留 `null`。
6. **Q26(C)「針眉」**：紙本疑為「針狀」（蘆薈葉特化為細長的針狀葉）。已由渲染頁影像目視比對支持，但尚未完成正式人工簽核，**paper.md 保留原字「針眉」**，待覆核後再一併修正。
7. **Q27(B)「甲 >> 乙」**：`>>` 疑為 `>` 之 OCR 重複，已目視比對支持，**paper.md 保留原字**，待覆核。
8. **Q20「刺激肝臟釋放和葡萄糖」**：疑為「釋放葡萄糖」之 OCR 誤插「和」字（語意與其他選項不相稱），**paper.md 保留原字**，待覆核。
9. **Q28(C)/Q28(D)「類囊體膜」與「囊狀膜」**：同一概念於同一題兩選項並用不同名稱，疑其中一處為 OCR 誤植（「類囊體膜」→應為「囊狀膜」或反之），**paper.md 保留原字**，待覆核。
10. **第 5 頁頁首雜訊**：「108 年四技 二 日 仿 第 5 頁／時 Maa sw 告 試題 僅 供 參 考 本」等掃描雜訊字樣殘留於頁首（OCR 對頁首浮水印與頁碼之誤讀），非題目內容，待覆核時確認是否移除。

> 以上第 6–10 項為 OCR 未完全確認處，本次入庫**保留現狀不修改**，僅記錄待人工複核；`paper.md` 之 SHA-256 與衍生 ID 亦因而維持與本次匯入一致。

## 修改的檔案清單

1. `content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc108/paper.md` — 增補 Q35–Q50 內容（取代原頁面 6–8 的 `...` 佔位符）。
2. `content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc108/paper.json` — 更新 `transcriptionMethod`、`notes`，反映 Q35–Q50 已提取，驗證結果為 50/50。
3. `verify-final.cjs` (工作目錄根) — 驗證腳本，可重複執行。

## 不動項目

- 原始 PDF：`content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc108/originals/108-4y-10-1生物.pdf` — 未修改，未刪除。
- `reviewStatus`：維持 `machine-extracted; independent-human-review-pending`，不標記為 `completed`。
- 臨時檔案：暫不清理（依指示保留）。

## 後續步驟（待人工介入）

1. 獨立人工逐題覆核 Q1–Q50 與原始 PDF 對照。
2. 確認 Q27、Q32 圖表內容。
3. 覆核完成後，將 `reviewStatus` 更新為 `completed`。
4. 清理臨時檔案。
5. Commit 與 push（待用戶授權）。

## 驗證腳本執行輸出

```
Total question lines found: 50
Question numbers: 1, 2, 3, ..., 50
Missing Q1-Q50: None
Duplicate questions: None
Incomplete A-D options: None - all 50 have A-D
Page markers: ===== PDF PAGE 1 === ... ===== PDF PAGE 8 ===

JSON:
  academicYear: 108
  reviewStatus: machine-extracted; independent-human-review-pending
  sha256: d47bdc7b93c34c5e6e1a034cd330f7d1f9263bfb011ca0920982441da3d14d78
  bytes: 1425975
  transcriptionPath: content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc108/paper.md
```

---
報告生成時間：2026-10-19  
產出人：Cline AI Coding Agent