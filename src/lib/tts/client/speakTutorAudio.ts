/**
 * speakTutorAudio — client facade for Tutor speech (Milestone 4).
 *
 * Primary: POST /api/tts → MP3/Opus → HTMLAudioElement (identical bytes everywhere).
 * Fallback: browser SpeechSynthesis ONLY on server timeout / network / provider failure.
 *
 * Never call SpeechSynthesis as the normal Tutor path.
 */

import { cancelBrowserTTS } from "@/lib/speechSynthesis";
import { latEnd, latMark } from "@/lib/latencyProfile";
import {
  CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID,
  teacherVoiceProfileIdForLanguage,
} from "@/lib/tts/client/teacherVoiceProfileForLanguage";

export type SpeakTutorAudioInput = {
  text: string;
  /** BCP-47; used for catalog default profile + /api/tts language. */
  language?: string | null;
  /** Stable Teacher Voice Catalog id — never a vendor voice name. */
  voiceProfileId?: string;
  speed?: number;
  format?: "mp3" | "opus";
  purpose?: string;
  /**
   * When false, never use SpeechSynthesis (Tutor long-wait policy).
   * Default true for non-tutor callers.
   */
  allowBrowserFallback?: boolean;
  /** Skip cloud and speak via SpeechSynthesis only (emergency last resort). */
  forceBrowserFallbackOnly?: boolean;
};

export type SpeakTutorAudioSource =
  | "cloud"
  | "offline_fallback"
  | "aborted"
  | "failed";

export type SpeakTutorAudioPlaybackMeta = {
  provider: string | null;
  model: string | null;
  voiceProfileId: string;
  latencyMs: number | null;
  retryCount: number | null;
  /** PriorityTtsProvider server-side fallback, or offline browser fallback. */
  fallbackUsed: boolean;
  /** Always false until Milestone 5 client/server audio cache. */
  cacheHit: boolean;
  source: SpeakTutorAudioSource;
};

export type SpeakTutorAudioHandle = {
  stop: () => void;
  /** Resolves when playback ends, fails, or is aborted. */
  done: Promise<SpeakTutorAudioPlaybackMeta>;
  /** Resolves true when audible playback actually started. */
  started: Promise<boolean>;
};

const TTS_FETCH_TIMEOUT_MS = 12_000;

type ActiveSession = {
  generation: number;
  /** User / barge-in cancel — must NOT be used for fetch timeout. */
  cancel: AbortController;
  audio: HTMLAudioElement | null;
  objectUrl: string | null;
};

let generationSeq = 0;
let active: ActiveSession | null = null;

/** Extra cancel hook (e.g. sentence-chunk pipeline). */
let tutorAudioCancelHook: (() => void) | null = null;

export function setTutorAudioCancelHook(fn: (() => void) | null): void {
  tutorAudioCancelHook = fn;
}

/** Soft budget for Tutor cloud fetch — do not wait forever then go robotic. */
export const TUTOR_CLOUD_TTS_BUDGET_MS = 6_000;
export const TUTOR_IMMEDIATE_FALLBACK_WINDOW_MS = 2_000;

function isTutorPurpose(purpose: string | undefined): boolean {
  if (!purpose) return false;
  const p = purpose.trim().toLowerCase();
  return p === "tutor" || p.startsWith("tutor_");
}

