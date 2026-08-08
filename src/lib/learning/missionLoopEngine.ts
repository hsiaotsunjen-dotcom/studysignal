/**
 * PRD-102 — Today's Mission Loop engine.
 * Deterministic, provider-agnostic tutor guidance. Never fabricates evidence.
 */

import { buildDemoMission, DEMO_APPLY_PROMPT } from "@/lib/learning/demoMission";
import { createSessionId } from "@/lib/learning/onboardingStore";
import type {
  MissionAttempt,
  MissionLoopSession,
  MissionPhase,
  MissionReflection,
  ModelObservation,
  TomorrowSeed,
  TutorTurn,
} from "@/lib/learning/missionTypes";
import type {
  ConfidenceLevel,
  LearningSignal,
  LearningStateId,
  StudentModel,
} from "@/lib/learning/types";

const ANSWER_SEEK_RE =
  /直接.*(答案|告訴我)|給我答案|just tell me|give me the answer|告訴我正確|標準答案|帮我写|幫我寫完整/i;

function now() {
  return new Date().toISOString();
}

function signal(
  kind: LearningSignal["kind"],
  observation: string,
  value: LearningSignal["value"],
  confidence: ConfidenceLevel,
  source: LearningSignal["source"] = "mission",
): LearningSignal {
  return {
    id: createSessionId(),
    kind,
    observation,
    value,
    confidence,
    source,
    createdAt: now(),
  };
}

function observeQuality(
  text: string,
): MissionAttempt["observedQuality"] {
  const t = text.trim();
  if (!t) return "empty";
  if (t.length < 8) return "thin";
  const hasLatin = /[A-Za-z]{2,}/.test(t);
  const hasReason =
    /因為|why|because|所以|覺得|想|先|再|會/i.test(t) || t.includes("?");
  if (hasLatin && hasReason && t.length >= 24) return "solid";
  if (hasLatin || hasReason) return "partial";
  if (t.length >= 16) return "partial";
  return "thin";
}

function asksForAnswer(text: string): boolean {
  return ANSWER_SEEK_RE.test(text);
}

/** State-influenced tutor — never dumps a full answer */
export function craftTutorResponse(input: {
  learningState: LearningStateId;
  attempt: MissionAttempt;
  answerRequestCount: number;
  attemptCount: number;
  name: string;
}): TutorTurn {
  const { learningState, attempt, answerRequestCount, attemptCount, name } =
    input;
  const id = createSessionId();
  const createdAt = now();

  if (attempt.askedForAnswer || answerRequestCount > 0) {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "deflect_answer_request",
      message:
        `${name}，我先不直接給完整句子。\n\n` +
        `你已經想到的字裡，哪一個字你最有把握？先把它寫下來，我們再一起補下一小步。`,
    };
  }

  if (learningState === "Overloaded" || learningState === "Affect-Blocked") {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "simplify",
      message:
        `我們放慢一點。只要寫一個英文詞或短語當開頭就好——例如你想怎麼打招呼。\n\n` +
        `你現在第一個想到的字是什麼？`,
    };
  }

  if (
    learningState === "Unproductive Struggle" ||
    (attempt.observedQuality === "thin" && attemptCount >= 2)
  ) {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "scaffold",
      message:
        `我們把任務拆小：\n1) 先選一個打招呼的詞（Hi / Hello…）\n2) 再說你的名字\n\n` +
        `你先完成第 1 步就好。你選哪個詞？為什麼？`,
    };
  }

  if (learningState === "Independent" && attempt.observedQuality === "solid") {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "reduce_intervention",
      message:
        `你已經有清楚的嘗試了。\n\n` +
        `再問自己一次：如果對方聽不懂，你會改哪一個詞？用一句話說明就好——我先不多說。`,
    };
  }

  if (learningState === "Ready" && attempt.observedQuality !== "thin") {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "stretch",
      message:
        `不錯，你有自己的想法。\n\n` +
        `哪一部分你最不確定？試著把那一句再改清楚一點，並說說你為什麼這樣改。`,
    };
  }

  if (attempt.observedQuality === "solid") {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "ask_reasoning",
      message:
        `我看到你的嘗試了。\n\n` +
        `你為什麼覺得這樣寫適合「新同學」這個情境？用自己的話說就好。`,
    };
  }

  if (learningState === "Productive Struggle") {
    return {
      id,
      createdAt,
      learningStateAtTurn: learningState,
      strategy: "encourage_persist",
      message:
        `卡住沒關係——你還在想，這很重要。\n\n` +
        `你現在不確定的是哪一小段？先指出來，我們只處理那一段。`,
    };
  }

  return {
    id,
    createdAt,
    learningStateAtTurn: learningState,
    strategy: "prompt_thinking",
    message:
      `謝謝你願意先寫。\n\n` +
      `你覺得哪一句最能代表你？為什麼？如果要改，你會先改哪裡？`,
  };
}

