# 掃描 200／印刷 205：文字定位及科學公式驗證 v2.1

日期：2026-11-04（Asia/Hong_Kong）。本輪為獨立離線證據層，重用已提交的 V2 驗證、TSV 解析及來源保護工具。沒有變更既有 V2 契約或分類規則，沒有新增 API 呼叫、OCR、正式教材寫入或 Git 提交。

## 主要結論

原本 13 項建議無法自動接受，有四個不同原因：

1. 原模型文字偏移有 12 項不符。V2 已能透過 before 的唯一精確命中建立 canonical span，但尚未連到可信來源的文字框。
2. 原 AI 框雖在原圖範圍內，仍不代表位置正確。本輪以 raw 與 TSV 全頁非空白序列一致性連結來源框，發現 13 個 AI 框均與各自目標的 TSV token boxes 無交集。不能只重命名 bbox 或猜測縮放比例處理。
3. OCR 與 AI 建議都不是獨立標準答案。公式字串變得合理，不代表符合原圖；上下標、電荷、英文字母大小寫及原書術語仍有風險。
4. 圖表分支、缺漏標籤及原書用字無法僅靠文字一致性證實。已存在的 OCR／TSV 可能一起漏掉同一內容，因此不能以二者相符推斷教材完整。

本輪改善的是來源定位與審核證據完整度，沒有證明辨識準確率或人工工時已改善。

## 改善前後實測比較

|項目|已保存 V2|本輪離線 v2.1|
|---|---|---|
|原文精確定位|13／13，保留錯誤原偏移|維持，加入 UTF-16 位置至 TSV token／行框映射|
|AI bbox|欄位統一、範圍檢查通過|另檢查對應 token box 交集，13／13 不相交|
|來源框|未建立每項建議的 TSV 框|13／13 建立，使用原圖像素 xywh；另存而不覆寫 AI 框|
|文字差異|整段 before／after|33 個確定性差異片段；只是差異，不是 33 個已證實錯誤|
|差異片段座標|未細分|30／33 可連到來源 word boxes；2 個插入及 1 個換行刪除沒有原始字形框|
|公式檢查|regex 風險標記|增加有限語法的原子數／電荷、Unicode 上下標及大小寫分析|
|接受修改|0|0|
|CER／WER／真實修復與新增錯誤數|null|維持 null|

本頁有 522 個既有 TSV word records；raw 與 TSV 非空白序列皆為 777 個 UTF-16 units，順序完全相同。此序列一致性只忽略空白用於定位，原文及其空白／換行未正規化或改寫。13 項整段建議皆涵蓋完整 token，但 30 個可定位差異片段中有 15 個僅占 token 部分文字；其框仍是整個 word box，不能宣稱是字元精準框。

## 13 項逐項結果

所有列出的座標均為本機由既有 TSV 取得的來源包圍框 `[x,y,width,height]`，不是重新辨識或人工核准的原圖框。跨行建議另保留逐行框，避免只使用大包圍框。

|項目|來源框 xywh|差異片段|公式比較結果|內容分類|
|---:|---|---:|---|---|
|1|1393,121,633,39|1|未解；含頁首失真 Latin 字串|人工審核|
|2|229,477,1520,68|4|未解；Fe?、Fe2+ 需核對|人工審核|
|3|271,806,1663,127|5|未解；COa 不能當作有效公式前綴修補|人工審核|
|4|239,993,1637,68|2|無公式候選；中文異字需核對|人工審核|
|5|135,1057,586,68|1|原子計數不同；不代表哪一方正確|人工審核|
|6|135,1186,1154,68|2|未解；離子字串含 OCR 雜訊|人工審核|
|7|187,1249,1743,132|4|原子計數／電荷不同|證據不足|
|8|186,1313,1744,261|6|未解；離子格式、Co／CO 大小寫風險|證據不足|
|9|133,1571,1114,68|2|未解；HbCO2 視為不透明生化縮寫|可能錯誤|
|10|278,1900,458,395|1|未解；圖內文字與標籤刪除仍有風險|可能錯誤|
|11|90,2406,706,86|2|無公式候選|人工審核|
|12|93,2659,1130,47|2|無公式候選|人工審核|
|13|89,2706,1416,81|1|無公式候選|人工審核|

13 個 AI 原框均不與其對應的來源 token boxes 相交。例如項目 1 的原框為 `[820,18,410,38]`，來源框為 `[1393,121,633,39]`；項目 11 的原框為 `[83,1091,404,43]`，來源框為 `[90,2406,706,86]`。工具只記錄此矛盾，不推定共同縮放或位移、不替換舊座標。

四類內容統計前後一致：可自動確認 0、人工審核 9、證據不足 2、可能錯誤 2。座標矛盾另外列為幾何診斷，不能因來源映射成功消除既有內容疑點。所有項目仍 pending_human_review、autoApplyAllowed=false、semanticVerified=false。

## 新增機制

### 來源定位

- 重用 `scripts/lib/ocr-layout-prototype.mjs` 的 parseTSV、intersection、area；對 headerless TSV 加入讀取相容層，避免遺失第一個 word record。
- 比對整頁 raw／TSV 非空白序列，不允許模糊匹配、大小寫折疊或推測字詞。序列不同、錨點不確定或來源框不合法時保留 unresolved。
- 以 immutable raw 的 UTF-16 位置連到 TSV token ID，再產生逐行框及包圍框。原圖座標系明確記為 original_image_pixels、xywh。
- 模型 bbox、來源 bbox、來源雜湊及原文位置分開保存。原模型座標不會被來源框取代；新增框只是來源證據。
- 差異採有界的字元編輯路徑，保存原／新文字及雙方 UTF-16 spans。重複字串可能有多種有效對齊，因此差異片段是確定性表示，不代表唯一的語言學修改邊界。超過 1,200 code points 的單區段停止差異細分，不猜測替代結果。

