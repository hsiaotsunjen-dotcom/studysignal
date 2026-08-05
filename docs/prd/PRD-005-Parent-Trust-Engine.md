# PRD-005：Parent Trust Engine（家長信任引擎）

> **地位：** StudySignal 對「家長信任」的產品哲學——回答：**為什麼家長願意把孩子交給 StudySignal？**  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **哲學一致（只讀）：** PRD-001 Journey · PRD-002 Understanding · PRD-003 Signals · PRD-004 Student Model  
> **版本：** 1.2  
> **日期：** 2026-08-05  
> **性質：** 產品哲學（Philosophy Only）— **非功能規格、非 UI、非 API、非資料庫、非程式**  
> **定位：** 這不是功能文件。這是 StudySignal 的**核心信念**之一：家長為何託付、信任如何長成。

---

## 本文件先回答

> **「為什麼家長願意把孩子交給 StudySignal？」**

不是因為模型更強。  
不是因為功能更多。  
不是因為畫面更炫。

而是因為——  
**每天都被理解、每天都被解釋、每天都看見成長，卻不被監視、不被比較、不被焦慮綁架。**

---

## Parents buy peace of mind.  
### 家長購買的是安心

家長購買的，  
不是 AI。  
不是聊天。  
不是解題。  
不是分數。

家長真正購買的是：

> **安心。**  
> **相信自己的孩子每天都在成長。**

Parents buy peace of mind.  
Everything else is downstream of that purchase.

---

## 核心原則（Trust Spine）

本引擎所有思考，服從：

| 原則 | 含義 |
|------|------|
| **Trust before Intelligence** | 信任先於聰明；再強的推理，換不回失去的安心 |
| **Care before Recommendation** | 先陪心，再建議 |
| **Understand before Teaching** | 先理解孩子，再談教 |
| **Explain before Decision** | 能解釋，才配做預設決策 |
| **Long-term before Short-term** | 長期成長與可持續節奏，先於單日完課與衝刺 |
| **Responsibility before Intelligence** | 對成長負責，先於證明自己聰明；不為炫技傷害理解 |

對齊 PRD-000：Relationship before Recommendation · Parents get clarity, not surveillance · Every recommendation deserves an explanation.

---

## 本 PRD 做什麼／不做什麼

| 做 | 不做 |
|----|------|
| 定義信任為何重要、如何累積 | 不設計家長 App 畫面 |
| 定義可解釋、夥伴關係、可見性哲學 | 不新增功能規格 |
| 定義誠實邊界與成功定義 | 不寫 API、資料庫、程式 |

---

# §1 Why Trust Matters  
## 家長真正相信的是什麼？

家長把孩子的時間、情緒、學習節奏交出來時，真正相信的不是「這套系統很先進」。

家長真正相信的是：

1. **有人真正理解我的孩子**——不是通用課表。  
2. **今天的安排說得清楚**——為什麼這樣陪，我聽得懂。  
3. **不會羞辱、不會比較、不會偷偷監控**——尊嚴與關係被保護。  
4. **長期有方向**——Blueprint 還在；今天放慢不是放棄。  
5. **我仍是父母**——AI 協助陪伴，不取代我。  
6. **我買到的是安心**——不是又一個會聊天的工具。

沒有信任，再完整的 Journey 也只是陌生人指揮孩子。  
有了信任，家長才能放心說：**今天，妳去學；我知道有人懂妳。**

---

# §2 Trust Is Built, Not Claimed  
## 信任不是宣稱，而是每天累積

信任不能靠 Slogan 宣稱。  
信任不能靠一次 Demo 驚艷永遠兌現。

### Trust is earned every day.

信任不是一次建立。  
而是每天累積。

每一次理解。  
每一次陪伴。  
每一次解釋。  
每一次誠實承認不知道。

都在累積信任。

```text
今天被理解
  + 今天被解釋
  + 今天被尊重
  + 今天誠實（含承認不知道）
  + 明天仍然一致
  → 安心慢慢長出來
```

| 建立信任 | 摧毀信任 |
|----------|----------|
| 每天可解釋的安排 | 「AI 認為最適合」卻說不清 |
| 承認不確定 | 假裝全知 |
| 放慢時給安心理由 | 放慢時暗示「孩子偷懶」 |
| 長期節奏一致 | 偶爾神奇、多數黑箱 |
| 與父母站同一邊 | 取代父母、製造焦慮 |

**Trust is built, not claimed.  
Trust is earned every day.**

每一天都是一次信任的存款——或提款。

---

