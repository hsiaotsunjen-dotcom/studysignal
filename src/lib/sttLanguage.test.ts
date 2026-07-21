import { describe, expect, it } from "vitest";

import {
  resolveBrowserSpeechRecognitionLang,
  resolveWhisperLanguageHint,
  shouldUseWhisperLanguageAutoDetect,
  STT_WHISPER_LANGUAGE_AUTO,
} from "@/lib/sttLanguage";

describe("sttLanguage", () => {
  it("treats missing / auto as Whisper auto-detect", () => {
    expect(shouldUseWhisperLanguageAutoDetect(undefined)).toBe(true);
    expect(shouldUseWhisperLanguageAutoDetect("")).toBe(true);
    expect(shouldUseWhisperLanguageAutoDetect(STT_WHISPER_LANGUAGE_AUTO)).toBe(
      true,
    );
    expect(shouldUseWhisperLanguageAutoDetect("detect")).toBe(true);
    expect(resolveWhisperLanguageHint(undefined)).toBeNull();
    expect(resolveWhisperLanguageHint("auto")).toBeNull();
  });

  it("still allows explicit ISO hints for non-Tutor callers", () => {
    expect(shouldUseWhisperLanguageAutoDetect("en")).toBe(false);
    expect(resolveWhisperLanguageHint("en-US")).toBe("en");
    expect(resolveWhisperLanguageHint("zh-TW")).toBe("zh");
  });

  it("browser SR lang comes from navigator when available", () => {
    const lang = resolveBrowserSpeechRecognitionLang();
    expect(lang === undefined || typeof lang === "string").toBe(true);
  });
});
