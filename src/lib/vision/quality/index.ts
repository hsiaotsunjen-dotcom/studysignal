/**
 * AI Quality Platform — public exports.
 */

export {
  EYES_FAILURE_CATEGORIES,
  EYES_PROMPT_VERSION,
  EYES_QUALITY_DIFFICULTIES,
  EYES_QUALITY_IMAGE_TAGS,
  EYES_QUALITY_SUBJECTS,
} from "@/lib/vision/quality/constants";

export {
  answersMatch,
  classifyAnswerMismatch,
  normalizeEyesAnswer,
} from "@/lib/vision/quality/classify";

export {
  loadAllEyesQualitySamples,
  loadEyesQualityBaselines,
  loadEyesQualitySample,
  listEyesQualitySampleIds,
  parseEyesQualityExpected,
  resolveAiQualityReportsRoot,
  resolveEyesQualityRoot,
  sampleImagesToAnalyzeInput,
} from "@/lib/vision/quality/dataset";

export {
  aggregateEyesQualityProvider,
  overviewFromEyesResult,
  scoreEyesQualitySample,
} from "@/lib/vision/quality/metrics";

export {
  EYES_QUALITY_PRICING,
  estimateEyesCostUsd,
  providerLabel,
} from "@/lib/vision/quality/pricing";

export {
  buildEyesQualityReport,
  formatEyesQualityTextReport,
} from "@/lib/vision/quality/report";

export {
  DEFAULT_EYES_QUALITY_PROVIDERS,
  assertEyesQualityBaselines,
  runEyesQualityBenchmark,
  runEyesQualityProviderOnSample,
} from "@/lib/vision/quality/runner";

export {
  computeOverallScore,
  overallScoreFromSampleMetrics,
  ratesFromConfusion,
} from "@/lib/vision/quality/scoring";

export {
  classifySampleFailures,
  persistFailureGallery,
} from "@/lib/vision/quality/failureGallery";

export { formatProviderScoreDashboard } from "@/lib/vision/quality/dashboard";

export {
  buildProviderDifficultyReport,
  formatDifficultyReport,
} from "@/lib/vision/quality/difficultyReport";

export {
  appendBenchmarkHistory,
  buildTrendReport,
  historyDir,
  loadBenchmarkHistory,
} from "@/lib/vision/quality/history";

export type {
  EyesDifficultySliceMetrics,
  EyesFailureCategory,
  EyesFailureRecord,
  EyesProviderDifficultyReport,
  EyesQualityAnswerExpectation,
  EyesQualityBaselines,
  EyesQualityBenchmarkReport,
  EyesQualityConfusion,
  EyesQualityDifficulty,
  EyesQualityHistoryEntry,
  EyesQualityImageTag,
  EyesQualityProviderAggregate,
  EyesQualitySample,
  EyesQualitySampleExpected,
  EyesQualitySampleMetrics,
  EyesQualitySampleRun,
  EyesQualitySubject,
  EyesQualityTrendReport,
  VisionTokenUsage,
} from "@/lib/vision/quality/types";
