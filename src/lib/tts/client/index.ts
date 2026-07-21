/**
 * Client-only TTS playback exports (browser).
 * Do not import server providers from here.
 */

export {
  cancelTutorAudio,
  speakTutorAudio,
  speakTutorAudioAsync,
  speakTutorAudioFireAndForget,
  speakTutorAudioUntilEnd,
} from "@/lib/tts/client/speakTutorAudio";

export type {
  SpeakTutorAudioHandle,
  SpeakTutorAudioInput,
  SpeakTutorAudioPlaybackMeta,
  SpeakTutorAudioSource,
} from "@/lib/tts/client/speakTutorAudio";

export {
  speakTutorReplyChunked,
  speakTutorReplyChunkedFireAndForget,
  TUTOR_TTS_FIRST_CHUNK_BUDGET_MS,
  TUTOR_TTS_IMMEDIATE_FAIL_MS,
} from "@/lib/tts/client/speakTutorChunks";

export type {
  SpeakTutorChunksOptions,
  SpeakTutorChunksResult,
} from "@/lib/tts/client/speakTutorChunks";

export { splitTutorSentences } from "@/lib/tts/client/splitTutorSentences";

export {
  CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID,
  teacherVoiceProfileIdForLanguage,
} from "@/lib/tts/client/teacherVoiceProfileForLanguage";
