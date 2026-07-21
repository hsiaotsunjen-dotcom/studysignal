import { describe, expect, it } from "vitest";

import { classifyAnswerMismatch } from "@/lib/vision/quality/classify";
import { formatProviderScoreDashboard } from "@/lib/vision/quality/dashboard";
import { formatDifficultyReport } from "@/lib/vision/quality/difficultyReport";
import {
  aggregateEyesQualityProvider,
  overviewFromEyesResult,
  scoreEyesQualitySample,
} from "@/lib/vision/quality/metrics";
import { formatEyesQualityTextReport } from "@/lib/vision/quality/report";
import { assertEyesQualityBaselines } from "@/lib/vision/quality/regression";
import { computeOverallScore } from "@/lib/vision/quality/scoring";
import { EYES_PROMPT_VERSION } from "@/lib/vision/quality/constants";
import type {
  EyesQualitySampleExpected,
  EyesQualitySampleRun,
} from "@/lib/vision/quality/types";
import type { HomeworkVisionResult } from "@/lib/vision/types";

const expected: EyesQualitySampleExpected = {
  id: "001_three_photo_fill_blank",
  sampleId: "001_three_photo_fill_blank",
  description: "fixture",
  photos: ["photo1.jpg"],
  enabled: true,
  subject: "English",
  grade: "elementary",
  language: "en",
  difficulty: "Medium",
  imageQuality: ["Handwriting", "Worksheet", "English", "Multi-page"],
  expectedQuestionCount: 13,
  questionCount: 13,
  expectedQuestionNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  expectedAnswers: [
    { questionNumber: 1, studentAnswer: "end" },
    { questionNumber: 9, studentAnswer: "picture" },
  ],
  expectedBlanks: [2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13],
  expectedOverview: "1. end\n9. picture",
};

function makeResult(
  answers: Array<{ number: number; studentAnswer: string | null }>,
): HomeworkVisionResult {
  return {
    assignment: {
      subject: "English",
      type: "worksheet",
      totalQuestions: 13,
      sameAssignment: true,
    },
    questions: Array.from({ length: 13 }, (_, i) => {
      const n = i + 1;
      const hit = answers.find((a) => a.number === n);
      const studentAnswer = hit?.studentAnswer ?? null;
      const answered = studentAnswer != null && studentAnswer.trim() !== "";
      return {
        number: n,
        answered,
        studentAnswer,
        status: answered ? ("answered" as const) : ("blank" as const),
        confidence: 0.9,
      };
    }),
    missingSections: [],
    photoQuality: "good",
    confidence: 0.9,
    provider: {
      provider: "google",
      model: "gemini-3.5-flash",
      version: "1.0.0",
      latency: 2100,
    },
  };
}

function makeRun(result: HomeworkVisionResult): EyesQualitySampleRun {
  return {
    sampleId: expected.id,
    providerId: "gemini",
    providerLabel: "Gemini (gemini-3.5-flash)",
    model: "gemini-3.5-flash",
    promptVersion: EYES_PROMPT_VERSION,
    result,
    rawResponse: result,
    latencyMs: 2100,
    usage: {
      promptTokens: 1000,
      completionTokens: 200,
      totalTokens: 1200,
    },
    estimatedCostUsd: 0.0008,
    retryCount: 0,
    providerRetryCount: 0,
    fallbackUsed: false,
    error: null,
  };
}

