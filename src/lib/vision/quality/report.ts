/**
 * Eyes Quality Benchmark — human-readable + JSON report.
 */

import type {
  EyesQualityBenchmarkReport,
  EyesQualityProviderAggregate,
} from "@/lib/vision/quality/types";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function money(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  if (n < 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function formatProviderBlock(p: EyesQualityProviderAggregate): string {
  const lines = [
    "=====================================",
    "Provider",
    p.providerLabel,
    "Question Accuracy",
    pct(p.questionDetectionAccuracy),
    "Answer Accuracy",
    pct(p.answerExtractionAccuracy),
    "Hallucination",
    pct(p.hallucinationRate),
    "Latency",
    `${(p.latencyMsAvg / 1000).toFixed(2)} s`,
    "Average Cost",
    money(p.estimatedCostUsdAvg),
    "Overall Score",
    p.overallScore.toFixed(1),
    "False Positives",
    String(p.falsePositives),
    "False Negatives",
    String(p.falseNegatives),
    "Avg Confidence",
    p.averageConfidence.toFixed(3),
    "Retries (provider-index sum)",
    String(p.retryCountTotal),
    "Fallbacks",
    String(p.fallbackCountTotal),
    "Token usage (total)",
    p.totalTokensTotal == null ? "n/a" : String(p.totalTokensTotal),
  ];
  return lines.join("\n");
}

export function formatEyesQualityTextReport(
  providers: EyesQualityProviderAggregate[],
): string {
  const header = [
    "Eyes Quality Benchmark Report",
    `Generated: ${new Date().toISOString()}`,
    "",
  ].join("\n");
  return header + providers.map(formatProviderBlock).join("\n\n") + "\n";
}

export function buildEyesQualityReport(input: {
  datasetRoot: string;
  sampleIds: string[];
  providers: EyesQualityProviderAggregate[];
}): EyesQualityBenchmarkReport {
  return {
    generatedAt: new Date().toISOString(),
    datasetRoot: input.datasetRoot,
    sampleIds: input.sampleIds,
    providers: input.providers,
    textReport: formatEyesQualityTextReport(input.providers),
  };
}
