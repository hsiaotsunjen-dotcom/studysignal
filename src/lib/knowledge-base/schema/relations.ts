/**
 * Documented foreign-key / cardinality map for the Knowledge Base.
 * Used by validators and as the blueprint for a future SQL migration.
 */

export const KNOWLEDGE_BASE_RELATIONS = {
  Curriculum: {
    subjectId: "Subject.id",
    educationLevelId: "EducationLevel.id",
  },
  CurriculumUnit: {
    curriculumId: "Curriculum.id",
    parentId: "CurriculumUnit.id | null",
  },
  KnowledgeNode: {
    subjectId: "Subject.id",
    curriculumUnitId: "CurriculumUnit.id",
    parentId: "KnowledgeNode.id | null",
  },
  KnowledgeRelation: {
    sourceNodeId: "KnowledgeNode.id",
    targetNodeId: "KnowledgeNode.id",
  },
  ExamSource: {
    subjectId: "Subject.id",
    educationLevelId: "EducationLevel.id",
  },
  ExamQuestion: {
    examSourceId: "ExamSource.id",
  },
  QuestionKnowledge: {
    questionId: "ExamQuestion.id",
    knowledgeNodeId: "KnowledgeNode.id",
  },
  LearningObjective: {
    knowledgeNodeId: "KnowledgeNode.id",
  },
  LearningResource: {
    knowledgeNodeId: "KnowledgeNode.id",
  },
} as const;

/**
 * Query paths the Tutor / planning layer will use later:
 *
 * Curriculum → CurriculumUnit → KnowledgeNode → KnowledgeRelation
 * ExamSource → ExamQuestion → QuestionKnowledge → KnowledgeNode
 */
export const KNOWLEDGE_BASE_QUERY_PATHS = [
  "node → unit → curriculum → subject + educationLevel",
  "node ← questionKnowledge ← question ← examSource",
  "node → relation(prerequisite) → prerequisite nodes",
  "node ← relation(prerequisite) ← next nodes",
] as const;