export function estimateStateAfterAttempt(input: {
  previous: LearningStateId;
  attempt: MissionAttempt;
  answerRequestCount: number;
  attemptCount: number;
  hintCount: number;
}): LearningStateId {
  const { previous, attempt, answerRequestCount, attemptCount, hintCount } =
    input;

  if (attempt.askedForAnswer || answerRequestCount >= 2) {
    return "Orienting";
  }
  if (attempt.observedQuality === "empty") {
    return previous === "Ready" ? "Orienting" : previous;
  }
  if (attempt.observedQuality === "thin" && attemptCount >= 2) {
    return "Unproductive Struggle";
  }
  if (
    attempt.observedQuality === "partial" &&
    (previous === "Building" || previous === "Orienting")
  ) {
    return "Productive Struggle";
  }
  if (attempt.observedQuality === "solid" && answerRequestCount === 0) {
    if (hintCount === 0 && attemptCount >= 2) return "Independent";
    return previous === "Ready" ? "Ready" : "Building";
  }
  if (previous === "Orienting" && attempt.observedQuality !== "empty") {
    return "Building";
  }
  return previous;
}

export function startMissionLoop(model: StudentModel): MissionLoopSession {
  const learningState = model.learningState;
  const mission = buildDemoMission(model, learningState);
  const t = now();
  return {
    version: "1.0",
    id: createSessionId(),
    studentId: model.studentId,
    phase: "mission_start",
    mission,
    studentModel: { ...model },
    learningState,
    attempts: [],
    tutorTurns: [],
    signals: [
      signal(
        "attempted",
        "Mission loop started",
        mission.id,
        "high",
        "mission",
      ),
    ],
    reflection: null,
    tomorrowSeed: null,
    hintCount: 0,
    answerRequestCount: 0,
    modelObservations: [],
    createdAt: t,
    updatedAt: t,
    completedAt: null,
    lastError: null,
  };
}

export function advancePhase(
  session: MissionLoopSession,
  phase: MissionPhase,
): MissionLoopSession {
  return { ...session, phase, updatedAt: now(), lastError: null };
}

