# PRD-001：Today's Journey Engine（今日旅程引擎）

> **地位：** StudySignal Learning OS 的第一個核心系統 PRD。  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md)（衝突時以憲法為準）  
> **配套：** [`PRODUCT.md`](../PRODUCT.md) · [`ARCHITECTURE.md`](../ARCHITECTURE.md) · [`BRAND_VOICE.md`](../BRAND_VOICE.md)  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 產品哲學與決策架構 — **非 UI、非工程規格、非實作**  
> **編號說明：** Learning OS 核心系統 **PRD-001**。  
> 既有 [`PRD-001-Parent-Signup.md`](./PRD-001-Parent-Signup.md) 屬帳號入門，職責不同，互不取代。

---

## 一句話

**Today's Journey Engine**  
= AI 每天根據對孩子的理解，  
**重新設計今天最適合的陪伴。**

Journey 不是固定課程。  
Journey 是每天重新生成。  
Journey 是決策與陪伴，不是排課。

---

## 本文件架構（Engine Spine）

```text
§1  Why Journey Exists     為什麼每天都需要 Journey
        ↓
§2  Care First             先陪心，再陪學
        ↓
§3  Understanding Framework  AI 每天先理解孩子，而不是先安排任務
        ↓
§4  Decision Philosophy    理解之後，才開始做決策
        ↓
§5  Decision Boundaries    何時前進？何時放慢？何時休息？
        ↓
§6  Prioritization Engine  今天真正重要的是什麼？
        ↓
§7  Today's Journey        今天的陪伴流程
        ↓
§8  Reflection             今天學到了什麼？
        ↓
§9  Growth                 哪些 Signal 改變了？
        ↓
§10 Tomorrow               明天應該如何開始？
```

**不做：** UI、畫面、程式、框架、資料表。  
**只做：** 產品哲學與決策架構（對齊 PRD-000：理解先於評分；Care → Learn → Grow）。

---

# §1 Why Journey Exists  
## 為什麼每天都需要 Journey

### 1.1 問題

多數教育產品問：

> 「今天學什麼？」

決策成本丟回孩子：選科目、選單元、選題量。  
猶豫、逃避、亂點——或乾脆不開始。

家長得到課表與打卡，仍不知道：**今天這位孩子被怎麼陪。**

### 1.2 StudySignal 的回答

StudySignal 每天需要 Journey，因為我們回答的是：

> **「今天怎麼陪這位學生。」**  
> **「今天最值得做什麼？」**

不是「今天能塞進最多什麼」。

### 1.3 Journey 是什麼

| Journey 不是 | Journey 是 |
|--------------|------------|
| 固定課程／課表 | 每天依這位孩子重新生成 |
| 任務清單 | 陪伴決策的落地 |
| 對所有人同一套 | 對這一位、這一個今天 |
| 完課劇場 | 服務理解與可持續成長 |

沒有每日 Journey，Learning OS 只剩聊天與內容——孩子仍自己做「今天怎麼辦」。  
有了它，才兌現：**Always know the next step · Decide for them, explain to them.**

### 1.4 為何是「每天」

因為孩子每天不同：情緒、疲勞、作業、信心、家庭節奏都會變。  
昨天的安排，不能假裝仍適合今天。  
**每天都需要一次：理解 → 邊界 → 優先 → 陪伴 → 回顧 → 成長 → 交給明天。**

---

# §2 Care First  
## 先陪心，再陪學

### 2.1 第一原則

對齊 PRD-000 Opening：

> **先陪心，再陪學，最後陪成長。**

```text
Care
  ↓
Learn
  ↓
Grow
```

> **Relationship before Recommendation.**  
> 先建立理解與信任，再提供建議與學習。

### 2.2 Care 在 Engine 裡的意思

Care 不是溫暖的裝飾文案。  
Care 是**決策的第一關**：

- 今天的心是否被接住？  
- 是否安全到願意開始？  
- 是否需要先被陪伴，而不是先被推進？

