/**
 * PRD-101 — Student Onboarding data structures.
 * Aligns with Learning OS / Kernel / State Engine vocabulary.
 */

export const LEARNING_STATES = [
  "Ready",
  "Orienting",
  "Building",
  "Productive Struggle",
  "Unproductive Struggle",
  "Misconception-Led",
  "Consolidating",
  "Transferring",
  "Creating",
  "Overloaded",
  "Affect-Blocked",
  "Independent",
  "Disengaged",
  "Reflecting",
  "Recovering",
] as const;

export type LearningStateId = (typeof LEARNING_STATES)[number];

export const ONBOARDING_PHASES = [
  "ONBOARDING_START",
  "IDENTITY_CAPTURED",
  "GOAL_CAPTURED",
  "CONTEXT_CAPTURED",
  "DIAGNOSTIC_STARTED",
  "DIAGNOSTIC_OBSERVED",
  "MODEL_INITIALIZED",
  "STATE_ESTABLISHED",
  "MISSION_CREATED",
  "ONBOARDING_COMPLETE",
] as const;

export type OnboardingPhase = (typeof ONBOARDING_PHASES)[number];

export type SignalKind =
  | "response_correctness"
  | "explanation_quality"
  | "confidence"
  | "hesitation"
  | "misconception"
  | "preferred_interaction_mode"
  | "persistence"
  | "transfer"
  | "self_report"
  | "goal_clarity"
  /** PRD-102 mission loop */
  | "attempted"
  | "asked_for_hint"
  | "explained_reasoning"
  | "demonstrated_confidence"
  | "demonstrated_uncertainty"
  | "reflected"
  | "completed_independently"
  | "answer_seeking"
  /** PRD-103 tutor signal bridge */
  | "corrected_after_scaffold"
  | "successful_application"
  | "productive_struggle";

export type ConfidenceLevel = "low" | "medium" | "high";

export type LearningSignalWhere = "mission" | "app_tutor" | "onboarding";

export type LearningSignal = {
  id: string;
  kind: SignalKind;
  /** Observed fact — not a personality label */
  observation: string;
  value: string | number | boolean;
  confidence: ConfidenceLevel;
  source:
    | "onboarding"
    | "diagnostic"
    | "self_report"
    | "mission"
    | "reflection"
    | "tutor";
  createdAt: string;
  /** Provenance — never raw chat transcript */
  where?: LearningSignalWhere;
  contextId?: string;
  /** Stable fingerprint to prevent duplicate append after refresh */
  eventKey?: string;
};

export type LearningGoal = {
  statement: string;
  subject: string;
  horizon: "near" | "ongoing";
};

export type LearningDnaSeed = {
  /** Soft preferences — low confidence until repeated */
  preferredPace: "slow" | "steady" | "fast" | "unknown";
  preferredMode: "guide" | "practice" | "explain" | "unknown";
  persistenceHint: "unknown" | "tries" | "gives_up_early";
  notes: string[];
  confidence: ConfidenceLevel;
};

export type StudentIdentity = {
  preferredName: string;
};

export type StudentContext = {
  learningContext: string;
  selfPerceivedDifficulty: "easy" | "ok" | "hard" | "unsure";
  preference?: "guide" | "practice" | "explain";
};

export type DiagnosticEvidence = {
  promptId: string;
  prompt: string;
  attempt: string;
  followUpPrompt: string;
  followUpResponse: string;
  observedCorrectness: "correct" | "partial" | "incorrect" | "unknown";
  explanationQuality: "thin" | "adequate" | "rich" | "unknown";
  confidenceSelf: "low" | "medium" | "high" | "unknown";
};

export type StudentModel = {
  version: "1.0";
  studentId: string;
  identity: StudentIdentity;
  goals: LearningGoal;
  subjectContext: {
    subject: string;
    context: string;
  };
  knownEvidence: string[];
  unknownAreas: string[];
  confidenceEstimates: {
    subjectFamiliarity: ConfidenceLevel;
    goalClarity: ConfidenceLevel;
    diagnosticRead: ConfidenceLevel;
  };
  learningState: LearningStateId;
  learningDna: LearningDnaSeed;
  onboardingTimestamp: string;
  modelVersion: string;
};

export type Mission = {
  id: string;
  title: string;
  purpose: string;
  difficulty: "gentle" | "stretch" | "recover";
  prompt: string;
  successCondition: string;
  evidenceTargets: SignalKind[];
  nextStepDecision: string;
  subject: string;
  createdAt: string;
};

export type OnboardingDraft = {
  preferredName: string;
  goalStatement: string;
  subject: string;
  learningContext: string;
  selfPerceivedDifficulty: StudentContext["selfPerceivedDifficulty"] | "";
  preference: StudentContext["preference"] | "";
  diagnosticAttempt: string;
  diagnosticFollowUp: string;
  diagnosticConfidence: DiagnosticEvidence["confidenceSelf"] | "";
};

export type OnboardingSession = {
  id: string;
  phase: OnboardingPhase;
  draft: OnboardingDraft;
  signals: LearningSignal[];
  diagnostic: DiagnosticEvidence | null;
  studentModel: StudentModel | null;
  mission: Mission | null;
  uiStep: OnboardingUiStep;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
};

/** Collapsed UX steps (fewer screens than phase list) */
export type OnboardingUiStep =
  | "welcome"
  | "identity"
  | "goal"
  | "context"
  | "diagnostic"
  | "reflect"
  | "mission"
  | "complete";
