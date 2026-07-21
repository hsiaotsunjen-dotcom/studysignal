/**
 * AI Quality Platform / Eyes Quality Benchmark — types.
 *
 * Permanent evaluation system for Eyes providers only.
 * Does not change Tutor, Signals, SAO, or the provider abstraction.
 */

import type {
  VisionProviderId,
  VisionTokenUsage,
} from "@/lib/vision/VisionProvider";
import type { HomeworkVisionResult } from "@/lib/vision/types";
import type { StudentAnswerObject } from "@/lib/studentAnswerObject";
import type {
  EyesFailureCategory,
  EyesQualityDifficulty,
  EyesQualityImageTag,
  EyesQualitySubject,
} from "@/lib/vision/quality/constants";

export type { VisionTokenUsage };
export type {
  EyesFailureCategory,
  EyesQualityDifficulty,
  EyesQualityImageTag,
  EyesQualitySubject,
};

export type EyesQualityAnswerExpectation = {
  questionNumber: number;
  /** null = expected blank / no student writing */
  studentAnswer: string | null;
  /**
   * Optional accepted aliases (normalized exact match after trim/casefold).
   * Primary `studentAnswer` is always accepted when non-null.
   */
  acceptedAnswers?: string[];
  /** Soft floor for per-question confidence when answered. */
  minConfidence?: number;
};

/**
 * Permanent sample metadata + ground truth.
 * `id` is the sampleId (folder name).
 */
export type EyesQualitySampleExpected = {
  /** Same as folder name / sampleId */
  id: string;
  sampleId?: string;
  description: string;
  photos: string[];
  /** When false, integrity still validates but live runner skips. */
  enabled?: boolean;

  subject: EyesQualitySubject;
  grade: string;
  language: string;
  difficulty: EyesQualityDifficulty;
  /** One or more image / worksheet tags. */
  imageQuality: EyesQualityImageTag[];
  providerNotes?: string;

  /** Alias for expectedQuestionCount */
  questionCount?: number;
  expectedQuestionCount: number;
  /** Full inventory 1..N when known; otherwise derived from count. */
  expectedQuestionNumbers?: number[];
  expectedAnswers: EyesQualityAnswerExpectation[];
  /** Question numbers expected blank (no writing). */
  expectedBlanks: number[];
  /** Soft floor for overall Eyes confidence. */
  expectedConfidenceMin?: number;
  /** Soft ceiling for overall Eyes confidence. */
  expectedConfidenceMax?: number;
  /** Same format as SAO/Tutor/Signals overview (`1. end\\n9. picture`). */
  expectedOverview: string;
};

export type EyesQualitySample = {
  rootDir: string;
  expected: EyesQualitySampleExpected;
  /** Absolute paths aligned with expected.photos order. */
  photoPaths: string[];
};

export type EyesQualitySampleRun = {
  sampleId: string;
  providerId: VisionProviderId;
  providerLabel: string;
  model: string;
  promptVersion: string;
  result: HomeworkVisionResult;
  rawResponse: unknown;
  latencyMs: number;
  usage: VisionTokenUsage | null;
  estimatedCostUsd: number | null;
  retryCount: number;
  providerRetryCount: number;
  fallbackUsed: boolean;
  error: string | null;
};

export type EyesQualityConfusion = {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
};

export type EyesQualitySampleMetrics = {
  sampleId: string;
  providerId: VisionProviderId;
  model: string;
  difficulty: EyesQualityDifficulty;
  imageQuality: EyesQualityImageTag[];
  subject: EyesQualitySubject;
  /** Fraction of expected question numbers present in Eyes inventory. */
  questionDetectionAccuracy: number;
  /** Fraction of expected answered questions with matching extracted text. */
  answerExtractionAccuracy: number;
  falsePositives: number;
  falseNegatives: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  /** FP / (FP + TN) over blank expectations. */
  hallucinationRate: number;
  averageConfidence: number;
  overallConfidence: number;
  latencyMs: number;
  estimatedCostUsd: number | null;
  retryCount: number;
  providerRetryCount: number;
  fallbackCount: number;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  overviewMatch: boolean;
  predictedOverview: string;
  expectedOverview: string;
  confusion: EyesQualityConfusion;
  answerMismatches: Array<{
    questionNumber: number;
    expected: string | null;
    predicted: string | null;
    categories: EyesFailureCategory[];
  }>;
  failureCategories: EyesFailureCategory[];
};

