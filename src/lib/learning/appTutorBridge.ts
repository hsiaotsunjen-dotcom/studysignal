/**
 * PRD-103 — light bridge for optional /app free-practice Tutor.
 * Does NOT become the mission spine. Stores attempt fingerprints only (not chat logs).
 */

import {
  readOnboardingSession,
} from "@/lib/learning/onboardingStore";
import { persistTutorBridgeResult } from "@/lib/learning/syncLearningStores";
import {
  classifyAppTutorMessage,
  recordTutorLearningEvent,
} from "@/lib/learning/tutorSignalBridge";

const APP_BRIDGE_KEY = "studysignal.appTutorBridge.v1";

type AppTutorBridgeState = {
  lastAttemptText: string | null;
  tutorScaffoldedSincePrevious: boolean;
};

function readState(): AppTutorBridgeState {
  if (typeof window === "undefined") {
    return { lastAttemptText: null, tutorScaffoldedSincePrevious: false };
  }
  try {
    const raw = window.sessionStorage.getItem(APP_BRIDGE_KEY);
    if (!raw) {
      return { lastAttemptText: null, tutorScaffoldedSincePrevious: false };
    }
    return JSON.parse(raw) as AppTutorBridgeState;
  } catch {
    return { lastAttemptText: null, tutorScaffoldedSincePrevious: false };
  }
}

function writeState(state: AppTutorBridgeState): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(APP_BRIDGE_KEY, JSON.stringify(state));
}

/** Call after a tutor reply is shown (guidance occurred). */
export function markAppTutorScaffolded(): void {
  const state = readState();
  writeState({ ...state, tutorScaffoldedSincePrevious: true });
}

/**
 * Record a meaningful /app student message as a Learning Signal when evidence allows.
 * Returns whether a signal was accepted. Never stores raw chat into Parent Insight.
 */
export function recordAppTutorStudentMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const onboarding = readOnboardingSession();
  if (!onboarding?.studentModel) return false;

  const state = readState();
  const event = classifyAppTutorMessage({
    text: trimmed,
    previousAttemptText: state.lastAttemptText ?? undefined,
    tutorScaffoldedSincePrevious: state.tutorScaffoldedSincePrevious,
  });
  if (!event) return false;

  const result = recordTutorLearningEvent(event, {
    studentModel: onboarding.studentModel,
    learningState: onboarding.studentModel.learningState,
    existingSignals: onboarding.signals,
  });

  if (result.accepted) {
    persistTutorBridgeResult({
      signals: result.signals,
      studentModel: result.studentModel,
      learningState: result.learningState,
    });
  }

  // Update fingerprint for correction detection — not a transcript store
  writeState({
    lastAttemptText: trimmed.slice(0, 280),
    tutorScaffoldedSincePrevious: false,
  });

  return result.accepted;
}
