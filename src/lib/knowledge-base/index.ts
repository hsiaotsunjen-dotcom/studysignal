/**
 * StudySignal Knowledge Base — curriculum- and exam-grounded knowledge graph skeleton.
 * Provider-agnostic; no AI / RAG / embeddings in this module.
 */

export {
  KNOWLEDGE_TYPES,
  SCOPE_STATUSES,
  RELATION_TYPES,
  QUESTION_KNOWLEDGE_ROLES,
  QUESTION_TYPES,
  EXAM_SOURCE_TYPES,
  RESOURCE_TYPES,
  DIFFICULTY_LEVELS,
} from "./schema/enums";
export type {
  KnowledgeType,
  ScopeStatus,
  RelationType,
  QuestionKnowledgeRole,
  QuestionType,
  ExamSourceType,
  ResourceType,
  DifficultyLevel,
} from "./schema/enums";

export type {
  Subject,
  EducationLevel,
  Curriculum,
  CurriculumUnit,
  KnowledgeNode,
  KnowledgeRelation,
  ExamSource,
  ExamQuestion,
  QuestionKnowledge,
  LearningObjective,
  LearningResource,
} from "./schema/entities";

export { KNOWLEDGE_BASE_RELATIONS, KNOWLEDGE_BASE_QUERY_PATHS } from "./schema/relations";
export {
  emptyKnowledgeBaseSnapshot,
  type KnowledgeBaseSnapshot,
} from "./schema/snapshot";
export { KNOWLEDGE_BASE_SQL_DDL } from "./schema/sqlDdl";

export type {
  NodeCurriculumContext,
  NodeExamEvidence,
  KnowledgeBaseValidationIssue,
  KnowledgeBaseValidationResult,
} from "./types";

export type { KnowledgeBaseService } from "./services/KnowledgeBaseService";
export { MemoryKnowledgeBaseService } from "./services/MemoryKnowledgeBaseService";
export { createKnowledgeBaseService } from "./services/createKnowledgeBaseService";

export { buildBiologyMinimalSeed } from "./seed/biology.minimal";
export { loadBiologyMinimalSeed } from "./seed/loadSeed";

export { kbId } from "./utils/ids";
export { validateKnowledgeBaseSnapshot } from "./utils/validateSnapshot";
export {
  findNodeByCode,
  resolveNodeCurriculumContext,
  listExamEvidenceForNode,
  listPrerequisiteNodes,
  listNextNodesAfter,
} from "./utils/queryHelpers";