### 科學文字

- 保留字面原文；分開比較 Unicode 下標、上標、baseline digits 及電荷符號，不做 NFKC 或英文大小寫正規化。
- 有限語法可將 O₂／O2 的原子計數相同與排版變動分開記錄；相同原子數及電荷不代表分子結構、化學意義或原圖文字相同。
- Fe²⁺ 可記錄明確上標電荷；缺乏排版資訊的 Fe2+、多位數尾綴與電荷歧義保留 unresolved，不用化學常識選答案。
- CO／Co 的字母大小寫會改變解析結果，另記錄 English／Latin 大小寫風險；本頁有 1 項建議觸發此風險。該風險是詞彙候選關係，不宣稱兩字串已精準逐詞配對。
- Hb 類生化縮寫不拆成元素；有限元素符號表之外、括號群、同位素／水合物等複雜記法均保留未解。複雜式保留完整 run，不靠解析有效片段宣稱全式有效。
- 混合中文與 Latin 字串保存各 token 位置與原始字面；仍沿用 V2 專有名詞及胺／氨保護。

本頁按整項建議比較：無公式候選 4、未解 7、原子數／電荷不同 2、兩側皆可解析且計數相同 0。before／after 中共有 14 個未解 token occurrences，包含重複及非公式的頁首雜訊，不能當作 14 個真實公式錯誤，也不是完整公式召回率。

## 可重複使用的處理順序

1. 鎖定單頁圖片、raw、TSV、既有回應及先前驗證版本，讀取後核對雜湊。
2. 呼叫既有 V2 驗證，保留原分類與先前未解觀察。
3. 建立 raw／TSV 來源一致性映射；不相符則停止推導座標。
4. 產生原圖像素的來源框與 AI 框比較證據。
5. 拆分純文字差異，逐片段連到來源 token；插入與純空白變更保留無字形框狀態。
6. 產生公式語法、排版、大小寫及混排診斷；不自動修正。
7. 新版本另存 JSON／Markdown，輸入前後核對不變；人工以來源框及差異片段聚焦審核。

共用 library 不讀磁碟、不連網、不識別科目頁碼，可由未來其他科目逐頁呼叫。本輪 CLI 刻意固定第 200 頁；沒有批次入口、沒有執行其他教材頁面，也沒有測量擴展吞吐量。來源不一致時的恢復／重試及人工接受流程仍應另行設計，不能把本輪包裝成全書處理系統。

## 測試及產物

```text
node --test scripts/ocr-ai-source-evidence.test.mjs scripts/ocr-ai-formula-evidence.test.mjs scripts/ocr-ai-proposal-evidence.test.mjs scripts/ocr-ai-proposal-validation.test.mjs scripts/ocr-ai-proposal-audit.test.mjs scripts/ocr-ai-correction-trial.test.mjs scripts/ocr-quality-metrics.test.mjs
node scripts/ocr-ai-evidence-replay.mjs
```

原有 56 項及新增 34 項均通過，共 90／90，失敗／略過皆 0。軟體測試通過率為 100%，不代表 OCR 準確率。新增測試涵蓋全頁字串不一致、headerless TSV、局部 token、越界、差異重建、Unicode spans、歧義電荷、上下標、大小寫、複雜式、先前疑點保留及可重現性。

最終結果：`tmp-ocr-ai-source-evidence-v21-Za6Ve1/evidence.json`、同目錄 `report.md`。單頁來源核對及重播約 26.78 ms；對相同輸入執行兩次函式比對結果一致。保護 9 個輸入檔案，輸出前後雜湊改變 0。中間結果 `tmp-ocr-ai-source-evidence-v21-xu3SIQ/` 保留，屬改善過程版本，最終統計以上述 Za6Ve1 版本為準。

來源：`scripts/fixtures/ocr-quality-baseline.v1.json`、manifest 及 page-index、`content/knowledge-base/ocr-pilot/biology-12pages-20261101-v2/pages/0200/attempt-01/` 的 raw／TSV／result、`tmp-ocr-ai-correction-paid-firstpage-v1/response.json`、先前 `tmp-ocr-ai-proposal-validation-v2-76P938/validation.json`。原圖依 manifest 指定的來源讀取，沒有複製或上傳。

產物包含原／候選教材文字，僅供本機查證，不應直接公開提交。未建立 Ground Truth；CER／WER 仍須獨立人工確認的參考文字。

## 檔案範圍與下一步

本輪只新增以下 8 個程式、測試及文件檔案，既有 V2 程式與報告均未修改：

- `scripts/lib/ocr-ai-source-evidence.mjs`
- `scripts/lib/ocr-ai-formula-evidence.mjs`
- `scripts/lib/ocr-ai-proposal-evidence.mjs`
- `scripts/ocr-ai-evidence-replay.mjs`
- `scripts/ocr-ai-source-evidence.test.mjs`
- `scripts/ocr-ai-formula-evidence.test.mjs`
- `scripts/ocr-ai-proposal-evidence.test.mjs`
- 本報告。

下一步建議只在本頁選取 Fe 電荷／上下標、氣體大小寫、胺／氨及圖中標籤做人工核對，驗證來源框確實方便審閱，再決定是否建立對照介面。原圖仍有 OCR 未收錄的圖示內容，不能從 TSV 重建；15 個差異的 word box 涵蓋多字，也不能用等寬切分偽造精準字框。尚無可靠人工工時或節省比例，不宣稱已減少多少人工工作。
