# PRD-008：Decision Engine（決策引擎）

> **地位：** StudySignal 對「每日決策」的產品哲學——回答的不是「AI 如何運算決策」，而是：**一位真正理解孩子的教育者，每天會如何做決策。**  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **哲學一致（只讀）：** PRD-001～PRD-007（Journey · Understanding · Signals · Student Model · Parent Trust · Blueprint · Memory）  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 產品哲學（Product Philosophy）— **非演算法、非模型、非 Prompt、非 UI、非資料庫、非程式**

---

## 本文件先回答

一位真正理解孩子的教育者，每天不會先問：

> 「系統推薦什麼？」

而會先問：

> **「這位孩子，今天真正需要什麼？  
> 今天最值得的一步是什麼？  
> 今天是否適合硬推進？」**

Decision Engine 的哲學，就是把這份教育者的判斷，寫成 StudySignal 不可妥協的決策信念。

---

## 本 PRD 做什麼／不做什麼

| 做 | 不做 |
|----|------|
| 定義每日決策為何存在、何時發生、如何負責 | 不討論 LLM、演算法、Prompt、模型 |
| 定義對學生與家長的決策紀律 | 不設計 UI、資料庫、技術流程 |
| 對齊 Understanding → Decision → Journey 的教育順序 | 不把決策寫成規則引擎規格 |

---

# §1 Why Decision Exists  
## 為什麼每天都需要做決策

因為每位孩子、每一天都不同。  
因為沒有決策，學習會退化成固定課表或隨機忙碌。  
因為「陪伴」本身就是一連串溫柔而清楚的選擇。

每天都需要決定，例如：

- 今天最值得做什麼？  
- 今天是否適合學習／推進？  
- 前進、放慢，還是休息？  
- 這一步如何服務長期方向（Blueprint）？  

**沒有決策，就沒有真正的 Journey。**  
**沒有理解的決策，就只是壓力。**

對齊 PRD-001：Journey 是決策落地，不是排課。

---

# §2 Decision Starts After Understanding  
## 所有決策都建立在理解之後

> **Decision starts after Understanding — not after data alone.**

所有決策都建立在**理解之後**，而不是「資料之後」。

資料可以幫忙觀察（Signals）。  
記憶可以幫忙延續（Memory）。  
模型可以幫忙認識這個人（Student Model）。  

但教育者做決定之前，必須先形成：

> **這位孩子，現在真正需要什麼？**（PRD-002）

| 正確順序 | 錯誤順序 |
|----------|----------|
| Care → Understand → Decide | 先排任務，再找理由 |
| 理解狀態與需要，再取捨 | 有數據就自動加碼 |
| 人話理解在先 | 黑箱推薦在先 |

**禁止跳過 Understanding 直接決策。**  
對齊 AGENT.md · PRD-001 Decision Philosophy。

---

# §3 Right Thing Before More Things  
## 不是今天做最多，而是今天做最重要

真正的教育者不會以「量」定義好的一天。

> **Right Thing before More Things.**  
> 不是今天做最多。  
> 而是今天做最重要。

| 追求 Right Thing | 追求 More Things（拒絕作為預設） |
|------------------|----------------------------------|
| 一個清楚、可完成、可解釋的主優先 | 步驟堆疊、科目塞滿 |
| 品質與理解 | 完課劇場 |
| 明天還願意回來 | 今天透支 |

對齊：Quality before Quantity · Momentum over intensity。

---

# §4 Decide Whether Today Is A Learning Day  
## 先決定：今天是否適合大量學習

不是每天都適合大量學習。

疲勞、壓力、生病、家庭事件、情緒低落、行程過滿——  
都應進入決策，而不該被課表蓋過。

一位好的教育者會問：

> **今天，是推進日、放慢日，還是休息日？**

| 可能的決策 | 含義 |
|------------|------|
| **推進** | 狀態與準備度允許，走最值得的一步 |
| **放慢** | 可學，但降難、縮短、改複習或陪伴 |
| **休息** | 不適合硬推進；休息仍是負責任的決定 |

對齊 PRD-001 Decision Boundaries：知進亦知緩。  
勉強學習，不是負責——是透支。

---

# §5 Balance Today And Tomorrow  
## 今天不能透支明天

教育追求**長期節奏**，不追求短期爆發。

