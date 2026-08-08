/**
 * PRD-102 — Today's Mission Loop domain types.
 * Extends Learning OS vocabulary; does not duplicate Student Model.
 */

import type {
  ConfidenceLevel,
  LearningSignal,
  LearningStateId,
  Mission,
  StudentModel,
} from "@/lib/learning/types";

export const MISSION_PHASES = [
  "mission_start",
  "orient",
  "first_attempt",
  "tutor_respond",
  "second_attempt",
  "apply",
  "reflection",
  "complete",
  "abandoned",
] as const;

export type MissionPhase = (typeof MISSION_PHASES)[number];

export type MissionAttemptKind =
  | "first_idea"
  | "explanation"
  | "revision"
  | "apply";

export type MissionAttempt = {
  id: string;
  kind: MissionAttemptKind;
  text: string;
  createdAt: string;
  /** Soft observation only — never a permanent ability claim */
  observedQuality: "empty" | "thin" | "partial" | "solid" | "unknown";
  askedForAnswer: boolean;
};

export type TutorTurn = {
  id: string;
  /** Student-facing only — no hidden reasoning exposed in UI */
  message: string;
  /** Internal strategy tag for tests / state influence */
  strategy:
    | "prompt_thinking"
    | "ask_reasoning"
    | "scaffold"
    | "simplify"
    | "stretch"
    | "reduce_intervention"
    | "deflect_answer_request"
    | "encourage_persist";
  learningStateAtTurn: LearningStateId;
  createdAt: string;
};

export type MissionReflection = {
  clearer: string;
  difficult: string;
  differently: string;
  confidenceNow: "low" | "medium" | "high";
  createdAt: string;
};

export type TomorrowSeed = {
  id: string;
  studentId: string;
  basedOnMissionId: string;
  focus: string;
  unresolvedDifficulty: string | null;
  successfulStrategy: string | null;
  transferOpportunity: string | null;
  suggestedState: LearningStateId;
  createdAt: string;
};

export type ModelObservation = {
  text: string;
  kind: "observed" | "inferred";
  confidence: ConfidenceLevel;
  at: string;
};

/** Working Student Model during/after mission — same shape, updated in place */
export type MissionLoopSession = {
  version: "1.0";
  id: string;
  studentId: string;
  phase: MissionPhase;
  mission: Mission;
  /** Authoritative working model for this loop (synced back to onboarding store) */
  studentModel: StudentModel;
  learningState: LearningStateId;
  attempts: MissionAttempt[];
  tutorTurns: TutorTurn[];
  signals: LearningSignal[];
  reflection: MissionReflection | null;
  tomorrowSeed: TomorrowSeed | null;
  hintCount: number;
  answerRequestCount: number;
  /** Soft patches accumulated — not permanent ability claims */
  modelObservations: ModelObservation[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastError: string | null;
};
