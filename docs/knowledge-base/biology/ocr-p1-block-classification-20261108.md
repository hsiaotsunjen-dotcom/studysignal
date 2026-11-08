# OCR P1 第一階段：缺漏候選分類及事件追溯

日期：2026-11-08（Asia/Hong_Kong）。基礎版本：P0 commit `a758bd7a4e4142d4a92c542f7fb73ded5aea3624`。

本輪新增獨立分類層，沒有修改 P0 核心、原始 OCR、圖片、人工草稿或正式知識庫。沒有 OCR、模型下載、付費 API、Git 寫入或 P2 開發。

## 實作與判斷邊界

- `scripts/ocr-multi-engine-diff/p1.mjs`：純分類及事件整合。
- `scripts/ocr-multi-engine-diff/p1-validation.mjs`：重用 P0 的四頁來源核對與比對，再另存 P1 結果；拒絕既有輸出目錄及專案外輸出。
- `scripts/ocr-multi-engine-diff/p1.test.mjs`：合成資料、邊界及四頁實際資料回歸。
- 本報告。

`classifyComparison()` 只接受目前 P0 版本，不原地升級歷史 JSON。每個區塊保留 image SHA、page_id、bbox/polygon、兩引擎原框及原字串、引擎版本、原始檔案引用與判斷證據。結果另存來源程式 SHA、runner SHA、歷史比較 SHA 及 P0 比較內容 digest。

主分類互斥，附加 facets 可重疊：

| 主分類 | 條件與限制 |
|---|---|
| missing_text_candidate | 只有一側具有非空、帶位置的 OCR 假說；不能據此判定原圖漏字或另一引擎正確 |
| position_or_order_candidate | 多框 token 多重集合相同、字串順序不同；保留多對多歧義，不自動重排 |
| structure_or_label_candidate | 既有 region_type 或標題／圖說字面模式提供上下文；不是影像結構辨識 |
| scientific_review | 重用公式語法分析及 Unicode、數值單位、科學符號提示；不證明公式正確 |
| segmentation_equivalent | 有配對且非多對多歧義；框數不同但文字完全相同，或可明確描述的中文空白差異。英文、數字與科學符號的空白邊界差異不自動歸為等價 |
| undetermined | 其他文字差異、空白單側內容、缺少足夠語義證據等，保留人工審核 |

所有類別皆 pending_human_review、auto_apply_allowed=false；引擎一致不能成為 verified。`segmentation_equivalent` 僅確認比較關係，不代表原圖正確、內容完整或可以略過人工確認。

本輪沒有接收人工證據或建立 Ground Truth 的入口。因此「已確認缺漏區塊數」為 0，意思是本輪未確認任何區塊，不是宣稱真正缺漏為零。真正缺漏總量、影像層誤報數、CER、WER 均未評估，保留 null。

## 資料來源

沿用 `tmp-ocr-fourpage-dual-20261107-v1/inputs.json`、原圖 manifest 及兩引擎 raw/result/layout；由 `loadP0Page`／`validateP0` 核對 SHA、原圖來源、共同輸入、page_id 與歷史結果重現。

| 掃描序號 | 索引印刷頁 | 原頁碼狀態 |
|---:|---:|---|
| 6 | 11 | verified |
| 19 | 24 | estimated |
| 200 | 205 | verified |
| 317 | 322 | estimated |

estimated 未升級。未擴大至其他頁面或剩餘 471 頁。

## 最終分類統計（v3）

| 掃描 | 群組 | 疑似缺漏 | 分段等價 | 科學覆核 | 結構／標籤候選 | 未能判定 |
|---:|---:|---:|---:|---:|---:|---:|
| 6 | 40 | 12 | 3 | 0 | 2 | 23 |
| 19 | 77 | 14 | 16 | 12 | 0 | 35 |
| 200 | 62 | 32 | 5 | 13 | 2 | 10 |
| 317 | 46 | 26 | 6 | 0 | 0 | 14 |
| 合計 | 225 | 84 | 30 | 25 | 4 | 82 |

四頁實際資料的順序候選主分類為 0；此分支有合成測試證據，但不能宣稱已辨識所有真實閱讀順序問題。225 個群組全部未完成人工確認，並非只有 undetermined 的 82 組需要人工。

84 個單側區塊與 P0 的 UNMATCHED 數量完全一致，沒有刪除、強配或自行補文。30 組分段等價全部來自 P0 原有一致群組，沒有把既有差異警告新判為可忽略。因此「P1 已消除 30 個假警告」是不成立的結論。影像層真正缺漏及假差異數量尚未確認。

第 200 頁案例（不在公開報告複製教材原文）：

