/**
 * AI Quality Platform — difficulty / tag scenario reports.
 */

import {
  EYES_QUALITY_DIFFICULTIES,
  type EyesQualityDifficulty,
  type EyesQualityImageTag,
} from "@/lib/vision/quality/constants";
import { overallScoreFromSampleMetrics } from "@/lib/vision/quality/scoring";
import type {
  EyesDifficultySliceMetrics,
  EyesProviderDifficultyReport,
  EyesQualityProviderAggregate,
  EyesQualitySampleMetrics,
} from "@/lib/vision/quality/types";

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

function sliceMetrics(
  sliceKey: string,
  sliceType: EyesDifficultySliceMetrics["sliceType"],
  samples: EyesQualitySampleMetrics[],
): EyesDifficultySliceMetrics {
  const costs = samples.map((s) => s.estimatedCostUsd);
  return {
    sliceKey,
    sliceType,
    sampleCount: samples.length,
    questionDetectionAccuracy: avg(
      samples.map((s) => s.questionDetectionAccuracy),
    ),
    answerExtractionAccuracy: avg(
      samples.map((s) => s.answerExtractionAccuracy),
    ),
    hallucinationRate: avg(samples.map((s) => s.hallucinationRate)),
    falsePositiveRate: avg(samples.map((s) => s.falsePositiveRate)),
    falseNegativeRate: avg(samples.map((s) => s.falseNegativeRate)),
    averageConfidence: avg(samples.map((s) => s.averageConfidence)),
    latencyMsAvg: avg(samples.map((s) => s.latencyMs)),
    estimatedCostUsdAvg: costs.every((c) => c == null)
      ? null
      : avg(costs.map((c) => c ?? 0)),
    overallScore: overallScoreFromSampleMetrics(samples),
  };
}

export function buildProviderDifficultyReport(
  provider: EyesQualityProviderAggregate,
): EyesProviderDifficultyReport {
  const byDifficulty: EyesDifficultySliceMetrics[] = [];
  for (const d of EYES_QUALITY_DIFFICULTIES) {
    const samples = provider.samples.filter((s) => s.difficulty === d);
    if (samples.length === 0) continue;
    byDifficulty.push(sliceMetrics(d, "difficulty", samples));
  }

  const tagSet = new Set<EyesQualityImageTag>();
  for (const s of provider.samples) {
    for (const t of s.imageQuality) tagSet.add(t);
  }
  const byImageQuality = [...tagSet]
    .sort()
    .map((tag) =>
      sliceMetrics(
        tag,
        "imageQuality",
        provider.samples.filter((s) => s.imageQuality.includes(tag)),
      ),
    );

  const subjects = [
    ...new Set(provider.samples.map((s) => s.subject)),
  ].sort();
  const bySubject = subjects.map((subject) =>
    sliceMetrics(
      subject,
      "subject",
      provider.samples.filter((s) => s.subject === subject),
    ),
  );

  return {
    providerId: provider.providerId,
    providerLabel: provider.providerLabel,
    model: provider.model,
    byDifficulty,
    byImageQuality,
    bySubject,
  };
}

export function formatDifficultyReport(
  providers: EyesQualityProviderAggregate[],
): string {
  const lines: string[] = [
    "AI Quality Platform — Difficulty Report",
    "",
  ];
  for (const p of providers) {
    const report = buildProviderDifficultyReport(p);
    lines.push("=====================================");
    lines.push(report.providerLabel);
    lines.push("");
    lines.push("By difficulty:");
    for (const d of EYES_QUALITY_DIFFICULTIES as readonly EyesQualityDifficulty[]) {
      const slice = report.byDifficulty.find((s) => s.sliceKey === d);
      if (!slice) {
        lines.push(`  ${d}: (no samples)`);
        continue;
      }
      lines.push(
        `  ${d}: Q=${(slice.questionDetectionAccuracy * 100).toFixed(1)}% A=${(slice.answerExtractionAccuracy * 100).toFixed(1)}% H=${(slice.hallucinationRate * 100).toFixed(1)}% score=${slice.overallScore.toFixed(1)} (n=${slice.sampleCount})`,
      );
    }
    lines.push("");
    lines.push("By image / scenario tags:");
    if (report.byImageQuality.length === 0) {
      lines.push("  (none)");
    } else {
      for (const s of report.byImageQuality) {
        lines.push(
          `  ${s.sliceKey}: Q=${(s.questionDetectionAccuracy * 100).toFixed(1)}% A=${(s.answerExtractionAccuracy * 100).toFixed(1)}% H=${(s.hallucinationRate * 100).toFixed(1)}% score=${s.overallScore.toFixed(1)} (n=${s.sampleCount})`,
        );
      }
    }
    lines.push("");
    lines.push("By subject:");
    for (const s of report.bySubject) {
      lines.push(
        `  ${s.sliceKey}: Q=${(s.questionDetectionAccuracy * 100).toFixed(1)}% A=${(s.answerExtractionAccuracy * 100).toFixed(1)}% score=${s.overallScore.toFixed(1)} (n=${s.sampleCount})`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}
