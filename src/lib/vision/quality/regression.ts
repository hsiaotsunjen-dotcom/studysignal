/**
 * AI Quality Platform — regression protection gates.
 */

import type {
  EyesQualityBaselines,
  EyesQualityBenchmarkReport,
} from "@/lib/vision/quality/types";

export function assertEyesQualityBaselines(
  report: EyesQualityBenchmarkReport,
  baselines: EyesQualityBaselines,
): void {
  if (!baselines.enforce) return;
  const failures: string[] = [];

  for (const provider of report.providers) {
    const floor = baselines.providers[provider.providerId];
    if (!floor) continue;

    if (
      provider.questionDetectionAccuracy < floor.minQuestionDetectionAccuracy
    ) {
      failures.push(
        `${provider.providerId} questionDetectionAccuracy ${(
          provider.questionDetectionAccuracy * 100
        ).toFixed(1)}% < ${(floor.minQuestionDetectionAccuracy * 100).toFixed(1)}%`,
      );
    }
    if (
      provider.answerExtractionAccuracy < floor.minAnswerExtractionAccuracy
    ) {
      failures.push(
        `${provider.providerId} answerExtractionAccuracy ${(
          provider.answerExtractionAccuracy * 100
        ).toFixed(1)}% < ${(floor.minAnswerExtractionAccuracy * 100).toFixed(1)}%`,
      );
    }
    if (provider.hallucinationRate > floor.maxHallucinationRate) {
      failures.push(
        `${provider.providerId} hallucinationRate ${(
          provider.hallucinationRate * 100
        ).toFixed(1)}% > ${(floor.maxHallucinationRate * 100).toFixed(1)}%`,
      );
    }

    const maxLatency =
      floor.maxLatencyMsAvg ?? baselines.maxLatencyMsAvg ?? null;
    if (maxLatency != null && provider.latencyMsAvg > maxLatency) {
      failures.push(
        `${provider.providerId} latency ${(provider.latencyMsAvg / 1000).toFixed(2)}s > ${(maxLatency / 1000).toFixed(2)}s`,
      );
    }

    const maxCost = floor.maxCostUsdAvg ?? baselines.maxCostUsdAvg ?? null;
    if (
      maxCost != null &&
      provider.estimatedCostUsdAvg != null &&
      provider.estimatedCostUsdAvg > maxCost
    ) {
      failures.push(
        `${provider.providerId} cost $${provider.estimatedCostUsdAvg.toFixed(4)} > $${maxCost.toFixed(4)}`,
      );
    }

    const minScore = floor.minOverallScore ?? baselines.minOverallScore ?? null;
    if (minScore != null && provider.overallScore < minScore) {
      failures.push(
        `${provider.providerId} overallScore ${provider.overallScore.toFixed(1)} < ${minScore.toFixed(1)}`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `AI Quality Platform regression failed:\n- ${failures.join("\n- ")}`,
    );
  }
}
