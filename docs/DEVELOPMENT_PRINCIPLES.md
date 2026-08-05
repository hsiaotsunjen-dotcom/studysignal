# StudySignal Development Principles  
# 開發原則

> **地位：** 整個 StudySignal 專案的開發原則。  
> **對象：** 所有 AI Agent、工程師、設計師、新加入成員。  
> **性質：** 這不是 PRD。這是建設時的紀律。  
> **服從：** [`prd/PRD-000-StudySignal-Constitution.md`](./prd/PRD-000-StudySignal-Constitution.md) · [`prd/PRD-100-Education-Architecture.md`](./prd/PRD-100-Education-Architecture.md) · [`AGENT.md`](./AGENT.md)  
> **版本：** 1.0  
> **日期：** 2026-08-05

任何功能、任何 PR、任何架構變更、任何 Agent 產出——  
若違反本文件，應停止、重新對齊，再繼續。

---

# StudySignal Development Principles

## 1. Education Before Technology  
### 教育哲學優先於技術

先問教育問題，再選技術手段。

- 這是否幫助理解孩子？  
- 這是否保護信心與信任？  
- 這是否服務長期成長？  

技術是工具。  
教育是方向。  
**不得**用新框架、新模型、新炫技，倒過來改寫產品是什麼。

> Technology serves education.  
> Education does not serve technology demos.

---

## 2. Constitution Before Features  
### 任何功能都必須符合 PRD-000

功能提案之前，先對齊憲法與教育架構：

- [`PRD-000`](./prd/PRD-000-StudySignal-Constitution.md) — 我們相信什麼  
- [`PRD-100`](./prd/PRD-100-Education-Architecture.md) — 系統如何分層  

衝突時：**憲法勝。**  
再吸引人的功能，若違反理解先於教學、信任先於效率、成長先於完課——不得上線。

> Features are downstream of Constitution.  
> Never the other way around.

---

## 3. Understand Before Building  
### 先理解需求，再開始設計

動工之前，先弄清：

- 為誰解決什麼痛苦？  
- 對應哪一層教育架構（Understanding / Journey / Trust / Growth）？  
- 成功長什麼樣子（教育成功，非虛榮指標）？  

未理解就畫畫面、寫程式、加 API——退回。  
對齊：Understand before teaching · Meta Principle（先運作／思考，再說話／畫面）。

---

## 4. One Responsibility Per PRD  
### 每份 PRD 只回答一個核心問題

保持文件邊界清晰：

| 例 | 核心問題 |
|----|----------|
| PRD-002 | 如何理解學生？ |
| PRD-003 | 為何／如何看待 Signals？ |
| PRD-001 | 今天如何陪？ |
| PRD-005 | 家長為何信任？ |

不要把 Journey、資料庫、UI、模型訓練塞進同一份「大雜燴 PRD」。  
一個核心問題，一份責任。擴充時開新文件或明確分章——不模糊職責。

---

## 5. Philosophy Before Implementation  
### 沒有哲學，不寫程式

實作之前，應對齊相關哲學 PRD（見 PRD-100 閱讀順序）。

- 沒有 Understanding 哲學，不實作「自動安排」  
- 沒有 Trust 哲學，不實作家長可見性  
- 沒有 Signals 哲學，不實作分數式標籤  

**沒有哲學，不寫程式。**  
Demo 可簡化帳號流程；Demo **不可**永久把產品做成答案機或監視器。

---

## 6. Explain Every Decision  
### 任何重大設計決策都應有理由

重大決策（產品方向、架構取捨、預設行為）必須能說明：

- 為什麼這樣做？  
- 對學生／家長／長期成長有何幫助？  
- 犧牲了什麼？為何可接受？  

對齊：Every recommendation deserves an explanation · Explainability before Authority。  
說不清楚的設計——不配成為預設。

---

## 7. Protect Long-term Consistency  
### 不得為了短期方便破壞長期架構

禁止：

- 為趕工跳過 Understanding 層  
- 為留存做焦慮打卡、排名羞辱  
- 為方便把 Signals 做成永久身份標籤  
- 為短期指標撕裂 Constitution / PRD-100 分層  

允許：

- 小步交付，但每步仍服從哲學  
- 暫時簡化實作，但標明邊界、不污染產品身份  

> Consistency before Intensity — also in engineering.  
> 長期架構的一致性，高於短期方便。

---

## 8. AI Is A Builder, Not A Product Owner  
### AI 協助建設，不自行改變產品方向

AI Agent（Cursor、Codex，或未來任何 Agent）：

- **可以**協助設計、實作、重構、文件、審查  
- **不可以**擅自改寫使命、定位、成功定義、教育哲學  
- **不可以**在未對齊 PRD-000／PRD-100／AGENT.md 時「優化」成另一種產品  

方向由產品憲法與人類判斷守護。  
AI 是 Builder——不是 Product Owner。

閱讀完成 PRD-100 指定順序後，才能開始設計。  
交付前走 [`AI_REVIEW.md`](./AI_REVIEW.md)。

---

## 9. Trust Is The Highest Requirement  
### 任何設計都不得傷害學生、家長與老師的信任

信任是最高需求，不是次要驗收項。

設計不得：

- 羞辱學生、比較同學、製造依賴  
- 用黑箱要求家長盲信  
- 把家長變成監工  
- 用裝懂、幻想、過度自信換權威  
- 為 DAU／時數／聊天次數犧牲安心與自主  

> Parents buy peace of mind.  
> Trust is earned every day.  
> Trust is the highest requirement.

傷害信任的「成長功能」——不是成長，是債務。

---

## 10. Final Belief

> **Technology will change.  
> Models will change.  
> Agents will change.**

> **StudySignal's educational philosophy must remain consistent.**

真正需要被保護的，  
不是程式，  
而是教育。

程式可以重寫。  
框架可以汰換。  
模型可以升級。

**理解、信任、陪伴、成長——必須留下。**

我們建設的不是另一個 AI 工具。  
我們建設的是一套配被託付的教育系統。

---

## How To Use This Document

1. **開工前：** 確認對齊 §1–§5（教育、憲法、理解、PRD 邊界、哲學）。  
2. **設計中：** 遵守 §6–§7（可解釋、長期一致）。  
3. **Agent 協作：** 遵守 §8；讀完再動手。  
4. **交付前：** 用 §9 與 AI_REVIEW 檢驗信任。  
5. **猶豫時：** 回到 §10——保護教育，不是保護程式快感。

---

## Related Documents

| 文件 | 用途 |
|------|------|
| [`prd/PRD-000-StudySignal-Constitution.md`](./prd/PRD-000-StudySignal-Constitution.md) | 產品憲法 |
| [`prd/PRD-100-Education-Architecture.md`](./prd/PRD-100-Education-Architecture.md) | 教育架構與閱讀順序 |
| [`AGENT.md`](./AGENT.md) | AI Agent 憲法 |
| [`AI_EXAMPLES.md`](./AI_EXAMPLES.md) | 案例手冊 |
| [`AI_REVIEW.md`](./AI_REVIEW.md) | 交付前自我審查 |
| [`PROJECT_RULES.md`](./PROJECT_RULES.md) | 專案協作規則（若適用） |

---

*StudySignal Development Principles · v1.0*  
*Education before technology · Constitution before features · Protect education, not just code.*
