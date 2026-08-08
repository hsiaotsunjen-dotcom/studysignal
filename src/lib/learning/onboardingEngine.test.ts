import { describe, expect, it } from "vitest";

import {
  createOnboardingSession,
  establishInitialState,
  finalizeOnboarding,
  markOnboardingComplete,
  observeDiagnostic,
  patchDraft,
} from "@/lib/learning/onboardingEngine";

describe("onboardingEngine", () => {
  it("keeps unknowns honest when diagnostic is thin", () => {
    let session = createOnboardingSession();
    session = patchDraft(session, {
      preferredName: "小宇",
      goalStatement: "想把英文開口說得更自然",
      subject: "英語",
      learningContext: "學校剛開始學",
      selfPerceivedDifficulty: "hard",
      preference: "guide",
      diagnosticAttempt: "hi",
      diagnosticFollowUp: "",
      diagnosticConfidence: "low",
    });

    const diagnostic = observeDiagnostic(session.draft);
    expect(diagnostic.explanationQuality).toBe("thin");

    const state = establishInitialState(session.draft, diagnostic);
    expect(state).toBe("Orienting");

    const done = finalizeOnboarding(session);
    expect(done.studentModel).not.toBeNull();
    expect(done.studentModel?.unknownAreas.length).toBeGreaterThan(0);
    expect(done.studentModel?.learningState).toBe("Orienting");
    expect(done.mission?.purpose).toContain("小宇");
    expect(done.signals.some((s) => s.kind === "goal_clarity")).toBe(true);

    const complete = markOnboardingComplete(done);
    expect(complete.phase).toBe("ONBOARDING_COMPLETE");
  });

  it("does not invent a model without name and goal", () => {
    const session = createOnboardingSession();
    const failed = finalizeOnboarding(session);
    expect(failed.studentModel).toBeNull();
    expect(failed.lastError).toBeTruthy();
  });

  it("sets Ready when self-report is easy and explanation is rich", () => {
    let session = createOnboardingSession();
    session = patchDraft(session, {
      preferredName: "Amy",
      goalStatement: "複習分數加減",
      subject: "數學",
      learningContext: "課後自己練習",
      selfPerceivedDifficulty: "easy",
      preference: "practice",
      diagnosticAttempt:
        "12 顆糖分給 3 人，每人 4 顆，因為 12 除以 3 等於 4。",
      diagnosticFollowUp: "分給 4 人的話每人 3 顆。",
      diagnosticConfidence: "high",
    });
    const finalized = finalizeOnboarding(session);
    expect(finalized.studentModel?.learningState).toBe("Ready");
    expect(finalized.mission?.difficulty).toBe("stretch");
  });
});
