# 108 學年度統測 衛生與護理類 專業科目(一)：基礎生物

## 考試資訊

- 考試年度：108 學年度
- 考試名稱：108學年度科技校院四年制與專科學校二年制統一入學測驗
- 類別：衛生與護理類
- 科目：專業科目(一)：基礎生物（封面為準；與 111–115 學年度「生物(B)」名稱不同，同屬本系列）
- 題目數量：50 題（單一選擇題；封面注意事項 1–7 條不計入試題）
- 共 8 頁

## 官方來源與追溯

- 官方索引：https://web1.tcte.edu.tw/EXAM/108_4y/
- 原始 PDF 名稱：108-4y-10-1生物.pdf
- 歸檔：originals/108-4y-10-1生物.pdf（1,425,975 bytes）
- 來源檔案 SHA-256：D47BDC7B93C34C5E6E1A034CD330F7D1F9263BFB011CA0920982441DA3D14D78
- 匯入檔案 SHA-256：408E3B757E99F996391E90D7C379B21D4B10F6E423F2F92410E58CC71F509D31（paper.md，17,605 bytes）

原始 PDF 不修改；歸檔時重新計算雙方 SHA-256 一致。

## 文字轉錄與修復

paper.md 為官方試題 PDF 的文字轉錄，保留 PDF PAGE 頁界與原樣抽取文字；不新增答案或解析。

- **Q1–Q18**：PDF 第 1–3 頁有文字層，由 `pdftotext` (Poppler) 直接提取。
- **Q19–Q34**：PDF 第 4–5 頁為掃描影像（無文字層），由 `pdftoppm` 300 DPI 渲染 + `tesseract.js` OCR (`chi_tra`) 逐題恢復。OCR 無法辨識之內容標記待人工核對，不猜測任何字元。
- **Q35–Q50**：PDF 第 6–8 頁有文字層，由 `pdftotext` (Poppler) 直接提取。

### 待人工覆核（pending-human-review，不重建）

- Q26(C)「針眉」疑為「針狀」；Q27(B)「甲 >> 乙」疑為「甲 > 乙」；Q20「釋放和葡萄糖」疑為「釋放葡萄糖」；Q28(C)/Q28(D)「類囊體膜」與「囊狀膜」同題並用不同名稱，疑有一處誤植；第 5 頁頁首殘留掃描雜訊字樣。
- Q27 圖(一)（光合作用速率與溫度關係圖）、Q32 圖(二)（皇帝豆種子與玉米果實內部構造圖）位於掃描影像內，未抽取、不重建，以原 PDF 為準。

以上皆**保留現狀不修改**，僅記錄待人工複核。完整清單見 `verification-report.md`。

## 驗證結果

正式題目 50 題、題號 1–50 連續無缺漏無重複、每題 A–D 選項完整（50/50）、PAGE 1–8 齊全、原始 PDF 可追溯。

reviewStatus: machine-extracted; independent-human-review-pending（尚未獨立人工逐題覆核）。publisher 未確認，保留 null。

## KB 工作流程

- 系列：tve-ut-health-nursing-bio-roc106-115。PDF 僅作原始來源；paper.md 為匯入文字，paper.json 保存來源追溯及 importer 產生的 linkage。
- 專案根目錄 importer：scripts/kb-biology-exam.ts --year 108；加 --write 正式匯入，省略為已持久化產物 verify-only。buildKbManifest 執行唯讀 registry/documents 完整性稽核，不另存 manifest。

## 入庫日期

2026-10-19（importer importedAt: 2026-10-19T14:33:25.444Z；sourceId: src_biology-exam_paper-408e3b757e99；documentId: doc_60d611014048）