**沒有 Care 的 Plan，只是壓力排程。**  
AI 不急著回答、不急著教、不急著糾正——**先理解、先陪心。**

### 2.3 Care 的產出（對內）

進入下一節之前，至少應能感覺到：

1. 孩子當下的情緒與安全感（觀察，非標籤）  
2. 是否需要「先陪」再「再學」  
3. 今日關係優先於今日進度

---

# §3 Understanding Framework  
## AI 每天先理解孩子，而不是先安排任務

### 3.1 原則

**不要急著安排任務。**

AI 先回答：

> **今天真正需要解決的是什麼？**  
> **今天這位孩子處在什麼狀態？**

沒有 Understanding 的 Journey = 排課。  
Understanding 是決策的起點。

### 3.2 每天需要理解的輸入

輸入不是問卷牆；多數來自既有理解與觀察：

| 輸入 | 用途 |
|------|------|
| **Student Model** | 對這位學生持續演化的理解 |
| **Learning Signals** | 此刻狀態的觀察（非分數、非標籤） |
| **Calendar** | 時間與力氣的現實 |
| **Today's Context** | 今天特有的情境（作業、情緒、突發） |
| **Learning History** | 近期發生過什麼、什麼有效 |
| **Long-term Goal** | 為何而學 |
| **Blueprint** | 長期藍圖方向 |
| **Parent Preference** | 家庭可承受的溫和邊界（非監視） |
| **Memory** | 讓今天建立在昨天之上 |
| **Knowledge Graph** | 前置、依賴、迷思、難度 |
| **Heart** | Care：心是否被接住 |

### 3.3 Understanding 可能長什麼樣子（例）

皆為**狀態理解**，不是價值判決：

| 理解（例） | 含義 |
|------------|------|
| 今天缺乏信心 | 需要小勝與低威脅 |
| 今天注意力下降 | 需要更短、更小步 |
| 今天應先完成作業 | 意圖改道，仍要可解釋 |
| 今天適合預習 | 輕量接觸＋前置檢查 |
| 今天需要休息 | 恢復與善意停止仍是陪伴 |
| 今天某迷思反覆出現 | 針對迷思，而非加量 |
| 今天狀態穩、自主上升 | 可交還一點規劃權 |

### 3.4 Understanding 產出契約

對內至少形成：

1. **今日核心問題**（一句人話）  
2. **今日狀態摘要**（含是否適合硬推進——交 §5）  
3. **今日意圖傾向**（帶領／作業／複習／預習／恢復）  
4. **負擔上限**  
5. **成功長什麼樣子**（完成、部分完成、善意停止皆可）  
6. **不確定之處**（不假裝全知）

然後——才進入決策（§4）。

---

# §4 Decision Philosophy  
## 理解之後，才開始做決策

### 4.1 每天真正在回答的問題

理解之後，AI **不是**回答「今天學什麼貨架」，而是：

> **「今天最值得做什麼？」**

### 4.2 決策優先序（永遠）

對齊 PRD-000 Learning Engine：

| 順位 | 優先 |
|------|------|
| 1 | **理解**（含 Care） |
| 2 | **長期成長** |
| 3 | **效率** |

任何只追求短期完成、卻傷害長期能力的決策——違憲。

### 4.3 決策原則

> **Right Thing before More Things.**  
> 先做最重要的事情。不是做最多事情。

> **Quality before Quantity.**  
> 真正理解，比完成更多重要。

> **Every recommendation deserves an explanation.**  
> 每一個建議，都必須能說明理由。

可解釋，才建立學生合作感與家長信任。  
說不清楚「為什麼」——不得作為預設主路徑。

### 4.4 決策在 Spine 上的位置

```text
Care → Understand →（本節：開始決策）→ Boundaries → Prioritize → Journey → Reflection → Growth → Tomorrow
```

**理解之後，才開始做決策。**  
決策不是跳過 Care 與 Understanding 的捷徑。

---

# §5 Decision Boundaries  
## 什麼時候前進？什麼時候放慢？什麼時候休息？

### 5.1 核心問題

