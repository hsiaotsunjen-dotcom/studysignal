/**
 * Tutor reply-language mapping (UI locale code → system-prompt instruction).
 * Add future languages here only — do not hardcode language in tutor prompts.
 */

export const DEFAULT_TUTOR_REPLY_LANGUAGE = "en-US";

/**
 * Stable instruction strings keyed by BCP-47-like codes used in the Tutor UI.
 * Add one entry per supported tutor reply language.
 */
export const TUTOR_REPLY_LANGUAGE_INSTRUCTIONS: Readonly<
  Record<string, string>
> = {
  "en-US": "Always reply in American English.",
  "en-GB": "Always reply in British English.",
  "zh-TW": "請使用繁體中文回答。",
};

export function normalizeTutorReplyLanguage(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_TUTOR_REPLY_LANGUAGE;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_TUTOR_REPLY_LANGUAGE;
  if (Object.prototype.hasOwnProperty.call(TUTOR_REPLY_LANGUAGE_INSTRUCTIONS, trimmed)) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  for (const code of Object.keys(TUTOR_REPLY_LANGUAGE_INSTRUCTIONS)) {
    if (code.toLowerCase() === lower) return code;
  }
  return DEFAULT_TUTOR_REPLY_LANGUAGE;
}

/** Single-line language rule appended to the generic tutor system prompt. */
export function buildTutorReplyLanguageInstruction(language: unknown): string {
  const code = normalizeTutorReplyLanguage(language);
  return (
    TUTOR_REPLY_LANGUAGE_INSTRUCTIONS[code] ??
    TUTOR_REPLY_LANGUAGE_INSTRUCTIONS[DEFAULT_TUTOR_REPLY_LANGUAGE]!
  );
}
