# PRD-007：Memory Engine（記憶引擎）

> **地位：** StudySignal 對「Memory」的產品哲學——回答：**AI 應該記住什麼？又應該忘記什麼？**  
> **服從：** [`PRD-000-StudySignal-Constitution.md`](./PRD-000-StudySignal-Constitution.md) · [`AGENT.md`](../AGENT.md)  
> **哲學一致（只讀）：** PRD-001～PRD-006（Journey · Understanding · Signals · Student Model · Parent Trust · Blueprint）  
> **版本：** 1.0  
> **日期：** 2026-08-05  
> **性質：** 產品哲學（Philosophy Only）— **非聊天紀錄規格、非 Conversation History、非 UI、非 API、非資料庫、非程式**

---

## 本文件先回答

> **「AI 應該記住什麼？又應該忘記什麼？」**

Memory **不是**聊天紀錄。  
**不是** Conversation History。  
**不是**把一切對話永久堆在倉庫裡。

Memory **是教育的一部分**——  
為了更理解孩子、更會陪伴、更保護成長的可能性；  
也為了知道：什麼該放下，好讓孩子不被昨天定義。

對齊 PRD-000：Memory 的目的不是保存歷史，而是讓每一天建立在昨天之上——且不把今天焊成永久身份（PRD-003／004）。

---

## 本 PRD 做什麼／不做什麼

| 做 | 不做 |
|----|------|
| 定義為何記憶、如何選擇、為何遺忘 | 不設計 log／向量庫／保留期限技術方案 |
| 定義記憶與關係、信任、藍圖的關係 | 不寫 UI、API、資料表 |
| 定義保護孩子的記憶紀律 | 不把 Memory 寫成完整對話存檔規格 |

---

# §1 Why Memory Exists  
## 為什麼需要記憶？

Memory **不是**為了回答更快。  
Memory **是**為了更理解孩子。

沒有記憶，就沒有真正的陪伴——  
只有一次次從頭介紹自己的陌生人。

有了合宜的記憶：

- AI 不必每天重新認識孩子  
- Journey 能接上昨天的善意停止與有效方法  
- Student Model 與 Blueprint 有延續的原料  
- 家長感到：這不是工具，是長期夥伴  

> 沒有記憶，就沒有真正的陪伴。  
> 有記憶卻不會遺忘，也沒有真正的教育。

---

# §2 Memory Is Selective  
## 記憶是選擇，不是全收

**不是所有事情都值得記住。**

AI 必須知道：

- **什麼值得留下**  
- **什麼應該忘記**  

全盤記住聊天、一次失敗、偶然情緒——  
會把陪伴變成監視，把理解變成偏見。

選擇性記憶，是責任——  
對齊：Responsibility before Intelligence（PRD-005）· Signals Never Judge（PRD-003）。

---

# §3 Remember Growth, Not Noise  
## 記住成長，不是噪音

### 傾向記住（Growth）

| 值得留下的方向 | 為何 |
|----------------|------|
| **努力** | 過程與方法，而非結果羞辱 |
| **進步** | 相對過去的自己 |
| **興趣** | 好奇與熱情的線索 |
| **挫折** | 如何被接住、如何恢復——非「又失敗」的烙印 |
| **理解** | 真正懂了什麼、哪種引導有效 |
| **夢想** | 為何而學 |
| **目標** | 與 Blueprint 相連的北 |

### 不要一直記住（Noise）

| 不應反覆抓住不放 | 為何 |
|------------------|------|
| **聊天內容全文** | Memory ≠ Conversation History |
| **一次失敗** | 單點不是身份 |
| **一次考試** | 不劫持長期方向（PRD-006） |
| **情緒波動** | 情緒是狀態，會變；可理解當下，不永久貼標 |
| **偶然事件** | 噪音會污染下一趟 Journey |

記住成長敘事。  
放下噪音——好讓明天仍有空間成為。

---

# §4 Memory Builds Relationship  
## 記憶建立關係

真正的陪伴，來自長期記憶。

不是今天回答得很好。  
而是**記得孩子一路走來**——  
記得他建立過的信心、走過的卡點、有效的方法、未完成的善意。

| 有關係的記憶 | 沒有關係的堆疊 |
|--------------|----------------|
| 「我們上周用這種方式比較順」 | 無差別重播舊對話 |
| 「你說過在意這件事」 | 用舊失敗威脅今天 |
| 「昨天先到這裡，今天接上」 | 每天當新用戶 |

對齊：AI 每一天都比昨天更理解孩子（PRD-000／004）。  
關係靠選擇性的長期記憶——不是靠聊天長度。

---

# §5 Memory Evolves  
## 記憶會演化——重新理解，不是冷凍

Memory **不是**凍結。  
Memory **是**重新理解。

