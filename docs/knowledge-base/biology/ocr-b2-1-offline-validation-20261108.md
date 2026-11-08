# OCR B2-1：品質基準與付費比較離線準備

日期：2026-11-08。此階段沒有執行 OCR、付費 API、模型下載、訓練、正式知識庫寫入或 Git 暫存／提交／推送。沒有建立真正 verified Ground Truth。

## 新增範圍

所有程式位於獨立的 `scripts/ocr-cross-validation/`；沒有修改既有 OCR 引擎、P0、P1、P2-A、B1 或人工校正工具。

| 檔案 | 用途 |
|---|---|
| `core.mjs` | 三供應商統一請求與來源合約、權利分層、既有 GT 評測整合、本機成對差異、候選學習紀錄、不可啟用的付費入口 |
| `providers.mjs` | 離線供應商替身格式、原始回應與版本保留、ROI 像素／正規化座標轉回原圖、原文及座標不可變驗證 |
| `journal.mjs` | 獨立候選與預算模擬的 append-only 日誌、revision／雜湊鏈、重新載入、快取與寫入衝突拒絕 |
| `budget.mjs` | 重用既有 mini 費率計算、頁數／token 情境估算、每 ROI／批次／總額預留、重試與請求上限 |
| `cli.mjs` | 只讀既有十二 ROI，建立新的離線基準與任務清單 |
| `b2-1.test.mjs` | 55 項來源、格式、版本、授權、成本與品質安全測試 |
| 本文件 | 成果、限制與人工驗收入口 |

## 重用與未實作的邊界

重用 P0 的原始順序與幾何匹配、P1 事件分類、B1 風險分流、P2-A `openP2A()`／來源快照與評測，以及現有人工 Ground Truth store 的明確確認與版本保護。費用估算重用 `scripts/lib/ocr-ai-correction-trial.mjs` 的 mini 計算器；其舊單頁硬性 US$0.25 helper 不適合多供應商總帳，保留不修改，另以整數 micro-USD 建立離線總帳。

**此版本沒有真實 Google／Azure／OpenAI transport，也沒有原生 API 回應 parser。**替身採明確標記的 `b2-1-provider-fixture` envelope，僅接受 synthetic 測試案例，不會把模擬輸出偽裝成十二 ROI 的真實付費結果。供應商原生 polygon／英吋座標與真正 API schema 的映射須下一階段另行實作、查官方文件及驗收。當前沒有 SDK 安裝或新增依賴。

環境變數名稱只作契約記錄：Google `GOOGLE_APPLICATION_CREDENTIALS`；Azure `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`、`AZURE_DOCUMENT_INTELLIGENCE_KEY`；OpenAI `OPENAI_API_KEY`。本程式不讀金鑰、不列印環境變數；config 與日誌會拒絕憑證欄位。

## 十二 ROI 實際基準

輸入：`tmp-ocr-p2a-20261108-v2/dataset.json`，SHA-256 `c67395075a67d951a9b762725900c3369276b7e86a02794cfa5ce871c7e0db92`。本輪重新核對引用 SHA、來源身份、掃描序號、ROI、既有 OCR 及版本，並在分析前後驗證來源未變。

| ROI | 掃描序號 | 索引印刷頁／狀態 | 內容驗證狀態 | B1 分流 |
|---|---:|---|---|---|
| p2a-text-01 | 6 | 11／verified | machine-generated | 可抽樣候選 |
| p2a-text-02 | 6 | 11／verified | machine-generated | 人工重點覆核 |
| p2a-text-03 | 200 | 205／verified | machine-generated | 可抽樣候選 |
| p2a-text-04 | 317 | 322／estimated | machine-generated | 人工重點覆核 |
| p2a-science-01 | 200 | 205／verified | machine-generated | 人工重點覆核 |
| p2a-science-02 | 200 | 205／verified | machine-generated | 人工重點覆核 |
| p2a-science-03 | 200 | 205／verified | machine-generated | 人工重點覆核 |
| p2a-science-04 | 200 | 205／verified | machine-generated | 人工重點覆核 |
| p2a-structure-01 | 19 | 24／estimated | machine-generated | 人工重點覆核 |
| p2a-structure-02 | 200 | 205／verified | machine-generated | 人工重點覆核 |
| p2a-special-01 | 200 | 205／verified | machine-generated | 人工重點覆核 |
| p2a-special-02 | 317 | 322／estimated | machine-generated | 人工重點覆核 |

