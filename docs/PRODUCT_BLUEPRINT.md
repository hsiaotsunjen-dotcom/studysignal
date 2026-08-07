# StudySignal Product Blueprint  
# 產品藍圖（Philosophy → Practical AI Product）

> **地位：** 將教育哲學轉成可建設的 AI Learning Companion 藍圖。  
> **服從：** [`prd/PRD-000-StudySignal-Constitution.md`](./prd/PRD-000-StudySignal-Constitution.md) · [`prd/PRD-100-Education-Architecture.md`](./prd/PRD-100-Education-Architecture.md) · [`AGENT.md`](./AGENT.md) · [`DEVELOPMENT_PRINCIPLES.md`](./DEVELOPMENT_PRINCIPLES.md)  
> **性質：** 產品藍圖 — 非程式、非 API 規格、非畫面稿  
> **版本：** 1.0  
> **日期：** 2026-08-07  
> **思考順序：** Educational philosophy → Learning science → AI behavior → UX → System architecture → Implementation

---

# 1. Goal

## 1.1 Mission

> Every student deserves an AI Learning Companion that understands them, guides them, and grows with them.

## 1.2 What we are building

| StudySignal IS | StudySignal is NOT |
|----------------|-------------------|
| **AI Learning Companion** | ChatGPT for education |
| 理解 → 引導思考 → 陪伴成長 | Homework solver |
| 讓學生成為自主學習者 | Question bank / 刷題機 |
| Learning OS + Student Model 為中心 | Online cram school |

## 1.3 North Star outcome

不是「AI 更會回答」。  
而是：

- 學生更會**想**、更有**信心**、更**自主**  
- 家長更**安心**、更理解成長方向  
- AI **逐漸比較不被需要**（independence）

## 1.4 Design challenge (assumption check)

常見錯誤假設：「中心是內容／題庫／聊天。」  
**更好的假設：** 中心是 **Student Model**——一切繞著「持續理解這位學生」轉。  
內容、對話、練習都是**手段**；理解與成為自主學習者才是**目的**。

---

# 2. Educational Philosophy

## 2.1 Two intertwined flows

StudySignal 同時運行兩條不可混淆的流：

### A. Companion Flow（陪伴／決策流）— 對齊 PRD-001／008

```text
Care → Understand → Prioritize → Plan → Journey → Reflection → Growth
```

回答：**今天怎麼陪這位孩子？今天最值得做什麼？是否適合學習？**

### B. Learning Flow（認知學習流）— 本藍圖強化

```text
Understand → Think → Explain → Apply → Create
```

回答：**面對一個概念／問題時，如何引導思考，而不是跳答案？**

| 若跳過 | 傷害 |
|--------|------|
| 跳過 Understand（學生狀態） | 壓力排程、錯的難度 |
| 跳過 Think / Explain（認知） | 依賴答案、假學會 |
| 跳過 Apply / Create | 只有辨識、沒有遷移與產出 |

**AI 永不取代學習；AI 引導學生走過學習流。**

## 2.2 AI Tutor principles (binding)

1. Understand the student before teaching.  
2. Guide before answering.  
3. Encourage before correcting.  
4. Teach thinking instead of memorization.  
5. Every interaction updates the Student Model.  
6. Learning is continuous, not session-based.  
7. The AI should gradually make itself less necessary.

## 2.3 Why this has educational value

- **認知科學：** 提取練習、解釋效應、可遷移理解 > 被餵答案  
- **動機科學：** 信心與勝任感先於績效壓力  
- **發展觀：** Becoming, not being（PRD-004／010）  
- **家庭系統：** Parents buy peace of mind（PRD-005）

---

# 3. Product Design

## 3.1 Product center: Student Model

```text
                    ┌─────────────────────┐
                    │   Student Model     │
                    │  (evolving center)  │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
    Learning Signals    Understanding Engine   Memory
           │                   │                   │
           └─────────► Decision / Journey ◄────────┘
                           │
              Blueprint ←──┴──→ Growth / Parent Trust
```

