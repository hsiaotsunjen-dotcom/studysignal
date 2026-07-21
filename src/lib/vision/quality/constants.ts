/**
 * AI Quality Platform — shared constants (Eyes evaluation only).
 * Does not change Tutor, Signals, SAO, or provider selection.
 */

/** Tracked with failure gallery entries; bump when Eyes prompts change. */
export const EYES_PROMPT_VERSION = "1.0.0";

export const EYES_QUALITY_DIFFICULTIES = [
  "Easy",
  "Medium",
  "Hard",
  "Extreme",
] as const;

export type EyesQualityDifficulty = (typeof EYES_QUALITY_DIFFICULTIES)[number];

export const EYES_QUALITY_IMAGE_TAGS = [
  "Printed",
  "Handwriting",
  "Messy handwriting",
  "Blur",
  "Motion blur",
  "Shadow",
  "Low light",
  "Perspective",
  "Curved page",
  "Multi-page",
  "Mixed language",
  "Exam paper",
  "Worksheet",
  "Math",
  "English",
  "Science",
  "Chinese",
] as const;

export type EyesQualityImageTag = (typeof EYES_QUALITY_IMAGE_TAGS)[number];

export const EYES_FAILURE_CATEGORIES = [
  "Question Missing",
  "Answer Missing",
  "Hallucination",
  "Wrong OCR",
  "Wrong Question Number",
  "Wrong Student Answer",
  "Truncation",
  "Confidence Too High",
  "Confidence Too Low",
  "Provider Timeout",
  "Schema Error",
  "Other",
] as const;

export type EyesFailureCategory = (typeof EYES_FAILURE_CATEGORIES)[number];

export const EYES_QUALITY_SUBJECTS = [
  "English",
  "Math",
  "Science",
  "Chinese",
  "Mixed",
  "Other",
] as const;

export type EyesQualitySubject = (typeof EYES_QUALITY_SUBJECTS)[number];
