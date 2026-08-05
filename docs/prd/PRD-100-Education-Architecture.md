# PRD-100：StudySignal Education Architecture  
# 教育架構總覽

> **地位：** StudySignal 教育系統的**總覽文件（Architecture Overview）**。  
> **目的：** 不新增教育理念——**整理**既有哲學如何組成一套完整系統。  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **覆蓋（只讀整理）：** PRD-001～PRD-010（Journey · Understanding · Signals · Student Model · Parent Trust · Blueprint · Memory · Decision · Explainability · Growth）  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 教育架構總覽 — **非 UI、非 Database、非 Prompt、非 LLM、非 Model、非演算法、非技術實作**

---

# StudySignal Education Architecture

## Why This Architecture Exists

StudySignal **不是**功能集合。  
不是聊天外掛、解題工具、或一堆互不相關的模組拼盤。

StudySignal **是**一套完整的**教育系統**：

- 先有信念（我們相信什麼）  
- 再有理解（如何真正看見一位孩子）  
- 再有旅程與決策（今天如何陪、往哪走）  
- 全程貫穿信任（家長為何敢託付）  
- 時間裡回答成長（成為更好的學習者）

**所有功能都必須建立在教育哲學之上。**  
沒有哲學的功能，只是噪音。  
違反架構順序的設計——退回。

> Technology changes.  
> Education does not.  
> Understanding is always the first step.

---

## Layer 1 — Constitution  
### 我們相信什麼？

| 文件 | 角色 |
|------|------|
| **[PRD-000](./PRD-000-StudySignal-Constitution.md)** | 產品憲法：使命、人格、倫理、Learning OS、Signals／Model／Engine 的最高準則 |
| **[`AGENT.md`](../AGENT.md)** | 所有 AI Agent 的最高指導原則 |
| **[`AI_EXAMPLES.md`](../AI_EXAMPLES.md)** · **[`AI_REVIEW.md`](../AI_REVIEW.md)** | 案例與自我審查（實作前的紀律） |

**本層回答：** 我們相信什麼？什麼永不妥協？

沒有 Constitution，其餘層級沒有資格存在。

---

## Layer 2 — Understanding  
### 如何真正理解一位學生？

| 文件 | 角色 |
|------|------|
| **[PRD-002](./PRD-002-Understanding-Engine.md)** | Understanding Engine：這位孩子現在真正需要什麼？ |
| **[PRD-003](./PRD-003-Learning-Signals.md)** | Learning Signals：為何觀察；狀態不是價值；變化不是身份 |
| **[PRD-004](./PRD-004-Student-Model.md)** | Student Model：持續理解同一人，卻不固化成一種人 |
| **[PRD-007](./PRD-007-Memory-Engine.md)** | Memory：記住什麼、忘記什麼；記憶是教育的一部分 |

**本層回答：** 如何真正理解一位學生——先於安排、先於炫技。

> Your first job is not to teach.  
> Your first job is to understand.

---

## Layer 3 — Journey  
### 理解之後，如何安排每天、建立信任、陪伴成長？

| 文件 | 角色 |
|------|------|
| **[PRD-001](./PRD-001-Todays-Journey-Engine.md)** | Today's Journey：今天如何陪；每天重新生成的陪伴決策 |
| **[PRD-006](./PRD-006-Learning-Blueprint.md)** | Learning Blueprint：未來方向；Living Blueprint；成為而非課表 |
| **[PRD-008](./PRD-008-Decision-Engine.md)** | Decision：教育者式每日決策；Right Thing；知進亦知緩 |
| **[PRD-009](./PRD-009-Explainability-Engine.md)** | Explainability：讓學生／家長／老師理解；解釋先於權威 |
| **[PRD-010](./PRD-010-Growth-Engine.md)** | Growth：真正的成長＝成為更好的學習者 |

**本層回答：** 理解之後——今天走哪、往哪去、如何決定、如何說明、時間裡如何長成。

> Journey answers today.  
> Blueprint answers becoming.  
> Decision chooses the right step.  
> Explanation makes it human.  
> Growth is the long answer.

---

## Parent Trust  
### 貫穿所有層級——不是單一模組

| 文件 | 角色 |
|------|------|
| **[PRD-005](./PRD-005-Parent-Trust-Engine.md)** | Parent Trust：為什麼家長願意把孩子交出來 |

**Parent Trust 並非單一模組。**  
它貫穿 Constitution、Understanding、Journey 每一層：

