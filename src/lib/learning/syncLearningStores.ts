/**
 * Keep onboarding Student Model in sync after mission loop updates.
 * Single Student Model — no parent/student duplicate.
 */

import type { MissionLoopSession } from "@/lib/learning/missionTypes";
import {
  readOnboardingSession,
  writeOnboardingSession,
} from "@/lib/learning/onboardingStore";
import type { LearningSignal } from "@/lib/learning/types";

export function syncMissionCompletionToOnboarding(
  loop: MissionLoopSession,
): void {
  const onboarding = readOnboardingSession();
  if (!onboarding?.studentModel) return;

  const mergedSignals: LearningSignal[] = [
    ...onboarding.signals,
    ...loop.signals.filter((s) => s.source === "mission" || s.source === "reflection"),
  ].slice(-80);

  writeOnboardingSession({
    ...onboarding,
    studentModel: loop.studentModel,
    mission: loop.mission,
    signals: mergedSignals,
  });
}
