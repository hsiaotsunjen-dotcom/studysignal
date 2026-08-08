/**
 * PRD-103 — Live Tutor Signal Bridge.
 * Tutor events → evidence evaluation → Learning Signals (canonical architecture).
 * Deterministic. Provider-agnostic. Never invents student behavior.
 */

import { createSessionId } from "@/lib/learning/onboardingStore";
import type {
  ConfidenceLevel,
  LearningSignal,
  LearningSignalWhere,
  LearningStateId,
  StudentModel,
} from "@/lib/learning/types";

export type TutorLearningEventType =
  | "ATTEMPT"
  | "CORRECTION"
  | "SUCCESS"
  | "STRUGGLE"
  | "CONFIDENCE_CHANGE"
  | "REFLECTION";

export type TutorAttemptQuality =
  | "empty"
  | "thin"
  | "partial"
  | "solid"
  | "unknown";

/**
 * Structured tutor learning event — NOT a free-form chat dump.
 * `text` may be used for classification only; never stored as Parent Insight content.
 */
export type TutorLearningEvent = {
  type: TutorLearningEventType;
  where: LearningSignalWhere;
  contextId?: string;
  /** Classification input only */
  text?: string;
  previousText?: string;
  scaffoldOccurred?: boolean;
  quality?: TutorAttemptQuality;
  askedForAnswer?: boolean;
  independent?: boolean;
  /** Explicit struggle evidence gate */
  struggleEvidence?: "repeated_thin" | "explicit_stuck" | "insufficient";
  confidenceDirection?: "up" | "down";
  confidenceLevel?: "low" | "medium" | "high";
  /** Dedup key fragment (attempt id / turn id) — not message body */
  evidenceId?: string;
};

export type TutorBridgeContext = {
  studentModel: StudentModel;
  learningState: LearningStateId;
  existingSignals: LearningSignal[];
};

export type TutorBridgeResult = {
  accepted: boolean;
  signals: LearningSignal[];
  learningState: LearningStateId;
  studentModel: StudentModel;
  reason?: string;
};

const EXPLICIT_STUCK_RE =
  /我不會|不知道怎麼|卡住了|完全不懂|i don't know how|i have no idea|stuck/i;
const CONFIDENCE_UP_RE =
  /我懂了|我了解了|現在懂|i understand now|that makes sense|我明白了/i;
const CONFIDENCE_DOWN_RE =
  /還是不會|還是不懂|還是不知道|still don't|still confused|還是很亂/i;

function now() {
  return new Date().toISOString();
}

function makeSignal(input: {
  kind: LearningSignal["kind"];
  observation: string;
  value: LearningSignal["value"];
  confidence: ConfidenceLevel;
  where: LearningSignalWhere;
  contextId?: string;
  eventKey: string;
  source?: LearningSignal["source"];
}): LearningSignal {
  return {
    id: createSessionId(),
    kind: input.kind,
    observation: input.observation,
    value: input.value,
    confidence: input.confidence,
    source: input.source ?? "tutor",
    createdAt: now(),
    where: input.where,
    contextId: input.contextId,
    eventKey: input.eventKey,
  };
}

function alreadyRecorded(
  existing: LearningSignal[],
  eventKey: string,
): boolean {
  return existing.some((s) => s.eventKey === eventKey);
}