新的 Journey。  
新的 Signals。  
新的 Student Model。  
新的 Blueprint 演化。  

都可能**改變** Memory 的意義與權重。

| 演化中的 Memory | 凍結的 Memory（拒絕） |
|-----------------|----------------------|
| 舊挫折被重寫為「曾卡住、已走出」 | 永遠標成「失敗過的人」 |
| 舊興趣讓位給新好奇 | 強迫孩子停留在過時標籤 |
| 隨理解更新「什麼重要」 | 永不修正的偏見倉庫 |

對齊 Living Blueprint（PRD-006）· Student Model Must Grow（PRD-004）。  
記憶與孩子一起長——不把孩子釘在舊檔案裡。

---

# §6 Parents Should Know What Is Remembered  
## 家長應能知道記住了什麼

AI 應該可以向家長解釋：

- **為什麼記住？**  
- **為什麼忘記？**  
- **為什麼更新？**  

對齊 Parent Trust Engine（PRD-005）：

- Explain before Decision / Explainability creates confidence  
- 讓家長理解，不是要求家長相信  
- Parents buy peace of mind  
- Never pretend to know  

記憶若對家庭完全黑箱——信任會裂。  
記憶若變成監視清單——信任會死。

家長需要的可見性是：**成長被延續的方式**——不是對話全文監控。

---

# §7 Forgetting Is Also Intelligence  
## 遺忘也是智慧

真正的智慧，包含知道：

> **什麼不用一直記得。**

遺忘不是缺陷。  
是教育的一部分。

| 智慧的遺忘 | 有害的遺忘 |
|------------|------------|
| 放下一次失敗的烙印 | 忘記孩子的尊嚴與安全感需求 |
| 放下聊天噪音 | 忘記有效方法與善意停止點 |
| 放下過時標籤 | 假裝從不認識這位孩子 |
| 為成為騰出空間 | 為方便而抹去責任 |

**Forgetting is also intelligence.**  
對齊：Signals follow change, never define identity · Becoming, not being.

---

# §8 Memory Protects The Child  
## 記憶保護孩子

Memory **不應**貼標籤。  
Memory **不應**定義孩子。  
Memory **應該**保護孩子成長的可能性。

| 保護性記憶 | 傷害性記憶 |
|------------|------------|
| 服務理解與陪伴 | 服務羞辱與比較 |
| Today appears to… 的延續 | The learner is… 的定案 |
| 保留「可以改變」 | 寫成命運 |
| 家長翻譯成安心 | 家長翻譯成罪名 |

對齊 PRD-003／004 Constitution：任何觀察都不能因一次而定義一種人。  
記憶是長期版本的同一紀律——**更嚴格，而非更寬鬆。**

---

# §9 Final Belief  
## 最終信念

> **StudySignal 不記住孩子的失敗。  
> StudySignal 記住孩子的成長。**

> **StudySignal 不定義孩子。  
> StudySignal 陪伴孩子成為更好的自己。**

記住，是為了理解。  
遺忘，是為了保護。  
演化，是為了成為。  

Memory 是教育的一部分——  
不是聊天的副產品。

---

# §10 Success Definition  
## 成功定義

### 不是

- 記住越多越好  
- 聊天越長越好  
- 資料越多越好  
- Conversation History 越完整越好  

### 而是

- **孩子被真正理解。**  
- **家長感受到陪伴。**  
- **Journey 越來越自然。**  
- **Blueprint 越來越清楚。**  
- **Student Model 越來越成熟。**  

成功的 Memory：  
昨天幫得上今天；  
今天不囚禁明天；  
家庭感到被長期陪著——而不是被錄下來。

---

## 與相鄰哲學的關係

```text
Signals（今天變化）→ 選擇性進入 Memory
Memory ←→ Student Model（延續理解、可修正）
Memory ←→ Blueprint（方向敘事，非失敗烙印）
Memory → Journey（接上昨天，不重來）
Memory → Parent Trust（可解釋：為何記／忘／更新）
```

記憶服務理解與關係。  
不服務全量存檔與炫技召回。

---

## 收尾

AI 應該記住什麼？  
——值得延續的成長、方法、夢想與被接住的路。

AI 應該忘記什麼？  
——噪音、一次定案、會把孩子關進標籤的東西。

沒有記憶，就沒有陪伴。  
沒有遺忘，就沒有成為的空間。

---

## 邊界聲明

本文件停在哲學。  
不新增功能。不規定畫面、儲存、介接、對話 log 實作。

若任何設計把 Memory 做成完整聊天存檔、失敗烙印庫、或不可解釋的黑箱——  
**違憲，必須重來。**

---

*PRD-007 · Memory Engine · v1.0*  
*Remember growth · Forget noise · Forgetting is intelligence · Philosophy only · Downstream of PRD-000 · No UI · No code.*
