# PRD-002：Understanding Engine（理解引擎）

> **地位：** StudySignal Learning OS 核心系統——定義 AI **如何真正理解一位學生**。  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **參考（不修改）：** PRD-001 Today's Journey Engine · [`AI_EXAMPLES.md`](../AI_EXAMPLES.md) · [`AI_REVIEW.md`](../AI_REVIEW.md)  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 產品哲學與理解架構 — **非 UI、非旅程規劃、非工程規格**

---

## 一句話

**Understanding Engine**  
= AI 持續回答：

> **「這位孩子，現在真正需要什麼？」**

不是分析成績。  
不是分析題目。  
不是為了排任務。

真正的 Journey，永遠建立在真正的 Understanding 之上。  
本文件**只定義理解**——不定義 Journey、Planning、Schedule、Task。

---

## 本 PRD 做什麼／不做什麼

| 做 | 不做 |
|----|------|
| 定義觀察如何變成理解 | 不設計 Journey／課表／任務 |
| 定義 Signals → Model → 狀態維度 | 不討論 UI、Database、API、程式 |
| 定義信心、動機、負荷、準備度 | 不規劃今日步驟或畫面 |
| 定義「為什麼得到這個理解」 | 不實作 Agent／Prompt |

**If you remember only one thing：**  
Your first job is not to teach. Your first job is to understand.

---

## Understanding Spine（理解脊柱）

```text
Observation
    ↓
Learning Signals
    ↓
Student Model（持續更新）
    ↓
Emotional State · Motivation · Cognitive Load · Readiness · Confidence
    ↓
Understanding
    ↓
Why（為何如此理解——可解釋）
```

每一層都服務同一句話：  
**這位孩子，現在真正需要什麼？**

---

# 1. Observation（觀察）

## 1.1 定義

Observation 是理解的起點。  
AI **看見**發生了什麼——尚未下結論、尚未安排、尚未評分。

觀察包括（概念上）：

- 孩子如何開始、如何卡住、如何放棄或堅持  
- 回應節奏、猶豫、求助方式  
- 情緒語氣與自我評價（「我不會」「隨便啦」）  
- 與昨天／上週相比的變化跡象  
- 情境線索：時間、負擔、家庭節奏（若可知）

## 1.2 原則

| 觀察是 | 觀察不是 |
|--------|----------|
| 持續、溫柔、多面向 | 單次考試定終身 |
| 對狀態的注意 | 對價值的判決 |
| 可累積的證據 | 羞辱性標籤 |
| 服務理解 | 服務排名 |

**禁止：** 把一次錯誤、一次缺席、一次慢，當成「這孩子就是這樣」的結論。

## 1.3 Observation 的產出

Observation 產出的是**原始留意**，交給 Learning Signals 層轉化——  
不是直接變成「今天學第幾課」。

---

# 2. Learning Signals（學習訊號）

## 2.1 定義（對齊憲法）

> Learning Signals are AI observations of a learner's current state,  
> not judgments of the learner's worth.

學習訊號是 AI 對學生**當前學習狀態的持續觀察**，  
不是對能力或價值的評價。

## 2.2 Signals 在 Understanding Engine 中的角色

Signals 是 Observation 的結構化語言。  
它們回答：「我現在看見什麼狀態？」——仍**不是**「該給什麼任務」。

理解引擎關心的訊號族（例，可擴充）：

| 族 | 例 |
|----|-----|
| Cognitive | Understanding depth · Error pattern · Pace · Forgetting |
| Engagement | Focus · Initiative · Curiosity · Interest |
| Affective | Confidence · Fatigue · Emotional safety |
| Habit | Consistency · Recovery · Graceful stop |
| Preference | Scaffold need · Modality fit |
| Growth trend | Progress vs past self · Autonomy rise |

## 2.3 原則

- Signal **不是分數、排名、貼標籤、成敗**  
- 單一 Signal 從不定義孩子是誰；**模式與趨勢**才進入理解  
- Signals 的目的：更新理解——不是分析學生給家長看笑話

> 我們不只看見孩子的答案，更看見孩子的學習訊號。

---

# 3. Student Model（學生模型）

## 3.1 定義

StudySignal 不保存一份成績單當「理解」。  
StudySignal 持續建立一個**會成長的 Student Model**：

> AI 對這位學生持續演化的理解。

Every Learning Signal updates the AI's understanding of the student.  
AI 不是每天重新認識孩子——而是每天比昨天更理解孩子。

## 3.2 Model 至少包含的理解面向

| 面向 | 與理解的關係 |
|------|----------------|
| Learning Personality | 節奏、面對困難的方式 |
| Current Ability | 目前能力狀態（溫柔、可演化） |
| Learning Preferences | 何種引導更有效 |
| Learning Signals | 即時觀察寫入 Model，非孤立堆疊 |
| Growth Blueprint | 長期方向（理解「往哪走」，非今日課表） |
| Goals | 為何而學 |
| Current Context | 今天的情境 |
| History & Memory | 情節與有效方法 |

