import type {
  Curriculum,
  EducationLevel,
  KnowledgeNode,
  Subject,
} from "../schema/entities";
import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import type {
  KnowledgeBaseValidationResult,
  NodeCurriculumContext,
  NodeExamEvidence,
} from "../types";

/**
 * Provider-agnostic Knowledge Base service.
 * Implementations may use memory, JSON files, or a future SQL store.
 * Does not depend on any AI model or embedding provider.
 */
export interface KnowledgeBaseService {
  readSnapshot(): Promise<KnowledgeBaseSnapshot>;
  replaceSnapshot(snapshot: KnowledgeBaseSnapshot): Promise<void>;
  validate(): Promise<KnowledgeBaseValidationResult>;

  getSubjectByCode(code: string): Promise<Subject | null>;
  getEducationLevelByCode(code: string): Promise<EducationLevel | null>;
  listActiveCurricula(subjectId: string): Promise<Curriculum[]>;
  listNodesByCurriculum(curriculumId: string): Promise<KnowledgeNode[]>;

  getNodeByCode(code: string): Promise<KnowledgeNode | null>;
  getNodeCurriculumContext(
    nodeId: string,
  ): Promise<NodeCurriculumContext | null>;
  listExamEvidenceForNode(nodeId: string): Promise<NodeExamEvidence[]>;
  countExamQuestionsForNode(nodeId: string): Promise<number>;
  listPrerequisites(nodeId: string): Promise<KnowledgeNode[]>;
  listSuggestedNextNodes(nodeId: string): Promise<KnowledgeNode[]>;
}
