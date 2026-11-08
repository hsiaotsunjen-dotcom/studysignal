# OCR P2-B B2：付費交叉驗證與自有 OCR 改善規劃

日期：2026-11-08。本文件為規劃，不是執行授權或實測品質報告。本輪沒有付費請求、新 OCR、模型下載、訓練或 Git 寫入。

## 1. 已核對的起點

StudySignal master 的 HEAD、origin/master 與 GitHub master 均為 `81fe2d4d3be5ea6046ef361bffc38857a0551f9a`。B1 十檔已備份；515 項工程測試通過是上一輪執行結果，本輪不重跑儲存型測試。

本輪實際呼叫既有 `openP2A()`、`verify()`、`progress()`、`evaluate()`，重新驗證 `tmp-ocr-p2a-20261108-v2/dataset.json` 與引用檔案：12 個 ROI 來源可追溯，verified Ground Truth 為 0，評測狀態為 `insufficient_verified_samples`。讀取既有 B1 summary：2 個抽樣候選、10 個人工重點覆核；不是 2 個內容正確或自動接受。原始資料保留本機，本文不含教材 OCR 原文或圖片。

| 模組／實際路徑 | 可以重用 | 尚未具備 |
|---|---|---|
| `scripts/ocr-multi-engine-diff/core.mjs`、`scripts/lib/ocr-block-matching.mjs` | P0 共用幾何匹配、原始閱讀順序、差異位置追溯 | 真實字形正確性、任意多引擎的共同分組 |
| `scripts/ocr-multi-engine-diff/p1.mjs` | 缺漏候選、分段差異、科學／結構風險、事件去重 | 單側文字是否真正缺漏的像素證明 |
| `scripts/ocr-benchmark/p2a/workflow.mjs`、`metrics.mjs` | 12 ROI、來源 SHA、人工確認流程、指標計算、版本引用 | 獨立測試集與已確認標準答案 |
| `scripts/lib/ocr-ground-truth-store.mjs`、`ocr-ground-truth-review.mjs` | 草稿、人工確認、不可覆寫版本、既有介面 | 自動審核正確率校準 |
| `scripts/ocr-quality-gate/b1.mjs`、`b1-batch.mjs` | 來源閘門、風險分流、批次迭代、原事件保留 | 付費供應商轉接器、費用總帳、重試執行與 calibrated confidence |

已保存的基準引擎版本：Tesseract.js 7.0.0、PaddleOCR 3.7.0、PaddlePaddle CPU 3.3.0。它們的既有辨識結果可直接用於比較，本輪不重新辨識。

## 2. 十二 ROI 與評測範圍

所有 ID 以下均省略 `p2a-` 前綴。座標取自既有 manifest，為原圖像素 `xywh`，不根據檔名猜測。

| 類別 | ROI | 掃描序號／索引印刷頁 |
|---|---|---|
| 純文字 4 | text-01、text-02 | 6／11（頁碼 verified） |
| | text-03 | 200／205（頁碼 verified） |
| | text-04 | 317／322（頁碼 estimated） |
| 科學符號 4 | science-01 至 science-04 | 200／205（頁碼 verified） |
| 結構 2 | structure-01 | 19／24（頁碼 estimated），僅局部表格 |
| | structure-02 | 200／205，僅圖說，未包括完整圖片 |
| 特殊錯誤 2 | special-01 | 200／205，單側辨識候選 |
| | special-02 | 317／322，原始順序／內容差異 |

science-01 的窄 ROI 與 structure-01 的局部表格不能證明完整公式上下文或全表品質。遇到來源範圍不足，標記 `insufficient_context`；不得自行擴大裁切或編造內容。十二 ROI 來自四頁、同一本書，部分範圍重疊，全部維持 development；不能視為十二個獨立統計樣本。學生手機拍照、手寫、陰影及傾斜品質在這批資料沒有驗證。

## 3. 付費候選比較：官方能力與待實測品質分開

以下美元單價是 2026-11-08 查閱的官方公開資訊；帳號、區域、合約、稅額及實際用量仍須執行前確認。各服務在本教材的辨識品質均尚未實測，沒有排名或準確率主張。