來源 resolved 12、source_unresolved 0；human-reviewed 0、verified 0。表中的「頁碼 verified」只指既有頁碼索引狀態，不是 OCR 內容 verified。舊兩 ROI 的草稿歷史以 `prior_review_refs` 保留，不自動變成新 ROI 的人工答案。

三種狀態：machine-generated 為尚無具名人工操作；human-reviewed 指已有具名草稿／審核操作，**不保證文字完整正確**；verified 只能由既有 store 驗證後匯出的真實人工 GT 判定，不能由候選或模型輸出宣稱。獨立候選日誌不允許保存 verified 標準答案。

局部 DNA／RNA 表格不等於完整表格；窄公式 ROI 可能缺上下文；圖說 ROI 沒有完整圖片。這些限制保留，沒有擴大裁切。全部仍屬 development，同書重疊來源不能當獨立 test。

## 評測與資料追溯

只有從既有審核 store 取出的 verified、來源 SHA／ROI 一致的版本才進入正式評測。重用 P2-A 全文／中文 CER、英文 CER／WER、公式與上下標欄位、表格 topology F1、圖說及閱讀順序；新增明確分母的整表拓樸 exact-match 比例，以及 canonical content units 遺漏數／GT units。表格文字另算，不把 topology 當文字準確率。

沒有 GT、沒有 canonical 對齊或分母為零時回 null／NOT_EVALUATED；字形基線與概念圖理解仍 NOT_IMPLEMENTED。NFC 與既有正規化規則不改，不用 NFKC 抹平上下標，不自動變更英文大小寫。此批所有正式品質分數均為 null；confidence 亦為 null／未校準，兩模型一致不得自動通過。

learning record 保留原圖來源與 SHA、ROI／頁碼、本機 OCR、付費候選、原始回應／SHA、模型版本／設定／耗時、差異、錯誤分類、待審核修正建議、人工版本引用及授權。原始 OCR 與人工 store 不覆寫。授權區分來源 `rights` 與供應商 `provider_rights`，各自記錄 evaluate、save、train、cloud_process、redistribute 的 allowed／denied／unknown、審查人／時間及證據引用；unknown 不等於允許。所有機器學習候選的 training_eligible 保守維持 false，本輪沒有訓練白名單匯出。

日誌每次新增一份 revision JSON，引用 previous_revision 與 previous_digest，驗證整條雜湊鏈。重放相同 event_id 必須內容相同；過期 revision 或競爭寫入會被拒絕，不覆蓋既有檔案。結果快取使用來源／crop SHA、ROI、模型版本、config、prompt digest；重開仍可查找，但須重新檢查來源及用途權利。這是本機原型，不是已驗證的跨主機分散式交易服務；多萬頁吞吐量尚未量測。

## 成本、恢復與批准

本輪執行預算 US$0，API calls 0、OCR calls 0、付費結果 0。`invokePaid()` 先要求請求範圍的明確批准與用途權利；即使測試提供這些條件，仍因 B2-1 offline-only／transport NOT_IMPLEMENTED 而拒絕，沒有可由命令列旗標直接啟用的付費路徑。