一切產品表面（今日旅程、引導對話、家長洞察）都是 Student Model 的**視窗**，不是相反。

## 3.2 Student Model contents (conceptual)

持續演化，包含（意義層，非表結構定案）：

| 面向 | 教育用途 |
|------|----------|
| Strengths / Challenges | 鷹架與信心設計 |
| Misconceptions | 針對迷思引導，而非盲目加量 |
| Confidence / Motivation / Attention | Care、邊界、步長 |
| Learning speed | 節奏，非「慢＝笨」 |
| Preferred learning style | 媒介與引導偏好（可演化） |
| Long-term growth | 對齊 Blueprint |
| **Learning DNA** | 跨時間的學習者指紋：有效方法、節奏、恢復模式、自主上升跡象——**描述模式，不定義命運** |

Learning DNA = 可更新的「如何跟這個人學比較有效」的理解叢集；  
遵守 PRD-003／004：**追蹤變化，不貼永久身份標籤。**

## 3.3 Core product surfaces (what users experience)

| Surface | 一句話 | 哲學來源 |
|---------|--------|----------|
| **Today's Journey** | 今天最適合的陪伴路徑（每天重生） | PRD-001／008 |
| **Guided Learning Moments** | 在 Journey 內走 Learning Flow | 本藍圖 §2 |
| **Ask the Coach** | 旁路求助；結束仍回到下一步 | Coach-first |
| **Reflection** | 短暖回顧 | PRD-001／010 |
| **Growth / Blueprint view** | 方向與成為（非分數英雄） | PRD-006／010 |
| **Parent Insight** | 安心、可解釋、看見成長 | PRD-005／009 |

## 3.4 What we deliberately do not center

- 無限聊天首屏  
- 題海與排行榜  
- 「直接給可繳交答案」作為預設  
- 家長監視儀表板  

---

# 4. AI Behavior

## 4.1 Default behavior loop (each day / each moment)

```text
Observe Signals
  → Update understanding of student (Student Model / Memory)
  → Decide: advance / ease / rest + right thing today
  → Deliver Journey step
  → Inside step: Understand→Think→Explain→Apply→Create (as appropriate)
  → Reflect → Growth signals → New Signals
```

## 4.2 When student asks for the answer

| Wrong | StudySignal |
|-------|-------------|
| 直接給完整答案 | Guide：拆解、提問、鼓勵先想 |
| 為趕進度代寫 | 保護能力建立；說明為何不直接給 |

對齊 AI Ethics：不代寫、不製造依賴。

## 4.3 When student is tired / anxious / failing streak

| Wrong | StudySignal |
|-------|-------------|
| 加量 | 降難、縮短、複習、陪伴、或建議休息 |
| 貼標籤 | 「今天……」狀態語言 |

## 4.4 Independence gradient

AI 行為應隨自主上升而**交還控制權**：

1. 高鷹架引導  
2. 半結構：學生選下一步（有限選項）  
3. 學生起草計畫，AI 審核與解釋  
4. AI 退居顧問——成功時更少出現  

**Educational value：** 自主是結果，不是假設。  
**User value：** 孩子感到被陪伴，而非被控制；最終感到「我自己會」。

## 4.5 Explainability (always on)

每個建議能回答：為什麼今天、為什麼這一步、為什麼不是更多、為什麼休息。  
對學生短暖；對家長安心透明；對老師可尊重（PRD-009）。

---

# 5. UX Flow

## 5.1 Student daily spine (conceptual, not wireframes)

```text
Open
  → Feel: "Today is prepared" (Care + clarity)
  → See: Today's Goal + why (one sentence)
  → Start Journey step
  → Guided moment (Learning Flow)
  → Optional: Ask Coach (side door)
  → Reflect (short)
  → Sense of progress vs past self (not leaderboard)
  → Tomorrow continuity hint
```

**UX principles**

- One primary action  
- Always know next step  
- Progress in journey language, not KPI theater  
- Graceful stop allowed  

## 5.2 Parent spine (conceptual)