- g005：6 個 Tesseract 框對 1 個 Paddle 框，文字完全相同，標為分段等價；仍需核對原圖。
- g009：公式／科學符號上下文，標為 scientific_review，不選擇任何引擎作答案。
- g027：多對多歧義保留，具有科學上下文提示；不自動重排或補寫圖內標籤。
- g043：只有 Paddle 位置假說，標為 missing_text_candidate；保留原 Quality Gate 事件與群組差異事件的關聯，並不宣稱 Tesseract 真正漏字已經人工確認。

## 重複事件整合

完整保存 `raw_events.quality_gate` 與 `raw_events.review_items`。相同 issue_id 的事件若 payload 完全相同，建立一筆 canonical event 並保留兩個原始清單／索引引用；ID 相同但內容衝突時拒絕處理。

每筆 canonical event 僅有一個 queue 或 context owner。區域事件以 group_id／engine block ID 對應工作項；無法定位的頁面事件依風險主題分組，但保留不同事件，不宣稱它們是相同錯誤。全頁雙引擎差異作為 overview context，不額外冒充一個局部缺漏錯誤。多區域事件保留全部 related group IDs。

| 掃描 | 原始事件引用 | canonical 事件 | 相同事件重複引用 | P0 review_items | P1 工作項 |
|---:|---:|---:|---:|---:|---:|
| 6 | 68 | 60 | 8 | 47 | 40 |
| 19 | 96 | 85 | 11 | 70 | 60 |
| 200 | 116 | 104 | 12 | 71 | 60 |
| 317 | 80 | 74 | 6 | 47 | 42 |
| 合計 | 360 | 323 | 37 | 235 | 202 |

37 是同一事件的重複引用數；235→202 是工作項呈現方式改變，不能當成少了 33 個真實錯誤或已節省相同比例人工時間。原始事件引用全部保留，與內容正確性無關。工作臺尚未整合此新隊列，不能宣稱實際操作次數已下降。

## 測試

- P1 新增 38 項，全部 PASS。
- P0 專項 25 項，全部 PASS。
- 原有 396 項加上 P1 38 項，共 **434 PASS、0 FAIL、0 SKIP**。

```powershell
node --test scripts/ocr-multi-engine-diff/p1.test.mjs
node --test scripts/ocr-multi-engine-diff/p0.test.mjs
```

完整回歸使用 P0 報告中的既有 396 項指令，另加入 `scripts/ocr-multi-engine-diff/p1.test.mjs`，保留相同範圍過濾，不讀取其他教材頁面進行新實際驗證。

涵蓋：單側假說不能確認缺漏、共享錯字盲點、空白／空結果、分段等價、英文／數字／公式空白邊界、token 順序候選與字元袋誤判、表格／圖說／圖內標籤上下文、公式與大小寫、數值單位、Unicode、相同事件去重與衝突拒絕、未知 group 拒絕、事件完整覆蓋、原始資料不可變性、輸出不與來源共享可變物件、SHA／座標／版本追溯、來源 gate 失敗、舊版本拒絕、重跑一致性及禁止覆寫輸出。

## 結果保存與操作

最終結果：`tmp-ocr-p1-classification-20261108-v3/`，包含 `0006.classification.json`、`0019.classification.json`、`0200.classification.json`、`0317.classification.json`、`summary.json`。

v1、v2 是本輪中間實驗輸出，完整保留，未覆寫；以 v3 作本報告統計依據。這些本機 JSON 含 OCR 原文及解析後來源路徑，不能直接公開到 GitHub。

```powershell
node scripts/ocr-multi-engine-diff/p1-validation.mjs --output tmp-ocr-p1-classification-another-run
```

輸出目錄必須不存在。單次 P1 分類耗時約 6 頁 18ms、19 頁 20ms、200 頁 17ms、317 頁 7ms，不含 P0 預檢及檔案寫入，非穩定效能或全書推估。API 費用 US$0；人工校正時間未測量。

## 未完成與下一步

- 真正缺漏、假辨識、兩引擎共同缺漏仍需人工對照像素。尚未提供可信人工證據匯入／自動確認缺漏機制。
- 全頁 OCR 的 region_type 是 page，沒有可靠的圖／表／正文語義區域；不能從本輪規則完整辨識 DNA/RNA 表格儲存格、圖片分支及標籤關係。合成 table／figure_text 測試只是證明介面接受該上下文，不能當成真實版面辨識已完成。
- 專有名詞、公式語法與單位規則未校準，可能誤報或漏報；所有風險為候選，不是準確率或自動確認依據。
- 尚未接入人工工作臺，也沒有實測人工時間、漏報率或假警告比例。
- 建議仍在 P1 內，下一步先由人工對第 200 頁選定缺漏候選及正常對照標註，再校準分類規則與工作臺呈現；不啟動 P2 或全書 OCR。

本次程式及報告的最小後續備份範圍為上述四個新檔，import 依賴沿用已提交 P0／Benchmark／公式分析／IO 模組；測試中的真實資料仍需要本機四頁私有測試資料。所有分類輸出目錄留本機。未執行 git add、commit 或 push。
