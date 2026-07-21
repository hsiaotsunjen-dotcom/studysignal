/**
 * VisionProvider — provider-agnostic Eyes interface.
 *
 * All Eyes providers (Gemini, OpenAI, Claude, Local, …) implement this contract.
 * They analyze homework photos and return raw JSON that HomeworkVisionService
 * validates into HomeworkVisionResult — the only Eyes output Brain may consume.
 *
 * Responsibilities of every provider:
 * - analyze homework images (one request with all photos)
 * - detect questions
 * - extract student answers
 * - report per-question confidence
 *
 * Providers must NOT: run local OCR merge, Tutor marking, Signals inventory,
 * or invent a parallel homework object. Source-photo mapping stays in SAO
 * assembly (capture session), not in the vision provider payload.
 *
 * HomeworkVisionService depends only on this contract.
 * Tutor / Signals / Ability Map must never import concrete providers.
 */

import type { HomeworkVisionAnalyzeInput } from "@/lib/vision/types";

export type VisionProviderId =
  | "gemini"
  | "openai"
  | "claude"
  | "qwen"
  /** Future on-device / offline vision. */
  | "local";

export type VisionProviderInfo = {
  id: VisionProviderId;
  /** e.g. "google" | "openai" | "local" */
  provider: string;
  /** e.g. "gemini-3.5-flash" — fixed per provider; do not swap casually */
  model: string;
};

/** Runtime call stats stamped onto HomeworkVisionResult.provider after analyze. */
/** Optional token accounting for Eyes Quality cost metrics. */
export type VisionTokenUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type VisionCallMeta = {
  provider: string;
  name: string;
  model: string;
  latency: number;
  /**
   * Index of the successful provider in the priority list
   * (0 = first provider; >0 means earlier providers failed).
   */
  retryCount: number;
  /** True when a later provider in VISION_PROVIDER_PRIORITY was used. */
  fallbackUsed: boolean;
  /**
   * Extra attempts on the winning provider before success
   * (0 = succeeded on first try of that provider).
   */
  providerRetryCount: number;
  usage?: VisionTokenUsage | null;
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

/** Optional: concrete providers may expose last token usage for quality cost. */
export interface VisionProviderWithUsage extends VisionProvider {
  readonly lastUsage: VisionTokenUsage | null;
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

export function getVisionTokenUsage(
  provider: VisionProvider,
): VisionTokenUsage | null {
  if (
    "lastUsage" in provider &&
    provider.lastUsage &&
    typeof provider.lastUsage === "object"
  ) {
    return provider.lastUsage as VisionTokenUsage;
  }
  const meta = getVisionCallMeta(provider);
  return meta?.usage ?? null;
}
