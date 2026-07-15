/**
 * Client + shared contract for `/api/final-coverage` (Final Coverage Verify).
 *
 * STANDALONE — this module is not wired into any existing flow. Nothing calls
 * `postFinalCoverageCheck` yet. It only defines the request/response contract
 * and a thin fetch helper for a future integration step.
 *
 * Scope: whole-worksheet coverage verification only (total / visible / missing /
 * duplicate / ready / retake). It never grades answers, runs OCR, or merges.
 */

import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";

/** Prior (per-photo) capture summary passed to Vision as a hint only. */
export type FinalCoverageCaptureSummary = {
  estimatedTotalQuestions: number;
  coveredQuestions: number[];
  missingQuestions: number[];
  analysisScope: "full" | "partial" | "unknown";
};

/** Per-photo coverage prior (same shape used by /api/photo-quality). */
export type FinalCoverageExistingCoverageEntry = {
  photoIndex: number;
  questionsClearlyVisible: number[];
};

export type FinalCoverageRequestBody = {
  images: AnalyzeImagePayload[];
  captureSummary: FinalCoverageCaptureSummary;
  existingCoverage: FinalCoverageExistingCoverageEntry[];
};

export type FinalCoverageAdditionalPhotoRequest = {
  reason: string;
  suggestedQuestions: number[];
};

export type FinalCoverageResult = {
  estimatedTotalQuestions: number;
  questionsClearlyVisible: number[];
  missingQuestions: number[];
  duplicateQuestions: number[];
  readyForAnalysis: boolean;
  additionalPhotoRequest: FinalCoverageAdditionalPhotoRequest | null;
};

export type FinalCoverageResponse = {
  result: FinalCoverageResult;
};

/**
 * Thin client for `/api/final-coverage`.
 *
 * NOTE: intentionally unused for now (Phase 1 is API-only). Kept here so a later
 * integration step can call it without touching the existing analyze flow.
 */
export async function postFinalCoverageCheck(
  body: FinalCoverageRequestBody,
): Promise<
  { ok: true; result: FinalCoverageResult } | { ok: false; error: string }
> {
  const res = await fetch("/api/final-coverage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "覆蓋率檢查失敗，請稍後再試。";
    return { ok: false, error: err };
  }
  const result =
    data &&
    typeof data === "object" &&
    "result" in data &&
    (data as FinalCoverageResponse).result
      ? (data as FinalCoverageResponse).result
      : null;
  if (!result) {
    return { ok: false, error: "覆蓋率檢查回應格式異常。" };
  }
  return { ok: true, result };
}