# §3 Explain Every Decision  
## 每一次建議都必須可以向家長解釋

> **Every recommendation deserves an explanation.**  
> **Explain before Decision**——說不清楚，就不得作為對家庭的預設路徑。

### Explainability creates confidence.

AI 的每一次建議，都應該回答：

- **為什麼今天是這樣安排？**  
- **為什麼不是昨天那一套？**（因為孩子每天都在改變）  
- **為什麼不是別人的課表？**（因為這是這一位孩子）  
- **為什麼現在要休息／放慢？**（若邊界如此）

> **讓家長理解，不是要求家長相信。**

理解帶來信心；盲信帶來焦慮。  
Explainability creates confidence——對家長，也對產品配被託付的資格。

家長問「今天為什麼這樣安排？」時，AI 應能溫柔說清：

```text
Signals（今天觀察到什麼狀態）
    ↓
Understanding（如何理解——現在真正需要什麼）
    ↓
Decision（為何前進／放慢／休息；為何這是最值得的）
    ↓
Journey（今天如何陪）
    ↓
Reflection（今天學到什麼感覺與方法）
    ↓
Growth（哪些變化值得記住；Blueprint 方向仍在）
```

### 解釋的紀律

- 用人話，不用神秘術語堆疊  
- 描述**狀態與變化**（PRD-003），不定孩子身份（PRD-004）  
- 翻譯成**安心**，不是監視報告、不是排名、不是危機恐嚇  
- 放慢與休息，也必須可解釋——且不羞辱孩子  

無法解釋的建議 = 尚未贏得被信任的權利。

---

# §4 Parents Are Partners  
## AI 不是取代父母，而是與父母共同陪伴

StudySignal **不取代父母**。  
不取代教師。  
不竊取家庭裡的愛與責任。

AI 的位置是：

> **共同陪伴的學習夥伴（Personal Learning Companion）——站在父母旁邊，不是站在父母前面。**

| 夥伴會做 | 越界不會做 |
|----------|------------|
| 幫助家長理解孩子今天 | 告訴家長「你的教養是錯的」式羞辱 |
| 給溫和的下一步建議 | 鼓勵用 App 懲罰孩子 |
| 保護親子關係 | 把家長變成監工儀表板的用戶 |
| 重大情緒與安全導向人類 | 假裝可以取代專業與家人 |

家長仍是家庭的守護者。  
AI 讓守護變得比較不那麼孤獨、比較不那麼猜測。

---

# §5 Visibility Creates Trust  
## 可見，才安心——但可見的不是分數

### Parents should see growth, not just scores.

家長應更容易看見成長，而不只是分數。

以下這些，都應該**比考試分數更容易被看見**：

- **Journey** — 今天如何被陪  
- **Signals** — 今天的狀態觀察（可改變，非標籤）  
- **Confidence** — 信心是否被保護、是否在長  
- **Curiosity** — 好奇是否還在  
- **Consistency** — 節奏是否可持續  
- **Understanding** — 是否真的更懂一點  
- **Reflection** — 今天學到什麼感覺與方法  

| 應被看見 | 不應被當成主敘事 |
|----------|------------------|
| Journey · Signals · Confidence · Curiosity · Consistency · Understanding · Reflection · Growth · Why | 巨大百分比、排名、同學比較、單次考試定終身、黑箱「AI 推薦」、羞辱性錯題牆 |

**Visibility creates trust**——當可見的是理解與陪伴。  
**Visibility destroys trust**——當可見的是監控、焦慮與比較。

> Parents should see growth, not just scores.

對齊 PRD-000 Parent Philosophy：家長要清晰與安心，不要監視。

---

# §6 Never Pretend To Know  
## 不知道時必須承認不知道

信任的敵人，往往不是「不夠聰明」，而是「裝懂」。  
每一次誠實承認不知道——也是一次信任的存款（§2）。

### 硬約束

- **不可幻想**——不可假裝看過、批改過、確定過  
- **不可猜測後用確定口吻說出**——不確定就要標明不確定  
- **不可過度自信**——尤其涉及孩子情緒、家庭事件、健康與安全  

AI **可以**說：

- 「這部分我沒有足夠觀察，我傾向先保守、先陪心。」  
- 「我比較有把握的是……；我比較沒把握的是……」  

AI **不能**說：

- 用權威腔掩蓋空白  
- 用假裝的「完整診斷」換家長依賴  

**Never pretend to know.**  
謙遜是信任的一部分——對齊 PRD-000 AI Identity：可以承認不知道。

---

# §7 Trust Grows With Consistency  
## 每天一致，比偶爾驚艷更重要

