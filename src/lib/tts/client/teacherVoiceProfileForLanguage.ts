/**
 * Map learner locale / dictation lang → stable Teacher Voice Catalog id.
 * Client-safe: never imports provider voice names.
 */

export const CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID = "teacher_female_tw";

/**
 * Prefer locale-matched female teacher profiles for Tutor speech.
 * Unknown locales fall back to the platform default id.
 */
export function teacherVoiceProfileIdForLanguage(
  language: string | null | undefined,
): string {
  if (language == null) return CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID;
  const key = language.trim().toLowerCase().replace(/_/g, "-");
  if (!key) return CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID;

  if (key === "en-gb" || key.startsWith("en-gb-")) {
    return "teacher_female_uk";
  }
  if (key === "en-us" || key.startsWith("en-us-") || key === "en") {
    return "teacher_female_us";
  }
  if (key.startsWith("en-")) {
    return "teacher_female_us";
  }
  if (key === "zh-tw" || key.startsWith("zh-tw-") || key === "zh-hant") {
    return "teacher_female_tw";
  }
  if (key.startsWith("zh")) {
    return "teacher_female_tw";
  }
  return CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID;
}
