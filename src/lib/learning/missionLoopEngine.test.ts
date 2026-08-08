import { describe, expect, it } from "vitest";

import {
  abandonMission,
  completeReflection,
  continueAfterTutor,
  craftTutorResponse,
  estimateStateAfterAttempt,
  recordStudentAttempt,
  sanitizeMissionLoop,
  startMissionLoop,
} from "@/lib/learning/missionLoopEngine";
import type { MissionAttempt } from "@/lib/learning/missionTypes";
import {
  createOnboardingSession,
  finalizeOnboarding,
  markOnboardingComplete,
  patchDraft,
} from "@/lib/learning/onboardingEngine";
import {
  buildParentInsight,
  insightLooksSurveillanceFree,
} from "@/lib/learning/parentInsight";
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

describe("missionLoopEngine", () => {
  it("initializes a mission from Student Model without fabricating evidence", () => {
    const model = seededModel();
    const loop = startMissionLoop(model);
    expect(loop.phase).toBe("mission_start");
    expect(loop.studentModel.studentId).toBe(model.studentId);
    expect(loop.mission.subject).toBe("英語");
    expect(loop.attempts).toHaveLength(0);
    expect(loop.tomorrowSeed).toBeNull();
  });

  it("records attempt, creates signals, updates state, and tutors without giving the answer", () => {
    let loop = startMissionLoop(seededModel());
    loop = recordStudentAttempt(
      loop,
      "first_idea",
      "Hello, I am Xiaoyu. 因為這是最自然的打招呼。",
    );
    expect(loop.lastError).toBeNull();
    expect(loop.attempts).toHaveLength(1);
    expect(loop.signals.some((s) => s.kind === "attempted")).toBe(true);
    expect(loop.tutorTurns).toHaveLength(1);
    expect(loop.tutorTurns[0]!.message).not.toMatch(/The answer is|標準答案是/i);
    expect(loop.tutorTurns[0]!.strategy).not.toBeUndefined();
    expect(loop.phase).toBe("tutor_respond");
    expect(loop.studentModel.learningState).toBe(loop.learningState);
  });

  it("rejects empty attempts without fabricating signals of quality", () => {
    let loop = startMissionLoop(seededModel());
    const before = loop.signals.length;
    loop = recordStudentAttempt(loop, "first_idea", "   ");
    expect(loop.lastError).toBeTruthy();
    expect(loop.attempts).toHaveLength(0);
    expect(loop.signals.length).toBe(before);
  });

  it("deflects answer-seeking instead of dumping a full answer", () => {
    const attempt: MissionAttempt = {
      id: "a1",
      kind: "first_idea",
      text: "直接告訴我答案",
      createdAt: new Date().toISOString(),
      observedQuality: "thin",
      askedForAnswer: true,
    };
    const turn = craftTutorResponse({
      learningState: "Building",
      attempt,
      answerRequestCount: 1,
      attemptCount: 1,
      name: "小宇",
    });
    expect(turn.strategy).toBe("deflect_answer_request");
    expect(turn.message).not.toContain("Hello, my name is");
  });

  it("Learning State influences next behavior (Unproductive Struggle → scaffold)", () => {
    const attempt: MissionAttempt = {
      id: "a2",
      kind: "first_idea",
      text: "hi",
      createdAt: new Date().toISOString(),
      observedQuality: "thin",
      askedForAnswer: false,
    };
    const state = estimateStateAfterAttempt({
      previous: "Building",
      attempt,
      answerRequestCount: 0,
      attemptCount: 2,
      hintCount: 0,
    });
    expect(state).toBe("Unproductive Struggle");
    const turn = craftTutorResponse({
      learningState: state,
      attempt,
      answerRequestCount: 0,
      attemptCount: 2,
      name: "小宇",
    });
    expect(turn.strategy).toBe("scaffold");
  });

  it("runs full loop: attempt → tutor → revision → apply → reflection → tomorrow", () => {
    let loop = startMissionLoop(seededModel());
    loop = recordStudentAttempt(
      loop,
      "first_idea",
      "Hi, I am Xiaoyu. Nice to meet you. 因為想讓對方知道我的名字。",
    );
    loop = continueAfterTutor(loop);
    expect(loop.phase).toBe("second_attempt");
    loop = recordStudentAttempt(
      loop,
      "revision",
      "Hi, I'm Xiaoyu. 我把 I am 改成 I'm，因為更口語。",
    );
    expect(loop.phase).toBe("apply");
    loop = recordStudentAttempt(
      loop,
      "apply",
      "Good morning, teacher. I am Xiaoyu.",
    );
    expect(loop.phase).toBe("reflection");

    const beforeEvidence = loop.studentModel.knownEvidence.length;
    loop = completeReflection(loop, {
      clearer: "打招呼可以先說名字",
      difficult: "不確定要不要加 Nice to meet you",
      differently: "先寫短的再補",
      confidenceNow: "medium",
    });

    expect(loop.phase).toBe("complete");
    expect(loop.reflection).toBeTruthy();
    expect(loop.tomorrowSeed).toBeTruthy();
    expect(loop.tomorrowSeed!.focus.length).toBeGreaterThan(4);
    expect(loop.signals.some((s) => s.kind === "reflected")).toBe(true);
    expect(loop.studentModel.knownEvidence.length).toBeGreaterThan(
      beforeEvidence,
    );
    expect(loop.studentModel.learningState).not.toBe("Orienting");

    const insight = buildParentInsight({
      studentModel: loop.studentModel,
      signals: loop.signals,
      mission: loop.mission,
      basedOn: "learning_session",
    });
    expect(insight.status).toBe("ready");
    expect(insightLooksSurveillanceFree(insight)).toBe(true);
    expect(JSON.stringify(insight)).not.toContain("Hi, I am Xiaoyu");
  });

  it("reduces intervention when Independent + solid attempt", () => {
    const attempt: MissionAttempt = {
      id: "a3",
      kind: "revision",
      text: "Hello, my name is Xiaoyu because I want to greet a new classmate clearly.",
      createdAt: new Date().toISOString(),
      observedQuality: "solid",
      askedForAnswer: false,
    };
    const turn = craftTutorResponse({
      learningState: "Independent",
      attempt,
      answerRequestCount: 0,
      attemptCount: 2,
      name: "小宇",
    });
    expect(turn.strategy).toBe("reduce_intervention");
  });

  it("sanitizes corrupted storage and supports abandon", () => {
    expect(sanitizeMissionLoop(null)).toBeNull();
    expect(
      sanitizeMissionLoop({
        id: "x",
      } as never),
    ).toBeNull();

    let loop = startMissionLoop(seededModel());
    loop = abandonMission(loop);
    expect(loop.phase).toBe("abandoned");
  });
});
