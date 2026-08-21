import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import type { KnowledgeNode } from "../schema/entities";
import type { NodeCurriculumContext, NodeExamEvidence } from "../types";

export function findNodeByCode(
  snap: KnowledgeBaseSnapshot,
  code: string,
): KnowledgeNode | undefined {
  return snap.knowledgeNodes.find((n) => n.code === code);
}

export function resolveNodeCurriculumContext(
  snap: KnowledgeBaseSnapshot,
  nodeId: string,
): NodeCurriculumContext | null {
  const node = snap.knowledgeNodes.find((n) => n.id === nodeId);
  if (!node) return null;
  const unit = snap.curriculumUnits.find((u) => u.id === node.curriculumUnitId);
  if (!unit) return null;
  const curriculum = snap.curricula.find((c) => c.id === unit.curriculumId);
  if (!curriculum) return null;
  const subject = snap.subjects.find((s) => s.id === curriculum.subjectId);
  const educationLevel = snap.educationLevels.find(
    (l) => l.id === curriculum.educationLevelId,
  );
  if (!subject || !educationLevel) return null;
  return { node, unit, curriculum, subject, educationLevel };
}

export function listExamEvidenceForNode(
  snap: KnowledgeBaseSnapshot,
  nodeId: string,
): NodeExamEvidence[] {
  const out: NodeExamEvidence[] = [];
  for (const link of snap.questionKnowledge) {
    if (link.knowledgeNodeId !== nodeId) continue;
    const question = snap.examQuestions.find((q) => q.id === link.questionId);
    if (!question) continue;
    const examSource = snap.examSources.find(
      (e) => e.id === question.examSourceId,
    );
    if (!examSource) continue;
    out.push({ link, question, examSource });
  }
  return out;
}

/** Nodes that must be learned before `nodeId` (incoming prerequisite). */
export function listPrerequisiteNodes(
  snap: KnowledgeBaseSnapshot,
  nodeId: string,
): KnowledgeNode[] {
  return snap.knowledgeRelations
    .filter(
      (r) =>
        r.targetNodeId === nodeId && r.relationType === "prerequisite",
    )
    .map((r) => snap.knowledgeNodes.find((n) => n.id === r.sourceNodeId))
    .filter((n): n is KnowledgeNode => Boolean(n));
}

/** Nodes that list `nodeId` as a prerequisite (suggested next steps). */
export function listNextNodesAfter(
  snap: KnowledgeBaseSnapshot,
  nodeId: string,
): KnowledgeNode[] {
  return snap.knowledgeRelations
    .filter(
      (r) =>
        r.sourceNodeId === nodeId && r.relationType === "prerequisite",
    )
    .map((r) => snap.knowledgeNodes.find((n) => n.id === r.targetNodeId))
    .filter((n): n is KnowledgeNode => Boolean(n));
}