預算模擬支援：US$100 探索總上限、歷史支出對帳、批次與 ROI 上限、整數費用預留、總請求與每 ROI／供應商重試次數、checkpoint 重開、重複 key 返回快取／執行中而不再計費。計費未知時保留預留，禁止盲目重試；實際成本超過預留會留下 overrun 並阻擋新工作。歷史支出未知時不能預留新任務。此模擬尚未串接真實供應商用量、帳單或跨程序全域費用服務，不能聲稱現已提供所有探索任務的帳單級硬上限。

費率沿用已保存 B2 規劃，不在本輪發出價格／模型 API 請求。Google 十二次 OCR 加四次科學附加項之情境估算 US$0.042；mini 依每 ROI 總輸入（含圖片）8,000 token、輸出2,000 token 假設，十二次 US$0.18；已知小計 US$0.222。Azure 缺帳號／區域／SKU 報價，故三家整批總額為 null／PARTIAL_QUOTE_REQUIRED。這不是實測 token 或保證上界，未含稅、儲存及傳輸；真正付款前還需核定圖片 token 上界、實際價格與剩餘總預算。

建議 B2-2 只批准一個供應商、先一個來源／範圍充分的 ROI，格式與計費正常後才擴至既定十二 ROI。規劃批次上限 US$5 不等於已授權花費。不得一次啟用三個服務或剩餘 471 頁。

## 實測、產物與操作

新增 B2-1 測試：55 PASS、0 FAIL、0 SKIP。連同 P0、P1、P2-A、B1、Quality Gate、Benchmark 及人工校正回歸：570 PASS、0 FAIL、0 SKIP。完整回歸約 9.19 秒；離線十二 ROI 清冊與前後驗證約 5.58 秒，並非 OCR 時間。初輪有一項錯誤訊息斷言失敗；來源越界當時已被正確拒絕，只調整新增測試的預期訊息，未變更舊模組或標準答案。

測試涵蓋三服務相同來源、Unicode 不變、座標換算／越界、假資料不能冒充真實結果、錯 SHA／模型版本拒絕、日誌保存重開／舊版保留／竄改拒絕、來源與供應商權利分離、快取／預算／未知計費／重試上限／overrun 阻擋、人工草稿不可算 GT、科學符號／表格／順序合成指標與十二真實 ROI 只讀驗證。合成人工確認案例只驗證程式，未寫入正式 Ground Truth。獨立測試資料保留於作業系統暫存目錄；舊測試另外建立的專案內合成資料也沒有清除。

```powershell
node --test scripts/ocr-cross-validation/b2-1.test.mjs
node scripts/ocr-cross-validation/cli.mjs --dataset tmp-ocr-p2a-20261108-v2 --out tmp-ocr-b21-NEW-RUN
```

輸出路徑必須是專案內的新目錄，既有目錄會被拒絕。最終產物 `tmp-ocr-b21-20261108-v2/` 包含十二份 ROI JSON、summary.json、report.md 與測試摘要；前次 v1 輸出完整保留。此目錄含既有 OCR 事件與本機來源引用，不應直接公開 Git。

## B2-2 前的最少人工決策與條件

1. 核定一個服務、處理區域／資料保存政策，確認教材來源及服務輸出的雲端處理、保存、評估權利；訓練用途另案核定。
2. 核對歷史費用與剩餘額度，選定真實 processor／model version、取得 Azure 報價或先不選 Azure，批准單 ROI／批次上限。
3. 真實 transport、供應商原生 parser、圖片 token 上界、實際用量／逾時恢復與費用總帳串接必須再經測試。現有替身不是正式 API 相容性證明。
4. 要衡量真正品質，至少先完整人工確認一個純文字、一個科學符號、一個結構 ROI 的來源範圍與標準答案，並抽查一致區；這三個 ROI 只是診斷起點，不足以校準全書自動通過率。無需現在逐頁校對四百多頁。

B2-1 離線基礎已可驗收；尚不具備立即呼叫付費服務或機器內容自動接受的條件。下一步應先批准單一供應商的原生 adapter／零費用合約測試，再另行批准付費單 ROI 試驗。本輪到此停止。
