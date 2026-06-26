/** Browser SpeechSynthesis helpers — no network, no API cost. */

export type DictationSpeechLang = "en-US" | "en-GB";

type VoiceGenderPreference = "female" | "male";

function resolveLang(lang: unknown): DictationSpeechLang {
  return typeof lang === "string" && lang === "en-GB" ? "en-GB" : "en-US";
}

function canonicalVoiceLang(lang: string): string {
  return lang.trim().replace(/_/g, "-").toLowerCase();
}

function voiceGenderFromName(name: string): VoiceGenderPreference | "unknown" {
  const lower = name.toLowerCase();
  if (/\bfemale\b/.test(lower) || /\bwoman\b/.test(lower) || /\bwomen\b/.test(lower)) {
    return "female";
  }
  if (/\bmale\b/.test(lower)) {
    return "male";
  }
  return "unknown";
}

function voicesForLang(
  voices: SpeechSynthesisVoice[],
  target: DictationSpeechLang,
): SpeechSynthesisVoice[] {
  const want = canonicalVoiceLang(target);
  return voices.filter((v) => canonicalVoiceLang(v.lang) === want);
}

function pickVoiceFromCandidates(
  candidates: SpeechSynthesisVoice[],
  genderPreference: VoiceGenderPreference,
): SpeechSynthesisVoice | null {
  if (candidates.length === 0) return null;

  const genderMatches = candidates.filter(
    (v) => voiceGenderFromName(v.name) === genderPreference,
  );
  if (genderMatches.length > 0) {
    return genderMatches.find((v) => v.default) ?? genderMatches[0];
  }

  return candidates.find((v) => v.default) ?? candidates[0];
}

function logSelectedVoice(
  voice: SpeechSynthesisVoice,
  requestedLang: DictationSpeechLang,
): void {
  console.log("[speechSynthesis] selected voice:", {
    requestedLang,
    name: voice.name,
    lang: voice.lang,
    default: voice.default,
  });
}

/**
 * Pick a SpeechSynthesis voice by BCP-47 lang (not by fixed voice name).
 * US → en-US + female preference; UK → en-GB + male preference (any en-GB if no male).
 */
export function selectSpeechVoiceForLang(
  lang: DictationSpeechLang | string,
  voices?: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const targetLang = resolveLang(lang);
  const allVoices =
    voices ??
    (typeof window !== "undefined"
      ? (window.speechSynthesis?.getVoices() ?? [])
      : []);

  const genderPreference: VoiceGenderPreference =
    targetLang === "en-GB" ? "male" : "female";

  const langMatches = voicesForLang(allVoices, targetLang);
  const selected = pickVoiceFromCandidates(langMatches, genderPreference);

  if (selected) {
    logSelectedVoice(selected, targetLang);
    return selected;
  }

  console.warn(
    `[speechSynthesis] no voice for ${targetLang} among ${allVoices.length} voices`,
  );
  return null;
}

function configureUtteranceVoice(
  utterance: SpeechSynthesisUtterance,
  lang: DictationSpeechLang,
): void {
  utterance.lang = lang;
  const voice = selectSpeechVoiceForLang(lang);
  if (voice) {
    utterance.voice = voice;
  }
}

function synthesisErrorMessage(ev: SpeechSynthesisErrorEvent): string {
  const code =
    typeof ev.error === "string" && ev.error.length > 0 ? ev.error : "unknown";
  return `SpeechSynthesis error: ${code}`;
}

/**
 * Mobile browsers block SpeechSynthesis without a user gesture.
 * Desktop can auto-play welcome TTS on first load.
 */
export function isLikelyMobileBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  if (coarsePointer && noHover) return true;
  const ua = navigator.userAgent ?? "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function whenSpeechVoicesReady(timeoutMs = 500): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const syn = window.speechSynthesis;
  if (!syn || syn.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      syn.removeEventListener("voiceschanged", done);
      resolve();
    };
    syn.addEventListener("voiceschanged", done);
    window.setTimeout(() => {
      syn.removeEventListener("voiceschanged", done);
      resolve();
    }, timeoutMs);
  });
}

function resumeSpeechSynthesisIfPaused(syn: SpeechSynthesis): void {
  if (!syn.paused) return;
  try {
    syn.resume();
  } catch {
    /* ignore */
  }
}

/** Resolve true when playback actually started (`onstart`). */
export function speakWithBrowserTTSAsync(
  text: unknown,
  lang: DictationSpeechLang | string,
  options?: { startTimeoutMs?: number },
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof text !== "string") return Promise.resolve(false);

  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve(false);

  const syn = window.speechSynthesis;
  if (!syn) return Promise.resolve(false);

  const resolved = resolveLang(lang);
  const startTimeoutMs = options?.startTimeoutMs ?? 500;

  return whenSpeechVoicesReady().then(
    () =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          if (timer !== undefined) clearTimeout(timer);
          resolve(ok);
        };

        try {
          syn.cancel();
          const u = new SpeechSynthesisUtterance(trimmed);
          configureUtteranceVoice(u, resolved);
          u.onstart = () => finish(true);
          u.onerror = (ev) => {
            if (process.env.NODE_ENV === "development") {
              console.warn(synthesisErrorMessage(ev));
            }
            finish(false);
          };
          timer = setTimeout(() => finish(false), startTimeoutMs);
          syn.speak(u);
          resumeSpeechSynthesisIfPaused(syn);
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[speakWithBrowserTTSAsync] speak failed", e);
          }
          finish(false);
        }
      }),
  );
}

/** Resolve when playback ends (`onend`) or fails — use after user gesture on mobile. */
export function speakWithBrowserTTSUntilEnd(
  text: unknown,
  lang: DictationSpeechLang | string,
): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof text !== "string") return Promise.resolve(false);

  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve(false);

  const syn = window.speechSynthesis;
  if (!syn) return Promise.resolve(false);

  const resolved = resolveLang(lang);

  return whenSpeechVoicesReady().then(
    () =>
      new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        try {
          syn.cancel();
          const u = new SpeechSynthesisUtterance(trimmed);
          configureUtteranceVoice(u, resolved);
          u.onend = () => finish(true);
          u.onerror = (ev) => {
            if (process.env.NODE_ENV === "development") {
              console.warn(synthesisErrorMessage(ev));
            }
            finish(false);
          };
          syn.speak(u);
          resumeSpeechSynthesisIfPaused(syn);
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[speakWithBrowserTTSUntilEnd] speak failed", e);
          }
          finish(false);
        }
      }),
  );
}

/**
 * Speak `text` with the given BCP-47 `lang`.
 * Ignores non-string `text` (e.g. a mistaken React event) so `.trim()` never runs on an Event.
 */
export function speakWithBrowserTTS(
  text: unknown,
  lang: DictationSpeechLang | string,
): void {
  if (typeof window === "undefined") return;
  if (typeof text !== "string") {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[speakWithBrowserTTS] skipped: expected string, got",
        typeof text,
      );
    }
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) return;

  const resolved = resolveLang(lang);
  const syn = window.speechSynthesis;
  if (!syn) return;

  const run = () => {
    try {
      syn.cancel();
      const u = new SpeechSynthesisUtterance(trimmed);
      configureUtteranceVoice(u, resolved);
      u.onerror = (ev) => {
        if (process.env.NODE_ENV === "development") {
          console.warn(synthesisErrorMessage(ev));
        }
      };
      syn.speak(u);
      resumeSpeechSynthesisIfPaused(syn);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[speakWithBrowserTTS] speak failed", e);
      }
    }
  };

  void whenSpeechVoicesReady().then(run);
}

export function cancelBrowserTTS(): void {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