- 理解是否可說明  
- 決策是否可解釋  
- 成長是否可被看見（而非監視）  
- 記憶是否保護孩子  
- AI 是否對成長負責，而非炫技  

> Parents buy peace of mind.  
> Trust is earned every day.  
> Responsibility before Intelligence.

---

## Information Flow  
### 教育資訊如何流動（概念循環）

```text
Signals
    ↓
Understanding
    ↓
Student Model
    ↓
Memory
    ↓
Decision
    ↓
Journey
    ↓
Reflection
    ↓
Growth
    ↓
New Signals
    └──────────►（持續循環）
```

| 節點 | 含義（一句話） |
|------|----------------|
| **Signals** | 今天的狀態觀察（非分數、非身份） |
| **Understanding** | 現在真正需要什麼 |
| **Student Model** | 持續演化的理解（Becoming） |
| **Memory** | 選擇性記住成長；智慧地遺忘噪音 |
| **Decision** | 今天最值得的一步；是否適合學 |
| **Journey** | 陪伴落地 |
| **Reflection** | 今天學到什麼感覺與方法 |
| **Growth** | 時間裡更好的學習者 |
| **New Signals** | 再次觀察，循環不止 |

Blueprint 為方向提供北；Parent Trust 與 Explainability 讓整條流對家庭可感、可懂。  
**禁止**跳過 Understanding 直接進入 Journey。

---

## Reading Order For Humans  
### 給人的建議閱讀順序

1. **PRD-100**（本文件）— 先看見整座建築  
2. **PRD-000** — 憲法與信念  
3. **AGENT.md**（若你會與 AI 協作）  
4. **Layer 2：** PRD-002 → 003 → 004 → 007  
5. **Layer 3：** PRD-008 → 001 → 006 → 009 → 010  
6. **貫穿：** PRD-005 Parent Trust  
7. 需要時：AI_EXAMPLES · AI_REVIEW  

先架構，再細節。先信念，再旅程。

---

## Reading Order For AI Agents  
### AI Agent 第一次接手專案時

包含 Cursor、Codex，或未來任何 Agent——**應依序閱讀：**

```text
PRD-100
    ↓
PRD-000
    ↓
PRD-002
    ↓
PRD-003
    ↓
PRD-004
    ↓
PRD-007
    ↓
PRD-008
    ↓
PRD-001
    ↓
PRD-006
    ↓
PRD-009
    ↓
PRD-010
    ↓
PRD-005
```

並應同時遵守：[`AGENT.md`](../AGENT.md) · [`AI_EXAMPLES.md`](../AI_EXAMPLES.md) · [`AI_REVIEW.md`](../AI_REVIEW.md)

**閱讀完成後，才能開始任何設計。**  
未完成閱讀就畫畫面、寫功能、跳過理解——退回。

---

## Core Principles  
### 各層共同原則（整理，非新增）

來自 PRD-000～PRD-010 的共同呼吸：

1. **Understand before teaching.**  
2. **Care before recommendation.**  
3. **Signals describe change** — not value, not identity.  
4. **Students are always becoming.**  
5. **Memory serves growth** — remember growth, forget noise.  
6. **Right thing before more things.**  
7. **Every recommendation deserves an explanation.**  
8. **Parents buy peace of mind.**  
9. **Growth is becoming a better learner.**  
10. **Technology changes. Education does not.**  
11. **Understanding is always the first step.**  

以及：

- Trust before Intelligence · Responsibility before Intelligence  
- Consistency before Intensity · Confidence before Performance  
- Explainability before Authority  
- Journey can change; Blueprint’s north endures (and may live/evolve)  
- Decision never labels · Know when to slow down  

---

## Final Belief

> **StudySignal 並不是一套 AI 教學工具。  
> 而是一套以理解、信任、陪伴與成長為核心的教育系統。**

> **真正的教育，  
> 不是替孩子學習。  
> 而是陪孩子成為一位終身學習者。**

功能會迭代。  
畫面會改版。  
模型會換代。

**理解、信任、陪伴、成長——不會過時。**

這就是 StudySignal Education Architecture 要守護的形狀。

---

## 邊界聲明

本文件只整理教育架構。  
不討論 UI、Database、Prompt、LLM、Model、演算法、任何技術實作。  
不新增與既有 PRD 衝突的理念；衝突時以 **PRD-000** 為準。

---

*PRD-100 · StudySignal Education Architecture · v1.0*  
*Not a feature pile — an education system · Read before design · Downstream of PRD-000 · No UI · No code.*
