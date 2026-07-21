import { describe, expect, it } from "vitest";

import {
  applyHomeworkStudentAnswersGuard,
  evidenceFromStudentAnswerObject,
} from "@/lib/homeworkStudentAnswers";
import {
  buildAnswerOverviewFromStudentAnswerObject,
  buildStudentAnswerObject,
} from "@/lib/studentAnswerObject";
import {
  buildTutorChatSaoSystemPrompt,
  buildTutorSaoInventoryView,
  tutorOverviewFromSao,
} from "@/lib/tutorSaoContext";
import type { HomeworkVisionResult } from "@/lib/vision/types";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

function makeSession(): WorksheetCaptureSession {
  return {
    photos: [
      {
        id: "p1",
        name: "Photo1.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p1",
          photoIndex: 0,
          estimatedTotalQuestions: 8,
          questionsClearlyVisible: [1, 2, 3, 4, 5],
          questionsWithIssues: [],
          detectedQuestionNumbers: [1, 2, 3, 4, 5],
          ocrRawText: "1 end",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "p2",
        name: "Photo2.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p2",
          photoIndex: 1,
          estimatedTotalQuestions: 10,
          questionsClearlyVisible: [6, 7, 8, 9],
          questionsWithIssues: [],
          detectedQuestionNumbers: [6, 7, 8, 9],
          ocrRawText: "9 picture",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "p3",
        name: "Photo3.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p3",
          photoIndex: 2,
          estimatedTotalQuestions: 13,
          questionsClearlyVisible: [10, 11, 12, 13],
          questionsWithIssues: [],
          detectedQuestionNumbers: [10, 11, 12, 13],
          ocrRawText: "10",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
    ],
    estimatedTotalQuestions: 13,
    coveredQuestions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    detectedQuestions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    questionsNeedingRetake: [],
    openIssues: [],
    questionPhotoMap: { 1: "p1", 9: "p2", 10: "p3" },
    questionEvidenceMap: {},
    analysis: {
      coverageComplete: true,
      qualityAcceptable: true,
      canAnalyzeCurrent: true,
      recommendedAction: "analyze",
      analysisScope: "full",
      analysisConfidence: "high",
      missingQuestions: [],
      lowQualityQuestions: [],
    },
    tutorMessage: "",
  };
}

function makeEyes(): HomeworkVisionResult {
  return {
    assignment: {
      subject: "English",
      type: "worksheet",
      totalQuestions: 13,
      sameAssignment: true,
    },
    questions: [
      {
        number: 1,
        answered: true,
        studentAnswer: "end",
        status: "answered",
        confidence: 0.95,
      },
      {
        number: 9,
        answered: true,
        studentAnswer: "picture",
        status: "answered",
        confidence: 0.92,
      },
    ],
    missingSections: [],
    photoQuality: "good",
    confidence: 0.9,
    provider: { provider: "test", model: "mock", version: "1.0.0" },
  };
}

describe("Phase 3 Tutor ← SAO (same inventory as Signals)", () => {
  it("Tutor and Signals share identical overview for Q1=end Q9=picture", () => {
    const sao = buildStudentAnswerObject({
      session: makeSession(),
      ocrRawTextByPhotoId: { p1: "a", p2: "b", p3: "c" },
      eyes: makeEyes(),
    });

    const signalsOverview = buildAnswerOverviewFromStudentAnswerObject(sao);
    const tutorOverview = tutorOverviewFromSao(sao);
    expect(tutorOverview).toBe(signalsOverview);
    expect(tutorOverview).toBe("1. end\n9. picture");

    const tutorView = buildTutorSaoInventoryView(sao);
    expect(tutorView.answeredCount).toBe(2);
    expect(tutorView.answered.map((q) => [q.id, q.studentAnswer])).toEqual([
      [1, "end"],
      [9, "picture"],
    ]);

    const signalsEvidence = evidenceFromStudentAnswerObject(sao);
    expect(signalsEvidence.answeredQuestions).toBe(tutorView.answeredCount);

    const guarded = applyHomeworkStudentAnswersGuard(
      {
        ocrText: "",
        visualSummaryZh: "",
        homeworkReport: {
          homeworkType: "worksheet",
          questionCount: 13,
          imageQuality: "good",
          studentAnswersStatus: "none",
          answerOverview: "—",
          keyExplanations: [],
          pronunciationFocus: [],
          learningSignal: [],
        },
      },
      { studentAnswerObject: sao },
    );
    expect(guarded.homeworkReport?.answerOverview).toBe(tutorOverview);
    expect(guarded.homeworkReport?.studentAnsweredQuestions).toBe(2);
  });

  it("Tutor system prompt embeds SAO and forbids pixel rediscovery", () => {
    const sao = buildStudentAnswerObject({
      session: makeSession(),
      ocrRawTextByPhotoId: { p1: "a", p2: "b", p3: "c" },
      eyes: makeEyes(),
    });
    const prompt = buildTutorChatSaoSystemPrompt(sao);
    expect(prompt).toContain("Q1 = end");
    expect(prompt).toContain("Q9 = picture");
    expect(prompt).toContain("1. end");
    expect(prompt).toContain("9. picture");
    expect(prompt).toMatch(/唯一真相來源|Single Source of Truth/);
    expect(prompt).toMatch(/禁止從照片重新辨識/);
    expect(prompt).toMatch(/禁止「找出最明顯的題」/);
    expect(prompt).toMatch(/「偵測手寫」/);
    expect(prompt).not.toMatch(/就依照圈選、手寫、或最明顯的題目判斷/);
  });
});
