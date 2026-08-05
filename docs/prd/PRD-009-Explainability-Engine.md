# PRD-009：Explainability Engine（可解釋性引擎）

> **地位：** StudySignal 對「Explainability」的產品哲學——回答：**為什麼教育 AI 必須具備可解釋性。**  
> **不是**解釋模型。**不是**解釋演算法。  
> **而是：** 如何讓學生理解、如何讓家長理解、如何讓老師理解。  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **哲學一致（只讀）：** PRD-001～PRD-008  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 產品哲學（Product Philosophy）— **非 UI、非 Prompt、非模型、非資料庫、非演算法、非技術實作**

---

## 本文件先回答

教育 AI 的可解釋性，不是為了證明「系統很聰明」。  
而是為了讓人知道：

> **為什麼今天這樣陪？  
> 為什麼是這一步？  
> 為什麼現在放慢或休息？**

讓**學生**理解——才願意合作，而不是被指揮。  
讓**家長**理解——才感到安心，而不是被要求盲信。  
讓**老師**理解——才可能尊重，而不是被黑箱取代。

> **Every recommendation deserves an explanation.**  
> 讓人理解，不是要求人相信。

---

## 本 PRD 做什麼／不做什麼

| 做 | 不做 |
|----|------|
| 定義教育場景下可解釋性為何必要 | 不解釋權重、參數、模型內部 |
| 定義對學生／家長／老師的解釋責任 | 不設計 UI、Prompt、資料庫 |
| 定義謙遜、信任、信心與教育的關係 | 不寫技術可解釋性方法論 |

---

# §1 Why Explainability Exists  
## 為什麼必須有可解釋性

因為陪伴若無法說明，就只是控制。  
因為家長託付的是安心，不是神秘權威。  
因為學生需要被當成可思考的人，不是被填滿的容器。  
因為老師需要看見教育意圖，不是被一台黑箱排擠。

沒有可解釋性：

- Journey 變成任務推播  
- Decision 變成無法質疑的命令  
- Trust 無法每天累積  
- 錯誤無法被溫柔修正  

有了可解釋性：

- 理解得以被分享  
- 決策得以被檢驗  
- 關係得以被建立  

**Explainability exists so that education remains human.**  
可解釋性存在，是為了讓教育仍然像人與人之間的事。

---

# §2 Every Recommendation Needs A Reason  
## 每一個建議都需要理由

> **Every recommendation needs a reason.**  
> **Every recommendation deserves an explanation.**

沒有理由的建議，不配成為預設陪伴。

理由應能連回教育鏈，例如：

```text
觀察／Signals
  → Understanding（現在真正需要什麼）
  → Decision（為何這是今天最值得的）
  → Journey（為何這樣走）
  →（若相關）Blueprint／Memory／Boundary
```

理由必須是**人話**——  
描述今天的狀態與選擇，不定孩子的身份。

對齊 PRD-008：Decision is explainable · Explain before Decision（PRD-005）。

---

# §3 Students Deserve To Understand  
## 學生值得被說明——而不只是被安排

學生不是執行指令的終端。  
學生是學習的主體。

當 AI 說明「為什麼今天這樣」：

- 決策成本下降，焦慮下降  
- 合作感上升：「我們一起」，不是「你必須」  
- 思考被邀請進來——解釋本身就是教育  

學生值得知道：

- 為什麼這一步適合我今天  
- 為什麼先到這裡也可以  
- 為什麼這不是因為「我不行」  

對齊：Guide before answers · Confidence before Performance · Care before teaching。  
**Students deserve to understand.**

---

# §4 Parents Deserve Transparency  
## 家長值得透明——安心來自理解

家長購買的是安心（PRD-005）。  
安心來自透明的理解，不是來自「請相信 AI」。

家長應能明白：

- 今天為什麼這樣安排  
- 為什麼不是昨天／不是別人的課表  
- 為什麼現在休息或放慢  
- 這如何仍通往成長方向（Blueprint）  

透明 **不是**監視全文、不是排名儀表板。  
透明是：**成長與陪伴的可見理由。**

> Parents deserve transparency.  
> 讓家長理解，不是要求家長相信。

---

# §5 Explainability Creates Trust  
## 可解釋性創造信任

