import { describe, expect, it } from "vitest";

import {
  createOnboardingSession,
  finalizeOnboarding,
  markOnboardingComplete,
  patchDraft,
} from "@/lib/learning/onboardingEngine";
import {
  buildParentInsight,
  emptyParentInsight,
  insightLooksSurveillanceFree,
  parentInsightFromOnboardingSession,
} from "@/lib/learning/parentInsight";

describe("parentInsight", () => {
  it("returns empty insight when there is no student model", () => {
    const empty = emptyParentInsight();
    expect(empty.status).toBe("empty");
    expect(empty.progress).toBeNull();
    expect(empty.privacy.includesChatHistory).toBe(false);
  });

  it("derives insight from onboarding Student Model without duplicating it", () => {
    let session = createOnboardingSession();
    session = patchDraft(session, {
      preferredName: "小宇",
      goalStatement: "想把英文開口說得更自然",
      subject: "英語",
      learningContext: "學校課業剛開始 / 跟不上",
      selfPerceivedDifficulty: "hard",
      preference: "guide",
      diagnosticAttempt: "Hello, nice to meet you. 因為常用。",
      diagnosticFollowUp: "我會換簡單一點的說法。",
      diagnosticConfidence: "medium",
    });
    session = markOnboardingComplete(finalizeOnboarding(session));

    const insight = parentInsightFromOnboardingSession(session);
    expect(insight.status).toBe("ready");
    expect(insight.studentDisplayName).toBe("小宇");
    expect(insight.subject).toBe("英語");
    expect(insight.progress).toContain("英語");
    expect(insight.currentChallenge).toBeTruthy();
    expect(insight.suggestedParentAction).toBeTruthy();
    expect(insight.learningStateSummary).toBeTruthy();
    expect(insightLooksSurveillanceFree(insight)).toBe(true);

    // Must not leak raw diagnostic attempt text
    const blob = JSON.stringify(insight);
    expect(blob).not.toContain("Hello, nice to meet you");
    expect(blob).not.toContain(session.diagnostic?.attempt ?? "___");
  });

  it("never invents scores or chat history flags", () => {
    const insight = buildParentInsight({
      studentModel: null,
      signals: [],
      mission: null,
    });
    expect(insight.privacy).toEqual({
      includesChatHistory: false,
      includesRawAiReasoning: false,
      includesScores: false,
    });
  });
});
