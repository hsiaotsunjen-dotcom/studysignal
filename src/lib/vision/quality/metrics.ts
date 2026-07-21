/**
 * Eyes Quality Benchmark — metrics from Eyes result vs sample expectations.
 */

import type { HomeworkVisionResult } from "@/lib/vision/types";
import {
  answersMatch,
  classifyAnswerMismatch,
  normalizeEyesAnswer,
} from "@/lib/vision/quality/classify";
import {
  overallScoreFromSampleMetrics,
  ratesFromConfusion,
} from "@/lib/vision/quality/scoring";
import type {
  EyesFailureCategory,
  EyesQualityProviderAggregate,
  EyesQualitySampleExpected,
  EyesQualitySampleMetrics,
  EyesQualitySampleRun,
} from "@/lib/vision/quality/types";

export { normalizeEyesAnswer, answersMatch } from "@/lib/vision/quality/classify";

function predictedAnswerMap(
  result: HomeworkVisionResult,
): Map<number, string | null> {
  const m = new Map<number, string | null>();
  for (const q of result.questions) {
    const answered =
      q.status === "answered" &&
      typeof q.studentAnswer === "string" &&
      q.studentAnswer.trim().length > 0;
    m.set(
      q.number,
      answered && typeof q.studentAnswer === "string"
        ? q.studentAnswer.trim()
        : null,
    );
  }
  return m;
}

function expectedQuestionSet(expected: EyesQualitySampleExpected): number[] {
  if (expected.expectedQuestionNumbers?.length) {
    return [...new Set(expected.expectedQuestionNumbers)].sort((a, b) => a - b);
  }
  return Array.from({ length: expected.expectedQuestionCount }, (_, i) => i + 1);
}

/** Overview string matching SAO / Tutor / Signals (`1. end\\n9. picture`). */
export function overviewFromEyesResult(result: HomeworkVisionResult): string {
  return result.questions
    .filter(
      (q) =>
        q.status === "answered" &&
        typeof q.studentAnswer === "string" &&
        q.studentAnswer.trim().length > 0,
    )
    .sort((a, b) => a.number - b.number)
    .map((q) => `${q.number}. ${q.studentAnswer!.trim()}`)
    .join("\n");
}

function emptyErrorMetrics(
  expected: EyesQualitySampleExpected,
  run: EyesQualitySampleRun,
): EyesQualitySampleMetrics {
  const fn = expected.expectedAnswers.filter(
    (a) => a.studentAnswer != null && a.studentAnswer.trim() !== "",
  ).length;
  const confusion = {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: fn,
    trueNegatives: 0,
  };
  const rates = ratesFromConfusion(confusion);
  return {
    sampleId: expected.id,
    providerId: run.providerId,
    model: run.model,
    difficulty: expected.difficulty,
    imageQuality: expected.imageQuality,
    subject: expected.subject,
    questionDetectionAccuracy: 0,
    answerExtractionAccuracy: 0,
    falsePositives: 0,
    falseNegatives: fn,
    falsePositiveRate: rates.falsePositiveRate,
    falseNegativeRate: rates.falseNegativeRate,
    hallucinationRate: 1,
    averageConfidence: 0,
    overallConfidence: 0,
    latencyMs: run.latencyMs,
    estimatedCostUsd: run.estimatedCostUsd,
    retryCount: run.retryCount,
    providerRetryCount: run.providerRetryCount,
    fallbackCount: run.fallbackUsed ? 1 : 0,
    promptTokens: run.usage?.promptTokens ?? null,
    completionTokens: run.usage?.completionTokens ?? null,
    totalTokens: run.usage?.totalTokens ?? null,
    overviewMatch: false,
    predictedOverview: "",
    expectedOverview: expected.expectedOverview,
    confusion,
    answerMismatches: [],
    failureCategories: run.error?.toLowerCase().includes("timeout")
      ? ["Provider Timeout"]
      : run.error?.toLowerCase().includes("json")
        ? ["Schema Error"]
        : ["Other"],
  };
}

