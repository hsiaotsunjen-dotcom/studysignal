# StudySignal Knowledge Base

> 第一階段：資料庫／schema 骨架（生物起始）。  
> **不是**筆記庫、**不是** RAG、**不綁定**特定 AI model。  
> 現況：專案尚未引入 Prisma／Supabase；本模組以 TypeScript 關聯模型 + in-memory service 作為可遷移契約。

## 目的

讓 AI Tutor 之後能回答「學生現在應該學什麼」，且每個知識點都能追溯到：

1. **課程範圍邊界**（Curriculum / CurriculumUnit）
2. **考題證據**（ExamSource / ExamQuestion / QuestionKnowledge）
3. **知識關聯**（KnowledgeRelation：前置／下一步）

## 目錄

```text
src/lib/knowledge-base/
  schema/     enums、entities、FK 文件、snapshot、SQL DDL 草圖
  types/      查詢結果與驗證結果型別
  services/   KnowledgeBaseService 介面 + Memory 實作
  seed/       極少量生物骨架 seed（非正式完整課綱）
  utils/      id、驗證、查詢輔助
```

## 主要關係

```text
Subject + EducationLevel
        ↓
   Curriculum
        ↓
  CurriculumUnit  (可樹狀 parentId)
        ↓
  KnowledgeNode   (可樹狀 parentId)
        ↓
  KnowledgeRelation  (prerequisite / related / …)

ExamSource
    ↓
ExamQuestion
    ↓
QuestionKnowledge ──→ KnowledgeNode

KnowledgeNode
    ↓
LearningObjective / LearningResource
```

因此可查：

| 問題 | 路徑 |
|------|------|
| 這個知識點屬於哪個課程範圍？ | Node → Unit → Curriculum |
| 哪些考題測這個知識點？ | Node ← QuestionKnowledge ← Question ← ExamSource |
| 過去考過幾次？（頻率骨架） | `countExamQuestionsForNode`（正式十年資料待匯入） |
| 前置知識？ | `relationType = prerequisite`（target = 本節點） |
| 下一步學什麼？ | 本節點作為 prerequisite 的 source → target |

## Enums（節錄）

- `knowledgeType`: concept \| process \| principle \| terminology \| calculation \| application
- `scopeStatus`: core \| extended \| out_of_scope
- `relationType`: prerequisite \| related \| parent \| application \| contrast
- `QuestionKnowledge.role`: primary \| supporting

## 使用方式（程式）

```ts
import { createKnowledgeBaseService } from "@/lib/knowledge-base";

const kb = createKnowledgeBaseService(); // 預設載入生物骨架 seed
const node = await kb.getNodeByCode("BIO.CELL.STRUCTURE");
const ctx = node ? await kb.getNodeCurriculumContext(node.id) : null;
const evidence = node ? await kb.listExamEvidenceForNode(node.id) : [];
```

## Seed 說明

`seed/biology.minimal.ts` 只有：

- 1 個科目（生物）
- 1 個學制層級（高中）
- 1 個骨架 Curriculum
- 2 個單元、3 個知識點、1 條前置關係
- 1 題佔位考題 + 連結

**禁止**把此 seed 當成正式課綱或十年真題。

## 與未來 SQL 的關係

- `schema/sqlDdl.ts` 提供 DDL 草圖（不在 runtime 執行）
- `KnowledgeBaseService` 可換成 SQL 實作而不改呼叫端
- 正式匯入流程建議：課綱目錄 → units/nodes → 考題映射 → 驗證 `validateKnowledgeBaseSnapshot`

## 不做的事（本階段）

- 不改 Tutor UI / Landing
- 不接 AI API、不做 embedding / vector DB
- 不大量灌假資料、不自行發明完整課綱或十年考題
