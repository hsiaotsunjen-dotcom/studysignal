/**
 * STT language policy for Tutor dictation.
 *
 * Tutor TTS locale (en-US / en-GB) must NOT force STT language.
 * Whisper: omit `language` → automatic detection (Chinese / English / mixed).
 * Browser SpeechRecognition: no true auto-detect; use device language as
 * best-effort fallback only (Whisper remains the primary transcript).
 */

/** Form value that means "do not send language to Whisper". */
export const STT_WHISPER_LANGUAGE_AUTO = "auto";

/**
 * Whether the client/server should omit Whisper's `language` field.
 * Missing, empty, "auto", or "detect" → auto-detect.
 */
export function shouldUseWhisperLanguageAutoDetect(
  languageField: unknown,
): boolean {
  if (languageField == null) return true;
  if (typeof languageField !== "string") return true;
  const t = languageField.trim().toLowerCase();
  if (!t) return true;
  if (t === "auto" || t === "detect" || t === "und") return true;
  return false;
}

/**
 * Optional ISO-639-1 hint for Whisper. Null → auto-detect.
 * Explicit BCP-47 / ISO codes still allowed for non-Tutor callers.
 */
export function resolveWhisperLanguageHint(languageField: unknown): string | null {
  if (shouldUseWhisperLanguageAutoDetect(languageField)) return null;
  if (typeof languageField !== "string") return null;
  const raw = languageField.trim();
  if (!/^[a-z]{2}(-[A-Za-z0-9]+)?$/i.test(raw)) return null;
  return raw.slice(0, 2).toLowerCase();
}

/**
 * Browser SpeechRecognition `lang` for fallback captions only.
 * Never uses Tutor TTS locale (en-US/en-GB from the voice picker).
 */
export function resolveBrowserSpeechRecognitionLang(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const lang = navigator.language?.trim();
  return lang || undefined;
}
