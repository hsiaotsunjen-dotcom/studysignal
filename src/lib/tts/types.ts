/**
 * TTS types — provider-agnostic Speak contract.
 * Client / API consume TtsAudioResult only; never provider-specific payloads.
 */

export type TtsAudioFormat = "mp3" | "opus";

export type TtsVoiceProfileId = string;

export type TtsSynthesizeInput = {
  text: string;
  /** BCP-47 when known; providers may ignore if unused. */
  language: string | null;
  /** Stable Teacher Voice Catalog id — not a vendor voice name. */
  voiceProfileId: TtsVoiceProfileId;
  speed: number;
  format: TtsAudioFormat;
  /** Optional abort for timeout / client cancel. */
  signal?: AbortSignal;
};

/**
 * Unified audio result returned by TtsService to /api/tts (and later speakTutorAudio).
 * No provider-specific fields leak into the binary response body.
 */
export type TtsAudioResult = {
  audio: ArrayBuffer;
  format: TtsAudioFormat;
  contentType: string;
  voiceProfileId: TtsVoiceProfileId;
  language: string | null;
  speed: number;
  meta: {
    providerId: string;
    provider: string;
    model: string;
    latencyMs: number;
    /** Index of winning provider in priority list (0 = first). */
    retryCount: number;
    providerRetryCount: number;
    fallbackUsed: boolean;
    characters: number;
    estimatedCostUsd: number | null;
  };
};

/** Raw bytes from a single adapter before Priority / Service stamps call meta. */
export type TtsProviderSynthesizeResult = {
  audio: ArrayBuffer;
  format: TtsAudioFormat;
  contentType: string;
  characters: number;
  estimatedCostUsd: number | null;
};

export const TTS_MAX_CHARS = 4096;

/**
 * @deprecated Prefer DEFAULT_TEACHER_VOICE_PROFILE_ID from the Teacher Voice Catalog.
 * Kept as an alias string for older imports.
 */
export const DEFAULT_TTS_VOICE_PROFILE = "teacher_female_tw";