export function recordStudentAttempt(
  session: MissionLoopSession,
  kind: MissionAttempt["kind"],
  text: string,
): MissionLoopSession {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ...session,
      lastError: "先寫一點你的想法再繼續——空的回答不會被當成學習證據。",
    };
  }

  const asked = asksForAnswer(trimmed);
  const attempt: MissionAttempt = {
    id: createSessionId(),
    kind,
    text: trimmed,
    createdAt: now(),
    observedQuality: observeQuality(trimmed),
    askedForAnswer: asked,
  };

  const answerRequestCount = session.answerRequestCount + (asked ? 1 : 0);
  const attempts = [...session.attempts, attempt];
  const signals: LearningSignal[] = [
    ...session.signals,
    signal("attempted", `Student produced a ${kind} attempt`, kind, "high"),
  ];

  if (asked) {
    signals.push(
      signal(
        "answer_seeking",
        "Student asked for a direct answer",
        true,
        "medium",
      ),
    );
  }
  if (attempt.observedQuality === "solid" || attempt.observedQuality === "partial") {
    if (kind === "explanation" || /因為|because|why|所以/i.test(trimmed)) {
      signals.push(
        signal(
          "explained_reasoning",
          "Student offered reasoning with the attempt",
          attempt.observedQuality,
          "medium",
        ),
      );
    }
  }
  if (attempt.observedQuality === "thin") {
    signals.push(
      signal(
        "explanation_quality",
        "Attempt was brief / limited reasoning observed",
        "thin",
        "low",
      ),
    );
  } else if (attempt.observedQuality === "solid") {
    signals.push(
      signal(
        "explanation_quality",
        "Attempt included usable reasoning cues",
        "rich",
        "medium",
      ),
    );
  }

  const learningState = estimateStateAfterAttempt({
    previous: session.learningState,
    attempt,
    answerRequestCount,
    attemptCount: attempts.length,
    hintCount: session.hintCount,
  });

  const observations: ModelObservation[] = [...session.modelObservations];
  if (attempt.observedQuality !== "empty") {
    observations.push({
      text: `Observed ${kind} quality=${attempt.observedQuality}${asked ? " (answer-seeking)" : ""}`,
      kind: "observed",
      confidence: attempt.observedQuality === "solid" ? "medium" : "low",
      at: now(),
    });
  }

  let phase: MissionPhase = session.phase;
  if (kind === "first_idea") phase = "tutor_respond";
  if (kind === "explanation" || kind === "revision") {
    phase =
      learningState === "Overloaded" || learningState === "Affect-Blocked"
        ? "reflection"
        : "apply";
  }
  if (kind === "apply") phase = "reflection";

  const tutorTurns = [...session.tutorTurns];
  if (kind === "first_idea") {
    tutorTurns.push(
      craftTutorResponse({
        learningState,
        attempt,
        answerRequestCount,
        attemptCount: attempts.length,
        name: session.studentModel.identity.preferredName || "你",
      }),
    );
    if (
      tutorTurns[tutorTurns.length - 1]?.strategy === "scaffold" ||
      tutorTurns[tutorTurns.length - 1]?.strategy === "simplify"
    ) {
      // counting scaffold as a soft hint for independence scoring
    }
  }

  const hintCount =
    session.hintCount +
    (tutorTurns.length > session.tutorTurns.length &&
    (tutorTurns[tutorTurns.length - 1]?.strategy === "scaffold" ||
      tutorTurns[tutorTurns.length - 1]?.strategy === "simplify")
      ? 1
      : 0);

  if (hintCount > session.hintCount) {
    signals.push(
      signal("asked_for_hint", "Scaffold/simplify prompt offered", true, "medium"),
    );
  }

  return {
    ...session,
    attempts,
    tutorTurns,
    signals,
    learningState,
    answerRequestCount,
    hintCount,
    modelObservations: observations,
    phase: kind === "first_idea" ? "tutor_respond" : phase,
    studentModel: {
      ...session.studentModel,
      learningState,
    },
    updatedAt: now(),
    lastError: null,
  };
}

export function continueAfterTutor(session: MissionLoopSession): MissionLoopSession {
  if (session.phase !== "tutor_respond") return session;
  return advancePhase(session, "second_attempt");
}

export function requestHint(session: MissionLoopSession): MissionLoopSession {
  const name = session.studentModel.identity.preferredName || "你";
  const turn: TutorTurn = {
    id: createSessionId(),
    createdAt: now(),
    learningStateAtTurn: session.learningState,
    strategy: "scaffold",
    message:
      `${name}，小提示（不是完整答案）：\n` +
      `先寫打招呼 → 再說名字 → 最後加一句你想讓對方知道的事。\n\n` +
      `你現在卡在哪一步？`,
  };
  return {
    ...session,
    tutorTurns: [...session.tutorTurns, turn],
    hintCount: session.hintCount + 1,
    signals: [
      ...session.signals,
      signal("asked_for_hint", "Student requested a hint", true, "high"),
    ],
    phase: session.phase === "first_attempt" ? "tutor_respond" : session.phase,
    updatedAt: now(),
  };
}

