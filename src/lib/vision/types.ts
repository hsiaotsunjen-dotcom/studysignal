/**
 * Homework Vision — Eyes layer contract.
 *
 * Brain (HomeworkAnalysis / Tutor / Signals) must only consume
 * HomeworkVisionResult. Do not re-infer coverage, question numbers,
 * OCR, or missing questions locally.
 */

/** Provenance for debugging and future provider swaps. */
export type HomeworkVisionProviderMeta = {
  /** e.g. "google" | "openai" */
  provider: string;
  /** Same as provider; kept for debugging / UI naming. */
  name?: string;
  /** e.g. "gemini-3.5-flash" | "gpt-4o-mini" */
  model: string;
  /** Schema / prompt contract version */
  version: string;
  /** Wall-clock ms for the successful Eyes call (incl. prior fallback attempts). */
  latency?: number;
  /** How many providers failed before the successful one (0 = first provider). */
  retryCount?: number;
  /** True when a later provider in VISION_PROVIDER_PRIORITY was used. */
  fallbackUsed?: boolean;
};

export type HomeworkVisionAssignment = {
  subject: string;
  type: string;
  totalQuestions: number;
  /** Whether all photos appear to belong to the same assignment. */
  sameAssignment: boolean;
};

export type HomeworkVisionQuestionStatus =
  | "answered"
  | "blank"
  | "not_visible";

export type HomeworkVisionQuestion = {
  number: number;
  answered: boolean;
  /** Null when blank, not_visible, or must not be guessed. */
  studentAnswer: string | null;
  status: HomeworkVisionQuestionStatus;
  /** Per-question confidence 0–1. */
  confidence: number;
};

export type HomeworkVisionPhotoQuality = "good" | "fair" | "poor";

/**
 * Model payload before StudySignal stamps provider metadata.
 * Gemini (or any VisionProvider) should return this shape.
 */
export type HomeworkVisionModelPayload = {
  assignment: HomeworkVisionAssignment;
  questions: HomeworkVisionQuestion[];
  missingSections: string[];
  photoQuality: HomeworkVisionPhotoQuality;
  /** Whole-assignment confidence 0–1. */
  confidence: number;
};

/**
 * Canonical Eyes output. StudySignal Brain trusts this object only.
 */
export type HomeworkVisionResult = HomeworkVisionModelPayload & {
  provider: HomeworkVisionProviderMeta;
};

/** One uploaded worksheet photo for the Vision Provider. */
export type HomeworkVisionImageInput = {
  mimeType: string;
  /** Raw base64 without data: URL prefix. */
  base64: string;
};

export type HomeworkVisionAnalyzeInput = {
  images: HomeworkVisionImageInput[];
};

/** Current HomeworkVisionResult schema / prompt contract version. */
export const HOMEWORK_VISION_SCHEMA_VERSION = "1.0.0";