function revokeObjectUrl(url: string | null): void {
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function stopActiveSession(): void {
  const session = active;
  active = null;
  if (!session) return;
  try {
    session.cancel.abort();
  } catch {
    /* ignore */
  }
  if (session.audio) {
    try {
      session.audio.pause();
      session.audio.removeAttribute("src");
      session.audio.load();
    } catch {
      /* ignore */
    }
  }
  revokeObjectUrl(session.objectUrl);
}

/** Stop cloud Tutor audio + browser SpeechSynthesis fallback. */
export function cancelTutorAudio(): void {
  stopActiveSession();
  try {
    tutorAudioCancelHook?.();
  } catch {
    /* ignore */
  }
  cancelBrowserTTS();
}

function logTutorSpeechStart(meta: SpeakTutorAudioPlaybackMeta): void {
  console.log("[speakTutorAudio] Tutor speaking", {
    Provider: meta.provider,
    Model: meta.model,
    VoiceProfile: meta.voiceProfileId,
    Latency: meta.latencyMs,
    RetryCount: meta.retryCount,
    FallbackUsed: meta.fallbackUsed,
    CacheHit: meta.cacheHit,
    Source: meta.source,
  });
}

function headerInt(res: Response, name: string): number | null {
  const raw = res.headers.get(name);
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeInput(
  input: SpeakTutorAudioInput | string,
  language?: string | null,
): {
  text: string;
  language: string | null;
  voiceProfileId: string;
  speed: number | undefined;
  format: "mp3" | "opus";
  purpose: string | undefined;
  allowBrowserFallback: boolean;
  forceBrowserFallbackOnly: boolean;
} {
  if (typeof input === "string") {
    const lang = language ?? null;
    return {
      text: input,
      language: lang,
      voiceProfileId: teacherVoiceProfileIdForLanguage(lang),
      speed: undefined,
      format: "mp3",
      purpose: undefined,
      allowBrowserFallback: true,
      forceBrowserFallbackOnly: false,
    };
  }
  const lang = input.language ?? language ?? null;
  const purpose = input.purpose;
  const tutor = isTutorPurpose(purpose);
  return {
    text: input.text,
    language: lang,
    voiceProfileId:
      input.voiceProfileId?.trim() ||
      teacherVoiceProfileIdForLanguage(lang),
    speed: input.speed,
    format: input.format === "opus" ? "opus" : "mp3",
    purpose,
    allowBrowserFallback:
      input.allowBrowserFallback ?? (tutor ? false : true),
    forceBrowserFallbackOnly: input.forceBrowserFallbackOnly === true,
  };
}

function isUserCancelled(session: ActiveSession, generation: number): boolean {
  return (
    session.cancel.signal.aborted ||
    active?.generation !== generation
  );
}

function isBrowserPlaybackAvailable(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof globalThis.fetch === "function" &&
    typeof globalThis.Audio === "function" &&
    typeof globalThis.URL?.createObjectURL === "function"
  );
}

async function playBlobAudio(
  session: ActiveSession,
  audio: ArrayBuffer,
  contentType: string,
): Promise<boolean> {
  if (!isBrowserPlaybackAvailable()) return false;
  const blob = new Blob([new Uint8Array(audio)], {
    type: contentType || "audio/mpeg",
  });
  const objectUrl = URL.createObjectURL(blob);
  session.objectUrl = objectUrl;

  const el = new Audio(objectUrl);
  session.audio = el;

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    el.onplaying = () => finish(true);
    el.onerror = () => finish(false);

    void el.play().then(
      () => {
        if (!el.paused) finish(true);
      },
      () => finish(false),
    );
  });
}

function waitForAudioEnd(
  el: HTMLAudioElement,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const done = () => {
      el.removeEventListener("ended", done);
      el.removeEventListener("error", done);
      signal.removeEventListener("abort", onAbort);
      resolve();
    };
    const onAbort = () => done();
    el.addEventListener("ended", done);
    el.addEventListener("error", done);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * One-shot SpeechSynthesis fallback (never the normal Tutor path).
 */
function speakBrowserFallbackOnce(
  text: string,
  language: string,
  signal: AbortSignal,
): Promise<{ started: boolean; finished: boolean }> {
  const syn =
    typeof globalThis !== "undefined"
      ? (
          globalThis as unknown as {
            speechSynthesis?: SpeechSynthesis;
          }
        ).speechSynthesis
      : undefined;
  if (!syn || typeof SpeechSynthesisUtterance === "undefined") {
    return Promise.resolve({ started: false, finished: false });
  }

  return new Promise((resolve) => {
    let settled = false;
    let didStart = false;
    const finish = (started: boolean, finished: boolean) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve({ started, finished });
    };
    const onAbort = () => {
      try {
        syn.cancel();
      } catch {
        /* ignore */
      }
      finish(didStart, false);
    };

    if (signal.aborted) {
      finish(false, false);
      return;
    }
    signal.addEventListener("abort", onAbort);

    try {
      syn.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = language;
      u.onstart = () => {
        didStart = true;
      };
      u.onend = () => finish(didStart, true);
      u.onerror = () => finish(didStart, false);
      syn.speak(u);
      try {
        if (syn.paused) syn.resume();
      } catch {
        /* ignore */
      }
    } catch {
      finish(false, false);
    }
  });
}