export function applyPromptForSession(session: MissionLoopSession): string {
  if (
    session.learningState === "Overloaded" ||
    session.learningState === "Affect-Blocked"
  ) {
    return "今天先到這裡也沒關係。用一句話說：你現在比較清楚的一件事是什麼？";
  }
  if (session.learningState === "Independent") {
    return `${DEMO_APPLY_PROMPT}\n（你已經展現自主性——盡量自己完成，我只在你需要時介入。）`;
  }
  return DEMO_APPLY_PROMPT;
}

export function completeReflection(
  session: MissionLoopSession,
  reflection: Omit<MissionReflection, "createdAt">,
): MissionLoopSession {
  if (
    !reflection.clearer.trim() &&
    !reflection.difficult.trim() &&
    !reflection.differently.trim()
  ) {
    return {
      ...session,
      lastError: "請至少回答其中一個反思問題——這能幫助你更了解自己怎麼學。",
    };
  }

  const full: MissionReflection = { ...reflection, createdAt: now() };
  const signals = [
    ...session.signals,
    signal("reflected", "Student completed mission reflection", true, "high", "reflection"),
  ];
  if (full.confidenceNow === "high") {
    signals.push(
      signal(
        "demonstrated_confidence",
        "Self-reported higher confidence after mission",
        "high",
        "medium",
        "reflection",
      ),
    );
  } else if (full.confidenceNow === "low") {
    signals.push(
      signal(
        "demonstrated_uncertainty",
        "Self-reported low confidence after mission",
        "low",
        "medium",
        "reflection",
      ),
    );
  }

  const independent =
    session.answerRequestCount === 0 &&
    session.hintCount <= 1 &&
    session.attempts.some((a) => a.observedQuality === "solid");

  if (independent) {
    signals.push(
      signal(
        "completed_independently",
        "Completed with limited AI scaffolding",
        true,
        "medium",
      ),
    );
  }

  let learningState: LearningStateId = "Reflecting";
  if (independent) learningState = "Independent";
  else if (full.confidenceNow === "low") learningState = "Consolidating";
  else if (session.learningState === "Unproductive Struggle")
    learningState = "Recovering";
  else learningState = "Consolidating";

  const updatedModel = applyModelUpdate(session.studentModel, {
    signals,
    learningState,
    observations: session.modelObservations,
    reflection: full,
    independent,
  });

  const tomorrowSeed = buildTomorrowSeed(session, updatedModel, full);

  return {
    ...session,
    reflection: full,
    signals,
    learningState,
    studentModel: updatedModel,
    tomorrowSeed,
    phase: "complete",
    completedAt: now(),
    updatedAt: now(),
    lastError: null,
  };
}

