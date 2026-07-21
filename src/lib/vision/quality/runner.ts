/**
 * AI Quality Platform — run every provider on the permanent dataset.
 *
 * Does not change production PriorityVisionProvider selection.
 * Does not touch Tutor / Signals / SAO.
 */

import fs from "node:fs";
import path from "node:path";

import { HomeworkVisionService } from "@/lib/vision/HomeworkVisionService";
import { createVisionProviderById } from "@/lib/vision/PriorityVisionProvider";
import type {
  VisionProvider,
  VisionProviderId,
} from "@/lib/vision/VisionProvider";
import {
  getVisionCallMeta,
  getVisionTokenUsage,
} from "@/lib/vision/VisionProvider";
import { EYES_PROMPT_VERSION } from "@/lib/vision/quality/constants";
import { formatProviderScoreDashboard } from "@/lib/vision/quality/dashboard";
import {
  loadAllEyesQualitySamples,
  loadEyesQualityBaselines,
  resolveAiQualityReportsRoot,
  resolveEyesQualityRoot,
  sampleImagesToAnalyzeInput,
} from "@/lib/vision/quality/dataset";
import { formatDifficultyReport } from "@/lib/vision/quality/difficultyReport";
import {
  classifySampleFailures,
  persistFailureGallery,
} from "@/lib/vision/quality/failureGallery";
import { appendBenchmarkHistory, buildTrendReport, loadBenchmarkHistory } from "@/lib/vision/quality/history";
import {
  aggregateEyesQualityProvider,
  scoreEyesQualitySample,
} from "@/lib/vision/quality/metrics";
import { estimateEyesCostUsd, providerLabel } from "@/lib/vision/quality/pricing";
import { assertEyesQualityBaselines } from "@/lib/vision/quality/regression";
import { buildEyesQualityReport } from "@/lib/vision/quality/report";
import type {
  EyesFailureRecord,
  EyesQualityBenchmarkReport,
  EyesQualitySampleRun,
} from "@/lib/vision/quality/types";

export const DEFAULT_EYES_QUALITY_PROVIDERS: VisionProviderId[] = [
  "gemini",
  "openai",
];

export { assertEyesQualityBaselines };

export async function runEyesQualityProviderOnSample(
  provider: VisionProvider | VisionProviderId,
  sample: ReturnType<typeof loadAllEyesQualitySamples>[number],
): Promise<EyesQualitySampleRun> {
  const impl =
    typeof provider === "string" ? createVisionProviderById(provider) : provider;
  const service = new HomeworkVisionService(impl);
  const started = Date.now();

  try {
    const result = await service.analyze(sampleImagesToAnalyzeInput(sample));
    const callMeta = getVisionCallMeta(impl);
    const usage =
      result.provider.usage ?? getVisionTokenUsage(impl) ?? callMeta?.usage ?? null;
    const latencyMs =
      result.provider.latency && result.provider.latency > 0
        ? result.provider.latency
        : Date.now() - started;

    return {
      sampleId: sample.expected.id,
      providerId: impl.info.id,
      providerLabel: providerLabel(impl.info.id, impl.info.model),
      model: impl.info.model,
      promptVersion: EYES_PROMPT_VERSION,
      result,
      rawResponse: result,
      latencyMs,
      usage,
      estimatedCostUsd: estimateEyesCostUsd(impl.info.model, usage),
      retryCount: callMeta?.retryCount ?? result.provider.retryCount ?? 0,
      providerRetryCount:
        callMeta?.providerRetryCount ?? result.provider.providerRetryCount ?? 0,
      fallbackUsed:
        callMeta?.fallbackUsed ?? result.provider.fallbackUsed ?? false,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      sampleId: sample.expected.id,
      providerId: impl.info.id,
      providerLabel: providerLabel(impl.info.id, impl.info.model),
      model: impl.info.model,
      promptVersion: EYES_PROMPT_VERSION,
      result: {
        assignment: {
          subject: "",
          type: "",
          totalQuestions: 0,
          sameAssignment: false,
        },
        questions: [],
        missingSections: [],
        photoQuality: "poor",
        confidence: 0,
        provider: {
          provider: impl.info.provider,
          model: impl.info.model,
          version: "error",
          latency: Date.now() - started,
        },
      },
      rawResponse: { error: message },
      latencyMs: Date.now() - started,
      usage: null,
      estimatedCostUsd: null,
      retryCount: 0,
      providerRetryCount: 0,
      fallbackUsed: false,
      error: message,
    };
  }
}

