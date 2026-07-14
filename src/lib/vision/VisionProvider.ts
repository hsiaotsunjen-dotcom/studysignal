/**
 * VisionProvider — provider-agnostic Eyes interface.
 *
 * HomeworkVisionService depends only on this contract.
 * Concrete providers (Gemini today; OpenAI / Claude / Qwen later)
 * implement analyzeHomework and return raw JSON for the Service to validate.
 */

import type { HomeworkVisionAnalyzeInput } from "@/lib/vision/types";

export type VisionProviderId =
  | "gemini"
  | "openai"
  | "claude"
  | "qwen";

export type VisionProviderInfo = {
  id: VisionProviderId;
  /** e.g. "google" */
  provider: string;
  /** e.g. "gemini-3.5-flash" — fixed per provider; do not swap casually */
  model: string;
};

/** Runtime call stats stamped onto HomeworkVisionResult.provider after analyze. */
export type VisionCallMeta = {
  provider: string;
  name: string;
  model: string;
  latency: number;
  retryCount: number;
  fallbackUsed: boolean;
};

/**
 * Raw provider JSON before schema validation / mapping.
 * Must not be passed to Brain until HomeworkVisionService validates it.
 */
export type VisionProviderRawResult = unknown;

export interface VisionProvider {
  readonly info: VisionProviderInfo;

  /**
   * Send all worksheet photos to the vision model in one request.
   * Returns the provider's raw JSON (parsed object or JSON string content).
   * Must not perform local OCR, coverage, merge, or question-number inference.
   */
  analyzeHomework(
    input: HomeworkVisionAnalyzeInput,
  ): Promise<VisionProviderRawResult>;
}

/** Optional: Priority / Fallback providers expose the last successful call meta. */
export interface VisionProviderWithCallMeta extends VisionProvider {
  readonly lastCallMeta: VisionCallMeta | null;
}

export function getVisionCallMeta(
  provider: VisionProvider,
): VisionCallMeta | null {
  if (
    "lastCallMeta" in provider &&
    provider.lastCallMeta &&
    typeof provider.lastCallMeta === "object"
  ) {
    return provider.lastCallMeta as VisionCallMeta;
  }
  return null;
}
