import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import { kbId } from "../utils/ids";

/**
 * Minimal biology seed — structural proof only.
 * Does NOT invent a full syllabus or decade of exam papers.
 * Replace / extend from curated curriculum + exam imports later.
 */
export function buildBiologyMinimalSeed(): KnowledgeBaseSnapshot {
  const subjectId = kbId("sub", "biology");
  const levelId = kbId("lvl", "senior-high");
  const curriculumId = kbId("cur", "bio-senior-skeleton");
  const unitCellId = kbId("unit", "cell-basics");
  const unitGeneticsId = kbId("unit", "genetics-intro");

  const nodeCellId = kbId("kn", "bio-cell-structure");
  const nodeMembraneId = kbId("kn", "bio-cell-membrane");
  const nodeDnaId = kbId("kn", "bio-dna-basics");

  const examId = kbId("exam", "bio-placeholder-2024");
  const questionId = kbId("q", "bio-placeholder-1");

  return {
    subjects: [
      {
        id: subjectId,
        name: "生物",
        code: "biology",
        description: "StudySignal Knowledge Base — 生物（骨架起始科目）",
        active: true,
      },
    ],
    educationLevels: [
      {
        id: levelId,
        name: "高中",
        code: "senior_high",
        description: "高中學制層級（骨架；細部課綱版本另以 Curriculum 區分）",
      },
    ],
    curricula: [
      {
        id: curriculumId,
        subjectId,
        educationLevelId: levelId,
        name: "高中生物（骨架）",
        version: "skeleton-0.1",
        source: "internal-skeleton",
        scopeDescription:
          "僅用於驗證 schema。正式課綱邊界與章節須由審核過的課綱／課本目錄匯入，禁止 AI 自行擴張至大學程度。",
        active: true,
      },
    ],
    curriculumUnits: [
      {
        id: unitCellId,
        curriculumId,
        parentId: null,
        title: "細胞",
        description: "骨架單元：細胞相關知識點容器（非正式完整課綱）",
        order: 1,
        level: 1,
      },
      {
        id: unitGeneticsId,
        curriculumId,
        parentId: null,
        title: "遺傳",
        description: "骨架單元：遺傳相關知識點容器（非正式完整課綱）",
        order: 2,
        level: 1,
      },
    ],
    knowledgeNodes: [
      {
        id: nodeCellId,
        subjectId,
        curriculumUnitId: unitCellId,
        parentId: null,
        code: "BIO.CELL.STRUCTURE",
        title: "細胞基本構造",
        description: "骨架知識點：細胞的基本構造（佔位）",
        knowledgeType: "concept",
        difficulty: "basic",
        scopeStatus: "core",
        order: 1,
      },
      {
        id: nodeMembraneId,
        subjectId,
        curriculumUnitId: unitCellId,
        parentId: nodeCellId,
        code: "BIO.CELL.MEMBRANE",
        title: "細胞膜",
        description: "骨架知識點：細胞膜（佔位）",
        knowledgeType: "concept",
        difficulty: "basic",
        scopeStatus: "core",
        order: 2,
      },
      {
        id: nodeDnaId,
        subjectId,
        curriculumUnitId: unitGeneticsId,
        parentId: null,
        code: "BIO.GEN.DNA",
        title: "DNA 基本概念",
        description: "骨架知識點：DNA（佔位）",
        knowledgeType: "terminology",
        difficulty: "basic",
        scopeStatus: "core",
        order: 1,
      },
    ],
    knowledgeRelations: [
      {
        id: kbId("rel", "cell-to-membrane"),
        sourceNodeId: nodeCellId,
        targetNodeId: nodeMembraneId,
        relationType: "prerequisite",
        weight: 1,
      },
    ],
    examSources: [
      {
        id: examId,
        subjectId,
        educationLevelId: levelId,
        year: 2024,
        examName: "生物考題來源佔位（非正式卷）",
        sourceType: "other",
        sourceFile: null,
        sourceUrl: null,
      },
    ],
    examQuestions: [
      {
        id: questionId,
        examSourceId: examId,
        questionNumber: "S1",
        questionType: "short_answer",
        questionText: "【骨架佔位題】請說出細胞的一項基本構造。",
        answer: "（佔位）例如細胞膜、細胞核等——正式答案以審核匯入為準。",
        explanation: "僅用於驗證 ExamQuestion → QuestionKnowledge → KnowledgeNode。",
        difficulty: "intro",
      },
    ],
    questionKnowledge: [
      {
        id: kbId("qk", "s1-cell"),
        questionId,
        knowledgeNodeId: nodeCellId,
        relevance: 1,
        role: "primary",
      },
    ],
    learningObjectives: [
      {
        id: kbId("lo", "cell-structure"),
        knowledgeNodeId: nodeCellId,
        objective: "能辨識細胞的基本構造名稱",
        measurableCriteria: "能正確說出至少一項基本構造（骨架標準）",
      },
    ],
    learningResources: [
      {
        id: kbId("lr", "cell-notes"),
        knowledgeNodeId: nodeCellId,
        resourceType: "notes",
        title: "細胞構造筆記（佔位）",
        source: "internal-skeleton",
        url: null,
        description: "正式教材連結待課綱／課本目錄匯入後補上。",
      },
    ],
  };
}
