/**
 * Tutor sentence-chunk TTS pipeline.
 * Prefetches next sentence while the current one plays.
 * Compatible with future token-stream sentence enqueue.
 */

import { cancelBrowserTTS } from "@/lib/speechSynthesis";
import { latEnd, latMark } from "@/lib/latencyProfile";
import {
  cancelTutorAudio,
  setTutorAudioCancelHook,
  type SpeakTutorAudioPlaybackMeta,
} from "@/lib/tts/client/speakTutorAudio";
import { teacherVoiceProfileIdForLanguage } from "@/lib/tts/client/teacherVoiceProfileForLanguage";
import { splitTutorSentences } from "@/lib/tts/client/splitTutorSentences";

/** Time-to-first-chunk budget — cancel without robotic fallback if exceeded. */
export const TUTOR_TTS_FIRST_CHUNK_BUDGET_MS = 6_000;

/** Only allow SpeechSynthesis if cloud dies inside this window. */
export const TUTOR_TTS_IMMEDIATE_FAIL_MS = 2_000;

export type SpeakTutorChunksOptions = {
  language?: string | null;
  voiceProfileId?: string;
  purpose?: string;
  /** Called when cloud TTS fails after the latency budget (show Tap to play). */
  onNeedsTapToPlay?: () => void;
  /** Called when natural playback starts (first chunk). */
  onFirstAudio?: () => void;
};

export type SpeakTutorChunksResult = {
  ok: boolean;
  meta: SpeakTutorAudioPlaybackMeta;
  sentencesPlayed: number;
};

let chunkAbort: AbortController | null = null;
let chunkGeneration = 0;

function abortChunks(): void {
  try {
    chunkAbort?.abort();
  } catch {
    /* ignore */
  }
  chunkAbort = null;
}

setTutorAudioCancelHook(abortChunks);

function isAbortError(err: unknown): boolean {
  if (err == null) return false;
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name === "AbortError";
  }
  return (
    err instanceof Error &&
    (err.name === "AbortError" || /aborted|AbortError/i.test(err.message))
  );
}

async function fetchTutorChunkAudio(input: {
  text: string;
  language: string | null;
  voiceProfileId: string;
  purpose: string;
  signal: AbortSignal;
}): Promise<{
  audio: ArrayBuffer;
  contentType: string;
  provider: string | null;
  model: string | null;
  latencyMs: number | null;
}> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input.text,
      language: input.language,
      voiceProfile: input.voiceProfileId,
      format: "mp3",
      purpose: input.purpose,
    }),
    signal: input.signal,
  });
  if (!res.ok) {
    throw new Error(`TTS HTTP ${res.status}`);
  }
  const audio = await res.arrayBuffer();
  if (!audio.byteLength) throw new Error("TTS empty body");
  return {
    audio,
    contentType: res.headers.get("Content-Type") || "audio/mpeg",
    provider: res.headers.get("X-TTS-Provider"),
    model: res.headers.get("X-TTS-Model"),
    latencyMs: (() => {
      const raw = res.headers.get("X-TTS-Latency-Ms");
      const n = raw != null ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
  };
}

function playArrayBuffer(
  audio: ArrayBuffer,
  contentType: string,
  signal: AbortSignal,
): Promise<boolean> {
  if (typeof Audio === "undefined" || typeof URL === "undefined") {
    return Promise.resolve(false);
  }
  const blob = new Blob([new Uint8Array(audio)], {
    type: contentType || "audio/mpeg",
  });
  const url = URL.createObjectURL(blob);
  const el = new Audio(url);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      try {
        el.pause();
        el.removeAttribute("src");
        el.load();
      } catch {
        /* ignore */
      }
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    const onAbort = () => finish(false);

    if (signal.aborted) {
      finish(false);
      return;
    }
    signal.addEventListener("abort", onAbort);

    el.onended = () => finish(true);
    el.onerror = () => finish(false);
    void el.play().then(
      () => {
        /* playing */
      },
      () => finish(false),
    );
  });
}

type ChunkPayload = Awaited<ReturnType<typeof fetchTutorChunkAudio>>;

/**
 * Await first-chunk TTS with a latency budget.
 * Budget abort is scoped to this fetch only — never the shared pipeline controller.
 * Timer is cleared as soon as bytes arrive so it cannot fire during playback.
 */
