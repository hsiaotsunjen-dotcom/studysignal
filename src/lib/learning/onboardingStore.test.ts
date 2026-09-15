import { describe, expect, it } from "vitest";

import {
  createOnboardingSession,
  markOnboardingComplete,
  patchDraft,
} from "@/lib/learning/onboardingEngine";
import { finalizeOnboarding } from "@/lib/learning/onboardingEngine";
import {
  isOnboardingComplete,
  isResumableOnboardingSession,
} from "@/lib/learning/onboardingStore";

describe("onboardingStore resume helpers", () => {
  it("treats a structurally valid incomplete session as resumable", () => {
    let session = createOnboardingSession();
    session = patchDraft(session, {
      preferredName: "小明",
      subject: "英語",
      goalStatement: "我想把英文口說練好",
    });

    expect(isOnboardingComplete(session)).toBe(false);
    expect(isResumableOnboardingSession(session)).toBe(true);
    expect(session.draft.preferredName).toBe("小明");
    expect(session.uiStep).toBe("welcome");
  });

  it("does not treat null or completed sessions as resumable", () => {
    expect(isResumableOnboardingSession(null)).toBe(false);

    let session = createOnboardingSession();
    session = patchDraft(session, {
      preferredName: "小明",
      subject: "英語",
      goalStatement: "我想把英文口說練好",
      learningContext: "學校課業剛開始 / 跟不上",
      selfPerceivedDifficulty: "ok",
      preference: "guide",
      diagnosticAttempt: "I want to practice speaking politely.",
      diagnosticFollowUp: "I get nervous starting.",
      diagnosticConfidence: "medium",
    });
    session = finalizeOnboarding(session);
    session = markOnboardingComplete(session);

    expect(isOnboardingComplete(session)).toBe(true);
    expect(isResumableOnboardingSession(session)).toBe(false);
  });

  it("fresh createOnboardingSession starts empty at welcome", () => {
    const fresh = createOnboardingSession();
    expect(fresh.uiStep).toBe("welcome");
    expect(fresh.draft.preferredName).toBe("");
    expect(fresh.draft.subject).toBe("");
    expect(fresh.draft.goalStatement).toBe("");
    expect(isResumableOnboardingSession(fresh)).toBe(true);
  });
});