| 方案 | 適用實驗與限制 | 計費／批次 |
|---|---|---|
| Google Document AI Enterprise Document OCR | 官方列有繁體中文及英文；提供文字與定位。Math OCR 可輸出公式 LaTeX 和框。可作第三個獨立候選，但化學電荷、字形、科學名詞仍需驗證；表格語義不等同一般 OCR | 標準邊際 OCR US$1.50／1,000 頁，OCR add-ons US$6／1,000 頁；保守估算先相加，不預扣免費額度。Layout Parser 為另一處理器，公開標準價 US$10／1,000 頁，不假設含在普通 OCR 中。支援線上與非同步批次 |
| Azure AI Document Intelligence Read／Layout，API v4.0 2024-11-30 | 官方列有繁體中文與英文；Layout 提供表格、段落及結構；公式附加功能有 LaTeX、polygon。數學公式支援不代表化學語義保證。適合與 Google 做表格／公式候選比較 | 官方價格頁本次沒有可核定的數值：**待區域／帳號報價**。Read、Layout、公式附加功能分開核對 SKU。支援非同步分析與批次；未確認報價前不得送件 |
| OpenAI `gpt-5.4-mini-2026-03-17` | 官方確認圖片輸入與結構化輸出；適合作為疑難 ROI 的額外轉錄／結構候選，非精確字形或 bbox 的保證。小字、非拉丁文字及旋轉是官方列出的視覺限制，不能讓語言推理補寫看不清的內容 | 標準輸入 US$0.75／百萬 token、輸出 US$4.50／百萬 token；圖片依官方圖片 token 規則計入輸入。符合條件的 Batch 官方提供 50% 折扣及 24 小時處理窗口；首輪用標準價預算，不預扣折扣 |

