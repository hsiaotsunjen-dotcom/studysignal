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
} from "./entities";

/** Full relational snapshot — one portable unit for any store backend. */
export type KnowledgeBaseSnapshot = {
  subjects: Subject[];
  educationLevels: EducationLevel[];
  curricula: Curriculum[];
  curriculumUnits: CurriculumUnit[];
  knowledgeNodes: KnowledgeNode[];
  knowledgeRelations: KnowledgeRelation[];
  examSources: ExamSource[];
  examQuestions: ExamQuestion[];
  questionKnowledge: QuestionKnowledge[];
  learningObjectives: LearningObjective[];
  learningResources: LearningResource[];
};

export function emptyKnowledgeBaseSnapshot(): KnowledgeBaseSnapshot {
  return {
    subjects: [],
    educationLevels: [],
    curricula: [],
    curriculumUnits: [],
    knowledgeNodes: [],
    knowledgeRelations: [],
    examSources: [],
    examQuestions: [],
    questionKnowledge: [],
    learningObjectives: [],
    learningResources: [],
  };
}
