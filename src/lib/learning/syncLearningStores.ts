/**
 * Keep onboarding Student Model in sync after mission / tutor updates.
 * Single Student Model — no parent/student duplicate.
 */

import type { MissionLoopSession } from "@/lib/learning/missionTypes";
import {
  readMissionLoop,
  writeMissionLoop,
} from "@/lib/learning/missionLoopStore";
import {
  readOnboardingSession,
  writeOnboardingSession,
} from "@/lib/learning/onboardingStore";
import type {
  LearningSignal,
  LearningStateId,
  StudentModel,
} from "@/lib/learning/types";

function mergeSignals(
  existing: LearningSignal[],
  incoming: LearningSignal[],
): LearningSignal[] {
  const keys = new Set(
    existing.map((s) => s.eventKey).filter(Boolean) as string[],
  );
  const next = [...existing];
  for (const s of incoming) {
    if (s.eventKey && keys.has(s.eventKey)) continue;
    if (s.eventKey) keys.add(s.eventKey);
    next.push(s);
  }
  return next.slice(-100);
}

export function syncMissionCompletionToOnboarding(
  loop: MissionLoopSession,
): void {
  const onboarding = readOnboardingSession();
  if (!onboarding?.studentModel) return;

  const mergedSignals = mergeSignals(
    onboarding.signals,
    loop.signals.filter(
      (s) =>
        s.source === "mission" ||
        s.source === "reflection" ||
        s.source === "tutor",
    ),
  );

  writeOnboardingSession({
    ...onboarding,
    studentModel: loop.studentModel,
    mission: loop.mission,
    signals: mergedSignals,
  });
}

/**
 * Persist tutor-bridge signals into onboarding (+ active mission loop if present).
 * Never stores raw chat. Safe no-op if Student Model missing.
 */
export function persistTutorBridgeResult(input: {
  signals: LearningSignal[];
  studentModel: StudentModel;
  learningState: LearningStateId;
}): void {
  if (input.signals.length === 0) return;

  const onboarding = readOnboardingSession();
  if (onboarding?.studentModel) {
    writeOnboardingSession({
      ...onboarding,
      studentModel: {
        ...input.studentModel,
        studentId: onboarding.studentModel.studentId,
        identity: onboarding.studentModel.identity,
      },
      signals: mergeSignals(onboarding.signals, input.signals),
    });
  }

  const loop = readMissionLoop();
  if (
    loop &&
    loop.phase !== "complete" &&
    loop.phase !== "abandoned" &&
    loop.studentId === input.studentModel.studentId
  ) {
    writeMissionLoop({
      ...loop,
      signals: mergeSignals(loop.signals, input.signals),
      learningState: input.learningState,
      studentModel: {
        ...input.studentModel,
        studentId: loop.studentId,
      },
      updatedAt: new Date().toISOString(),
    });
  }
}