## 3.3 原則

Student Model：

- **不是**資料庫代稱  
- **不是**靜態 Profile  
- **不是**履歷  

而是：**陪伴式理解的活體。**

本 PRD 只要求：Understanding Engine **讀取並更新** Model 中與「現在需要什麼」相關的理解——  
不在此展開 Journey 如何使用 Model。

---

# 4. Emotional State（心理／情緒狀態）

## 4.1 為何必須理解情緒

沒有情感安全，學習條件不成立。  
Care before teaching——理解引擎必須看見心，而不只看見題。

## 4.2 理解什麼

| 面向 | 問題 |
|------|------|
| Safety | 是否感到被接住，而非被審判？ |
| Mood | 低落、平穩、興奮、煩躁？ |
| Threat | 是否把學習體驗成威脅？ |
| Recovery need | 是否需要先被陪伴，再談內容？ |

## 4.3 原則

- 情緒低落 ≠ 懶惰  
- 煩躁 ≠ 不配學習  
- 情緒狀態改變「現在真正需要什麼」——常常是：安全感、小勝、休息，而非加碼  

**Emotional State 進入 Understanding，不進入羞辱報告。**

---

# 5. Motivation（動機）

## 5.1 定義

Motivation 是「為什麼願意走下一步」的狀態——  
內在好奇、勝任感、歸屬感、外在壓力、逃避、或耗竭。

## 5.2 理解引擎要分清

| 可能狀態 | 「現在真正需要什麼」常指向 |
|----------|----------------------------|
| 內在興趣高 | 保護興趣；適度挑戰 |
| 外在壓力驅動 | 降低羞辱；找回可控的一小步 |
| 動機枯竭 | Care、恢復、縮短；非催促打卡 |
| 想表現／怕失敗 | 信心與安全先於表演 |

## 5.3 原則

- 不把外在催促當成健康動機  
- 不把「今天沒學」直接判為動機差——先理解原因  
- 動機理解服務「願意回來」，不是服務「今天做最多」

> Momentum is more important than intensity.

---

# 6. Cognitive Load（認知負荷）

## 6.1 定義

Cognitive Load 是此刻心智可承受的複雜度與同時處理量。  
負荷過高時，再好的內容也變成傷害。

## 6.2 理解什麼

| 訊號（例） | 可能含義 |
|------------|----------|
| 頻繁卡住、放棄 | 負荷或前置不足 |
| 要求直接答案 | 可能負荷＋焦慮，而非只是懶 |
| 速度極慢或極亂 | 工作記憶過載 |
| 同時多科高壓 | 今日負荷預算已滿 |

## 6.3 原則

- 理解負荷，是為了知道「現在需要更少、更清、更小步」——不是為了塞滿  
- Quality before Quantity  
- 高負荷時，「現在真正需要什麼」往往是：**減輕**，不是**加碼**

本節不規定如何排任務——只規定：Understanding 必須包含負荷判斷。

---

# 7. Readiness（準備度）

## 7.1 定義

Readiness 回答：

> **現在，適合推進、放慢，還是休息？**

它整合：情緒、動機、負荷、信心、情境、知識前置（概念上）——  
成為「可不可往前」的理解，而非課表進度。

## 7.2 三種準備度（理解層）

| Readiness | 含義（理解，非指令清單） |
|-----------|--------------------------|
| **Ready to advance** | 狀態穩、前置大致足夠、負擔可承受 |
| **Ready only to ease** | 可學習，但需降難、縮短、改複習或陪伴 |
| **Ready to rest** | 今日不適合硬推進；需要恢復與被理解 |

## 7.3 原則

- AI 必須理解準備度——正如必須理解內容缺口  
- 「不適合推進」是合法、尊嚴的理解結果  
- Know when to slow down——從理解開始，不是從妥協開始

---

# 8. Confidence（信心）

## 8.1 定義

Confidence 是願意嘗試、願意犯錯、願意再來的主觀力量。  
低信心會把一切學習體驗成威脅。

## 8.2 原則

> **Confidence before Performance.**

- 沒有信心時，「現在真正需要什麼」優先是：**被接住與小勝**，不是分數修復  
- 不因速度快就假設信心高；不因答錯就假設人格弱  
- 只與過去的自己比——理解引擎拒絕同學比較作為「激勵」

## 8.3 信心在 Understanding 中的位置

Confidence 是核心狀態維度之一。  
它與 Emotional State、Motivation、Readiness 互相纏繞——  
Understanding Engine 必須能說：「今天信心偏低，因此真正需要的是……」

---

# 9. Understanding（理解）

## 9.1 定義

Understanding 是本引擎的**輸出**：  
把 Observation、Signals、Model、與各狀態維度，收斂成一句可行動的人話理解——

