/**
 * AI Quality Platform — provider score dashboard text.
 */

import type { EyesQualityProviderAggregate } from "@/lib/vision/quality/types";

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function money(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "n/a";
  if (n < 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

export function formatProviderScoreDashboard(
  providers: EyesQualityProviderAggregate[],
): string {
  const blocks = providers.map((p) =>
    [
      "=====================================",
      "Provider",
      p.providerLabel,
      "Question Accuracy",
      pct(p.questionDetectionAccuracy),
      "Answer Accuracy",
      pct(p.answerExtractionAccuracy),
      "Hallucination Rate",
      pct(p.hallucinationRate),
      "False Positive Rate",
      pct(p.falsePositiveRate),
      "False Negative Rate",
      pct(p.falseNegativeRate),
      "Average Confidence",
      p.averageConfidence.toFixed(3),
      "Latency",
      `${(p.latencyMsAvg / 1000).toFixed(2)} s`,
      "Retry Rate",
      pct(p.retryRate),
      "Fallback Rate",
      pct(p.fallbackRate),
      "Average Cost",
      money(p.estimatedCostUsdAvg),
      "Average Token Usage",
      p.averageTokenUsage == null
        ? "n/a"
        : Math.round(p.averageTokenUsage).toString(),
      "Overall Score",
      p.overallScore.toFixed(1),
    ].join("\n"),
  );
  return (
    ["AI Quality Platform — Provider Score Dashboard", ""].join("\n") +
    blocks.join("\n\n") +
    "\n"
  );
}
