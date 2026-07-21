/**
 * TTS public exports (server /api/tts wiring).
 * Clients must not import concrete providers — use /api/tts only (until M4).
 */

export type {
  TtsAudioFormat,
  TtsAudioResult,
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
  TtsVoiceProfileId,
} from "@/lib/tts/types";
export {
  DEFAULT_TTS_VOICE_PROFILE,
  TTS_MAX_CHARS,
} from "@/lib/tts/types";

export {
  DEFAULT_TEACHER_VOICE_PROFILE_ID,
  TEACHER_VOICE_CATALOG,
  TEACHER_VOICE_PROFILE_ALIASES,
  getTeacherVoiceProfile,
  isTeacherVoiceProfileId,
  listPublicTeacherVoiceProfiles,
  listTeacherVoiceProfiles,
  normalizeTeacherVoiceProfileId,
  requireTeacherVoiceProfile,
  resolveProviderVoiceName,
  toPublicTeacherVoiceProfile,
} from "@/lib/tts/catalog";

export type {
  ProviderVoiceMapping,
  PublicTeacherVoiceProfile,
  TeacherSpeakingStyle,
  TeacherVoiceGender,
  TeacherVoiceProfile,
  TeacherVoiceProfileId,
} from "@/lib/tts/catalog";

export type {
  TtsCallMeta,
  TtsProvider,
  TtsProviderId,
  TtsProviderInfo,
  TtsProviderWithCallMeta,
} from "@/lib/tts/TtsProvider";
export { getTtsCallMeta } from "@/lib/tts/TtsProvider";

export { OpenAITtsProvider, OPENAI_TTS_MODEL, OPENAI_TTS_PROVIDER } from "@/lib/tts/OpenAITtsProvider";
export { GeminiTtsProvider } from "@/lib/tts/GeminiTtsProvider";
export { AzureTtsProvider } from "@/lib/tts/AzureTtsProvider";
export { ElevenLabsTtsProvider } from "@/lib/tts/ElevenLabsTtsProvider";
export { LocalTtsProvider } from "@/lib/tts/LocalTtsProvider";

export {
  PriorityTtsProvider,
  createHomeworkTtsProviderFromEnv,
  createTtsProviderById,
  parseTtsProviderPriority,
  DEFAULT_TTS_PROVIDER_PRIORITY,
  DEFAULT_TTS_PROVIDER_MAX_ATTEMPTS,
  DEFAULT_TTS_ATTEMPT_TIMEOUT_MS,
} from "@/lib/tts/PriorityTtsProvider";

export { TtsService } from "@/lib/tts/TtsService";
export { isTransientTtsProviderError } from "@/lib/tts/ttsFallbackErrors";
export {
  isImmediateTutorTtsRetryable,
  isTtsAttemptTimeoutError,
  isTutorTtsPurpose,
  TUTOR_TTS_IMMEDIATE_RETRY_WINDOW_MS,
} from "@/lib/tts/ttsFallbackErrors";
export type { TtsRetryPolicy } from "@/lib/tts/ttsFallbackErrors";
export { logTtsProviderDevSummary } from "@/lib/tts/ttsProviderLog";
export {
  estimateOpenAiTts1CostUsd,
  OPENAI_TTS_1_USD_PER_MILLION_CHARS,
} from "@/lib/tts/ttsCost";
