/**
 * AI Quality Platform — historical trend storage.
 */

import fs from "node:fs";
import path from "node:path";

import { EYES_PROMPT_VERSION } from "@/lib/vision/quality/constants";
import { resolveAiQualityReportsRoot } from "@/lib/vision/quality/dataset";
import type {
  EyesQualityBenchmarkReport,
  EyesQualityHistoryEntry,
  EyesQualityTrendReport,
} from "@/lib/vision/quality/types";

export function historyDir(
  reportsRoot: string = resolveAiQualityReportsRoot(),
): string {
  return path.join(reportsRoot, "history");
}

export function appendBenchmarkHistory(
  report: EyesQualityBenchmarkReport,
  failureCount: number,
  reportsRoot: string = resolveAiQualityReportsRoot(),
): EyesQualityHistoryEntry {
  const dir = historyDir(reportsRoot);
  fs.mkdirSync(dir, { recursive: true });
  const id = `run-${report.generatedAt.replace(/[:.]/g, "-")}`;
  const entry: EyesQualityHistoryEntry = {
    id,
    generatedAt: report.generatedAt,
    promptVersion: EYES_PROMPT_VERSION,
    sampleIds: report.sampleIds,
    providers: report.providers.map((p) => ({
      providerId: p.providerId,
      model: p.model,
      questionDetectionAccuracy: p.questionDetectionAccuracy,
      answerExtractionAccuracy: p.answerExtractionAccuracy,
      hallucinationRate: p.hallucinationRate,
      falsePositiveRate: p.falsePositiveRate,
      falseNegativeRate: p.falseNegativeRate,
      averageConfidence: p.averageConfidence,
      latencyMsAvg: p.latencyMsAvg,
      estimatedCostUsdAvg: p.estimatedCostUsdAvg,
      averageTokenUsage: p.averageTokenUsage,
      retryRate: p.retryRate,
      fallbackRate: p.fallbackRate,
      overallScore: p.overallScore,
    })),
    failureCount,
  };

  fs.writeFileSync(
    path.join(dir, `${id}.json`),
    JSON.stringify(entry, null, 2),
    "utf8",
  );
  fs.appendFileSync(
    path.join(dir, "history.jsonl"),
    JSON.stringify(entry) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "latest.json"),
    JSON.stringify(entry, null, 2),
    "utf8",
  );
  return entry;
}

export function loadBenchmarkHistory(
  reportsRoot: string = resolveAiQualityReportsRoot(),
): EyesQualityHistoryEntry[] {
  const jsonl = path.join(historyDir(reportsRoot), "history.jsonl");
  if (!fs.existsSync(jsonl)) return [];
  const lines = fs.readFileSync(jsonl, "utf8").split(/\r?\n/).filter(Boolean);
  const entries: EyesQualityHistoryEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as EyesQualityHistoryEntry);
    } catch {
      // skip corrupt lines
    }
  }
  return entries.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}

function series(
  entries: EyesQualityHistoryEntry[],
  providerId: string,
  pick: (p: EyesQualityHistoryEntry["providers"][number]) => number | null,
  asPercent: boolean,
): string {
  const points = entries
    .map((e) => {
      const p = e.providers.find((x) => x.providerId === providerId);
      if (!p) return null;
      const v = pick(p);
      if (v == null || Number.isNaN(v)) return null;
      const label = e.generatedAt.slice(0, 10);
      if (asPercent) return `${label}=${(v * 100).toFixed(1)}%`;
      return `${label}=${v.toFixed(2)}`;
    })
    .filter(Boolean);
  return points.length ? points.join(" → ") : "(no data)";
}

export function buildTrendReport(
  entries: EyesQualityHistoryEntry[] = loadBenchmarkHistory(),
): EyesQualityTrendReport {
  const providerIds = [
    ...new Set(entries.flatMap((e) => e.providers.map((p) => p.providerId))),
  ];
  const lines: string[] = [
    "AI Quality Platform — Historical Trend",
    `Runs: ${entries.length}`,
    "",
  ];
  for (const id of providerIds) {
    lines.push(`Provider: ${id}`);
    lines.push(
      `  Accuracy (answer): ${series(entries, id, (p) => p.answerExtractionAccuracy, true)}`,
    );
    lines.push(
      `  Hallucination: ${series(entries, id, (p) => p.hallucinationRate, true)}`,
    );
    lines.push(
      `  Latency (s): ${series(entries, id, (p) => p.latencyMsAvg / 1000, false)}`,
    );
    lines.push(
      `  Cost: ${series(entries, id, (p) => p.estimatedCostUsdAvg, false)}`,
    );
    lines.push(
      `  Overall score: ${series(entries, id, (p) => p.overallScore, false)}`,
    );
    lines.push("");
  }

  const latest = entries[entries.length - 1];
  if (latest) {
    const ranked = [...latest.providers].sort(
      (a, b) => b.overallScore - a.overallScore,
    );
    lines.push("Latest provider ranking:");
    ranked.forEach((p, i) => {
      lines.push(
        `  ${i + 1}. ${p.providerId} (${p.model}) score=${p.overallScore.toFixed(1)}`,
      );
    });
  }

  return { entries, textReport: lines.join("\n") + "\n" };
}
