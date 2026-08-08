/**
 * Modular onboarding analysis — keep providers swappable.
 * Deterministic analyzer is the default; never invent a Student Model.
 */

import {
  observeDiagnostic,
  establishInitialState,
  initializeStudentModel,
  createFirstMission,
  buildSignalsFromDraft,
} from "@/lib/learning/onboardingEngine";
import type {
  DiagnosticEvidence,
  LearningSignal,
  LearningStateId,
  Mission,
  OnboardingDraft,
  StudentModel,
} from "@/lib/learning/types";

export type OnboardingAnalysis = {
  diagnostic: DiagnosticEvidence;
  signals: LearningSignal[];
  learningState: LearningStateId;
  studentModel: StudentModel;
  mission: Mission;
};

export interface OnboardingAnalyzer {
  analyze(draft: OnboardingDraft): Promise<OnboardingAnalysis>;
}

/** Evidence-only analyzer — no LLM, no invented psychology. */
export class DeterministicOnboardingAnalyzer implements OnboardingAnalyzer {
  async analyze(draft: OnboardingDraft): Promise<OnboardingAnalysis> {
    if (!draft.preferredName.trim() || !draft.goalStatement.trim()) {
      throw new Error("INSUFFICIENT_INPUT");
    }
    const diagnostic = observeDiagnostic(draft);
    const signals = buildSignalsFromDraft(draft, diagnostic);
    const learningState = establishInitialState(draft, diagnostic);
    const studentModel = initializeStudentModel(
      draft,
      diagnostic,
      learningState,
    );
    const mission = createFirstMission(studentModel, diagnostic);
    return { diagnostic, signals, learningState, studentModel, mission };
  }
}

let analyzer: OnboardingAnalyzer = new DeterministicOnboardingAnalyzer();

export function getOnboardingAnalyzer(): OnboardingAnalyzer {
  return analyzer;
}

/** Tests / future LLM provider injection */
export function setOnboardingAnalyzer(next: OnboardingAnalyzer): void {
  analyzer = next;
}
