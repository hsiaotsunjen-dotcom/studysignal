/**
 * Knowledge Base entity shapes (relational skeleton).
 * No ORM yet — these types are the contract for future SQL / provider stores.
 */

import type {
  DifficultyLevel,
  ExamSourceType,
  KnowledgeType,
  QuestionKnowledgeRole,
  QuestionType,
  RelationType,
  ResourceType,
  ScopeStatus,
} from "./enums";

export type Subject = {
  id: string;
  name: string;
  code: string;
  description: string;
  active: boolean;
};

export type EducationLevel = {
  id: string;
  name: string;
  code: string;
  description: string;
};

export type Curriculum = {
  id: string;
  subjectId: string;
  educationLevelId: string;
  name: string;
  version: string;
  source: string;
  scopeDescription: string;
  active: boolean;
};

export type CurriculumUnit = {
  id: string;
  curriculumId: string;
  parentId: string | null;
  title: string;
  description: string;
  order: number;
  /** Hierarchy depth: 1 = top-level unit, 2 = subunit, … */
  level: number;
};

export type KnowledgeNode = {
  id: string;
  subjectId: string;
  curriculumUnitId: string;
  parentId: string | null;
  code: string;
  title: string;
  description: string;
  knowledgeType: KnowledgeType;
  difficulty: DifficultyLevel;
  scopeStatus: ScopeStatus;
  order: number;
};

export type KnowledgeRelation = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  weight: number;
};

export type ExamSource = {
  id: string;
  subjectId: string;
  educationLevelId: string;
  year: number;
  examName: string;
  sourceType: ExamSourceType;
  sourceFile: string | null;
  sourceUrl: string | null;
};

export type ExamQuestion = {
  id: string;
  examSourceId: string;
  questionNumber: string;
  questionType: QuestionType;
  questionText: string;
  answer: string;
  explanation: string;
  difficulty: DifficultyLevel;
};

export type QuestionKnowledge = {
  id: string;
  questionId: string;
  knowledgeNodeId: string;
  relevance: number;
  role: QuestionKnowledgeRole;
};

export type LearningObjective = {
  id: string;
  knowledgeNodeId: string;
  objective: string;
  measurableCriteria: string;
};

export type LearningResource = {
  id: string;
  knowledgeNodeId: string;
  resourceType: ResourceType;
  title: string;
  source: string;
  url: string | null;
  description: string;
};