/** Soft quality observe — shared semantics with mission loop */
export function classifyAttemptQuality(text: string): TutorAttemptQuality {
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

export function detectExplicitStuck(text: string): boolean {
  return EXPLICIT_STUCK_RE.test(text.trim());
}

export function detectConfidenceDirection(
  text: string,
): "up" | "down" | null {
  if (CONFIDENCE_UP_RE.test(text)) return "up";
  if (CONFIDENCE_DOWN_RE.test(text)) return "down";
  return null;
}

function stateAfterSignals(
  previous: LearningStateId,
  newSignals: LearningSignal[],
): LearningStateId {
  if (newSignals.some((s) => s.kind === "productive_struggle")) {
    return "Productive Struggle";
  }
  if (newSignals.some((s) => s.kind === "successful_application")) {
    return previous === "Independent" ? "Independent" : "Building";
  }
  if (newSignals.some((s) => s.kind === "corrected_after_scaffold")) {
    return "Building";
  }
  if (
    newSignals.some(
      (s) => s.kind === "demonstrated_uncertainty" && s.source === "tutor",
    )
  ) {
    return previous === "Ready" ? "Orienting" : previous;
  }
  if (newSignals.some((s) => s.kind === "reflected")) {
    return "Reflecting";
  }
  return previous;
}

function softModelPatch(
  model: StudentModel,
  signals: LearningSignal[],
  learningState: LearningStateId,
): StudentModel {
  if (signals.length === 0) {
    return { ...model, learningState };
  }
  const knownEvidence = [...model.knownEvidence];
  for (const s of signals) {
    // Conservative: observed facts only, never permanent mastery labels
    knownEvidence.push(
      `[tutor/${s.kind}] ${s.observation} (confidence=${s.confidence})`,
    );
  }
  return {
    ...model,
    learningState,
    knownEvidence: knownEvidence.slice(-24),
  };
}

/**
 * Canonical bridge entry.
 * One tutor message ≠ one signal. Insufficient evidence → accepted:false, no invent.
 */
export function recordTutorLearningEvent(
  event: TutorLearningEvent,
  ctx: TutorBridgeContext,
): TutorBridgeResult {
  const baseKey = `${event.type}:${event.where}:${event.contextId ?? "none"}:${event.evidenceId ?? "anon"}`;
  const signals: LearningSignal[] = [];

  switch (event.type) {
    case "ATTEMPT": {
      const text = (event.text ?? "").trim();
      if (!text) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "empty_attempt",
        };
      }
      const quality = event.quality ?? classifyAttemptQuality(text);
      if (quality === "empty") {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "empty_attempt",
        };
      }
      const eventKey = `${baseKey}:attempted`;
      if (alreadyRecorded(ctx.existingSignals, eventKey)) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "duplicate",
        };
      }
      signals.push(
        makeSignal({
          kind: "attempted",
          observation:
            "Student made an explicit learning attempt (participation evidence, not mastery)",
          value: quality,
          confidence: "high",
          where: event.where,
          contextId: event.contextId,
          eventKey,
        }),
      );
      if (event.askedForAnswer) {
        signals.push(
          makeSignal({
            kind: "answer_seeking",
            observation: "Student requested a direct answer during tutor flow",
            value: true,
            confidence: "medium",
            where: event.where,
            contextId: event.contextId,
            eventKey: `${baseKey}:answer_seeking`,
          }),
        );
      }
      break;
    }

    case "CORRECTION": {
      const curr = (event.text ?? "").trim();
      const prev = (event.previousText ?? "").trim();
      if (!curr || !prev || curr === prev || !event.scaffoldOccurred) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "insufficient_correction_evidence",
        };
      }
      const eventKey = `${baseKey}:corrected_after_scaffold`;
      if (alreadyRecorded(ctx.existingSignals, eventKey)) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "duplicate",
        };
      }
      signals.push(
        makeSignal({
          kind: "corrected_after_scaffold",
          observation:
            "Student revised an attempt after tutor scaffolding (learning movement)",
          value: true,
          confidence: "medium",
          where: event.where,
          contextId: event.contextId,
          eventKey,
        }),
      );
      signals.push(
        makeSignal({
          kind: "persistence",
          observation: "Student persisted with a second attempt after guidance",
          value: true,
          confidence: "medium",
          where: event.where,
          contextId: event.contextId,
          eventKey: `${baseKey}:persistence`,
        }),
      );
      break;
    }

    case "SUCCESS": {
      const quality = event.quality ?? classifyAttemptQuality(event.text ?? "");
      if (quality !== "solid" && quality !== "partial") {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "insufficient_success_evidence",
        };
      }
      if (event.askedForAnswer) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "answer_seeking_blocks_success",
        };
      }
      const eventKey = `${baseKey}:successful_application`;
      if (alreadyRecorded(ctx.existingSignals, eventKey)) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "duplicate",
        };
      }
      signals.push(
        makeSignal({
          kind: "successful_application",
          observation:
            "Student produced an acceptable response in this learning event (not permanent mastery)",
          value: quality,
          confidence: event.independent ? "medium" : "low",
          where: event.where,
          contextId: event.contextId,
          eventKey,
        }),
      );
      if (event.independent) {
        signals.push(
          makeSignal({
            kind: "completed_independently",
            observation:
              "Application completed with limited scaffolding in this event",
            value: true,
            confidence: "low",
            where: event.where,
            contextId: event.contextId,
            eventKey: `${baseKey}:completed_independently`,
          }),
        );
      }
      break;
    }

    case "STRUGGLE": {
      const evidence = event.struggleEvidence ?? "insufficient";
      const text = (event.text ?? "").trim();
      const explicit = text ? detectExplicitStuck(text) : false;
      if (evidence === "insufficient" && !explicit) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "insufficient_struggle_evidence",
        };
      }
      if (evidence !== "repeated_thin" && evidence !== "explicit_stuck" && !explicit) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "insufficient_struggle_evidence",
        };
      }
      const eventKey = `${baseKey}:productive_struggle`;
      if (alreadyRecorded(ctx.existingSignals, eventKey)) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "duplicate",
        };
      }
      signals.push(
        makeSignal({
          kind: "productive_struggle",
          observation:
            "Sufficient evidence of meaningful difficulty affecting tutor strategy (temporary)",
          value: explicit ? "explicit_stuck" : evidence,
          confidence: "low",
          where: event.where,
          contextId: event.contextId,
          eventKey,
        }),
      );
      break;
    }

    case "CONFIDENCE_CHANGE": {
      const fromText = event.text
        ? detectConfidenceDirection(event.text)
        : null;
      const direction = event.confidenceDirection ?? fromText;
      if (!direction && !event.confidenceLevel) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "no_explicit_confidence_evidence",
        };
      }
      const eventKey = `${baseKey}:confidence:${direction ?? event.confidenceLevel}`;
      if (alreadyRecorded(ctx.existingSignals, eventKey)) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "duplicate",
        };
      }
      if (direction === "up" || event.confidenceLevel === "high") {
        signals.push(
          makeSignal({
            kind: "demonstrated_confidence",
            observation: "Explicit student signal of increased understanding",
            value: event.confidenceLevel ?? "high",
            confidence: "medium",
            where: event.where,
            contextId: event.contextId,
            eventKey,
          }),
        );
      } else if (direction === "down" || event.confidenceLevel === "low") {
        signals.push(
          makeSignal({
            kind: "demonstrated_uncertainty",
            observation: "Explicit student signal of remaining uncertainty",
            value: event.confidenceLevel ?? "low",
            confidence: "medium",
            where: event.where,
            contextId: event.contextId,
            eventKey,
          }),
        );
      } else {
        // Explicit medium self-report — not invented from ordinary wording
        signals.push(
          makeSignal({
            kind: "confidence",
            observation: "Explicit mid-level confidence self-report after learning",
            value: "medium",
            confidence: "medium",
            where: event.where,
            contextId: event.contextId,
            eventKey,
          }),
        );
      }
      break;
    }

    case "REFLECTION": {
      const eventKey = `${baseKey}:reflected`;
      if (alreadyRecorded(ctx.existingSignals, eventKey)) {
        return {
          accepted: false,
          signals: [],
          learningState: ctx.learningState,
          studentModel: ctx.studentModel,
          reason: "duplicate",
        };
      }
      signals.push(
        makeSignal({
          kind: "reflected",
          observation: "Student completed a reflection step in the learning loop",
          value: true,
          confidence: "high",
          where: event.where,
          contextId: event.contextId,
          eventKey,
          source: "reflection",
        }),
      );
      break;
    }

    default:
      return {
        accepted: false,
        signals: [],
        learningState: ctx.learningState,
        studentModel: ctx.studentModel,
        reason: "unknown_event",
      };
  }

  if (signals.length === 0) {
    return {
      accepted: false,
      signals: [],
      learningState: ctx.learningState,
      studentModel: ctx.studentModel,
      reason: "no_signal",
    };
  }

  const learningState = stateAfterSignals(ctx.learningState, signals);
  const studentModel = softModelPatch(ctx.studentModel, signals, learningState);

  return {
    accepted: true,
    signals,
    learningState,
    studentModel,
  };
}