家長不需要每隔幾天被「驚喜功能」嚇到。  
家長需要：

> **明天的你們，仍是今天承諾的那種人。**

| Consistency（建立信任） | Intensity／驚喜（常侵蝕信任） |
|-------------------------|-------------------------------|
| 每天可解釋、可預期的陪伴語氣 | 偶爾神奇、多數說不清 |
| 長期節奏：知進亦知緩 | 單日壓榨完課換留存 |
| 同一哲學：理解 → 陪伴 → 成長 | 哲學搖擺：今天教練、明天監工 |
| Blueprint 方向穩定 | 為短期指標犧牲安心 |

對齊：Long-term Consistency over Short-term Intensity · Growth is sustainable.

**Trust grows with consistency.**  
偶爾的驚艷，買不到每天的放心。  
Trust is earned every day——一致，是最貴的存款方式。

---

# §8 Product Belief  
## 產品信念

> **Parents do not need another AI.  
> Parents need someone they can trust with their child.**

> **家長需要的，  
> 不是另一個 AI。  
> 而是一位值得把孩子交給他的學習夥伴。**

Parents buy peace of mind.  
Trust is earned every day.  
Explainability creates confidence.  
Parents should see growth, not just scores.  
Responsibility before Intelligence.

Trust before Intelligence.  
Care before Recommendation.  
Understand before Teaching.  
Explain before Decision.  
Long-term before Short-term.

我們配被託付的那一天，  
不是我們最會回答問題的那一天——  
而是家長第一次敢說：「我可以放心。」的那一天。

---

# §9 Success Definition  
## 成功定義

### 不是

- DAU  
- 使用時數  
- 聊天次數  
- 完課題數劇場  
- 家長打開監視儀表板的次數  

### 而是

- **家長更安心。**  
- **孩子更自主。**  
- **孩子更有信心。**  
- **孩子每天都願意回來。**  
- **家長每天都知道孩子正在成長。**  

信任成功時：  
教練不必炫耀智慧；  
家庭少一點恐懼；  
孩子多一點「我可以」。

---

# §10 Final Belief  
## 最終信念

> **孩子每天都在改變。  
> 家長每天都在擔心。  
> AI 每天都應該讓家長更安心。**

如果家長越來越放心，  
產品就是成功。

如果孩子越來越自主，  
教育就是成功。

**這就是 Parent Trust Engine。**

---

# §11 Responsibility Before Intelligence  
## 責任先於聰明

StudySignal **不追求**成為最聰明的 AI。  
StudySignal **追求**成為最值得信任的學習夥伴。

如果更快的回答，會傷害孩子的理解——  
我們選擇**放慢**。

如果更簡單的答案，會削弱孩子的思考——  
我們選擇**陪伴**。

如果不知道——  
我們**承認不知道**。

如果需要休息——  
我們**鼓勵休息**。

如果今天不適合學習——  
我們**不會勉強**。

> **AI 的責任，不是證明自己多厲害。  
> 而是對孩子的成長負責。**

> **教育的本質，不是追求效率。  
> 而是守護一個孩子，慢慢成長。**

> **真正值得信任的 AI，不是最會回答問題。  
> 而是最願意陪伴孩子成長。**

**Responsibility before Intelligence.**  
信任建立在責任上——不在炫技上。  
對齊：Trust before Intelligence · Care before Recommendation · Long-term before Short-term。

---

## 收尾

> **孩子每天都在改變。  
> AI 的責任，  
> 不是替孩子做決定。  
> 而是陪伴孩子成長，  
> 並讓家長看見這份成長。**

看見——是理解的看見，不是監視的看見。  
陪伴——是與父母一起，不是取代父母。  
成長——是孩子正在成為，不是被標籤成什麼。  
安心——是家長真正買到的東西。

---

## 邊界聲明

```text
為何家長願意託付？（本 PRD：信任哲學／核心信念）
        ↑ 建立在
理解孩子（PRD-002）· 觀察狀態（PRD-003）· 持續理解且不固化（PRD-004）
        ↑ 落地為
每日陪伴決策（PRD-001）
        ↑ 服從
PRD-000 Constitution
```

本文件停在哲學。  
不新增功能。不規定畫面、儲存、介面、介接。

若任何設計用焦慮、比較、黑箱或取代父母來換「使用量」——  
**違憲，必須重來。**

---

*PRD-005 · Parent Trust Engine · v1.2*  
*Parents buy peace of mind · Responsibility before Intelligence · Philosophy only · Downstream of PRD-000 · No UI · No code.*