export function applyModelUpdate(
  model: StudentModel,
  input: {
    signals: LearningSignal[];
    learningState: LearningStateId;
    observations: ModelObservation[];
    reflection: MissionReflection;
    independent: boolean;
  },
): StudentModel {
  const knownEvidence = [...model.knownEvidence];
  const unknownAreas = [...model.unknownAreas];

  // Observed only — never permanent weakness labels from one session
  const solid = input.signals.some(
    (s) => s.kind === "explanation_quality" && s.value === "rich",
  );
  const thin = input.signals.some(
    (s) => s.kind === "explanation_quality" && s.value === "thin",
  );
  const answerSeek = input.signals.some((s) => s.kind === "answer_seeking");

  if (solid) {
    knownEvidence.push(
      "Recent mission: offered usable reasoning with English attempt (confidence medium; limited samples)",
    );
  }
  if (thin && !solid) {
    knownEvidence.push(
      "Recent mission: attempts were brief; uncertainty when elaborating (confidence low; evidence limited)",
    );
  }
  if (answerSeek) {
    knownEvidence.push(
      "Recent mission: sought direct answers at least once (observed help-seeking; not a trait claim)",
    );
  }
  if (input.reflection.clearer.trim()) {
    knownEvidence.push(
      `Reflection — clearer: ${input.reflection.clearer.trim().slice(0, 80)}`,
    );
  }
  if (input.independent) {
    const idx = unknownAreas.indexOf("診斷互動中的推理模式");
    if (idx >= 0) unknownAreas.splice(idx, 1);
  }

  const dna = { ...model.learningDna };
  if (input.independent) {
    dna.persistenceHint = "tries";
    dna.notes = [
      ...dna.notes,
      "Mission: completed with limited scaffolding (low-strength prior)",
    ].slice(-6);
    dna.confidence = "low";
  }

  return {
    ...model,
    knownEvidence: knownEvidence.slice(-20),
    unknownAreas,
    learningState: input.learningState,
    learningDna: dna,
    confidenceEstimates: {
      ...model.confidenceEstimates,
      diagnosticRead: solid ? "medium" : model.confidenceEstimates.diagnosticRead,
      subjectFamiliarity: solid
        ? model.confidenceEstimates.subjectFamiliarity === "low"
          ? "medium"
          : model.confidenceEstimates.subjectFamiliarity
        : model.confidenceEstimates.subjectFamiliarity,
    },
  };
}

export function buildTomorrowSeed(
  session: MissionLoopSession,
  model: StudentModel,
  reflection: MissionReflection,
): TomorrowSeed {
  const last = session.attempts[session.attempts.length - 1];
  const unresolved =
    reflection.difficult.trim() ||
    (last && last.observedQuality === "thin"
      ? "還需要練習把「為什麼這樣寫」說得更清楚"
      : null);

  const successful =
    session.attempts.some((a) => a.observedQuality === "solid")
      ? "先自己嘗試、再說明選詞理由，而不是先要答案"
      : session.hintCount > 0
        ? "用拆小步驟（打招呼 → 名字 → 細節）幫助自己前進"
        : null;

  return {
    id: createSessionId(),
    studentId: model.studentId,
    basedOnMissionId: session.mission.id,
    focus:
      unresolved && reflection.confidenceNow === "low"
        ? `用更短的英文打招呼，並練習說出「為什麼選這個詞」`
        : `把自我介紹遷移到另一個真實情境（例如跟老師或店員）`,
    unresolvedDifficulty: unresolved
      ? unresolved
      : null,
    successfulStrategy: successful,
    transferOpportunity: "試著對一個新對象說出同一結構的介紹，並指出你改了哪個詞",
    suggestedState:
      reflection.confidenceNow === "high" ? "Transferring" : "Consolidating",
    createdAt: now(),
  };
}

export function abandonMission(session: MissionLoopSession): MissionLoopSession {
  return {
    ...session,
    phase: "abandoned",
    updatedAt: now(),
    lastError: null,
    signals: [
      ...session.signals,
      signal("attempted", "Mission abandoned by student", "abandoned", "high"),
    ],
  };
}

/** Recover corrupted / partial sessions safely */
export function sanitizeMissionLoop(
  raw: MissionLoopSession | null,
): MissionLoopSession | null {
  if (!raw) return null;
  if (!raw.studentModel?.studentId || !raw.mission?.id) return null;
  if (!raw.phase) return null;
  return {
    ...raw,
    attempts: Array.isArray(raw.attempts) ? raw.attempts : [],
    tutorTurns: Array.isArray(raw.tutorTurns) ? raw.tutorTurns : [],
    signals: Array.isArray(raw.signals) ? raw.signals : [],
    modelObservations: Array.isArray(raw.modelObservations)
      ? raw.modelObservations
      : [],
    lastError: null,
  };
}
