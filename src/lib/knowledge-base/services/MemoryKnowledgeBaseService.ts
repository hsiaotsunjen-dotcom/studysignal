import {
  emptyKnowledgeBaseSnapshot,
  type KnowledgeBaseSnapshot,
} from "../schema/snapshot";
import type {
  Curriculum,
  EducationLevel,
  KnowledgeNode,
  Subject,
} from "../schema/entities";
import type {
  KnowledgeBaseValidationResult,
  NodeCurriculumContext,
  NodeExamEvidence,
} from "../types";
import {
  findNodeByCode,
  listExamEvidenceForNode,
  listNextNodesAfter,
  listPrerequisiteNodes,
  resolveNodeCurriculumContext,
} from "../utils/queryHelpers";
import { validateKnowledgeBaseSnapshot } from "../utils/validateSnapshot";
import type { KnowledgeBaseService } from "./KnowledgeBaseService";

/**
 * In-memory Knowledge Base — used for seed verification and early Tutor planning.
 * Swap later for a SQL-backed implementation without changing callers.
 */
export class MemoryKnowledgeBaseService implements KnowledgeBaseService {
  private snapshot: KnowledgeBaseSnapshot;

  constructor(initial?: KnowledgeBaseSnapshot) {
    this.snapshot = initial
      ? structuredClone(initial)
      : emptyKnowledgeBaseSnapshot();
  }

  async readSnapshot(): Promise<KnowledgeBaseSnapshot> {
    return structuredClone(this.snapshot);
  }

  async replaceSnapshot(snapshot: KnowledgeBaseSnapshot): Promise<void> {
    this.snapshot = structuredClone(snapshot);
  }

  async validate(): Promise<KnowledgeBaseValidationResult> {
    return validateKnowledgeBaseSnapshot(this.snapshot);
  }

  async getSubjectByCode(code: string): Promise<Subject | null> {
    return this.snapshot.subjects.find((s) => s.code === code) ?? null;
  }

  async getEducationLevelByCode(
    code: string,
  ): Promise<EducationLevel | null> {
    return this.snapshot.educationLevels.find((l) => l.code === code) ?? null;
  }

  async listActiveCurricula(subjectId: string): Promise<Curriculum[]> {
    return this.snapshot.curricula.filter(
      (c) => c.subjectId === subjectId && c.active,
    );
  }

  async listNodesByCurriculum(
    curriculumId: string,
  ): Promise<KnowledgeNode[]> {
    const unitIds = new Set(
      this.snapshot.curriculumUnits
        .filter((u) => u.curriculumId === curriculumId)
        .map((u) => u.id),
    );
    return this.snapshot.knowledgeNodes
      .filter((n) => unitIds.has(n.curriculumUnitId))
      .slice()
      .sort((a, b) => a.order - b.order);
  }

  async getNodeByCode(code: string): Promise<KnowledgeNode | null> {
    return findNodeByCode(this.snapshot, code) ?? null;
  }

  async getNodeCurriculumContext(
    nodeId: string,
  ): Promise<NodeCurriculumContext | null> {
    return resolveNodeCurriculumContext(this.snapshot, nodeId);
  }

  async listExamEvidenceForNode(
    nodeId: string,
  ): Promise<NodeExamEvidence[]> {
    return listExamEvidenceForNode(this.snapshot, nodeId);
  }

  async countExamQuestionsForNode(nodeId: string): Promise<number> {
    const evidence = listExamEvidenceForNode(this.snapshot, nodeId);
    return new Set(evidence.map((e) => e.question.id)).size;
  }

  async listPrerequisites(nodeId: string): Promise<KnowledgeNode[]> {
    return listPrerequisiteNodes(this.snapshot, nodeId);
  }

  async listSuggestedNextNodes(nodeId: string): Promise<KnowledgeNode[]> {
    return listNextNodesAfter(this.snapshot, nodeId);
  }
}