AI 不只決定今天做什麼。  
AI 也必須決定：

> **今天是否適合學習／推進？**

**AI 不只是知道何時前進。更要知道何時放慢。**

### 5.2 三種邊界決策

| 決策 | 何時（例） | 含義 |
|------|------------|------|
| **前進** | 狀態穩、前置足夠、負擔可承受 | 可推進今日最值得的路徑 |
| **放慢** | 信心不足、注意力下降、壓力偏高 | 降難、縮短、改複習或陪伴 |
| **休息** | 疲勞、過滿、高強度後、家庭重大事件 | 建議休息／今天先到這裡——仍算被好好陪 |

### 5.3 觸發放慢或休息的狀況（例）

- 情緒低落  
- 壓力過高  
- 身心疲勞  
- 行程過滿  
- 已完成高強度學習  
- 家庭重大事件  

調整方式：降低難度 · 縮短 Journey · 改複習 · 改陪伴 · 建議休息。

**放慢不是失敗。** 是教練判斷。

### 5.4 可持續原則

> **Growth is sustainable.**  
> 真正的成長，來自可以持續的節奏。不是每天做到最多。

AI 永遠追求 **Long-term Consistency**，而不是 **Short-term Intensity**。

### 5.5 Journey 可調；Blueprint 不變

> AI 可以改變今天，但不能忘記長期目標。

今日時長、難度、意圖可變；  
**Growth Blueprint 的方向與意義不因今天放慢而丟棄。**  
休息是為了明天還能走在藍圖上。

放慢／休息仍須可解釋——對家長翻譯成安心，不是「偷懶」指控。

---

# §6 Prioritization Engine  
## 今天真正重要的是什麼？

### 6.1 問題

在 Care、Understanding、Boundaries 之後，回答：

> **今天真正重要的是什麼？**  
> **今天刻意不做／延後的是什麼？**

### 6.2 Priority 不依照課表

Priority 由以下**共同決定**——無單一霸權：

| 依據 | 角色 |
|------|------|
| **Heart** | 心與情緒是否需要被接住 |
| **Signals** | 此刻觀察 |
| **Student Model** | 對這位學生的持續理解 |
| **Blueprint** | 長期該往哪——今日服務成長 |
| **Calendar** | 時間與力氣現實 |
| **Parent Preference** | 溫和家庭邊界 |
| **Knowledge Graph** | 前置／依賴／迷思／難度 |
| **Memory** | 昨天與有效方法 |

無法說清「為什麼這比那更值得」——不得用「課表排到了」代替。

### 6.3 Prioritize 產出

1. **今天最值得的核心一件事**（或一條主路徑）  
2. **今天延後／不做的事** + 理由  
3. **一句人話解釋**（給學生與家長信任）  
4. **對齊邊界**：前進／放慢／休息下的優先形態

### 6.4 與 Right Thing

Prioritization Engine 的存在，就是為了阻止「做更多」。  
**一天一個清楚、可完成、可解釋的主優先。**

---

# §7 Today's Journey  
## 今天的陪伴流程

### 7.1 定義

Today's Journey = Prioritize 之後的**今日陪伴落地**：

- 今日目標（Today's Goal）  
- 步驟、順序、時長、鷹架  
- **為什麼是今天這樣**（可解釋）

每天重新生成；可因作業／複習／預習／恢復改道——仍須回到 Understanding → Boundary → Prioritize。

### 7.2 Journey 必須具備

| 要素 | 要求 |
|------|------|
| **一個主目標** | Right Thing；可為推進、複習、陪伴或恢復 |
| **可走的步驟** | 學生永遠知道下一步 |
| **時間負擔** | 誠實、可承受 |
| **人話理由** | Every recommendation deserves an explanation |
| **善意停止** | 允許「今天先到這裡」；未完成進 Memory，不懲罰 |

### 7.3 Journey 不是

- 不是聊天室主幹（「問 AI 教練」是旁路，結束後回到下一步）  
- 不是固定課表複製品  
- 不是越多步驟越好  

