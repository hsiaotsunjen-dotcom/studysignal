# PRD-004：Student Model（學生模型）

> **地位：** StudySignal 對「學生模型」的產品哲學——定義 AI **如何持續理解同一位孩子，卻不把他固定成一種人**。  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **相鄰（只讀、不修改）：** PRD-001 Journey · PRD-002 Understanding · [`PRD-003-Learning-Signals.md`](./PRD-003-Learning-Signals.md)  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 產品哲學 — **非靜態 Profile、非資料表、非標籤、非 UI、非 API**

---

## 本文件先回答

> **「AI 如何持續理解同一位孩子，卻不把他固定成一種人？」**

答案的方向是：

用**可更新的理解**陪伴同一個人的成長；  
用**變化與趨勢**記住昨天；  
**絕不**用一次觀察、一個分數、一張標籤，把孩子說成「就是那樣的人」。

---

## 本 PRD 做什麼／不做什麼

| 做 | 不做 |
|----|------|
| 定義 Student Model 為何存在 | 不設計資料表、欄位、API |
| 定義核心構成的**意義** | 不寫技術實作與模型訓練 |
| 定義與 Signals 的關係 | 不設計 UI、儀表板 |
| 定義「成為」而非「是」的語言紀律 | 不把 Model 寫成成績單規格 |

---

# §1 Why Student Model Exists  
## 為什麼需要學生模型？

若沒有 Student Model，AI 每天都像第一次見面——  
無法延續昨天的理解，也無法溫柔地接住長期成長。

若 Student Model 變成靜態檔案，AI 又會把孩子關進標籤裡——  
「理解」變成「定案」。

因此 Student Model 的存在，**不是為了記錄孩子**，  
而是為了幫助 AI **持續理解孩子**——同一個人，不同的天，同一條成長弧線。

### 產品信念

> **The learner is always becoming.**

> **孩子永遠都在成長，  
> 不是固定不變的角色。**

AI 記得你，是為了更好地陪你成為明天的你——  
不是為了把你釘在昨天的結論上。

---

# §2 Student Model Is Not A Profile  
## 學生模型不是檔案夾

### Student Model 不是

| 不是 | 為什麼必須拒絕 |
|------|----------------|
| **靜態 Profile** | Profile 易於一次填完、長期不改；理解必須每天活著 |
| **標籤** | 標籤把人變成類別；孩子不是類別 |
| **身份定義** | 「他就是……」封閉成長；違憲 |
| **成績單** | 成績評價表現切片；Model 承載理解 |
| **能力結論** | 「弱／強」的終局判決不是理解，是審判 |

### Student Model 是

| 是 | 含義 |
|----|------|
| **AI 對孩子持續演化的理解** | 活的、可修正的、有溫度的 |
| **可被更新的認知** | 新的一天、新的 Signals，可以改寫理解 |
| **與 Signals 一起成長的模型** | 觀察進來，理解加深——但不把觀察焊成身份 |

> Student Model ≠ Profile ≠ 履歷 ≠ 成績單 ≠ 標籤牆。

---

# §3 Core Components  
## 核心構成（只定義意義）

以下是理解的面向——**不是資料庫欄位**。

| 構成 | 意義 |
|------|------|
| **Learning Personality** | 這位孩子學習時常見的節奏與風格傾向——可演化，非人格烙印 |
| **Current State** | 此刻大致處在什麼狀態（與今日 Signals 呼應）——屬於今天，可明日不同 |
| **Strengths** | 目前相對穩定的優勢與有效方法——用來建立信心與遷移，非用來排名 |
| **Challenges** | 目前反覆出現的卡點與需要鷹架之處——「正在面對」，不是「永遠不行」 |
| **Preferences** | 何種引導、節奏、形式更幫得上忙——服務陪伴方式，非消費標籤 |
| **Confidence Pattern** | 信心如何起伏、在何種情境易退縮或易嘗試——模式可改，非「沒自信的人」 |
| **Motivation Pattern** | 願意前進的力量從何而來、何時枯竭——理解動機，不道德綁架 |
| **Learning Rhythm** | 可持續的步調：何時能推進、何時需恢復——服務 Consistency |
| **Long-term Goal** | 為何而學、往哪走——北，不是今日任務清單 |
| **Growth History** | 相對過去的自己，走過哪些值得記住的改變——成長敘事，非成績流水帳 |