/**
 * Classify a free-practice /app student message into at most one primary event.
 * Ambiguous short messages → no event (no invented signal).
 */
export function classifyAppTutorMessage(input: {
  text: string;
  previousAttemptText?: string;
  tutorScaffoldedSincePrevious?: boolean;
}): TutorLearningEvent | null {
  const text = input.text.trim();
  if (!text) return null;

  const confidence = detectConfidenceDirection(text);
  if (confidence) {
    return {
      type: "CONFIDENCE_CHANGE",
      where: "app_tutor",
      text,
      confidenceDirection: confidence,
      evidenceId: `conf-${text.length}`,
    };
  }

  if (
    input.previousAttemptText &&
    input.tutorScaffoldedSincePrevious &&
    text !== input.previousAttemptText.trim()
  ) {
    return {
      type: "CORRECTION",
      where: "app_tutor",
      text,
      previousText: input.previousAttemptText,
      scaffoldOccurred: true,
      evidenceId: `corr-${text.length}-${input.previousAttemptText.length}`,
    };
  }

  const quality = classifyAttemptQuality(text);
  if (quality === "empty" || (quality === "thin" && text.length < 4)) {
    return null;
  }

  // Single "I don't know" is an attempt/stuck cue — struggle only if explicit stuck phrasing
  if (detectExplicitStuck(text)) {
    return {
      type: "STRUGGLE",
      where: "app_tutor",
      text,
      struggleEvidence: "explicit_stuck",
      evidenceId: `str-${text.length}`,
    };
  }

  return {
    type: "ATTEMPT",
    where: "app_tutor",
    text,
    quality,
    evidenceId: `att-${text.length}-${quality}`,
  };
}
