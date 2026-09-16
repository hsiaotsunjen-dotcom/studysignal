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
export type { KbDocumentService } from "./query/kbDocumentService";
export {
  MemoryKbDocumentService,
  createKbDocumentService,
} from "./query/kbDocumentService";
export type {
  KbRepositoryLoadResult,
  KbSkippedDocumentFile,
} from "./query/kbFileDocumentRepository";
export {
  getKbFileDocumentById,
  listKbDocumentFiles,
  loadKbDocumentServiceFromDir,
  loadKbDocumentsFromDir,
} from "./query/kbFileDocumentRepository";
export type {
  KbEvidenceItem,
  KbEvidencePack,
  KbEvidenceQuery,
} from "./query/kbEvidence";
export {
  KB_EVIDENCE_DEFAULT_LIMIT,
  KB_EVIDENCE_MAX_LIMIT,
  KB_EVIDENCE_MAX_QUERY_LENGTH,
  buildKbEvidencePack,
  normalizeEvidenceQuery,
} from "./query/kbEvidence";
export type {
  KbRetrievalCitation,
  KbRetrievalOptions,
  KbRetrievalResult,
} from "./query/kbRetrieval";
export {
  KB_RETRIEVAL_DEFAULT_MAX_EXCERPT_CHARS,
  KB_RETRIEVAL_DEFAULT_MAX_ITEMS,
  KB_RETRIEVAL_DEFAULT_MAX_SNIPPETS,
  KB_RETRIEVAL_MAX_EXCERPT_CHARS_CAP,
  KB_RETRIEVAL_MAX_ITEMS_CAP,
  KB_RETRIEVAL_MAX_SNIPPETS_CAP,
  buildKbRetrievalResult,
} from "./query/kbRetrieval";
export type {
  KbManifest,
  KbManifestEntry,
  KbManifestIssue,
  KbManifestIssueKind,
} from "./query/kbManifest";
export {
  KB_MANIFEST_VERSION,
  buildKbManifest,
  serializeKbManifest,
} from "./query/kbManifest";
export type {
  KbCandidateRecord,
  KbIngestionIssue,
  KbIngestionResult,
} from "./import/kbIngestionBoundary";
export {
  KB_INGESTION_ALLOWED_EXTENSIONS,
  KB_INGESTION_MAX_CONTENT_LENGTH,
  KB_INGESTION_MAX_PATH_LENGTH,
  KB_INGESTION_MAX_TITLE_LENGTH,
  KB_INGESTION_VERSION,
  validateKbCandidateRecord,
} from "./import/kbIngestionBoundary";
export type { KbCandidateImportResult } from "./import/kbCandidateImport";
export { KB_CANDIDATE_IMPORT_VERSION, importKbCandidate } from "./import/kbCandidateImport";
export {
  findNodeByCode,
  resolveNodeCurriculumContext,
  listExamEvidenceForNode,
  listPrerequisiteNodes,
  listNextNodesAfter,
} from "./utils/queryHelpers";