每一項都必須保留：**可以更新、可以變軟、可以重新理解。**

---

# §4 Becoming, Not Being  
## 成為，不是「就是」

### 核心原則

> **孩子不是「是什麼」，  
> 孩子是「正在成為什麼」。**

Being 封閉未來。  
Becoming 打開陪伴。

### AI 不能說

- 「這個孩子就是弱。」  
- 「這個孩子就是不會。」  
- 「這個孩子就是不適合。」  

### AI 應該說

- 「今天這裡還在成長。」  
- 「目前這個概念還卡住。」  
- 「這個孩子正在建立信心。」  

| 禁止（Being） | 允許（Becoming） |
|---------------|------------------|
| 他就是數學差 | 目前在這段路上還在建立理解 |
| 他不適合英文 | 今天口說自信不足，需要更多鼓勵 |
| 他很懶 | 今天啟動意願偏低／顯得疲憊 |
| 他是資優／他是問題學生 | 相對上個月，自主／信心有這些移動 |

對齊 PRD-003：  
**Today, the learner appears to…** · Signals follow change, never define identity.  
Student Model 必須用同一種語言紀律——只是時間尺度可以更長，**仍然不是 Forever 身份**。

---

# §5 Student Model & Signals  
## 模型與訊號：一體循環，互不混淆

| | Learning Signals | Student Model |
|--|------------------|---------------|
| **描述** | **今天**的變化 | **長期**累積的理解 |
| **時間** | 此刻／今日 | 跨日、跨週、仍可修正 |
| **危險** | 被當成永久標籤 | 被寫成靜態 Profile |
| **正確用途** | 更新理解 | 幫助解釋下一次訊號的意義 |

### 循環

```text
Signals（今天的變化）
    ↓ 更新
Student Model（累積的理解）
    ↓ 幫助解讀
下一次 Signals 的意義
    ↓ 再次更新
Student Model …
```

- **Signals 更新 Student Model。**  
- **Student Model 幫助 AI 理解下一次 Signals 的意義。**  

兩者形成循環，**但不能互相混淆**：

- 不能把一條今日 Signal 直接寫成 Model 裡的永久身份。  
- 不能用過時的 Model 結論，無視今天的 Signals。  
- Signal = 變化的觀察；Model = 理解的延續——**延續仍須可被今天改寫。**

---

# §6 Student Model Must Grow  
## 模型必須成長

### 原則

1. **Student Model 不是一次建立就完成。**  
   第一次見面只有起點，沒有定案。

2. **Student Model 必須每天更新。**  
   哪怕只是微小修正——「比昨天多懂一點」。

3. **Student Model 必須保留成長空間。**  
   每個構成都預留「正在成為」；禁止寫死。

4. **Student Model 不能把今天的觀察變成永久判斷。**  
   今日 Challenges ≠ 終身缺陷。  
   今日低信心 ≠ 這個人沒自信。

若模型停止更新，陪伴就變成念舊檔案。  
若模型只增不改、只判不疑——理解就變成偏見。

> AI 不是每天重新認識孩子。  
> AI 每一天，都比昨天更理解孩子——**並且允許自己昨天理解錯了。**

---

# §7 Product Belief  
## 產品信念

> **The student is not a label.  
> The student is a person in growth.**

> **孩子不是標籤。  
> 孩子是一個正在成長的人。**

我們建立 Student Model，  
不是為了把人归档。  
是為了在歲月裡，仍然认得這顆心——  
並且相信它明天還會不一樣。

### 收斂

持續理解同一位孩子：靠**記憶與更新**。  
不把他固定成一種人：靠**Becoming，而非 Being**。  

The learner is always becoming.  
Signals follow change.  
The Model grows with the child—  
never cages the child.

---

## 邊界聲明

```text
PRD-003 Learning Signals  → 今天的變化如何被觀察
PRD-004 Student Model     → 理解如何延續且不固化（本文件）
PRD-002 Understanding     → 此刻「真正需要什麼」
PRD-001 Journey           → 如何陪伴決策
```

本文件停在哲學。  
不規定儲存、不規定演算法、不規定畫面。

若任何實作把 Student Model 做成靜態 Profile、標籤牆、成績結論或「他就是……」——  
**違憲，必須重來。**

---

*PRD-004 · Student Model · v1.0*  
*Becoming, not being · Downstream of PRD-000 · No database · No UI · No code.*