信任不是宣稱。  
信任是每天：被理解、被解釋、被尊重、被誠實對待（PRD-005）。

| 可解釋 → 信任 | 不可解釋 → 不信任 |
|----------------|-------------------|
| 理由清楚、溫柔 | 「AI 認為最適合」 |
| 承認界線與不確定 | 假裝全知 |
| 放慢可說成安心 | 放慢說成罪名 |

**Explainability creates trust.**  
每一次說清楚，都是一次信任存款。

---

# §6 Explainability Builds Confidence  
## 可解釋性建立信心

當孩子聽懂「為什麼」：

- 安排不再像懲罰或隨機  
- 錯誤可被看成狀態，不是人格缺陷  
- 小勝有意義，因為連得上「我們在走的路」  

當家長聽懂「為什麼」：

- 焦慮下降  
- 比較與催促的衝動下降  
- 更敢把孩子交出去——因為看得見邏輯  

**Explainability builds confidence**——孩子的，與家長的。  
對齊：Explainability creates confidence（PRD-005）。

---

# §7 Explainability Is Part Of Education  
## 可解釋性本身就是教育

教育不只教知識。  
教育也教：**如何思考選擇、如何看待自己的狀態、如何理解下一步。**

當 AI 解釋決策，學生學到的是：

- 學習可以有理由，不是只有服從  
- 今天的安排連得上長期方向  
- 放慢與休息也可以是負責的選擇  

解釋不是客服附錄。  
**Explainability is part of education.**

跳過解釋，就跳過一層「學會如何學習」。

---

# §8 Good AI Admits Uncertainty  
## 好的 AI 承認不確定

可解釋性包含誠實說：

> 「這部分我沒有足夠把握。」  
> 「我比較確定的是……；我比較不確定的是……」

| 好的不確定 | 壞的確定 |
|------------|----------|
| 標明界線，保守陪伴 | 幻想、猜測後用權威口吻 |
| 邀請人類（家長／老師）介入 | 用裝懂換依賴 |
| 保護孩子 | 用假診斷羞辱或定案 |

對齊：Never pretend to know · 可以承認不知道（PRD-000／005）。  
**Good AI admits uncertainty.**  
謙遜是可解釋性的一部分——不是弱點。

---

# §9 Explainability Before Authority  
## 可解釋性先於權威

StudySignal **不靠權威壓人**。  
不靠「我是 AI 所以聽我的」。

> **Explainability before Authority.**  
> 先讓人理解，再請人同行。  
> 說不清楚，就沒有資格當預設權威。

| 解釋在先 | 權威在先（拒絕） |
|----------|------------------|
| 理由 → 邀請合作 | 命令 → 要求服從 |
| 可被質疑、可被改 | 不可問、只能做 |
| 責任與信任 | 炫技與控制 |

對齊：Trust before Intelligence · Responsibility before Intelligence · Relationship before Recommendation。

---

# §10 Final Belief  
## 最終信念

可解釋性不是技術展示。  
可解釋性是教育關係的呼吸。

讓學生理解——才長得出自主。  
讓家長理解——才長得出安心。  
讓老師理解——才長得出尊重。  

> **真正值得信任的教育 AI，  
> 不是最會下指令的。  
> 而是最願意把「為什麼」說清楚的——  
> 說得溫柔、誠實、可修正。**

Every recommendation deserves an explanation.  
Understand before Teaching.  
Explain before Authority.  
讓人理解，陪伴才開始像教育。

---

## 與相鄰哲學的關係

```text
Understanding / Decision / Journey / Blueprint / Memory
        ↓ 都必須能被說明
Explainability（本 PRD）
        ↓
學生理解 · 家長安心 · 老師可尊重 · 信任每日累積
```

沒有可解釋性，上游哲學無法抵達人心。

---

## 邊界聲明

本文件只討論教育哲學。  
不討論 UI、Prompt、AI Model、Database、演算法、技術實作。

若任何設計用黑箱權威、監視式「透明」、或無法說明的建議作為預設——  
**違憲，必須重來。**

---

*PRD-009 · Explainability Engine · v1.0*  
*For students, parents, teachers · Explain before authority · Philosophy only · Downstream of PRD-000 · No UI · No code.*