describe("AI Quality Platform metrics + dashboard", () => {
  it("scores perfect extraction with rates + overall score", () => {
    const result = makeResult([
      { number: 1, studentAnswer: "end" },
      { number: 9, studentAnswer: "picture" },
    ]);
    const metrics = scoreEyesQualitySample(expected, makeRun(result));
    expect(metrics.questionDetectionAccuracy).toBe(1);
    expect(metrics.answerExtractionAccuracy).toBe(1);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.hallucinationRate).toBe(0);
    expect(metrics.falsePositiveRate).toBe(0);
    expect(metrics.overviewMatch).toBe(true);
    expect(overviewFromEyesResult(result)).toBe("1. end\n9. picture");

    const agg = aggregateEyesQualityProvider(
      "gemini",
      "Gemini 3.5 Flash",
      "gemini-3.5-flash",
      [metrics],
    );
    expect(agg.overallScore).toBeGreaterThan(90);
    expect(formatProviderScoreDashboard([agg])).toContain("Overall Score");
    expect(formatDifficultyReport([agg])).toContain("Medium");
    expect(formatEyesQualityTextReport([agg])).toContain("100.0%");
  });

  it("classifies truncation mismatches", () => {
    expect(
      classifyAnswerMismatch({
        expected: "end",
        predicted: "nd",
        expectedBlank: false,
      }),
    ).toEqual(expect.arrayContaining(["Wrong Student Answer", "Truncation"]));

    const result = makeResult([
      { number: 1, studentAnswer: "nd" },
      { number: 9, studentAnswer: "icture" },
    ]);
    const metrics = scoreEyesQualitySample(expected, makeRun(result));
    expect(metrics.answerExtractionAccuracy).toBe(0);
    expect(metrics.failureCategories).toEqual(
      expect.arrayContaining(["Wrong Student Answer", "Truncation"]),
    );
  });

  it("counts invented blank answers as hallucinations", () => {
    const result = makeResult([
      { number: 1, studentAnswer: "end" },
      { number: 9, studentAnswer: "picture" },
      { number: 3, studentAnswer: "ghost" },
    ]);
    const metrics = scoreEyesQualitySample(expected, makeRun(result));
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.hallucinationRate).toBeGreaterThan(0);
    expect(metrics.failureCategories).toContain("Hallucination");
  });

  it("does not force 100% hallucination when blanks are undeclared", () => {
    const partialExpected: EyesQualitySampleExpected = {
      ...expected,
      id: "003_photo2_q9_picture",
      sampleId: "003_photo2_q9_picture",
      difficulty: "Hard",
      expectedQuestionCount: 1,
      questionCount: 1,
      expectedQuestionNumbers: [9],
      expectedAnswers: [{ questionNumber: 9, studentAnswer: "picture" }],
      expectedBlanks: [],
      expectedOverview: "9. picture",
    };
    const result = makeResult([
      { number: 1, studentAnswer: "end" },
      { number: 9, studentAnswer: "picture" },
    ]);
    const metrics = scoreEyesQualitySample(partialExpected, {
      ...makeRun(result),
      sampleId: partialExpected.id,
    });
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.answerExtractionAccuracy).toBe(1);
    expect(metrics.hallucinationRate).toBeCloseTo(0.5, 5);
  });

  it("computes overall score and enforces baselines", () => {
    expect(
      computeOverallScore({
        questionDetectionAccuracy: 1,
        answerExtractionAccuracy: 1,
        hallucinationRate: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        latencyMsAvg: 2000,
        estimatedCostUsdAvg: 0.001,
      }),
    ).toBeGreaterThan(95);

    const perfect = scoreEyesQualitySample(
      expected,
      makeRun(
        makeResult([
          { number: 1, studentAnswer: "end" },
          { number: 9, studentAnswer: "picture" },
        ]),
      ),
    );
    const report = {
      generatedAt: new Date().toISOString(),
      datasetRoot: "tests/eyes-quality",
      sampleIds: [expected.id],
      providers: [
        aggregateEyesQualityProvider(
          "gemini",
          "Gemini",
          "gemini-3.5-flash",
          [perfect],
        ),
      ],
      textReport: "",
    };
    expect(() =>
      assertEyesQualityBaselines(report, {
        version: "2.0.0",
        description: "test",
        enforce: true,
        maxLatencyMsAvg: 60000,
        maxCostUsdAvg: 0.05,
        minOverallScore: 70,
        providers: {
          gemini: {
            minQuestionDetectionAccuracy: 0.9,
            minAnswerExtractionAccuracy: 0.9,
            maxHallucinationRate: 0.15,
            minOverallScore: 70,
          },
        },
      }),
    ).not.toThrow();

    const bad = scoreEyesQualitySample(
      expected,
      makeRun(
        makeResult([
          { number: 1, studentAnswer: "nd" },
          { number: 9, studentAnswer: "icture" },
        ]),
      ),
    );
    expect(() =>
      assertEyesQualityBaselines(
        {
          ...report,
          providers: [
            aggregateEyesQualityProvider("gemini", "Gemini", "gemini-3.5-flash", [
              bad,
            ]),
          ],
        },
        {
          version: "2.0.0",
          description: "test",
          enforce: true,
          providers: {
            gemini: {
              minQuestionDetectionAccuracy: 0.9,
              minAnswerExtractionAccuracy: 0.9,
              maxHallucinationRate: 0.15,
            },
          },
        },
      ),
    ).toThrow(/answerExtractionAccuracy/);
  });
});
