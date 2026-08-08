import { diagnosticForGoal } from "@/lib/learning/diagnostic";
import { createSessionId } from "@/lib/learning/onboardingStore";
import type {
  ConfidenceLevel,
  DiagnosticEvidence,
  LearningDnaSeed,
  LearningSignal,
  LearningStateId,
  Mission,
  OnboardingDraft,
  OnboardingPhase,
  OnboardingSession,
  OnboardingUiStep,
  StudentModel,
} from "@/lib/learning/types";

const MODEL_VERSION = "student-model.v1";

export function emptyDraft(): OnboardingDraft {
  return {
    preferredName: "",
    goalStatement: "",
    subject: "",
    learningContext: "",
    selfPerceivedDifficulty: "",
    preference: "",
    diagnosticAttempt: "",
    diagnosticFollowUp: "",
    diagnosticConfidence: "",
  };
}

export function createOnboardingSession(): OnboardingSession {
  const now = new Date().toISOString();
  return {
    id: createSessionId(),
    phase: "ONBOARDING_START",
    draft: emptyDraft(),
    signals: [],
    diagnostic: null,
    studentModel: null,
    mission: null,
    uiStep: "welcome",
    createdAt: now,
    updatedAt: now,
    lastError: null,
  };
}

function signal(
  kind: LearningSignal["kind"],
  observation: string,
  value: LearningSignal["value"],
  confidence: ConfidenceLevel,
  source: LearningSignal["source"],
): LearningSignal {
  return {
    id: createSessionId(),
    kind,
    observation,
    value,
    confidence,
    source,
    createdAt: new Date().toISOString(),
  };
}

export function phaseForUiStep(step: OnboardingUiStep): OnboardingPhase {
  switch (step) {
    case "welcome":
      return "ONBOARDING_START";
    case "identity":
      return "IDENTITY_CAPTURED";
    case "goal":
      return "GOAL_CAPTURED";
    case "context":
      return "CONTEXT_CAPTURED";
    case "diagnostic":
      return "DIAGNOSTIC_STARTED";
    case "reflect":
      return "DIAGNOSTIC_OBSERVED";
    case "mission":
      return "MISSION_CREATED";
    case "complete":
      return "ONBOARDING_COMPLETE";
    default:
      return "ONBOARDING_START";
  }
}

/** Observe attempt without pretending certainty */
export function observeDiagnostic(
  draft: OnboardingDraft,
): DiagnosticEvidence {
  const prompt = diagnosticForGoal({ subject: draft.subject || "一般" });
  const attempt = draft.diagnosticAttempt.trim();
  const follow = draft.diagnosticFollowUp.trim();
  const lower = attempt.toLowerCase();

  let observedCorrectness: DiagnosticEvidence["observedCorrectness"] = "unknown";
  if (attempt.length < 4) {
    observedCorrectness = "unknown";
  } else if (prompt.softHints.some((h) => lower.includes(h.toLowerCase()))) {
    observedCorrectness = "partial";
  } else if (attempt.length >= 12) {
    observedCorrectness = "partial";
  } else {
    observedCorrectness = "unknown";
  }

  let explanationQuality: DiagnosticEvidence["explanationQuality"] = "unknown";
  const combined = `${attempt} ${follow}`;
  if (combined.length < 8) explanationQuality = "thin";
  else if (combined.length < 40) explanationQuality = "adequate";
  else explanationQuality = "rich";

  return {
    promptId: prompt.id,
    prompt: prompt.prompt,
    attempt,
    followUpPrompt: prompt.followUp,
    followUpResponse: follow,
    observedCorrectness,
    explanationQuality,
    confidenceSelf: draft.diagnosticConfidence || "unknown",
  };
}

