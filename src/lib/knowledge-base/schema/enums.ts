/**
 * Knowledge Base domain enums.
 * Provider-agnostic — same values map to SQL CHECK / Postgres ENUM later.
 */

export const KNOWLEDGE_TYPES = [
  "concept",
  "process",
  "principle",
  "terminology",
  "calculation",
  "application",
] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

export const SCOPE_STATUSES = ["core", "extended", "out_of_scope"] as const;
export type ScopeStatus = (typeof SCOPE_STATUSES)[number];

export const RELATION_TYPES = [
  "prerequisite",
  "related",
  "parent",
  "application",
  "contrast",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const QUESTION_KNOWLEDGE_ROLES = ["primary", "supporting"] as const;
export type QuestionKnowledgeRole = (typeof QUESTION_KNOWLEDGE_ROLES)[number];

export const QUESTION_TYPES = [
  "multiple_choice",
  "short_answer",
  "essay",
  "true_false",
  "mixed",
  "other",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const EXAM_SOURCE_TYPES = [
  "national_exam",
  "mock_exam",
  "school_exam",
  "textbook_exercise",
  "other",
] as const;
export type ExamSourceType = (typeof EXAM_SOURCE_TYPES)[number];

export const RESOURCE_TYPES = [
  "textbook",
  "worksheet",
  "video",
  "article",
  "notes",
  "other",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const DIFFICULTY_LEVELS = [
  "intro",
  "basic",
  "intermediate",
  "advanced",
] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];
