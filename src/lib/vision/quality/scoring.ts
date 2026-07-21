/**
 * AI Quality Platform — overall score + rate helpers.
 */

import type { EyesQualitySampleMetrics } from "@/lib/vision/quality/types";

/**
 * Weighted 0–100 overall score.
 * Accuracy-heavy; latency/cost soft penalties so quality remains primary.
 */
export function computeOverallScore(input: {
  questionDetectionAccuracy: number;
  answerExtractionAccuracy: number;
  hallucinationRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  latencyMsAvg: number;
  estimatedCostUsdAvg: number | null;
}): number {
  const q = clamp01(input.questionDetectionAccuracy);
  const a = clamp01(input.answerExtractionAccuracy);
  const h = clamp01(1 - input.hallucinationRate);
  const fp = clamp01(1 - input.falsePositiveRate);
  const fn = clamp01(1 - input.falseNegativeRate);

  // Soft latency: full credit ≤8s, zero at ≥60s
  const latencyScore = clamp01(1 - (input.latencyMsAvg - 8000) / 52000);
  // Soft cost: full credit ≤$0.002, zero at ≥$0.05
  const cost =
    input.estimatedCostUsdAvg == null ? 0.85 : clamp01(1 - (input.estimatedCostUsdAvg - 0.002) / 0.048);

  const weighted =
    q * 0.25 +
    a * 0.3 +
    h * 0.2 +
    fp * 0.05 +
    fn * 0.1 +
    latencyScore * 0.05 +
    cost * 0.05;

  return Math.round(weighted * 1000) / 10;
}

export function ratesFromConfusion(c: {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
}): { falsePositiveRate: number; falseNegativeRate: number } {
  const fpDenom = c.falsePositives + c.trueNegatives;
  const fnDenom = c.falseNegatives + c.truePositives;
  return {
    falsePositiveRate: fpDenom === 0 ? 0 : c.falsePositives / fpDenom,
    falseNegativeRate: fnDenom === 0 ? 0 : c.falseNegatives / fnDenom,
  };
}

export function overallScoreFromSampleMetrics(
  samples: EyesQualitySampleMetrics[],
): number {
  if (samples.length === 0) return 0;
  const avg = (pick: (s: EyesQualitySampleMetrics) => number) =>
    samples.reduce((sum, s) => sum + pick(s), 0) / samples.length;
  const costs = samples.map((s) => s.estimatedCostUsd);
  return computeOverallScore({
    questionDetectionAccuracy: avg((s) => s.questionDetectionAccuracy),
    answerExtractionAccuracy: avg((s) => s.answerExtractionAccuracy),
    hallucinationRate: avg((s) => s.hallucinationRate),
    falsePositiveRate: avg((s) => s.falsePositiveRate),
    falseNegativeRate: avg((s) => s.falseNegativeRate),
    latencyMsAvg: avg((s) => s.latencyMs),
    estimatedCostUsdAvg: costs.every((c) => c == null)
      ? null
      : avg((s) => s.estimatedCostUsd ?? 0),
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