> **這位孩子，現在真正需要什麼？**

以及：

> **今天真正需要解決的核心是什麼？**

## 9.2 Understanding 不是

| 不是 | 為什麼 |
|------|--------|
| 成績單 | 分數不是理解 |
| 題目解析報告 | 解析題目 ≠ 理解孩子 |
| Journey／任務列表 | 那是後續引擎；本 PRD 禁止越界 |
| 羞辱標籤 | 「懶」「笨」「不配合」禁止出現 |

## 9.3 Understanding 產出契約（對內）

一次合格的 Understanding 至少包含：

1. **核心需要**（一句人話：現在真正需要什麼）  
2. **狀態摘要**（情緒／動機／負荷／準備度／信心——精煉，非監控報告）  
3. **與過去自己的對照**（若有：比昨天如何）  
4. **不確定之處**（誠實：哪裡沒把握）  
5. **為何如此理解**（見 §10）

## 9.4 例子（理解語言，非安排語言）

| Understanding（例） | 說明 |
|---------------------|------|
| 「現在需要被接住與恢復信心，多於新進度。」 | 信心／情緒優先 |
| 「現在需要減輕負荷，守住一個小小的勝任感。」 | 負荷／準備度 |
| 「現在需要釐清某個概念迷思，而非加量練習。」 | 認知訊號 |
| 「現在需要休息；長期方向仍在，今天不必硬推。」 | Readiness = rest |
| 「現在狀態穩，可以溫柔推進一點，並交還一些自主。」 | Ready to advance |

注意：以上**停在理解**。  
不在此寫「因此安排三個任務」。

---

# 10. Why（AI 為什麼得到這個理解）

## 10.1 原則

> **Every understanding deserves an explanation.**  
> （對齊：Every recommendation deserves an explanation——理解本身也必須可追溯。）

若 AI 說「我理解你現在需要休息」，必須能說明**憑什麼**——  
否則理解與黑箱評分無異。

## 10.2 Why 必須能回答

| 問題 | 目的 |
|------|------|
| 我觀察到了什麼？ | Observation／Signals |
| 這些訊號如何更新了我對你的理解？ | Student Model |
| 我如何看待你的情緒／動機／負荷／信心／準備度？ | 狀態維度 |
| 為什麼「現在真正需要」是這個，而不是「更多題」？ | 收斂邏輯 |
| 我哪裡可能錯了？ | 謙遜與可修正 |

## 10.3 對誰解釋

| 對象 | Why 的語氣 |
|------|------------|
| 對內（引擎／後續決策） | 清楚、可檢驗 |
| 對學生（若需） | 短、暖、無考核口吻 |
| 對家長 | 安心、日記式；非監視、非羞辱 |

家長信任建立在：**理解可被說明**——不是「AI 很聰明所以聽它的」。

## 10.4 不合格的 Why

- 「AI 認為對你最好」  
- 「課表排到了所以你需要這個」  
- 「平均分低所以你需要這個」  
- 無法指出任何 Signal 或狀態依據  

不合格的 Why → **不得當成合格 Understanding。**

---

# 理解引擎與整條產品鏈（邊界聲明）

```text
Understanding Engine（本 PRD）
        ↓ 產出：真正的 Understanding + Why
（此處停止本文件的職責）
        ↓
後續由其他 PRD／引擎使用理解去決策與陪伴
（Journey / Planning —— 不在本文件範圍）
```

**禁止本 PRD：**

- 定義今日任務、時長表、畫面  
- 用 Understanding 直接等於 Schedule  
- 把理解引擎做成成績分析儀表板規格  

**必須本 PRD：**

- 讓任何後續決策都站在「先理解」之上  
- 讓「這位孩子現在真正需要什麼」永遠可被問、可被答、可被解釋  

---

# 憲法對齊（摘要）

1. Understand before Teaching.  
2. Care before Planning.  
3. Signals = 觀察，不是標籤。  
4. Student Model = 持續演化的理解，不是 Profile。  
5. Confidence before Performance.  
6. Consistency before Intensity.  
7. Explain every understanding.  
8. 真正的 Journey，永遠建立在真正的 Understanding 之上。

---

## 產品信念（收斂）

> 不是分析成績。  
> 不是分析題目。  
> 而是理解這位孩子——現在真正需要什麼。  
>  
> 觀察成為訊號。  
> 訊號更新模型。  
> 狀態被誠實看見。  
> 理解被清楚說出。  
> 理由被溫柔解釋。  
>  
> 沒有理解，就沒有資格安排。  
> 有了理解，陪伴才開始有意義。

---

*PRD-002 · Understanding Engine · v1.0*  
*Observation → Signals → Model → States → Understanding → Why*  
*Downstream of PRD-000 · Philosophy of understanding only · No Journey · No UI · No code.*