官方依據：[Google 處理器與語言](https://docs.cloud.google.com/document-ai/docs/processors-list)、[Math OCR](https://docs.cloud.google.com/document-ai/docs/enterprise-document-ocr)、[Google 價格](https://cloud.google.com/products/document-ai/pricing)、[處理模式](https://docs.cloud.google.com/document-ai/docs/send-request)；[Azure 語言](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/ocr?view=doc-intel-4.0.0)、[Layout](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/layout?view=doc-intel-4.0.0)、[公式附加功能](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/add-on-capabilities?view=doc-intel-4.0.0)、[價格](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/)、[批次](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/batch-analysis?view=doc-intel-4.0.0)；[GPT 模型／價格](https://developers.openai.com/api/docs/models/gpt-5.4-mini)、[圖片限制與 token 規則](https://developers.openai.com/api/docs/guides/images-vision)、[Batch](https://developers.openai.com/api/docs/guides/batch)。

推薦順序：現有本機結果 → B1 風險 → Google OCR 小實驗 → 只對仍有爭議的 ROI 使用 GPT mini；Azure 在取得報價且表格／公式功能可用時作替代比較。這是成本與接口適配建議，不是辨識品質結論。首輪只選一個第三方服務，避免三套服務同時導入增加歸因困難。

## 4. 隱私、輸出權利與訓練資格

| 服務 | 可確認的資料處理資訊 | StudySignal 訓練用途判定 |
|---|---|---|
| Google Document AI | 官方表示不以客戶內容訓練其模型、不主張文件與 predictions 所有權；線上文件在記憶體處理，非同步模式有不同暫存規則 | 不代表教材授權自動成立。實際 OCR／Layout 處理器條款、主合約與來源授權仍需確認；確認前 `training_allowed=false` |
| Azure Document Intelligence | 官方說明完成分析後輸入與結果保留 24 小時，並有提前刪除結果 API；區域及帳號設定須確認 | Microsoft 通用生成式 AI 條款含相似功能模型的合成訓練限制。不能直接斷言適用或不適用傳統 Document Intelligence；必須依實際服務分類與合約查證 |
| OpenAI API | 官方資料控制頁列 API 資料不作模型訓練、預設濫用監控保留最長 30 天，存在例外；`store:false` 不等於保證零保留，Batch 有另外的保存生命週期 | 本輪未取得足以確認「輸出可用於自有 OCR 訓練」的合約依據：**待查證**。不得用輸出所有權或不訓練承諾推論競爭模型訓練許可 |

依據：[Google 安全與內容權利](https://docs.cloud.google.com/document-ai/docs/security)、[Google 服務條款](https://cloud.google.com/terms/service-terms)、[Azure 資料隱私](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security)、[Microsoft 通用線上服務條款](https://www.microsoft.com/licensing/terms/en-US/product/ForOnlineServices/SS)、[OpenAI 資料控制](https://developers.openai.com/api/docs/guides/your-data)。此為工程上採用保守阻擋的依據，不是法律許可結論。

先建立相互獨立的權利欄位：`cloud_processing_allowed`、`evaluation_allowed`、`training_allowed`、`redistribution_allowed`，附條款版本、查核日期、來源授權、適用供應商與授權證據。未知即阻擋該用途。買到書或已完成掃描，不自動等於可以上傳第三方或訓練。人工改寫供應商輸出也不自動消除使用限制。

未來學生資料需另有服務處理與訓練用途同意，按適用年齡及地區處理；先去除姓名、學號、臉部及不必要背景。去識別化不取代同意。禁止可公開存取的圖片 URL；每一租戶隔離、最小化上傳、到期刪除與權限稽核。這批十二 ROI 不支持學生拍照品質主張。

## 5. B2 實驗與決策流程

1. 凍結十二 ROI、原圖 SHA、ROI 座標、候選 SHA、引擎版本／參數與 B1 結果；記錄各自輸入的完整性。不得改動舊快照。
2. 通過來源權利及供應商使用資格檢查後，生成 dry-run 工作清單；每個任務先預留最壞費用，沒有可核定價格、輸入上限或付款批准則阻擋。
3. 未來另獲批准才執行第一筆單 ROI。先要求付費服務只看同一原圖 ROI 獨立轉錄，不先給兩個本機答案，降低互相暗示。看不清須輸出未知，不得靠常識補全。若另做「參考本機候選的修正」是不同實驗臂，不能視為獨立票。
4. 保存原始供應商輸出；再建立 normalized、layout 與差異候選，不合併成真值。座標保留 native polygon／單位及 ROI→原圖轉換，所有結果都回到原圖像素。模型猜測 bbox 不可冒充原生 OCR 定位。
5. 重用 P0 進行成對比較，記錄比較雙方與各自事件 ID；新增層再彙整跨 pair 的共同問題，避免把同一缺漏計算多次。現有 P0 是雙引擎接口，不宣稱已支援任意多引擎共同匹配。
6. 由 P1／B1 分類問題，輸出來源、位置、類型、證據、嚴重度、建議操作、是否需要上下文及剩餘預算。公式、數值、單位、上下標、表格跨列跨欄採較嚴格規則。
7. 來源不明／失配 → `SOURCE_BLOCKED`；有可改善的失敗模式且尚有額度 → `RETRY_RECOMMENDED`；內容或結構不確定 → `HUMAN_REVIEW_REQUIRED`。`AUTO_ACCEPTED_MACHINE` 欄位可預留，但本階段內容接受關閉；模型一致、confidence 高或警告減少均不能單獨解鎖。
8. 人工只先處理集中化例外清單；但校準／評測用 ROI 仍需完整核對選定範圍，包括引擎一致區，以發現共同錯誤。只有現有明確人工確認流程可建立 verified GT；機器候選與 GT 儲存空間分離。

每個新 attempt 至少保留：source/material/page/ROI ID、image SHA、crop SHA／座標／轉換、parent attempt、引擎與 model snapshot、設定／prompt digest、原始輸出引用及 SHA、文字與 layout 層、UTC 時間、狀態、耗時、request/job ID、用量、估計／實際費用與幣別、權利查核引用、決策依據、人工確認版本。不得寫入金鑰或個人絕對路徑到公開報告。

可恢復工作以 source+ROI+image SHA+引擎版本+設定+prompt 的 digest 去重，任務與結果 append-only。首輪並行 1、後續最多 2；每 ROI 每供應商最多一次初始請求及一次經批准的重試，總任務數也有硬上限。逾時但結果／計費未知時先查 job 狀態並保留費用預留，不能盲目重送。無差異改善、結構惡化、來源失配、費率改變或額度不足就停止。

## 6. 評測與停止門檻

目前所有正式指標維持 null／未評估。以下為建議門檻，不是實測結果或全書品質標準。

| 指標 | 分母與方法 | 首輪判讀 |
|---|---|---|
| 全文 CER | Levenshtein 插入+刪除+替換／GT 字元數；沿用 NFC、排除空白、保留大小寫與科學符號 | 建議 ≤1%，同時看逐 ROI 值，缺 GT 不評分 |
| 中文 CER | 人工 GT 漢字投影的編輯距離／GT 漢字數 | 建議 ≤1%；另報混排全文，不以投影掩蓋問題 |
| 英文 CER／WER | 英文詞內字元或明定英文詞 token 的編輯距離／GT 對應單位；大小寫敏感 | CER 建議 ≤1%、WER ≤3%；分母為零回 null，不套用英文空格分詞算中文 WER |
| 科學公式／上下標／數值單位 | 人工標記的原子項目完全正確數／GT 項目數；保留元素大小寫、電荷、基線／上下標角色 | 本次已審核關鍵項目要求全對且新增關鍵錯誤 0；不推論母體 100% |
| 表格 | 人工確認 canonical cell 的位置、row/column span 精確比對之 F1；文字另算 CER | 建議 topology F1 ≥0.98；只能評已核對局部，缺欄／跨格未知不評分 |
| 圖說與標籤 | 正確文字及關聯數／人工列出的關聯數，另列遺漏／多出項目 | 建議選定範圍關鍵項目全對；現有圖說不能代表整幅圖 |
| 閱讀順序 | 正確先後關係對數／人工確認可比較關係對數 | 建議 ≥0.99；未知順序不算正確 |
| 漏字／漏行／漏區塊 | 人工 GT 對齊後刪除字元、漏行、漏區塊／各自 GT 數量 | 分開報告；大段或關鍵區塊漏辨識 0 |
| 風險規則 | TP/(TP+FN)、FP/(TP+FP)，另列基準樣本數 | 已審核高風險事件漏報 0；正例過少標樣本不足，不用輸出一致性代替真值 |
| 機器錯誤接受率 | 人工稽核發現錯誤的機器接受項目／已稽核機器接受項目 | 本輪機器接受未啟用，回 null，不報 0% |
| 人工量與成本 | 活躍核對秒數／ROI、每千 GT 字元、操作數、升級率；API 總成本／請求或 ROI | 使用同一操作定義，先量基準再量差異優先流程；尚未測量 |

空白、英文詞界、化學式符號不能用 NFKC 或自動改大小寫抹平。先前 metrics 的表格值是 F1，不是整表準確率；化學／圖說既有 keyed 值是錯誤率，不能改名為準確率。腳本像素幾何與概念圖節點／分支比對仍 NOT_IMPLEMENTED。

前十二 ROI 為 development，會有重疊及選樣偏差。任何公開性能或自動接受校準，須另行批准建立不同來源的 validation/test，按來源書本／頁面／衍生關係隔離。零次觀察錯誤不等於真實錯誤率為零；此資料量不能支持大規模免人工聲明。

## 7. 成本與分階段計畫

總探索上限 US$100，不是新一輪額外 US$100。歷史付費試驗的累積實際支出本輪尚未對帳，因此剩餘可用額度未知；須先對帳並扣除。下表為規劃配額，全部付費步驟仍需逐階段批准。

| 階段 | 工作／驗收 | 建議額度上限 | 工程時間估算 |
|---|---|---:|---|
| B2-0 | 本輪盤點與設計；來源、權利、歷史費用缺口清楚列出 | US$0 | 本輪完成規劃 |
| B2-1 | 離線轉接器合約、原生座標轉換、費用預留／checkpoint／去重；現有測試不退化、錯 SHA 拒絕、無批准零外呼 | US$0 | 2–3 工作日 |
| B2-2 | 一個服務先單 ROI，格式／來源／用量正常後最多十二 ROI；再決定是否加第二服務 | 共享 US$5，須先批准 | 1–2 工作日整合；API 延遲待測 |
| B2-3 | 同十二 ROI 的必要附加功能或第二服務、人工獨立審核與錯誤歸因；新增關鍵錯誤 0，無實益則停 | US$10 | 1–2 工作日，人工核對時長待測 |
| B2-4 | 另行批准後才建立獨立合法樣本、候選校準與本機改善回歸 | US$15 | 範圍確定後估；本輪不執行 |
| 保留 | 未批准的額度／歷史費用扣抵，不要求用完 | 最多 US$70 | 不分配工作 |

費用算例（均非實際帳單，未含稅／儲存／傳輸）：若每個 ROI 分別作單頁送件，十二次 Google OCR 的標準邊際費約 `12×1.5/1000=US$0.018`；四個科學 ROI 的 add-on 預留 `4×6/1000=US$0.024`，共約 US$0.042。若再對兩個結構 ROI 使用獨立 Layout 請求，另估 `2×10/1000=US$0.020`。實際可用 add-on、計費單位與 processor version 必須執行前確認。

GPT mini 假設每次總輸入（含圖片換算）8,000 token、輸出2,000 token，標準價約 `8000×0.75/1e6+2000×4.5/1e6=US$0.015`；十二次約 US$0.18。這是假設，不是該十二 ROI 的已量測 token 數。Azure 報價未知，不給估計單價。最初小實驗不需要使用 US$100。

應用端集中總帳須包含已花費、執行中預留、未知計費及其他探索工作，不只看本程序。每請求以實際圖片尺寸與模型計費規則計輸入上界，設定輸出 token 上限、請求次數及最大額外儲存量；剩餘額度不足以承擔最壞請求則不發送。供應商預算告警不是硬停止，不能只依賴告警。若無法推導可靠上界，停止等待報價或新批准。

純費率外推不等於處理批准：471 頁各一次 Google OCR 的標準邊際費約 US$0.7065；若每頁均加 US$6／千頁的附加項則另加 US$2.826。GPT 依上述假設每頁一次約 US$7.065，但整頁圖片 token／輸出通常不同，且尚未量測，不能作實際報價。正式策略應為局部升級，報 `頁數×平均升級ROI數×單ROI成本`，並計重試、儲存、傳輸及人工成本。471 頁本輪不處理。

## 8. 自有 OCR 持續改善與下一步

- 可先自動做：來源一致性、格式驗證、版本保存、座標轉換、差異分類、重複任務避免、資源／費用限制。這些不改變教材原文。
- 可提出候選但不能直接當真值：繁體錯字、名詞替換、電荷與上下標、表格填格、閱讀順序重建、缺漏內容。只因詞典或化學規則合理不能證明原圖如此。
- 付費服務用途：為本機結果提供另一份獨立圖像辨識證據及結構假設；沒有效益就換處理器或停止，不能無限重問。
- 訓練資料分層：原圖／raw OCR → 機器候選隔離區 → 有來源權利且人工核對的版本 → 再通過供應商用途權利檢查的訓練白名單。verified 的品質狀態與 training_allowed 的法律狀態獨立，兩者缺一不可。來源或合約不明、學生未同意、保留測試集均不得進訓練。
- 合法候選可累積錯誤類型、差異位置與人工操作耗時，優先改善本機偵測／分組／裁切；真正引擎替換或微調必須用合法且獨立的測試集驗證，不能只減少警告。
- 未來大量服務：本機預設、受控付費升級、預算／隱私政策路由、例外人工；教材掃描與學生拍照分開報指標。是否能減少人工及減少多少，現階段尚未測量。

最值得下一步批准的是 **B2-1 離線轉接器與成本／來源保護測試**，同時釐清既有教材的雲端處理授權與歷史支出。之後再批准一個供應商的單 ROI 試驗。尚不具備擴大剩餘 471 頁或啟用機器內容自動接受的條件。
