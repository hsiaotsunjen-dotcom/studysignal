import { describe, expect, it } from "vitest";

import {
  buildStudentAnswerObject,
  STUDENT_ANSWER_OBJECT_VERSION,
  studentAnswerObjectMatchesPhotos,
  summarizeStudentAnswerObjectForLog,
} from "@/lib/studentAnswerObject";
import type { HomeworkVisionResult } from "@/lib/vision/types";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

function makeSession(
  overrides?: Partial<WorksheetCaptureSession>,
): WorksheetCaptureSession {
  return {
    photos: [
      {
        id: "p1",
        name: "Photo A.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p1",
          photoIndex: 0,
          estimatedTotalQuestions: 9,
          questionsClearlyVisible: [1, 2],
          questionsWithIssues: [],
          detectedQuestionNumbers: [1, 2, 9],
          ocrRawText: "1. ___ end\n2. ___\n9. ___ picture",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "p2",
        name: "Photo B.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p2",
          photoIndex: 1,
          estimatedTotalQuestions: 13,
          questionsClearlyVisible: [9, 10],
          questionsWithIssues: [],
          detectedQuestionNumbers: [9, 10, 13],
          ocrRawText: "9 picture\n10 ____",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
    ],
    estimatedTotalQuestions: 13,
    coveredQuestions: [1, 2, 9, 10],
    detectedQuestions: [1, 2, 9, 10, 13],
    questionsNeedingRetake: [],
    openIssues: [],
    questionPhotoMap: {
      1: "p1",
      2: "p1",
      9: "p2",
      10: "p2",
    },
    questionCoverage: [],
    globalQuestionSet: [1, 2, 9, 10, 13],
    analysis: {
      coverageComplete: false,
      qualityAcceptable: true,
      analysisScope: "partial",
      analysisConfidence: "medium",
      recommendedAction: "retake-missing",
      canAnalyzeCurrent: true,
      missingQuestions: [3, 4, 5, 6, 7, 8, 11, 12, 13],
      lowQualityQuestions: [],
    },
    tutorMessage: "",
    questionEvidenceMap: {},
    ...overrides,
  };
}

describe("buildStudentAnswerObject", () => {
  it("retains OCR raw text per photo and merged", () => {
    const session = makeSession();
    const sao = buildStudentAnswerObject({
      session,
      ocrRawTextByPhotoId: {
        p1: session.photos[0]!.quality!.ocrRawText!,
        p2: session.photos[1]!.quality!.ocrRawText!,
      },
      eyes: null,
      producedAt: 1,
    });

    expect(sao.version).toBe(STUDENT_ANSWER_OBJECT_VERSION);
    expect(sao.ocr.rawTextPerPhoto).toEqual([
      { photoId: "p1", rawText: "1. ___ end\n2. ___\n9. ___ picture" },
      { photoId: "p2", rawText: "9 picture\n10 ____" },
    ]);
    expect(sao.ocr.mergedRawText).toContain("end");
    expect(sao.ocr.mergedRawText).toContain("picture");
    expect(sao.ocr.mergedRawText.length).toBeGreaterThan(0);
  });

  it("builds Q1..QN list and maps Eyes student answers for Q1 and Q9", () => {
    const session = makeSession();
    const eyes: HomeworkVisionResult = {
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
          confidence: 0.9,
        },
        {
          number: 2,
          answered: false,
          studentAnswer: null,
          status: "blank",
          confidence: 0.8,
        },
      ],
      missingSections: [],
      photoQuality: "good",
      confidence: 0.9,
      provider: {
        provider: "test",
        model: "mock",
        version: "1.0.0",
      },
    };

    const sao = buildStudentAnswerObject({
      session,
      ocrRawTextByPhotoId: {
        p1: "ocr-a",
        p2: "ocr-b",
      },
      eyes,
      producedAt: 42,
    });

    expect(sao.questions).toHaveLength(13);
    expect(sao.questions.find((q) => q.id === 1)).toMatchObject({
      studentAnswer: "end",
      answerStatus: "answered",
      sourcePhoto: "Photo1",
    });
    expect(sao.questions.find((q) => q.id === 9)).toMatchObject({
      studentAnswer: "picture",
      answerStatus: "answered",
      sourcePhoto: "Photo2",
    });
    expect(sao.summary.answered).toBe(2);
    expect(sao.summary.totalQuestions).toBe(13);
    expect(sao.eyes?.provider.model).toBe("mock");
    expect(sao.producedAt).toBe(42);
  });

  it("matches photos helper", () => {
    const session = makeSession();
    const sao = buildStudentAnswerObject({
      session,
      ocrRawTextByPhotoId: { p1: "a", p2: "b" },
    });
    expect(studentAnswerObjectMatchesPhotos(sao, ["p1", "p2"])).toBe(true);
    expect(studentAnswerObjectMatchesPhotos(sao, ["p1"])).toBe(false);
    expect(studentAnswerObjectMatchesPhotos(null, ["p1"])).toBe(false);
  });

  it("summarize log does not dump full OCR", () => {
    const sao = buildStudentAnswerObject({
      session: makeSession(),
      ocrRawTextByPhotoId: { p1: "secret-long-ocr", p2: "x" },
    });
    const log = summarizeStudentAnswerObjectForLog(sao);
    expect(JSON.stringify(log)).not.toContain("secret-long-ocr");
    expect(log.ocrMergedLength).toBe(sao.ocr.mergedRawText.length);
  });
});
