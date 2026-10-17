# ROC106 生物試題來源說明

## 試卷基本資訊
- 考試年度：106 學年度
- 科目：生物（基礎生物）
- 試卷名稱：106學年度科技校院四年制與專科學校二年制統一入學測驗－衛生與護理類－專業科目(一)：基礎生物
- 原始 PDF 檔名：`106-4y-10-1生物.pdf`
- 原始 PDF SHA-256：`0bf961ad8a2845e006e711b43ade4dd544e35154cefe20c4cf539eead9c2c230`
- 原始 PDF 大小：554,748 bytes（8 頁）
- 試題總數：50 題（單一選擇題，題號 1–50 連續）
- 選項總數：200（每題 A/B/C/D）

## 擷取方法
- 以 PyMuPDF 1.28.2 從原始 PDF 擷取文字層
- 已保留頁面界標記（共 8 個頁界標記）
- 圖形、圖表與表格排版未重製，請參照原始 PDF
- 頁首頁尾水印「公告試題僅供參考」共 8 次
- 未新增答案或解析

## Q43 人工核對
- Q43 已於 2026-10-11 經人工目視核對（上下標與電荷符號：N₂、NO₃⁻、NH₄⁺、NH₃）
- 人工核對紀錄：`docs/kb-import-reviews/roc106-q43-human-verification.md`
- Q43 修復後之 `paper.md` 區段與原始 PDF 第 5 頁字元多重集相符（207 = 207）
- 其餘 49 題（Q1–Q42、Q44–Q50）僅機器擷取，未逐題人工覆核

## 來源出處
- 官方索引：https://web1.tcte.edu.tw/EXAM/106_4y/
- 原始 PDF 暫存位置：`C:\Users\tjhsi\AppData\Local\Temp\ss-kb-roc106-109-verify\106-4y-10-1生物.pdf`
- 原始 PDF 來源 ZIP：`D:\Downloads\StudySignal_Biology_ROC106-109.zip`

## 已知限制
- Q43 以外題目未經獨立人工逐題覆核，reviewStatus 為 `machine-extracted; independent-human-review-pending`
- 封面第 1 頁有 2 張光柵圖（鈴鐺/條碼）屬裝飾，不計入試題內容
- 第 7、8 頁為空白頁，僅頁首頁尾
- publisher 未確認，保留 null

## 匯入狀態
- Stage 111M：Q43 修復已套用，paper.md 通過全部 19 項完整性檢查
- Stage 111O：匯入就緒審計判定 NOT READY — ACTION REQUIRED（缺原始 PDF 歸檔、README.md、paper.json 元數據更新）
- Stage 111P：原始 PDF 已歸檔至 `originals/`，README.md 已建立，paper.json 元數據已更新
- 等待授權後方可進行正式 commit 與 Knowledge Base 匯入