export type RunEyesQualityBenchmarkOptions = {
  datasetRoot?: string;
  providerIds?: VisionProviderId[];
  /** Write JSON + text under this directory when set. */
  outDir?: string;
  /** Persist failure gallery + history under reports root. */
  reportsRoot?: string;
  /** Enforce baselines.json regression gates (default true when enforce flag set). */
  enforceBaselines?: boolean;
  /** Append to historical trend store (default true when outDir/reports set). */
  recordHistory?: boolean;
};

/**
 * Full AI Quality Platform run:
 * dataset → providers → metrics → dashboard → difficulty → failures → history → regression.
 */
export async function runEyesQualityBenchmark(
  options: RunEyesQualityBenchmarkOptions = {},
): Promise<EyesQualityBenchmarkReport> {
  const datasetRoot = options.datasetRoot ?? resolveEyesQualityRoot();
  const reportsRoot = options.reportsRoot ?? resolveAiQualityReportsRoot();
  const providerIds = options.providerIds ?? DEFAULT_EYES_QUALITY_PROVIDERS;
  const samples = loadAllEyesQualitySamples(datasetRoot, { enabledOnly: true });
  if (samples.length === 0) {
    throw new Error(`EyesQuality: no enabled samples under ${datasetRoot}/samples`);
  }

  const aggregates = [];
  const allFailures: EyesFailureRecord[] = [];

  for (const providerId of providerIds) {
    const sampleMetrics = [];
    let label = providerLabel(providerId, providerId);
    let model = providerId as string;
    for (const sample of samples) {
      const run = await runEyesQualityProviderOnSample(providerId, sample);
      label = run.providerLabel;
      model = run.model;
      const metrics = scoreEyesQualitySample(sample.expected, run);
      sampleMetrics.push(metrics);
      allFailures.push(...classifySampleFailures(sample, metrics, run));
    }
    aggregates.push(
      aggregateEyesQualityProvider(providerId, label, model, sampleMetrics),
    );
  }

  let report = buildEyesQualityReport({
    datasetRoot,
    sampleIds: samples.map((s) => s.expected.id),
    providers: aggregates,
  });

  const dashboardText = formatProviderScoreDashboard(aggregates);
  const difficultyReportText = formatDifficultyReport(aggregates);
  report = {
    ...report,
    dashboardText,
    difficultyReportText,
    failureCount: allFailures.length,
    textReport: [
      report.textReport.trimEnd(),
      "",
      dashboardText.trimEnd(),
      "",
      difficultyReportText.trimEnd(),
      "",
    ].join("\n"),
  };

  const persistArtifacts =
    options.outDir != null ||
    options.reportsRoot != null ||
    options.recordHistory === true;

  if (persistArtifacts) {
    const outDir = options.outDir ?? path.join(reportsRoot, "reports");
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = report.generatedAt.replace(/[:.]/g, "-");
    fs.writeFileSync(
      path.join(outDir, `eyes-quality-report-${stamp}.json`),
      JSON.stringify(report, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(outDir, `eyes-quality-report-${stamp}.txt`),
      report.textReport,
      "utf8",
    );
    fs.writeFileSync(
      path.join(outDir, "eyes-quality-report-latest.json"),
      JSON.stringify(report, null, 2),
      "utf8",
    );
    fs.writeFileSync(
      path.join(outDir, "eyes-quality-report-latest.txt"),
      report.textReport,
      "utf8",
    );
    fs.writeFileSync(
      path.join(outDir, "dashboard-latest.txt"),
      dashboardText,
      "utf8",
    );
    fs.writeFileSync(
      path.join(outDir, "difficulty-report-latest.txt"),
      difficultyReportText,
      "utf8",
    );

    persistFailureGallery(allFailures, reportsRoot);
    if (options.recordHistory !== false) {
      const entry = appendBenchmarkHistory(
        report,
        allFailures.length,
        reportsRoot,
      );
      report = { ...report, historyEntryId: entry.id };
      const trend = buildTrendReport(loadBenchmarkHistory(reportsRoot));
      fs.mkdirSync(path.join(reportsRoot, "history"), { recursive: true });
      fs.writeFileSync(
        path.join(reportsRoot, "history", "trend-latest.txt"),
        trend.textReport,
        "utf8",
      );
    }
  }

  if (options.enforceBaselines === true) {
    assertEyesQualityBaselines(report, loadEyesQualityBaselines(datasetRoot));
  }

  return report;
}
