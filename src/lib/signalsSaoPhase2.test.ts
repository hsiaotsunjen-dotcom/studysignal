import { describe, expect, it } from "vitest";

import type { ImageInsights } from "@/lib/analyzeFeedback";
import {
  applyHomeworkStudentAnswersGuard,
  evidenceFromStudentAnswerObject,
  NO_STUDENT_ANSWERS_MESSAGE_EN,
  NO_STUDENT_ANSWERS_MESSAGE_ZH,
  resolveStudentAnswersStatusFromSao,
} from "@/lib/homeworkStudentAnswers";
import {
  buildAnswerOverviewFromStudentAnswerObject,
  buildStudentAnswerObject,
} from "@/lib/studentAnswerObject";
import type { HomeworkVisionResult } from "@/lib/vision/types";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

/**
 * Regression: 3-photo homework where Eyes/SAO sees Q1=end and Q9=picture.
 * Signals must consume SAO only and must never report "No student answers detected."
 */
function makeThreePhotoSession(): WorksheetCaptureSession {
  return {
    photos: [
      {
        id: "photo-1",
        name: "Photo1.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "photo-1",
          photoIndex: 0,
          estimatedTotalQuestions: 8,
          questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8],
          questionsWithIssues: [],
          detectedQuestionNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
          ocrRawText: "1. ___ end\n2. ___",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "photo-2",
        name: "Photo2.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "photo-2",
          photoIndex: 1,
          estimatedTotalQuestions: 10,
          questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          questionsWithIssues: [],
          detectedQuestionNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          ocrRawText: "9. ___ picture",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "photo-3",
        name: "Photo3.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "photo-3",
          photoIndex: 2,
          estimatedTotalQuestions: 13,
          questionsClearlyVisible: [7, 8, 9, 10],
          questionsWithIssues: [],
          detectedQuestionNumbers: [7, 8, 9, 10, 11, 12, 13],
          ocrRawText: "11 ____ 12 ____ 13 ____",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
    ],
    estimatedTotalQuestions: 13,
    coveredQuestions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    detectedQuestions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    questionsNeedingRetake: [],
    openIssues: [],
    questionPhotoMap: {
      1: "photo-1",
      2: "photo-1",
      9: "photo-2",
      10: "photo-2",
    },
    questionEvidenceMap: {},
    analysis: {
      coverageComplete: false,
      qualityAcceptable: true,
      canAnalyzeCurrent: true,
      recommendedAction: "retake-missing",
      analysisScope: "partial",
      analysisConfidence: "medium",
      missingQuestions: [11, 12, 13],
      lowQualityQuestions: [],
    },
    tutorMessage: "",
    questionCoverage: [],
    globalQuestionSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  };
}

function makeEyesWithQ1EndQ9Picture(): HomeworkVisionResult {
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
    provider: {
      provider: "test",
      model: "mock-eyes",
      version: "1.0.0",
    },
  };
}

function modelSaysNoneInsights(): ImageInsights {
  return {
    ocrText: "",
    visualSummaryZh: "作業照片",
    homeworkReport: {
      homeworkType: "worksheet",
      questionCount: 13,
      imageQuality: "good",
      studentAnswersStatus: "none",
      studentAnswersDetected: false,
      noStudentAnswersMessage: NO_STUDENT_ANSWERS_MESSAGE_EN,
      answerOverview: "—",
      keyExplanations: [],
      pronunciationFocus: [],
      learningSignal: [],
      questionAnswerAudit: [],
    },
  };
}

describe("Phase 2 Signals ← SAO (3-photo Q1=end, Q9=picture)", () => {
  it("builds SAO with Q1=end and Q9=picture from Eyes", () => {
    const session = makeThreePhotoSession();
    const sao = buildStudentAnswerObject({
      session,
      ocrRawTextByPhotoId: {
        "photo-1": session.photos[0]!.quality!.ocrRawText!,
        "photo-2": session.photos[1]!.quality!.ocrRawText!,
        "photo-3": session.photos[2]!.quality!.ocrRawText!,
      },
      eyes: makeEyesWithQ1EndQ9Picture(),
    });

    expect(sao.photos).toHaveLength(3);
    expect(sao.questions.find((q) => q.id === 1)?.studentAnswer).toBe("end");
    expect(sao.questions.find((q) => q.id === 9)?.studentAnswer).toBe(
      "picture",
    );
    expect(sao.summary.answered).toBe(2);
    expect(buildAnswerOverviewFromStudentAnswerObject(sao)).toContain("end");
    expect(buildAnswerOverviewFromStudentAnswerObject(sao)).toContain(
      "picture",
    );
  });

  it("Signals guard never reports none / No student answers when SAO has answers", () => {
    const session = makeThreePhotoSession();
    const sao = buildStudentAnswerObject({
      session,
      ocrRawTextByPhotoId: {
        "photo-1": "ocr1",
        "photo-2": "ocr2",
        "photo-3": "ocr3",
      },
      eyes: makeEyesWithQ1EndQ9Picture(),
    });

    const evidence = evidenceFromStudentAnswerObject(sao);
    expect(evidence.answeredQuestions).toBe(2);
    expect(resolveStudentAnswersStatusFromSao(evidence)).not.toBe("none");

    const guarded = applyHomeworkStudentAnswersGuard(modelSaysNoneInsights(), {
      studentAnswerObject: sao,
    });
    const report = guarded.homeworkReport!;

    expect(report.studentAnswersStatus).not.toBe("none");
    expect(report.studentAnsweredQuestions).toBe(2);
    expect(report.answerOverview).toMatch(/1\.\s*end/);
    expect(report.answerOverview).toMatch(/9\.\s*picture/);
    expect(report.formattedReport ?? "").not.toContain(
      "No student answers were detected",
    );
    expect(report.noStudentAnswersMessage ?? "").not.toContain(
      "No student answers were detected",
    );
    expect(report.formattedReport ?? "").not.toContain(
      NO_STUDENT_ANSWERS_MESSAGE_ZH.split("\n")[0]!,
    );
  });

  it("ignores model none inventory when SAO is attached", () => {
    const session = makeThreePhotoSession();
    const sao = buildStudentAnswerObject({
      session,
      ocrRawTextByPhotoId: {
        "photo-1": "a",
        "photo-2": "b",
        "photo-3": "c",
      },
      eyes: makeEyesWithQ1EndQ9Picture(),
    });

    const withoutSao = applyHomeworkStudentAnswersGuard(
      modelSaysNoneInsights(),
    );
    expect(withoutSao.homeworkReport?.studentAnswersStatus).toBe("none");

    const withSao = applyHomeworkStudentAnswersGuard(modelSaysNoneInsights(), {
      studentAnswerObject: sao,
    });
    expect(withSao.homeworkReport?.studentAnswersStatus).toBe("insufficient");
    expect(withSao.homeworkReport?.studentAnsweredQuestions).toBe(2);
  });
});
