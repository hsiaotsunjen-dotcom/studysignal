/**
 * Teacher Voice Catalog — permanent, UI-stable teacher identity.
 *
 * Clients and UI use only TeacherVoiceProfileId.
 * Provider voice names live exclusively in providerVoiceMapping and are
 * read only by TTS provider adapters (never by Tutor / SAO / Signals / UI).
 */

import type { TtsProviderId } from "@/lib/tts/TtsProvider";

/** Forever-stable teacher IDs. Never rename; add new ids instead. */
export type TeacherVoiceProfileId =
  | "teacher_female_tw"
  | "teacher_female_us"
  | "teacher_female_uk"
  | "teacher_male_tw"
  | "teacher_male_us"
  | "teacher_male_uk"
  | "future_teacher";

export type TeacherVoiceGender = "female" | "male" | "neutral";

export type TeacherSpeakingStyle =
  | "warm_teacher"
  | "clear_instructor"
  | "calm_narrator"
  | "energetic_coach"
  | "future";

/**
 * Per-provider vendor voice name. Only adapters may read these strings.
 * Missing keys mean that provider is not configured for this teacher yet.
 */
export type ProviderVoiceMapping = Partial<Record<TtsProviderId, string>>;

export type TeacherVoiceProfile = {
  id: TeacherVoiceProfileId;
  /** Human-readable label for future settings UI (not a vendor name). */
  displayName: string;
  /** Primary language family tag, e.g. "zh" | "en" | "multi". */
  language: string;
  /** BCP-47 locale, e.g. "zh-TW" | "en-US" | "en-GB". */
  locale: string;
  gender: TeacherVoiceGender;
  speakingStyle: TeacherSpeakingStyle;
  defaultSpeed: number;
  /**
   * Vendor voice ids keyed by TtsProviderId.
   * NEVER send this object to the browser.
   */
  providerVoiceMapping: ProviderVoiceMapping;
  /** Optional notes for engineers / catalog maintainers. */
  notes?: string;
};

/** Safe client/settings projection — no provider voice names. */
export type PublicTeacherVoiceProfile = Omit<
  TeacherVoiceProfile,
  "providerVoiceMapping" | "notes"
>;
