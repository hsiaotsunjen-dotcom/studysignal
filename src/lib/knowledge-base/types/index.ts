import type {
  Curriculum,
  CurriculumUnit,
  EducationLevel,
  ExamQuestion,
  ExamSource,
  KnowledgeNode,
  KnowledgeRelation,
  LearningObjective,
  LearningResource,
  QuestionKnowledge,
  Subject,
} from "../schema/entities";
import type {
  DifficultyLevel,
  ExamSourceType,
  KnowledgeType,
  QuestionKnowledgeRole,
  QuestionType,
  RelationType,
  ResourceType,
  ScopeStatus,
} from "../schema/enums";
import type { KnowledgeBaseSnapshot } from "../schema/snapshot";

export type {
  Curriculum,
  CurriculumUnit,
  EducationLevel,
  ExamQuestion,
  ExamSource,
  KnowledgeNode,
  KnowledgeRelation,
  LearningObjective,
  LearningResource,
  QuestionKnowledge,
  Subject,
  DifficultyLevel,
  ExamSourceType,
  KnowledgeType,
  QuestionKnowledgeRole,
  QuestionType,
  RelationType,
  ResourceType,
  ScopeStatus,
  KnowledgeBaseSnapshot,
};

/** Curriculum context for a knowledge node (scope boundary). */
export type NodeCurriculumContext = {
  node: KnowledgeNode;
  unit: CurriculumUnit;
  curriculum: Curriculum;
  subject: Subject;
  educationLevel: EducationLevel;
};

/** Exam evidence linked to a knowledge node. */
export type NodeExamEvidence = {
  link: QuestionKnowledge;
  question: ExamQuestion;
  examSource: ExamSource;
};

export type KnowledgeBaseValidationIssue = {
  entity: string;
  id?: string;
  field?: string;
  message: string;
};

export type KnowledgeBaseValidationResult = {
  ok: boolean;
  issues: KnowledgeBaseValidationIssue[];
};