async function awaitFirstChunkWithBudget(
  fetchPromise: Promise<ChunkPayload>,
  fetchAbort: AbortController,
  pipelineSignal: AbortSignal,
): Promise<ChunkPayload> {
  let budgetTimer: ReturnType<typeof setTimeout> | null = null;
  let budgetRejected = false;

  const clearBudgetTimer = () => {
    if (budgetTimer != null) {
      clearTimeout(budgetTimer);
      budgetTimer = null;
    }
  };

  const budgetPromise = new Promise<never>((_, reject) => {
    budgetTimer = setTimeout(() => {
      budgetTimer = null;
      budgetRejected = true;
      // Abort only the first-chunk fetch — do NOT abort the pipeline controller
      // (that would kill playback / later chunks if the timer ever misfired).
      try {
        fetchAbort.abort();
      } catch {
        /* ignore */
      }
      reject(new Error("tutor_tts_first_chunk_budget"));
    }, TUTOR_TTS_FIRST_CHUNK_BUDGET_MS);
  });

  // Swallow late budget rejection so Promise.race loser cannot become unhandled.
  void budgetPromise.catch(() => undefined);

  const onPipelineAbort = () => {
    clearBudgetTimer();
    try {
      fetchAbort.abort();
    } catch {
      /* ignore */
    }
  };
  if (pipelineSignal.aborted) {
    onPipelineAbort();
  } else {
    pipelineSignal.addEventListener("abort", onPipelineAbort, { once: true });
  }

  try {
    const payload = await Promise.race([fetchPromise, budgetPromise]);
    // First audio bytes ready — budget no longer applies.
    clearBudgetTimer();
    pipelineSignal.removeEventListener("abort", onPipelineAbort);
    return payload;
  } catch (err) {
    clearBudgetTimer();
    pipelineSignal.removeEventListener("abort", onPipelineAbort);
    if (
      budgetRejected ||
      (err instanceof Error && err.message === "tutor_tts_first_chunk_budget")
    ) {
      throw new Error("tutor_tts_first_chunk_budget");
    }
    if (
      isAbortError(err) ||
      pipelineSignal.aborted ||
      fetchAbort.signal.aborted
    ) {
      const abortErr = new Error("tutor_tts_aborted");
      abortErr.name = "AbortError";
      throw abortErr;
    }
    throw err;
  }
}

/**
 * Speak a full Tutor reply as sentence chunks with prefetch.
 * Does not use Android SpeechSynthesis after a long cloud wait.
 */