export type EyesQualityProviderAggregate = {
  providerId: VisionProviderId;
  providerLabel: string;
  model: string;
  sampleCount: number;
  questionDetectionAccuracy: number;
  answerExtractionAccuracy: number;
  falsePositives: number;
  falseNegatives: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  hallucinationRate: number;
  averageConfidence: number;
  latencyMsAvg: number;
  estimatedCostUsdAvg: number | null;
  retryCountTotal: number;
  fallbackCountTotal: number;
  retryRate: number;
  fallbackRate: number;
  promptTokensTotal: number | null;
  completionTokensTotal: number | null;
  totalTokensTotal: number | null;
  averageTokenUsage: number | null;
  /** Weighted 0–100 overall score for the dashboard. */
  overallScore: number;
  samples: EyesQualitySampleMetrics[];
};

export type EyesQualityBenchmarkReport = {
  generatedAt: string;
  datasetRoot: string;
  sampleIds: string[];
  providers: EyesQualityProviderAggregate[];
  textReport: string;
  dashboardText?: string;
  difficultyReportText?: string;
  failureCount?: number;
  historyEntryId?: string;
};

/** Minimum scores / ceilings a provider must meet (regression gate). */
export type EyesQualityBaselines = {
  version: string;
  description: string;
  /** When true, live runs fail if any provider regresses below floors. */
  enforce: boolean;
  maxLatencyMsAvg?: number;
  maxCostUsdAvg?: number;
  minOverallScore?: number;
  providers: Record<
    string,
    {
      minQuestionDetectionAccuracy: number;
      minAnswerExtractionAccuracy: number;
      maxHallucinationRate: number;
      maxLatencyMsAvg?: number;
      maxCostUsdAvg?: number;
      minOverallScore?: number;
    }
  >;
};

export type EyesFailureRecord = {
  id: string;
  createdAt: string;
  sampleId: string;
  photoPaths: string[];
  providerId: VisionProviderId;
  providerLabel: string;
  model: string;
  promptVersion: string;
  rawResponse: unknown;
  parsedResponse: HomeworkVisionResult | null;
  sao: StudentAnswerObject | null;
  expectedAnswer: string | null;
  actualAnswer: string | null;
  questionNumber: number | null;
  failureCategory: EyesFailureCategory;
  confidence: number | null;
  latencyMs: number;
  tokenUsage: VisionTokenUsage | null;
  costUsd: number | null;
  notes?: string;
};

export type EyesDifficultySliceMetrics = {
  sliceKey: string;
  sliceType: "difficulty" | "imageQuality" | "subject";
  sampleCount: number;
  questionDetectionAccuracy: number;
  answerExtractionAccuracy: number;
  hallucinationRate: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  averageConfidence: number;
  latencyMsAvg: number;
  estimatedCostUsdAvg: number | null;
  overallScore: number;
};

export type EyesProviderDifficultyReport = {
  providerId: VisionProviderId;
  providerLabel: string;
  model: string;
  byDifficulty: EyesDifficultySliceMetrics[];
  byImageQuality: EyesDifficultySliceMetrics[];
  bySubject: EyesDifficultySliceMetrics[];
};

export type EyesQualityHistoryEntry = {
  id: string;
  generatedAt: string;
  promptVersion: string;
  sampleIds: string[];
  providers: Array<{
    providerId: VisionProviderId;
    model: string;
    questionDetectionAccuracy: number;
    answerExtractionAccuracy: number;
    hallucinationRate: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    averageConfidence: number;
    latencyMsAvg: number;
    estimatedCostUsdAvg: number | null;
    averageTokenUsage: number | null;
    retryRate: number;
    fallbackRate: number;
    overallScore: number;
  }>;
  failureCount: number;
};

export type EyesQualityTrendReport = {
  entries: EyesQualityHistoryEntry[];
  textReport: string;
};
