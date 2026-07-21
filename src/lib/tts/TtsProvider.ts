/**
 * TtsProvider — provider-agnostic TTS interface (mirrors VisionProvider / Eyes).
 *
 * All TTS providers (OpenAI, Gemini, Azure, ElevenLabs, Local, …) implement this.
 * They synthesize speech and return unified audio bytes — never vendor JSON to clients.
 *
 * Tutor / SAO / Signals / UI must never import concrete providers.
 * /api/tts and TtsService depend only on this contract + PriorityTtsProvider.
 */

import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";

export type TtsProviderId =
  | "openai"
  | "gemini"
  | "azure"
  | "elevenlabs"
  | "local";

export type TtsProviderInfo = {
  id: TtsProviderId;
  /** e.g. "openai" | "google" | "azure" | "elevenlabs" | "local" */
  provider: string;
  /** e.g. "tts-1" — fixed per adapter */
  model: string;
};

export type TtsCallMeta = {
  provider: string;
  name: string;
  model: string;
  latency: number;
  /** Index of successful provider in priority list (0 = first). */
  retryCount: number;
  fallbackUsed: boolean;
  /** Extra attempts on winning provider (0 = first try). */
  providerRetryCount: number;
  characters: number;
  estimatedCostUsd: number | null;
};

export interface TtsProvider {
  readonly info: TtsProviderInfo;

  /**
   * Synthesize speech for the given text + voice profile.
   * Must resolve voiceProfileId → vendor voice via Teacher Voice Catalog
   * (resolveProviderVoiceName) — never expose vendor names upward.
   */
  synthesize(input: TtsSynthesizeInput): Promise<TtsProviderSynthesizeResult>;
}

export interface TtsProviderWithCallMeta extends TtsProvider {
  readonly lastCallMeta: TtsCallMeta | null;
}

export function getTtsCallMeta(provider: TtsProvider): TtsCallMeta | null {
  if (
    "lastCallMeta" in provider &&
    provider.lastCallMeta &&
    typeof provider.lastCallMeta === "object"
  ) {
    return provider.lastCallMeta as TtsCallMeta;
  }
  return null;
}