export function speakTutorReplyChunked(
  text: string,
  language?: string | null,
  options: SpeakTutorChunksOptions = {},
): Promise<SpeakTutorChunksResult> {
  const trimmed = text.trim();
  const lang = language ?? null;
  const voiceProfileId =
    options.voiceProfileId?.trim() ||
    teacherVoiceProfileIdForLanguage(lang);
  const purpose = options.purpose ?? "tutor_reply";

  const emptyMeta = (): SpeakTutorAudioPlaybackMeta => ({
    provider: null,
    model: null,
    voiceProfileId,
    latencyMs: null,
    retryCount: null,
    fallbackUsed: false,
    cacheHit: false,
    source: "failed",
  });

  if (!trimmed) {
    return Promise.resolve({
      ok: false,
      meta: emptyMeta(),
      sentencesPlayed: 0,
    });
  }

  // Stop any single-shot or prior chunk pipeline.
  cancelTutorAudio();
  cancelBrowserTTS();

  const generation = ++chunkGeneration;
  const abort = new AbortController();
  chunkAbort = abort;
  const clientStarted = Date.now();

  const sentences = splitTutorSentences(trimmed);

  const run = (async (): Promise<SpeakTutorChunksResult> => {
    let sentencesPlayed = 0;
    let firstMeta: SpeakTutorAudioPlaybackMeta | null = null;

    try {
      latMark("9a_tts_chunk_pipeline_start", {
        sentences: sentences.length,
        purpose,
      });

      // First chunk uses its own AbortController so the latency budget cannot
      // abort the shared pipeline (playback / later prefetch) after success.
      const firstFetchAbort = new AbortController();
      let nextFetch: Promise<ChunkPayload> | null = fetchTutorChunkAudio({
        text: sentences[0]!,
        language: lang,
        voiceProfileId,
        purpose,
        signal: firstFetchAbort.signal,
      }).catch((err) => {
        if (isAbortError(err)) {
          const abortErr = new Error("tutor_tts_aborted");
          abortErr.name = "AbortError";
          throw abortErr;
        }
        throw err;
      });

      for (let i = 0; i < sentences.length; i++) {
        if (abort.signal.aborted || chunkGeneration !== generation) {
          return {
            ok: false,
            meta: { ...emptyMeta(), source: "aborted" },
            sentencesPlayed,
          };
        }

        let payload: ChunkPayload;
        try {
          if (i === 0 && nextFetch) {
            payload = await awaitFirstChunkWithBudget(
              nextFetch,
              firstFetchAbort,
              abort.signal,
            );
          } else {
            payload = await (nextFetch as Promise<ChunkPayload>);
          }
        } catch (err) {
          if (
            isAbortError(err) ||
            (err instanceof Error && err.message === "tutor_tts_aborted")
          ) {
            return {
              ok: false,
              meta: { ...emptyMeta(), source: "aborted" },
              sentencesPlayed,
            };
          }

          const elapsed = Date.now() - clientStarted;
          const msg = err instanceof Error ? err.message : String(err);
          if (process.env.NODE_ENV === "development") {
            console.warn("[TTS] chunk fetch failed", {
              language: lang,
              purpose,
              elapsedMs: elapsed,
              error: msg,
              fallback: false,
            });
          }
          if (
            elapsed <= TUTOR_TTS_IMMEDIATE_FAIL_MS &&
            msg !== "tutor_tts_first_chunk_budget"
          ) {
            const { speakTutorAudio } = await import(
              "@/lib/tts/client/speakTutorAudio"
            );
            const handle = speakTutorAudio({
              text: trimmed,
              language: lang,
              voiceProfileId,
              purpose: "tutor_emergency_fallback",
              allowBrowserFallback: true,
              forceBrowserFallbackOnly: true,
            });
            const meta = await handle.done;
            if (!meta.source || meta.source === "failed") {
              options.onNeedsTapToPlay?.();
            }
            return {
              ok: meta.source === "offline_fallback" || meta.source === "cloud",
              meta,
              sentencesPlayed,
            };
          }
          options.onNeedsTapToPlay?.();
          return {
            ok: false,
            meta: {
              ...emptyMeta(),
              latencyMs: elapsed,
              source: "failed",
            },
            sentencesPlayed,
          };
        }

        if (i === 0) {
          firstMeta = {
            provider: payload.provider,
            model: payload.model,
            voiceProfileId,
            latencyMs: payload.latencyMs ?? Date.now() - clientStarted,
            retryCount: 0,
            fallbackUsed: false,
            cacheHit: false,
            source: "cloud",
          };
          if (process.env.NODE_ENV === "development") {
            console.log("[TTS]", {
              language: lang,
              provider: payload.provider,
              voice: voiceProfileId,
              fallback: false,
              chunk: 1,
              of: sentences.length,
            });
          }
          options.onFirstAudio?.();
          latMark("10_first_audio_playback", { source: "tutor_chunk" });
        }

        // Prefetch next while playing current (shared pipeline signal only).
        if (i + 1 < sentences.length) {
          nextFetch = fetchTutorChunkAudio({
            text: sentences[i + 1]!,
            language: lang,
            voiceProfileId,
            purpose,
            signal: abort.signal,
          }).catch((err) => {
            if (isAbortError(err)) {
              const abortErr = new Error("tutor_tts_aborted");
              abortErr.name = "AbortError";
              throw abortErr;
            }
            throw err;
          });
        } else {
          nextFetch = null;
        }

        const played = await playArrayBuffer(
          payload.audio,
          payload.contentType,
          abort.signal,
        );
        if (!played) {
          if (abort.signal.aborted || chunkGeneration !== generation) {
            return {
              ok: false,
              meta: { ...(firstMeta ?? emptyMeta()), source: "aborted" },
              sentencesPlayed,
            };
          }
          if (sentencesPlayed === 0) options.onNeedsTapToPlay?.();
          return {
            ok: false,
            meta: firstMeta ?? emptyMeta(),
            sentencesPlayed,
          };
        }
        sentencesPlayed += 1;
      }

      latEnd("tutor_tts_chunk_pipeline_done");
      if (chunkAbort === abort) chunkAbort = null;
      return {
        ok: true,
        meta: firstMeta ?? emptyMeta(),
        sentencesPlayed,
      };
    } catch (err) {
      if (isAbortError(err)) {
        return {
          ok: false,
          meta: { ...(firstMeta ?? emptyMeta()), source: "aborted" },
          sentencesPlayed,
        };
      }
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[TTS] chunk pipeline error",
          err instanceof Error ? err.message : err,
        );
      }
      if (sentencesPlayed === 0) options.onNeedsTapToPlay?.();
      return {
        ok: false,
        meta: firstMeta ?? emptyMeta(),
        sentencesPlayed,
      };
    }
  })();

  // Fire-and-forget callers must not see AbortError as an unhandled rejection.
  return run.catch((err) => {
    if (isAbortError(err)) {
      return {
        ok: false,
        meta: { ...emptyMeta(), source: "aborted" as const },
        sentencesPlayed: 0,
      };
    }
    throw err;
  });
}

/** Fire-and-forget chunked Tutor speech. */
export function speakTutorReplyChunkedFireAndForget(
  text: string,
  language?: string | null,
  options?: SpeakTutorChunksOptions,
): void {
  void speakTutorReplyChunked(text, language, options).catch((err) => {
    if (isAbortError(err)) return;
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[TTS] chunked speak rejected",
        err instanceof Error ? err.message : err,
      );
    }
  });
}