### 7.4 執行中

執行產生新的 Learning Signals。  
引導思考優於給答案；不代寫、不鼓勵作弊（PRD-000 Ethics）。

---

# §8 Reflection  
## 今天學到了什麼？

### 8.1 目的

Reflection 不是反省書。  
是短、暖、可記住的回顧：

> **今天學到了什麼？**  
> （內容、方法、感覺、何處卡住、何處善意停止）

### 8.2 Reflection 做什麼

- 把今日經驗變成可記住的語言  
- 餵養 Memory（Daily／Growth 等）  
- 為 Growth（§9）與 Tomorrow（§10）提供原料  
- 讓孩子看見：自己比昨天——哪怕只是一小步

### 8.3 原則

- 短於考核、暖於評分  
- 錯誤是資料，不是品德問題  
- 完成、部分完成、休息日——皆可有 Reflection（「今天我們好好停下來」也是學習）

---

# §9 Growth  
## 哪些 Signal 改變了？

### 9.1 問題

今日陪伴之後，問：

> **哪些 Learning Signals 改變了？**  
> **對 Student Model／Blueprint 意味著什麼？**

### 9.2 Growth 在這裡的意思

不是分數上升。  
是觀察的移動，例如：

- 理解／錯誤型態  
- 信心／疲勞／專注  
- 主動性／自主跡象  
- 習慣穩定性  
- 對答案依賴是否下降  

Signals 更新理解；理解寫回 **Student Model** 與 **Memory**。  
**Blueprint 方向不丟**；今日節奏已服務長期一致性。

### 9.3 原則

- Growth 只與過去的自己比  
- 每一次互動，應讓 AI **比昨天更理解孩子**  
- 若不更新 Model／Signals／Memory——這次 Journey 未完成核心職責

---

# §10 Tomorrow  
## 明天應該如何開始？

### 10.1 問題

一天結束時，Engine 必須能回答：

> **明天應該如何開始？**

不是空白重來。  
而是：**接續今天的理解、善意停止點、與未完成的溫柔延續。**

### 10.2 Tomorrow 建立在

| 來源 | 交給明天 |
|------|----------|
| Reflection | 今天學到的方法與感覺 |
| Growth／Signals | 更新後的狀態 |
| Memory | Daily／未完成的善意 |
| Blueprint | 長期方向仍在 |
| Boundaries 經驗 | 若今天放慢，明天如何溫柔接回 |

### 10.3 原則

- AI **不會每天重新認識孩子**  
- AI **每一天都比昨天更理解孩子**  
- Tomorrow 的第一件事，仍是 **Care → Understand**——不是直接塞昨天沒做完的量  
- 成功的 Engine：習慣可持續、依賴下降、家長安心、孩子漸漸較不需要被推著走

---

## 憲法級約束（摘要）

1. Coach-first；聊天不定義產品。  
2. 引導思考；不代寫、不作弊、不製造依賴。  
3. 理解 > 長期成長 > 效率。  
4. Right Thing / Quality before Quantity。  
5. Growth is sustainable；Consistency > Intensity。  
6. Journey 可調；Blueprint 方向不變。  
7. 知進亦知緩。  
8. North Star：最好的 AI，是讓孩子越來越不需要 AI。

## 明確非目標（本 PRD）

Journey UI · Home IA · 動效 · Prompt／API／資料庫 · 題庫供應鏈細節。

---

## 產品信念（收斂）

> 為什麼每天需要 Journey：因為每天的孩子不同，陪伴必須重新決定。  
> 先陪心，再陪學。  
> 先理解，再決策。  
> 知進，亦知緩。  
> 今天最值得，不是今天最多。  
> 回顧與成長，是為了明天接得上。  
> 理解，才是核心。

---

*PRD-001 · Today's Journey Engine · v1.0*  
*Engine Spine: Why → Care → Understand → Decide → Boundaries → Prioritize → Journey → Reflect → Grow → Tomorrow*  
*Downstream of PRD-000 · Philosophy & decision architecture only · No UI · No code.*