export function scoreEyesQualitySample(
  expected: EyesQualitySampleExpected,
  run: EyesQualitySampleRun,
): EyesQualitySampleMetrics {
  if (run.error || !run.result) {
    return emptyErrorMetrics(expected, run);
  }

  const result = run.result;
  const expectedQs = expectedQuestionSet(expected);
  const predictedNums = new Set(result.questions.map((q) => q.number));
  const detected = expectedQs.filter((n) => predictedNums.has(n)).length;
  const questionDetectionAccuracy =
    expectedQs.length === 0 ? 1 : detected / expectedQs.length;

  const predMap = predictedAnswerMap(result);
  const answeredExpectations = expected.expectedAnswers.filter(
    (a) => a.studentAnswer != null && a.studentAnswer.trim() !== "",
  );

  let truePositives = 0;
  let falseNegatives = 0;
  const answerMismatches: EyesQualitySampleMetrics["answerMismatches"] = [];
  const failureCategories = new Set<EyesFailureCategory>();

  for (const n of expectedQs) {
    if (!predictedNums.has(n)) failureCategories.add("Question Missing");
  }

  for (const exp of answeredExpectations) {
    const predicted = predMap.has(exp.questionNumber)
      ? predMap.get(exp.questionNumber)!
      : null;
    if (answersMatch(exp, predicted)) {
      truePositives += 1;
    } else {
      falseNegatives += 1;
      const categories = classifyAnswerMismatch({
        expected: exp.studentAnswer,
        predicted,
        expectedBlank: false,
      });
      for (const c of categories) failureCategories.add(c);
      answerMismatches.push({
        questionNumber: exp.questionNumber,
        expected: exp.studentAnswer,
        predicted,
        categories,
      });
    }
  }

  let falsePositives = 0;
  let trueNegatives = 0;
  for (const blankNum of expected.expectedBlanks) {
    const predicted = predMap.has(blankNum) ? predMap.get(blankNum)! : null;
    if (predicted != null && predicted.trim() !== "") {
      falsePositives += 1;
      const categories = classifyAnswerMismatch({
        expected: null,
        predicted,
        expectedBlank: true,
      });
      for (const c of categories) failureCategories.add(c);
      answerMismatches.push({
        questionNumber: blankNum,
        expected: null,
        predicted,
        categories,
      });
    } else {
      trueNegatives += 1;
    }
  }

  const known = new Set([
    ...answeredExpectations.map((a) => a.questionNumber),
    ...expected.expectedBlanks,
  ]);
  for (const [num, ans] of predMap) {
    if (known.has(num)) continue;
    if (ans != null && ans.trim() !== "") {
      falsePositives += 1;
      const categories = classifyAnswerMismatch({
        expected: null,
        predicted: ans,
        expectedBlank: true,
      });
      for (const c of categories) failureCategories.add(c);
      answerMismatches.push({
        questionNumber: num,
        expected: null,
        predicted: ans,
        categories,
      });
    }
  }

  const answerExtractionAccuracy =
    answeredExpectations.length === 0
      ? 1
      : truePositives / answeredExpectations.length;

  const confusion = {
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
  };
  const rates = ratesFromConfusion(confusion);
  const blankDenom = falsePositives + trueNegatives;
  const hasBlankExpectations = expected.expectedBlanks.length > 0;
  // Declared blanks → FP among blank checks.
  // No declared blanks → FP/(FP+TP) so extras don't force 100% when TN=0.
  const hallucinationRate = hasBlankExpectations
    ? blankDenom === 0
      ? 0
      : falsePositives / blankDenom
    : falsePositives === 0
      ? 0
      : falsePositives / (falsePositives + Math.max(truePositives, 0));

  const confidences = result.questions.map((q) => q.confidence);
  const averageConfidence =
    confidences.length === 0
      ? 0
      : confidences.reduce((s, c) => s + c, 0) / confidences.length;

  const predictedOverview = overviewFromEyesResult(result);
  const normalizedPredicted =
    predictedOverview.trim() === "" ? "(none)" : predictedOverview;
  const normalizedExpected =
    expected.expectedOverview.trim() === ""
      ? "(none)"
      : expected.expectedOverview;
  const overviewMatch =
    normalizeEyesAnswer(normalizedPredicted.replace(/\n/g, " | ")) ===
      normalizeEyesAnswer(normalizedExpected.replace(/\n/g, " | ")) ||
    normalizedPredicted === normalizedExpected;

  return {
    sampleId: expected.id,
    providerId: run.providerId,
    model: run.model,
    difficulty: expected.difficulty,
    imageQuality: [...expected.imageQuality],
    subject: expected.subject,
    questionDetectionAccuracy,
    answerExtractionAccuracy,
    falsePositives,
    falseNegatives,
    falsePositiveRate: rates.falsePositiveRate,
    falseNegativeRate: rates.falseNegativeRate,
    hallucinationRate,
    averageConfidence,
    overallConfidence: result.confidence,
    latencyMs: run.latencyMs,
    estimatedCostUsd: run.estimatedCostUsd,
    retryCount: run.retryCount,
    providerRetryCount: run.providerRetryCount,
    fallbackCount: run.fallbackUsed ? 1 : 0,
    promptTokens: run.usage?.promptTokens ?? null,
    completionTokens: run.usage?.completionTokens ?? null,
    totalTokens: run.usage?.totalTokens ?? null,
    overviewMatch,
    predictedOverview,
    expectedOverview: expected.expectedOverview,
    confusion,
    answerMismatches,
    failureCategories: [...failureCategories],
  };
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function sumNullable(vals: Array<number | null>): number | null {
  if (vals.every((v) => v == null)) return null;
  return vals.reduce<number>((s, v) => s + (v ?? 0), 0);
}

export function aggregateEyesQualityProvider(
  providerId: EyesQualitySampleRun["providerId"],
  providerLabel: string,
  model: string,
  samples: EyesQualitySampleMetrics[],
): EyesQualityProviderAggregate {
  const costs = samples.map((s) => s.estimatedCostUsd);
  const tokens = samples.map((s) => s.totalTokens);
  const retryRate =
    samples.length === 0
      ? 0
      : samples.filter((s) => s.retryCount > 0 || s.providerRetryCount > 0)
          .length / samples.length;
  const fallbackRate =
    samples.length === 0
      ? 0
      : samples.filter((s) => s.fallbackCount > 0).length / samples.length;

  return {
    providerId,
    providerLabel,
    model,
    sampleCount: samples.length,
    questionDetectionAccuracy: avg(
      samples.map((s) => s.questionDetectionAccuracy),
    ),
    answerExtractionAccuracy: avg(
      samples.map((s) => s.answerExtractionAccuracy),
    ),
    falsePositives: samples.reduce((s, x) => s + x.falsePositives, 0),
    falseNegatives: samples.reduce((s, x) => s + x.falseNegatives, 0),
    falsePositiveRate: avg(samples.map((s) => s.falsePositiveRate)),
    falseNegativeRate: avg(samples.map((s) => s.falseNegativeRate)),
    hallucinationRate: avg(samples.map((s) => s.hallucinationRate)),
    averageConfidence: avg(samples.map((s) => s.averageConfidence)),
    latencyMsAvg: avg(samples.map((s) => s.latencyMs)),
    estimatedCostUsdAvg: costs.every((c) => c == null)
      ? null
      : avg(costs.map((c) => c ?? 0)),
    retryCountTotal: samples.reduce((s, x) => s + x.retryCount, 0),
    fallbackCountTotal: samples.reduce((s, x) => s + x.fallbackCount, 0),
    retryRate,
    fallbackRate,
    promptTokensTotal: sumNullable(samples.map((s) => s.promptTokens)),
    completionTokensTotal: sumNullable(samples.map((s) => s.completionTokens)),
    totalTokensTotal: sumNullable(samples.map((s) => s.totalTokens)),
    averageTokenUsage: tokens.every((t) => t == null)
      ? null
      : avg(tokens.map((t) => t ?? 0)),
    overallScore: overallScoreFromSampleMetrics(samples),
    samples,
  };
}
