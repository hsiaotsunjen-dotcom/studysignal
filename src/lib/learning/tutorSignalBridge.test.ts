import { describe, expect, it } from "vitest";

import {
  createOnboardingSession,
  finalizeOnboarding,
  markOnboardingComplete,
  patchDraft,
} from "@/lib/learning/onboardingEngine";
import {
  continueAfterTutor,
  recordStudentAttempt,
  startMissionLoop,
  completeReflection,
} from "@/lib/learning/missionLoopEngine";
import {
  buildParentInsight,
  insightLooksSurveillanceFree,
} from "@/lib/learning/parentInsight";
import {
  classifyAppTutorMessage,
  recordTutorLearningEvent,
} from "@/lib/learning/tutorSignalBridge";
import type { StudentModel } from "@/lib/learning/types";

function seededModel(): StudentModel {
  let session = createOnboardingSession();
  session = patchDraft(session, {
    preferredName: "小宇",
    goalStatement: "想把英文開口說得更自然",
    subject: "英語",
    learningContext: "學校課業剛開始 / 跟不上",
    selfPerceivedDifficulty: "hard",
    preference: "guide",
    diagnosticAttempt: "Hello, nice to meet you.",
    diagnosticFollowUp: "我會說慢一點。",
    diagnosticConfidence: "medium",
  });
  session = markOnboardingComplete(finalizeOnboarding(session));
  return session.studentModel!;
}

describe("tutorSignalBridge", () => {
  it("creates an attempt signal from an explicit tutor attempt", () => {
    const model = seededModel();
    const result = recordTutorLearningEvent(
      {
        type: "ATTEMPT",
        where: "mission",
        text: "Hello, I am Xiaoyu because I want to greet a classmate.",
        quality: "solid",
        evidenceId: "a1",
        contextId: "m1",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(result.accepted).toBe(true);
    expect(result.signals.some((s) => s.kind === "attempted")).toBe(true);
    expect(result.signals[0]!.where).toBe("mission");
    expect(result.signals[0]!.eventKey).toBeTruthy();
  });

  it("creates no signal for empty / invalid events", () => {
    const model = seededModel();
    const empty = recordTutorLearningEvent(
      { type: "ATTEMPT", where: "app_tutor", text: "   ", evidenceId: "e0" },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(empty.accepted).toBe(false);
    expect(empty.signals).toHaveLength(0);

    const ambiguous = classifyAppTutorMessage({ text: "ok" });
    expect(ambiguous).toBeNull();
  });

  it("does not turn one ambiguous message into a permanent learning claim", () => {
    const model = seededModel();
    const result = recordTutorLearningEvent(
      {
        type: "ATTEMPT",
        where: "app_tutor",
        text: "I don't know",
        quality: "thin",
        evidenceId: "amb1",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(result.accepted).toBe(true);
    expect(result.signals.some((s) => s.kind === "attempted")).toBe(true);
    expect(result.signals.some((s) => s.kind === "productive_struggle")).toBe(
      false,
    );
    const blob = JSON.stringify(result.studentModel.knownEvidence);
    expect(blob).not.toMatch(/weak at English|英文很差/i);
  });

  it("creates correction evidence only when both attempts + scaffold exist", () => {
    const model = seededModel();
    const missing = recordTutorLearningEvent(
      {
        type: "CORRECTION",
        where: "mission",
        text: "Hi, I'm Xiaoyu",
        previousText: "",
        scaffoldOccurred: true,
        evidenceId: "c0",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(missing.accepted).toBe(false);

    const ok = recordTutorLearningEvent(
      {
        type: "CORRECTION",
        where: "mission",
        text: "Hi, I'm Xiaoyu. 因為更口語。",
        previousText: "Hello I am Xiaoyu",
        scaffoldOccurred: true,
        evidenceId: "c1",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(ok.accepted).toBe(true);
    expect(ok.signals.some((s) => s.kind === "corrected_after_scaffold")).toBe(
      true,
    );
  });

  it("creates successful_application for acceptable independent attempt", () => {
    const model = seededModel();
    const result = recordTutorLearningEvent(
      {
        type: "SUCCESS",
        where: "mission",
        text: "Good morning, teacher. I am Xiaoyu.",
        quality: "solid",
        independent: true,
        askedForAnswer: false,
        evidenceId: "s1",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(result.accepted).toBe(true);
    expect(result.signals.some((s) => s.kind === "successful_application")).toBe(
      true,
    );
    expect(result.signals.find((s) => s.kind === "successful_application")!.confidence).not.toBe(
      "high",
    );
  });

  it("creates productive_struggle only with sufficient evidence", () => {
    const model = seededModel();
    const weak = recordTutorLearningEvent(
      {
        type: "STRUGGLE",
        where: "mission",
        text: "hmm",
        struggleEvidence: "insufficient",
        evidenceId: "st0",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(weak.accepted).toBe(false);

    const ok = recordTutorLearningEvent(
      {
        type: "STRUGGLE",
        where: "mission",
        text: "我不會這一步",
        struggleEvidence: "explicit_stuck",
        evidenceId: "st1",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    expect(ok.accepted).toBe(true);
    expect(ok.learningState).toBe("Productive Struggle");
  });

  it("deduplicates by eventKey (refresh-safe)", () => {
    const model = seededModel();
    const first = recordTutorLearningEvent(
      {
        type: "ATTEMPT",
        where: "mission",
        text: "Hello there, I am trying.",
        quality: "partial",
        evidenceId: "dup1",
        contextId: "m1",
      },
      {
        studentModel: model,
        learningState: model.learningState,
        existingSignals: [],
      },
    );
    const second = recordTutorLearningEvent(
      {
        type: "ATTEMPT",
        where: "mission",
        text: "Hello there, I am trying.",
        quality: "partial",
        evidenceId: "dup1",
        contextId: "m1",
      },
      {
        studentModel: first.studentModel,
        learningState: first.learningState,
        existingSignals: first.signals,
      },
    );
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe("duplicate");
  });

  it("mission loop uses bridge; reflection connects; Parent Insight stays surveillance-free", () => {
    let loop = startMissionLoop(seededModel());
    loop = recordStudentAttempt(
      loop,
      "first_idea",
      "Hello, I am Xiaoyu. 因為想讓新同學知道我的名字。",
    );
    expect(loop.signals.some((s) => s.kind === "attempted" && s.source === "tutor")).toBe(
      true,
    );
    loop = continueAfterTutor(loop);
    loop = recordStudentAttempt(
      loop,
      "revision",
      "Hi, I'm Xiaoyu. 因為對同學更自然。",
    );
    expect(
      loop.signals.some((s) => s.kind === "corrected_after_scaffold"),
    ).toBe(true);
    loop = recordStudentAttempt(
      loop,
      "apply",
      "Good morning, teacher. I am Xiaoyu.",
    );
    expect(loop.signals.some((s) => s.kind === "successful_application")).toBe(
      true,
    );
    loop = completeReflection(loop, {
      clearer: "可以先說名字",
      difficult: "不確定 Nice to meet you",
      differently: "先寫短句",
      confidenceNow: "medium",
    });
    expect(loop.signals.some((s) => s.kind === "reflected")).toBe(true);
    expect(loop.tomorrowSeed).toBeTruthy();

    const insight = buildParentInsight({
      studentModel: loop.studentModel,
      signals: loop.signals,
      mission: loop.mission,
      basedOn: "learning_session",
    });
    expect(insightLooksSurveillanceFree(insight)).toBe(true);
    const blob = JSON.stringify(insight);
    expect(blob).not.toContain("Hello, I am Xiaoyu");
    expect(blob).not.toContain("role");
  });
});