```text
Open Parent Insight
  → What happened today (human language)
  → What Signals meant (state, not shame)
  → Why this Decision / Journey
  → Growth direction (Blueprint)
  → How I can gently support tomorrow
```

**Never：** 排名、羞辱、即時監視每一秒。

## 5.3 First-use (minimal)

最少身份 → 立刻第一段成功旅程 → 詳問延後（PRD-000）。  
避免問卷牆殺死開始意願。

---

# 6. Data Structure

> 此處為**概念資料結構**（scalability 用），非資料庫 schema、非 ORM。  
> 實作可演化；含義必須穩定。

## 6.1 Core entities (conceptual)

```text
Student
  └── StudentModel          // evolving understanding (center)
        ├── LearningDNA     // durable-but-revisable patterns
        ├── AbilitySnapshot // strengths, challenges, misconceptions
        ├── AffectiveState  // confidence, motivation, attention (time-scoped)
        ├── Preferences
        └── GrowthNarrative // becoming over time

LearningSignal[]            // temporary, observable, explainable observations
MemoryItem[]                // selective: growth > noise; forget is intelligence
Blueprint                   // living direction (not syllabus dump)
DecisionRecord              // what was decided + why (explainability)
Journey (daily)             // steps, duration intent, goal, reasons
Reflection
ParentInsight (derived)     // translation for peace of mind
```

## 6.2 Invariants (must never break)

| Invariant | Meaning |
|-----------|---------|
| Signals ≠ identity | Today appears to… not The learner is… |
| Model must grow daily | Not a static profile |
| Memory is selective | Not full chat archive as product memory |
| Every Journey has Why | Explainability |
| Interaction updates Model | Continuous learning, not isolated sessions |

## 6.3 Future scalability

- 多學科：同一 Student Model，多條能力／迷思維度  
- 多孩子家庭：Model per student；Trust per parent  
- 學校／老師：只讀成長訊號與可解釋理由，不接管家長角色  
- 模型供應商可換：行為契約（哲學）不變，實作可換（DEVELOPMENT_PRINCIPLES）

---

# 7. Future Evolution

## Phase narrative (product, not sprint tickets)

| Horizon | Focus | Success signal |
|---------|--------|----------------|
| **Foundation** | Student Model + Signals + Understanding + daily Journey + Explainability | 學生能開始；家長懂為什麼 |
| **Depth** | Misconception-aware guidance；Learning Flow 完整；Memory 選擇性成熟 | 依賴答案下降；信心上升 |
| **Independence** | 交還規劃權；Blueprint 共創 | AI 介入變少仍進步 |
| **Ecosystem** | 老師可尊重的洞察；家庭節奏更穩 | Trust 續存；非監視擴張 |

## Evolution rules

1. 新功能必須更新或服務 Student Model——否則非核心（PRD-000 §18）。  
2. 不得為留存引入排名／成癮／代寫。  
3. 哲學穩定；實作可替換。  
4. Challenge every feature: *Does this make the AI less necessary over time?*

---

# Blueprint Summary (one page)

| Layer | Answers |
|-------|---------|
| Philosophy | Companion, not solver; Becoming; Care → Learn → Grow |
| Learning science | Learning Flow + Companion Flow; guide thinking |
| AI behavior | Understand → decide → guide → update model → explain |
| UX | Prepared today; one next step; parent peace of mind |
| System center | Student Model + Signals + Memory + Blueprint |
| Outcome | Independent learners; trusted families |

---

## Final Belief

StudySignal 不是另一個教育聊天機器人。  
它是以 **Student Model** 為心臟的 AI Learning Companion：

理解孩子，引導思考，陪伴成長——  
直到孩子比較不需要被帶著走。

> The AI should never replace learning.  
> The AI should make students become independent learners.

---

*StudySignal Product Blueprint · v1.0*  
*Philosophy → Learning science → AI behavior → UX → Architecture → Implementation*  
*Downstream of PRD-000 / PRD-100 · No code in this document.*
