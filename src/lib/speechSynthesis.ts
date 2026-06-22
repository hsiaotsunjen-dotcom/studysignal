/** Browser SpeechSynthesis helpers — no network, no API cost. */

export type DictationSpeechLang = "en-US" | "en-GB";

function resolveLang(lang: unknown): DictationSpeechLang {
  return typeof lang === "string" && lang === "en-GB" ? "en-GB" : "en-US";
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
          u.lang = resolved;
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
          u.lang = resolved;
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
      u.lang = resolved;
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
