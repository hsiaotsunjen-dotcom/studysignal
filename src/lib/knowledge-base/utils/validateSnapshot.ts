import {
  DIFFICULTY_LEVELS,
  EXAM_SOURCE_TYPES,
  KNOWLEDGE_TYPES,
  QUESTION_KNOWLEDGE_ROLES,
  QUESTION_TYPES,
  RELATION_TYPES,
  RESOURCE_TYPES,
  SCOPE_STATUSES,
} from "../schema/enums";
import type { KnowledgeBaseSnapshot } from "../schema/snapshot";
import type {
  KnowledgeBaseValidationIssue,
  KnowledgeBaseValidationResult,
} from "../types";

function includes<T extends string>(
  allowed: readonly T[],
  value: string,
): value is T {
  return (allowed as readonly string[]).includes(value);
}

function indexById<T extends { id: string }>(
  rows: T[],
): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * Referential + enum integrity check for a Knowledge Base snapshot.
 * Does not invent curriculum content — only validates structure.
 */
export function validateKnowledgeBaseSnapshot(
  snap: KnowledgeBaseSnapshot,
): KnowledgeBaseValidationResult {
  const issues: KnowledgeBaseValidationIssue[] = [];

  const subjects = indexById(snap.subjects);
  const levels = indexById(snap.educationLevels);
  const curricula = indexById(snap.curricula);
  const units = indexById(snap.curriculumUnits);
  const nodes = indexById(snap.knowledgeNodes);
  const exams = indexById(snap.examSources);
  const questions = indexById(snap.examQuestions);

  const assertUnique = (
    entity: string,
    rows: { id: string }[],
  ) => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.id)) {
        issues.push({
          entity,
          id: row.id,
          field: "id",
          message: "duplicate id",
        });
      }
      seen.add(row.id);
    }
  };

  assertUnique("Subject", snap.subjects);
  assertUnique("EducationLevel", snap.educationLevels);
  assertUnique("Curriculum", snap.curricula);
  assertUnique("CurriculumUnit", snap.curriculumUnits);
  assertUnique("KnowledgeNode", snap.knowledgeNodes);
  assertUnique("KnowledgeRelation", snap.knowledgeRelations);
  assertUnique("ExamSource", snap.examSources);
  assertUnique("ExamQuestion", snap.examQuestions);
  assertUnique("QuestionKnowledge", snap.questionKnowledge);
  assertUnique("LearningObjective", snap.learningObjectives);
  assertUnique("LearningResource", snap.learningResources);

  const subjectCodes = new Set<string>();
  for (const s of snap.subjects) {
    if (subjectCodes.has(s.code)) {
      issues.push({
        entity: "Subject",
        id: s.id,
        field: "code",
        message: `duplicate code "${s.code}"`,
      });
    }
    subjectCodes.add(s.code);
  }

  const nodeCodes = new Set<string>();
  for (const n of snap.knowledgeNodes) {
    if (nodeCodes.has(n.code)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "code",
        message: `duplicate code "${n.code}"`,
      });
    }
    nodeCodes.add(n.code);

    if (!subjects.has(n.subjectId)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "subjectId",
        message: "missing Subject",
      });
    }
    if (!units.has(n.curriculumUnitId)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "curriculumUnitId",
        message: "missing CurriculumUnit",
      });
    }
    if (n.parentId && !nodes.has(n.parentId)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "parentId",
        message: "missing parent KnowledgeNode",
      });
    }
    if (!includes(KNOWLEDGE_TYPES, n.knowledgeType)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "knowledgeType",
        message: `invalid ${n.knowledgeType}`,
      });
    }
    if (!includes(DIFFICULTY_LEVELS, n.difficulty)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "difficulty",
        message: `invalid ${n.difficulty}`,
      });
    }
    if (!includes(SCOPE_STATUSES, n.scopeStatus)) {
      issues.push({
        entity: "KnowledgeNode",
        id: n.id,
        field: "scopeStatus",
        message: `invalid ${n.scopeStatus}`,
      });
    }
  }

  for (const c of snap.curricula) {
    if (!subjects.has(c.subjectId)) {
      issues.push({
        entity: "Curriculum",
        id: c.id,
        field: "subjectId",
        message: "missing Subject",
      });
    }
    if (!levels.has(c.educationLevelId)) {
      issues.push({
        entity: "Curriculum",
        id: c.id,
        field: "educationLevelId",
        message: "missing EducationLevel",
      });
    }
  }

  for (const u of snap.curriculumUnits) {
    if (!curricula.has(u.curriculumId)) {
      issues.push({
        entity: "CurriculumUnit",
        id: u.id,
        field: "curriculumId",
        message: "missing Curriculum",
      });
    }
    if (u.parentId && !units.has(u.parentId)) {
      issues.push({
        entity: "CurriculumUnit",
        id: u.id,
        field: "parentId",
        message: "missing parent CurriculumUnit",
      });
    }
  }

  for (const r of snap.knowledgeRelations) {
    if (!nodes.has(r.sourceNodeId) || !nodes.has(r.targetNodeId)) {
      issues.push({
        entity: "KnowledgeRelation",
        id: r.id,
        message: "source or target KnowledgeNode missing",
      });
    }
    if (r.sourceNodeId === r.targetNodeId) {
      issues.push({
        entity: "KnowledgeRelation",
        id: r.id,
        message: "self-relation not allowed",
      });
    }
    if (!includes(RELATION_TYPES, r.relationType)) {
      issues.push({
        entity: "KnowledgeRelation",
        id: r.id,
        field: "relationType",
        message: `invalid ${r.relationType}`,
      });
    }
  }

  for (const e of snap.examSources) {
    if (!subjects.has(e.subjectId) || !levels.has(e.educationLevelId)) {
      issues.push({
        entity: "ExamSource",
        id: e.id,
        message: "missing Subject or EducationLevel",
      });
    }
    if (!includes(EXAM_SOURCE_TYPES, e.sourceType)) {
      issues.push({
        entity: "ExamSource",
        id: e.id,
        field: "sourceType",
        message: `invalid ${e.sourceType}`,
      });
    }
  }

  for (const q of snap.examQuestions) {
    if (!exams.has(q.examSourceId)) {
      issues.push({
        entity: "ExamQuestion",
        id: q.id,
        field: "examSourceId",
        message: "missing ExamSource",
      });
    }
    if (!includes(QUESTION_TYPES, q.questionType)) {
      issues.push({
        entity: "ExamQuestion",
        id: q.id,
        field: "questionType",
        message: `invalid ${q.questionType}`,
      });
    }
    if (!includes(DIFFICULTY_LEVELS, q.difficulty)) {
      issues.push({
        entity: "ExamQuestion",
        id: q.id,
        field: "difficulty",
        message: `invalid ${q.difficulty}`,
      });
    }
  }

  for (const link of snap.questionKnowledge) {
    if (!questions.has(link.questionId) || !nodes.has(link.knowledgeNodeId)) {
      issues.push({
        entity: "QuestionKnowledge",
        id: link.id,
        message: "missing ExamQuestion or KnowledgeNode",
      });
    }
    if (!includes(QUESTION_KNOWLEDGE_ROLES, link.role)) {
      issues.push({
        entity: "QuestionKnowledge",
        id: link.id,
        field: "role",
        message: `invalid ${link.role}`,
      });
    }
    if (link.relevance < 0 || link.relevance > 1) {
      issues.push({
        entity: "QuestionKnowledge",
        id: link.id,
        field: "relevance",
        message: "relevance must be between 0 and 1",
      });
    }
  }

  for (const o of snap.learningObjectives) {
    if (!nodes.has(o.knowledgeNodeId)) {
      issues.push({
        entity: "LearningObjective",
        id: o.id,
        field: "knowledgeNodeId",
        message: "missing KnowledgeNode",
      });
    }
  }

  for (const res of snap.learningResources) {
    if (!nodes.has(res.knowledgeNodeId)) {
      issues.push({
        entity: "LearningResource",
        id: res.id,
        field: "knowledgeNodeId",
        message: "missing KnowledgeNode",
      });
    }
    if (!includes(RESOURCE_TYPES, res.resourceType)) {
      issues.push({
        entity: "LearningResource",
        id: res.id,
        field: "resourceType",
        message: `invalid ${res.resourceType}`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