export function buildSignalsFromDraft(
  draft: OnboardingDraft,
  diagnostic: DiagnosticEvidence | null,
): LearningSignal[] {
  const out: LearningSignal[] = [];

  if (draft.goalStatement.trim()) {
    out.push(
      signal(
        "goal_clarity",
        "Student stated a learning goal in their own words",
        draft.goalStatement.trim(),
        draft.goalStatement.trim().length >= 8 ? "medium" : "low",
        "self_report",
      ),
    );
  }

  if (draft.selfPerceivedDifficulty) {
    out.push(
      signal(
        "confidence",
        "Self-perceived difficulty with the subject area",
        draft.selfPerceivedDifficulty,
        "medium",
        "self_report",
      ),
    );
  }

  if (draft.preference) {
    out.push(
      signal(
        "preferred_interaction_mode",
        "Preferred first interaction mode",
        draft.preference,
        "low",
        "self_report",
      ),
    );
  }

  if (diagnostic) {
    out.push(
      signal(
        "response_correctness",
        "Diagnostic attempt correctness (weak single-sample estimate)",
        diagnostic.observedCorrectness,
        diagnostic.observedCorrectness === "unknown" ? "low" : "medium",
        "diagnostic",
      ),
    );
    out.push(
      signal(
        "explanation_quality",
        "How much reasoning the student offered",
        diagnostic.explanationQuality,
        "medium",
        "diagnostic",
      ),
    );
    if (diagnostic.confidenceSelf !== "unknown") {
      out.push(
        signal(
          "confidence",
          "Self-reported confidence after diagnostic",
          diagnostic.confidenceSelf,
          "medium",
          "diagnostic",
        ),
      );
    }
    if (diagnostic.followUpResponse.trim().length >= 6) {
      out.push(
        signal(
          "persistence",
          "Student engaged with a follow-up prompt",
          true,
          "medium",
          "diagnostic",
        ),
      );
    }
  }

  return out;
}

export function establishInitialState(
  draft: OnboardingDraft,
  diagnostic: DiagnosticEvidence | null,
): LearningStateId {
  const diff = draft.selfPerceivedDifficulty;
  const conf = diagnostic?.confidenceSelf;
  const quality = diagnostic?.explanationQuality;

  if (diff === "hard" && (conf === "low" || quality === "thin")) {
    return "Orienting";
  }
  if (diff === "hard" && quality === "adequate") {
    return "Productive Struggle";
  }
  if (diff === "easy" && quality === "rich") {
    return "Ready";
  }
  if (diff === "unsure" || !diagnostic) {
    return "Orienting";
  }
  if (quality === "thin") {
    return "Building";
  }
  return "Building";
}

function dnaFromDraft(
  draft: OnboardingDraft,
  diagnostic: DiagnosticEvidence | null,
): LearningDnaSeed {
  const preferredMode = draft.preference || "unknown";
  let persistenceHint: LearningDnaSeed["persistenceHint"] = "unknown";
  if (diagnostic?.followUpResponse.trim()) persistenceHint = "tries";

  return {
    preferredPace: "unknown",
    preferredMode,
    persistenceHint,
    notes: [
      draft.learningContext.trim()
        ? `Context: ${draft.learningContext.trim()}`
        : "Context not yet known",
    ],
    confidence: "low",
  };
}

export function initializeStudentModel(
  draft: OnboardingDraft,
  diagnostic: DiagnosticEvidence | null,
  learningState: LearningStateId,
): StudentModel {
  const knownEvidence: string[] = [];
  const unknownAreas: string[] = [
    "長期記憶與遺忘曲線",
    "跨主題遷移能力",
    "持續困難下的情緒反應",
  ];

  if (draft.preferredName.trim()) {
    knownEvidence.push(`Prefers to be called ${draft.preferredName.trim()}`);
  }
  if (draft.goalStatement.trim()) {
    knownEvidence.push(`Goal: ${draft.goalStatement.trim()}`);
  }
  if (draft.subject.trim()) {
    knownEvidence.push(`Focus subject: ${draft.subject.trim()}`);
  }
  if (draft.learningContext.trim()) {
    knownEvidence.push(`Context: ${draft.learningContext.trim()}`);
  }
  if (diagnostic?.attempt) {
    knownEvidence.push(
      `Diagnostic attempt observed (${diagnostic.observedCorrectness}, explanation ${diagnostic.explanationQuality})`,
    );
  } else {
    unknownAreas.unshift("診斷互動中的推理模式");
  }

  const subjectFamiliarity: ConfidenceLevel =
    draft.selfPerceivedDifficulty === "easy"
      ? "medium"
      : draft.selfPerceivedDifficulty === "hard"
        ? "low"
        : "low";

  return {
    version: "1.0",
    studentId: `student-${createSessionId()}`,
    identity: { preferredName: draft.preferredName.trim() },
    goals: {
      statement: draft.goalStatement.trim(),
      subject: draft.subject.trim() || "一般",
      horizon: "near",
    },
    subjectContext: {
      subject: draft.subject.trim() || "一般",
      context: draft.learningContext.trim() || "unknown",
    },
    knownEvidence,
    unknownAreas,
    confidenceEstimates: {
      subjectFamiliarity,
      goalClarity: draft.goalStatement.trim().length >= 8 ? "medium" : "low",
      diagnosticRead: diagnostic ? "medium" : "low",
    },
    learningState,
    learningDna: dnaFromDraft(draft, diagnostic),
    onboardingTimestamp: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
  };
}