/**
 * Speak Tutor text via server TTS → HTMLAudioElement.
 * Falls back to SpeechSynthesis only if the cloud path fails.
 */
export function speakTutorAudio(
  input: SpeakTutorAudioInput | string,
  language?: string | null,
): SpeakTutorAudioHandle {
  const normalized = normalizeInput(input, language);
  const trimmed = normalized.text.trim();

  const emptyMeta = (): SpeakTutorAudioPlaybackMeta => ({
    provider: null,
    model: null,
    voiceProfileId:
      normalized.voiceProfileId || CLIENT_DEFAULT_TEACHER_VOICE_PROFILE_ID,
    latencyMs: null,
    retryCount: null,
    fallbackUsed: false,
    cacheHit: false,
    source: "failed",
  });

  if (!trimmed || !isBrowserPlaybackAvailable()) {
    const meta = emptyMeta();
    return {
      stop: () => undefined,
      done: Promise.resolve(meta),
      started: Promise.resolve(false),
    };
  }

  cancelTutorAudio();

  const generation = ++generationSeq;
  const cancel = new AbortController();
  const session: ActiveSession = {
    generation,
    cancel,
    audio: null,
    objectUrl: null,
  };
  active = session;

  let resolveStarted!: (ok: boolean) => void;
  const started = new Promise<boolean>((resolve) => {
    resolveStarted = resolve;
  });

  const done = (async (): Promise<SpeakTutorAudioPlaybackMeta> => {
    const clientStartedAt = Date.now();

    const failMeta = (
      partial: Partial<SpeakTutorAudioPlaybackMeta>,
    ): SpeakTutorAudioPlaybackMeta => ({
      ...emptyMeta(),
      ...partial,
      voiceProfileId: normalized.voiceProfileId,
    });

    if (isUserCancelled(session, generation)) {
      resolveStarted(false);
      return failMeta({ source: "aborted" });
    }

    let cloudRetryCount: number | null = null;

    const runOfflineFallback = async (): Promise<SpeakTutorAudioPlaybackMeta> => {
      if (!normalized.allowBrowserFallback) {
        resolveStarted(false);
        return failMeta({
          source: "failed",
          latencyMs: Date.now() - clientStartedAt,
          retryCount: cloudRetryCount,
        });
      }

      const offlineMeta: SpeakTutorAudioPlaybackMeta = {
        provider: "browser_speech_synthesis",
        model: "SpeechSynthesis",
        voiceProfileId: normalized.voiceProfileId,
        latencyMs: Date.now() - clientStartedAt,
        retryCount: cloudRetryCount,
        fallbackUsed: true,
        cacheHit: false,
        source: "offline_fallback",
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[TTS]", {
          language: normalized.language,
          provider: "android_speech_synthesis",
          voice: normalized.voiceProfileId,
          fallback: true,
          fallback_reason: "immediate_cloud_failure",
        });
      }

      const lang = normalized.language ?? "en-US";
      const result = await speakBrowserFallbackOnce(
        trimmed,
        lang,
        cancel.signal,
      );

      if (isUserCancelled(session, generation) && !result.started) {
        resolveStarted(false);
        return failMeta({
          source: "aborted",
          fallbackUsed: true,
          latencyMs: offlineMeta.latencyMs,
          retryCount: cloudRetryCount,
        });
      }

      if (!result.started) {
        resolveStarted(false);
        return failMeta({
          source: "failed",
          fallbackUsed: true,
          provider: offlineMeta.provider,
          model: offlineMeta.model,
          latencyMs: offlineMeta.latencyMs,
          retryCount: cloudRetryCount,
        });
      }

      logTutorSpeechStart(offlineMeta);
      resolveStarted(true);
      latMark("10_first_audio_playback", { source: "offline_fallback" });
      latEnd("tutor_tts_offline_fallback");
      if (active === session) active = null;
      return offlineMeta;
    };

    const maybeOfflineFallback = async (
      reason: string,
    ): Promise<SpeakTutorAudioPlaybackMeta> => {
      const elapsed = Date.now() - clientStartedAt;
      const tutor = isTutorPurpose(normalized.purpose);
      if (
        tutor &&
        (!normalized.allowBrowserFallback ||
          elapsed > TUTOR_IMMEDIATE_FALLBACK_WINDOW_MS)
      ) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[TTS] skip robotic fallback after wait", {
            language: normalized.language,
            elapsedMs: elapsed,
            reason,
            fallback: false,
          });
        }
        resolveStarted(false);
        return failMeta({
          source: "failed",
          latencyMs: elapsed,
          retryCount: cloudRetryCount,
        });
      }
      return runOfflineFallback();
    };

    if (normalized.forceBrowserFallbackOnly) {
      return runOfflineFallback();
    }

    try {
      const fetchAbort = new AbortController();
      const onUserCancel = () => fetchAbort.abort();
      cancel.signal.addEventListener("abort", onUserCancel);

      const tutor = isTutorPurpose(normalized.purpose);
      const fetchTimeoutMs = tutor
        ? TUTOR_CLOUD_TTS_BUDGET_MS
        : TTS_FETCH_TIMEOUT_MS;

      const timeoutId = globalThis.setTimeout(() => {
        fetchAbort.abort();
      }, fetchTimeoutMs);

      let res: Response;
      try {
        latMark("9a_tts_fetch_start", { endpoint: "/api/tts" });
        res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            language: normalized.language,
            voiceProfile: normalized.voiceProfileId,
            ...(normalized.speed != null ? { speed: normalized.speed } : {}),
            format: normalized.format,
            ...(normalized.purpose ? { purpose: normalized.purpose } : {}),
          }),
          signal: fetchAbort.signal,
        });
        latMark("9b_tts_first_response_headers", {
          status: res.status,
          ok: res.ok,
        });
      } catch (err) {
        cancel.signal.removeEventListener("abort", onUserCancel);
        globalThis.clearTimeout(timeoutId);

        if (isUserCancelled(session, generation)) {
          resolveStarted(false);
          return failMeta({
            source: "aborted",
            latencyMs: Date.now() - clientStartedAt,
          });
        }

        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[speakTutorAudio] cloud TTS fetch failed; evaluating fallback",
            err instanceof Error ? err.message : err,
          );
        }
        latMark("9b_tts_fetch_failed_to_fallback");
        return maybeOfflineFallback("fetch_abort_or_network");
      } finally {
        globalThis.clearTimeout(timeoutId);
        cancel.signal.removeEventListener("abort", onUserCancel);
      }

      if (isUserCancelled(session, generation)) {
        resolveStarted(false);
        return failMeta({ source: "aborted" });
      }

      if (!res.ok) {
        cloudRetryCount = headerInt(res, "X-TTS-Retry-Count");
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `[speakTutorAudio] cloud TTS HTTP ${res.status}; evaluating fallback`,
          );
        }
        return maybeOfflineFallback(`http_${res.status}`);
      }

      const audio = await res.arrayBuffer();
      latMark("9c_tts_audio_bytes_received", { bytes: audio.byteLength });
      if (!audio.byteLength) {
        throw new Error("TTS empty body");
      }

      if (isUserCancelled(session, generation)) {
        resolveStarted(false);
        return failMeta({ source: "aborted" });
      }

      const contentType = res.headers.get("Content-Type") || "audio/mpeg";
      const provider = res.headers.get("X-TTS-Provider");
      const model = res.headers.get("X-TTS-Model");
      const voiceProfile =
        res.headers.get("X-TTS-Voice-Profile") || normalized.voiceProfileId;
      const latencyMs = headerInt(res, "X-TTS-Latency-Ms");
      const retryCount = headerInt(res, "X-TTS-Retry-Count");
      cloudRetryCount = retryCount;
      const fallbackUsed = res.headers.get("X-TTS-Fallback-Used") === "1";

      const cloudMeta: SpeakTutorAudioPlaybackMeta = {
        provider,
        model,
        voiceProfileId: voiceProfile,
        latencyMs,
        retryCount,
        fallbackUsed,
        cacheHit: false,
        source: "cloud",
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[TTS]", {
          language: normalized.language,
          provider,
          voice: voiceProfile,
          fallback: false,
        });
      }

      latMark("10a_html_audio_play_called");
      const playOk = await playBlobAudio(session, audio, contentType);
      if (isUserCancelled(session, generation)) {
        resolveStarted(false);
        return failMeta({
          source: "aborted",
          provider: cloudMeta.provider,
          model: cloudMeta.model,
          latencyMs: cloudMeta.latencyMs,
          retryCount: cloudMeta.retryCount,
        });
      }

      // Autoplay blocked is not a cloud failure — do not SpeechSynthesis-fallback
      // (that is also gesture-gated on mobile). Caller can retry after tap.
      if (!playOk || !session.audio) {
        latMark("10b_html_audio_play_failed");
        resolveStarted(false);
        return failMeta({
          source: "failed",
          provider: cloudMeta.provider,
          model: cloudMeta.model,
          latencyMs: cloudMeta.latencyMs,
          retryCount: cloudMeta.retryCount,
        });
      }

      latMark("10_first_audio_playback");
      logTutorSpeechStart(cloudMeta);
      resolveStarted(true);
      await waitForAudioEnd(session.audio, cancel.signal);
      latEnd("tutor_tts_playback_done");

      if (active?.generation === generation) {
        revokeObjectUrl(session.objectUrl);
        session.objectUrl = null;
        session.audio = null;
        if (active === session) active = null;
      }
      return cloudMeta;
    } catch (err) {
      if (isUserCancelled(session, generation)) {
        resolveStarted(false);
        return failMeta({
          source: "aborted",
          latencyMs: Date.now() - clientStartedAt,
          retryCount: cloudRetryCount,
        });
      }

      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[speakTutorAudio] cloud TTS failed; evaluating fallback",
          err instanceof Error ? err.message : err,
        );
      }
      return maybeOfflineFallback("cloud_exception");
    }
  })();

  return {
    stop: () => {
      cancelTutorAudio();
    },
    done,
    started,
  };
}

