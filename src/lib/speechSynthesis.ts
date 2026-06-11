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
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[speakWithBrowserTTS] speak failed", e);
      }
    }
  };

  queueMicrotask(run);
}

export function cancelBrowserTTS(): void {
  if (typeof window === "undefined") return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}