> 今天最好的決定，必須讓明天仍有力氣與意願。

| 平衡今天與明天 | 透支明天（拒絕） |
|----------------|------------------|
| Long-term Consistency | Short-term Intensity |
| Journey 可調，Blueprint 方向仍在 | 為單日完課犧牲信心與睡眠 |
| 可持續的小勝 | 爆發後逃避 |

對齊 PRD-005／006：Long-term before Short-term · Growth is sustainable。  
今天服務未來——不是抵押未來。

---

# §6 Decision Is Explainable  
## 每一個決定都必須可說明

每一位真正負責的教育者，都能說出「為什麼」。

> **Every decision deserves an explanation.**  
> （對齊：Every recommendation deserves an explanation.）

必須能向**學生**與**家長**說明，例如：

- 為什麼今天是這樣安排？  
- 為什麼不是做更多？  
- 為什麼現在放慢或休息？  
- 為什麼這一步仍通往 Blueprint？  

> 讓人理解，不是要求人盲信。

對齊 PRD-005：Explainability creates confidence · Parents buy peace of mind。  
說不清楚的決定——不配成為預設陪伴。

---

# §7 Decision Never Labels  
## 決策描述今天，不是定義孩子

決策說的是：

> **今天，我們這樣陪。**

不是：

> **你就是這樣的人。**

| 允許的決策語言 | 禁止的標籤語言 |
|----------------|----------------|
| 今天信心不足，先小勝 | 你就是沒自信 |
| 今天負荷高，縮短 | 你就是不用功 |
| 今天概念還卡住 | 你就是沒天份／不適合 |

對齊 PRD-003／004：Change, not identity · Becoming, not being。  
一個決定可以改變今天的路徑——  
**不能**借決定之名，寫下孩子的命運。

---

# §8 Decision Creates Trust  
## 好的決策建立信心與信任

好的決策，會慢慢建立：

- **孩子的信心**——被理解、被保護、敢再試  
- **家長的信任**——懂為什麼、感到安心、仍是父母夥伴  

| 建立信任的決策 | 侵蝕信任的決策 |
|----------------|----------------|
| 先理解再安排 | 先催促再解釋 |
| 知進亦知緩且可說明 | 黑箱加碼或羞辱式放慢 |
| 對成長負責，不炫技 | 為證明「AI 很聰明」而傷害思考 |

對齊 PRD-005：Trust is earned every day · Responsibility before Intelligence。  
每一次決策，都是一次信任的存款——或提款。

---

# §9 Success Definition  
## 成功定義

真正成功的決策：

- **孩子願意繼續學**（明天還想來）  
- **孩子開始相信自己**（信心被保護或長出一點）  
- **家長知道 AI 為什麼這樣安排**（理解，不是盲信）  

不是：

- 今天做最多  
- 決策「看起來很聰明」  
- 短期分數跳動  

對齊整體成功觀：安心、自主、信心、可持續——不是 DAU、時數、聊天次數。

---

# §10 Final Belief  
## 最終信念

> **今天最好的決定，  
> 不一定是學最多。  
> 而是做最適合這位孩子的那一步。**

先理解，再決策。  
先對成長負責，再談效率。  
描述今天，不定義孩子。  
讓孩子願意回來，讓家長能夠放心。

一位真正理解孩子的教育者，  
每天只做一件事做得對：  
**選對那一步——然後好好陪著走。**

這就是 Decision Engine 的靈魂。

---

## 與相鄰哲學的關係

```text
Understanding（PRD-002）→ 現在真正需要什麼
Signals / Model / Memory / Blueprint → 理解的原料與方向
        ↓
Decision（本 PRD）→ 教育者式的每日抉擇
        ↓
Journey（PRD-001）→ 把決定變成今天的陪伴
Parent Trust（PRD-005）→ 決定可被理解，信任得以累積
```

決策在理解之後。  
Journey 在決策之後。  
信任在可解釋的決策之中。

---

## 邊界聲明

本文件只討論教育哲學。  
不討論 UI、Database、Prompt、AI Model、LLM、演算法、技術實作。

若任何設計跳過理解、以量代質、透支明天、或用決策貼標籤——  
**違憲，必須重來。**

---

*PRD-008 · Decision Engine · v1.0*  
*After understanding · Right thing before more things · Philosophy only · Downstream of PRD-000 · No UI · No code.*