/** Fire-and-forget Tutor speech (replaces speakWithBrowserTTS on Tutor paths). */
export function speakTutorAudioFireAndForget(
  text: string,
  language?: string | null,
  options?: Omit<SpeakTutorAudioInput, "text" | "language">,
): void {
  void speakTutorAudio({
    text,
    language,
    ...options,
    purpose: options?.purpose ?? "tutor_reply",
  }).started;
}

/** Resolves when playback starts (cloud or offline fallback). */
export function speakTutorAudioAsync(
  text: string,
  language?: string | null,
  options?: Omit<SpeakTutorAudioInput, "text" | "language">,
): Promise<boolean> {
  return speakTutorAudio({
    text,
    language,
    ...options,
    purpose: options?.purpose ?? "tutor_auto",
  }).started;
}

/** Resolves when playback finishes (or fails / aborts). */
export async function speakTutorAudioUntilEnd(
  text: string,
  language?: string | null,
  options?: Omit<SpeakTutorAudioInput, "text" | "language">,
): Promise<boolean> {
  const handle = speakTutorAudio({
    text,
    language,
    ...options,
    purpose: options?.purpose ?? "tutor_welcome",
  });
  const didStart = await handle.started;
  if (!didStart) return false;
  const meta = await handle.done;
  return meta.source === "cloud" || meta.source === "offline_fallback";
}