export function createFirstMission(
  model: StudentModel,
  diagnostic: DiagnosticEvidence | null,
): Mission {
  const subject = model.goals.subject;
  const name = model.identity.preferredName || "你";
  const state = model.learningState;

  let difficulty: Mission["difficulty"] = "gentle";
  if (state === "Ready") difficulty = "stretch";
  if (state === "Orienting" || state === "Recovering") difficulty = "recover";

  const purpose =
    state === "Orienting"
      ? `幫${name}在「${subject}」上找到一個可以開始的小落腳點`
      : `帶${name}朝「${model.goals.statement}」踏出第一個可觀察的學習動作`;

  const prompt =
    diagnostic && diagnostic.explanationQuality !== "rich"
      ? `回到剛才的想法：用一句話說明你卡在哪裡，然後試著再走一小步。主題：${subject}。`
      : `選擇「${subject}」裡一個小目標，用自己的話解釋你打算怎麼開始，並實際做一次（說、寫或算都可以）。`;

  return {
    id: `mission-${createSessionId()}`,
    title: "今天的第一個任務",
    purpose,
    difficulty,
    prompt,
    successCondition:
      "學生提出至少一段自己的推理或嘗試，且能說出下一步想做什麼",
    evidenceTargets: [
      "explanation_quality",
      "persistence",
      "confidence",
      "response_correctness",
    ],
    nextStepDecision:
      "依嘗試品質與情緒訊號，決定加深練習、放慢引導，或澄清迷思",
    subject,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Finalize model + state + mission from preserved draft.
 * Never invents evidence beyond draft + diagnostic observation.
 */
export function finalizeOnboarding(
  session: OnboardingSession,
): OnboardingSession {
  const draft = session.draft;
  if (!draft.preferredName.trim() || !draft.goalStatement.trim()) {
    return {
      ...session,
      lastError: "還需要暱稱與學習目標，才能建立學生模型。",
    };
  }

  const diagnostic = observeDiagnostic(draft);
  const signals = buildSignalsFromDraft(draft, diagnostic);
  const learningState = establishInitialState(draft, diagnostic);
  const studentModel = initializeStudentModel(draft, diagnostic, learningState);
  const mission = createFirstMission(studentModel, diagnostic);

  return {
    ...session,
    diagnostic,
    signals,
    studentModel,
    mission,
    phase: "MISSION_CREATED",
    uiStep: "mission",
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

export function markOnboardingComplete(
  session: OnboardingSession,
): OnboardingSession {
  if (!session.studentModel || !session.mission) {
    return {
      ...session,
      lastError: "尚未完成學生模型與任務，無法結束導覽。",
    };
  }
  return {
    ...session,
    phase: "ONBOARDING_COMPLETE",
    uiStep: "complete",
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

export function patchDraft(
  session: OnboardingSession,
  patch: Partial<OnboardingDraft>,
): OnboardingSession {
  return {
    ...session,
    draft: { ...session.draft, ...patch },
    lastError: null,
    updatedAt: new Date().toISOString(),
  };
}

export function advanceUi(
  session: OnboardingSession,
  uiStep: OnboardingUiStep,
  phaseOverride?: OnboardingPhase,
): OnboardingSession {
  return {
    ...session,
    uiStep,
    phase: phaseOverride ?? phaseForUiStep(uiStep),
    updatedAt: new Date().toISOString(),
  };
}
