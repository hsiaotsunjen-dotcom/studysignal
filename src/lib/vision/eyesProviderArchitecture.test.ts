import { describe, expect, it, vi } from "vitest";

import { applyHomeworkStudentAnswersGuard } from "@/lib/homeworkStudentAnswers";
import { buildStudentAnswerObject } from "@/lib/studentAnswerObject";
import {
  buildTutorSaoInventoryView,
  tutorOverviewFromSao,
} from "@/lib/tutorSaoContext";
import {
  compareEyesProviders,
  detectPossibleLeadingLetterDrop,
  diffEyesAnswers,
  HomeworkVisionService,
  summarizeEyesProviderResult,
  type VisionProvider,
} from "@/lib/vision";
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
          ocrRawText: "",
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
          ocrRawText: "",
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
          ocrRawText: "",
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

function eyesRaw(q1: string, q9: string) {
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
        studentAnswer: q1,
        status: "answered",
        confidence: 0.95,
      },
      {
        number: 9,
        answered: true,
        studentAnswer: q9,
        status: "answered",
        confidence: 0.92,
      },
    ],
    missingSections: [],
    photoQuality: "good",
    confidence: 0.9,
  };
}

function mockProvider(
  id: "gemini" | "openai",
  provider: string,
  model: string,
  raw: unknown,
): VisionProvider {
  return {
    info: { id, provider, model },
    analyzeHomework: vi.fn(async () => raw),
  };
}

function assertSaoTutorSignalsSync(eyes: HomeworkVisionResult) {
  const sao = buildStudentAnswerObject({
    session: makeSession(),
    ocrRawTextByPhotoId: { p1: "", p2: "", p3: "" },
    eyes,
  });
  const tutorView = buildTutorSaoInventoryView(sao);
  const tutorOverview = tutorOverviewFromSao(sao);
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

  expect(tutorOverview).toBe(guarded.homeworkReport?.answerOverview);
  expect(tutorView.answeredCount).toBe(
    guarded.homeworkReport?.studentAnsweredQuestions,
  );
  expect(guarded.homeworkReport?.studentAnswersStatus).not.toBe("none");
  return { sao, tutorOverview, signalsOverview: guarded.homeworkReport?.answerOverview };
}

describe("Eyes pluggable providers → SAO → Tutor/Signals", () => {
  it("Gemini-shaped Eyes output stays synced through SAO consumers", async () => {
    const gemini = mockProvider(
      "gemini",
      "google",
      "gemini-3.5-flash",
      eyesRaw("end", "picture"),
    );
    const service = new HomeworkVisionService(gemini);
    const eyes = await service.analyze({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });
    expect(eyes.provider.model).toBe("gemini-3.5-flash");
    const sync = assertSaoTutorSignalsSync(eyes);
    expect(sync.tutorOverview).toBe("1. end\n9. picture");
  });

  it("OpenAI-shaped Eyes output stays synced through SAO consumers", async () => {
    const openai = mockProvider(
      "openai",
      "openai",
      "gpt-4o-mini",
      eyesRaw("end", "picture"),
    );
    const service = new HomeworkVisionService(openai);
    const eyes = await service.analyze({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });
    expect(eyes.provider.model).toBe("gpt-4o-mini");
    const sync = assertSaoTutorSignalsSync(eyes);
    expect(sync.tutorOverview).toBe("1. end\n9. picture");
  });

  it("provider-only differences are allowed; consumers still match SAO", async () => {
    const gemini = mockProvider(
      "gemini",
      "google",
      "gemini-3.5-flash",
      eyesRaw("nd", "icture"),
    );
    const openai = mockProvider(
      "openai",
      "openai",
      "gpt-4o-mini",
      eyesRaw("end", "picture"),
    );

    const ab = await compareEyesProviders(
      { images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }] },
      gemini,
      openai,
    );

    expect(ab.answerDiffs.length).toBeGreaterThan(0);
    expect(diffEyesAnswers(ab.resultA, ab.resultB)).toEqual(ab.answerDiffs);

    const syncGemini = assertSaoTutorSignalsSync(ab.resultA);
    const syncOpenAI = assertSaoTutorSignalsSync(ab.resultB);
    expect(syncGemini.tutorOverview).toBe("1. nd\n9. icture");
    expect(syncOpenAI.tutorOverview).toBe("1. end\n9. picture");
    // Consumers agree with their own SAO even when providers disagree.
    expect(syncGemini.tutorOverview).toBe(syncGemini.signalsOverview);
    expect(syncOpenAI.tutorOverview).toBe(syncOpenAI.signalsOverview);
  });

  it("summarizeEyesProviderResult flags truncation heuristics", () => {
    expect(detectPossibleLeadingLetterDrop("nd")).toBe(true);
    expect(detectPossibleLeadingLetterDrop("icture")).toBe(true);
    expect(detectPossibleLeadingLetterDrop("end")).toBe(false);
    expect(detectPossibleLeadingLetterDrop("picture")).toBe(false);

    const summary = summarizeEyesProviderResult({
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
          studentAnswer: "nd",
          status: "answered",
          confidence: 0.9,
        },
        {
          number: 9,
          answered: true,
          studentAnswer: "picture",
          status: "answered",
          confidence: 0.9,
        },
      ],
      missingSections: [],
      photoQuality: "good",
      confidence: 0.9,
      provider: {
        provider: "google",
        model: "gemini-3.5-flash",
        version: "1.0.0",
        latency: 2400,
      },
    });
    expect(summary.answeredCount).toBe(2);
    expect(summary.truncationHints).toEqual([
      {
        questionNumber: 1,
        studentAnswer: "nd",
        possibleLeadingLetterDrop: true,
      },
    ]);
  });
});
