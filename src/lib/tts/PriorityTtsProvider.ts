/**
 * PriorityTtsProvider — tries TtsProviders in TTS_PROVIDER_PRIORITY order.
 *
 * Mirrors PriorityVisionProvider:
 * transient error → retry same provider → fallback to next.
 * Successful first provider never calls later ones.
 *
 * Default production order: openai
 */

import type {
  TtsCallMeta,
  TtsProvider,
  TtsProviderId,
  TtsProviderInfo,
  TtsProviderWithCallMeta,
} from "@/lib/tts/TtsProvider";
import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";
import {
  isImmediateTutorTtsRetryable,
  isTransientTtsProviderError,
  type TtsRetryPolicy,
} from "@/lib/tts/ttsFallbackErrors";
import { OpenAITtsProvider } from "@/lib/tts/OpenAITtsProvider";
import { GeminiTtsProvider } from "@/lib/tts/GeminiTtsProvider";
import { AzureTtsProvider } from "@/lib/tts/AzureTtsProvider";
import { ElevenLabsTtsProvider } from "@/lib/tts/ElevenLabsTtsProvider";
import { LocalTtsProvider } from "@/lib/tts/LocalTtsProvider";

/** Production default — do not change without product review. */
export const DEFAULT_TTS_PROVIDER_PRIORITY = "openai";

export const DEFAULT_TTS_PROVIDER_MAX_ATTEMPTS = 2;

/** Per-attempt wall-clock timeout (ms). */
export const DEFAULT_TTS_ATTEMPT_TIMEOUT_MS = 8_000;

export function parseTtsProviderPriority(
  raw: string | undefined = process.env.TTS_PROVIDER_PRIORITY,
): TtsProviderId[] {
  const source = (raw?.trim() || DEFAULT_TTS_PROVIDER_PRIORITY).toLowerCase();
  const ids: TtsProviderId[] = [];
  for (const part of source.split(",")) {
    const id = part.trim();
    if (
      id === "openai" ||
      id === "gemini" ||
      id === "azure" ||
      id === "elevenlabs" ||
      id === "local"
    ) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids.length > 0 ? ids : ["openai"];
}

export function createTtsProviderById(id: TtsProviderId): TtsProvider {
  switch (id) {
    case "openai":
      return new OpenAITtsProvider();
    case "gemini":
      return new GeminiTtsProvider();
    case "azure":
      return new AzureTtsProvider();
    case "elevenlabs":
      return new ElevenLabsTtsProvider();
    case "local":
      return new LocalTtsProvider();
    default:
      throw new Error(`PriorityTtsProvider: unknown provider id "${id}".`);
  }
}

export function createHomeworkTtsProviderFromEnv(
  retryPolicy: TtsRetryPolicy = "default",
): PriorityTtsProvider {
  const ids = parseTtsProviderPriority();
  // Skip stubs that would only throw "not implemented" unless explicitly sole entry
  // — for multi-provider lists, only instantiate implemented adapters + stubs that
  // can act as fallbacks once implemented. Creating stub classes is fine; they throw
  // non-transient "not implemented" and stop the chain (correct until wired).
  const providers = ids.map(createTtsProviderById);
  return new PriorityTtsProvider(
    providers,
    DEFAULT_TTS_PROVIDER_MAX_ATTEMPTS,
    DEFAULT_TTS_ATTEMPT_TIMEOUT_MS,
    retryPolicy,
  );
}

function runWithTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      return Promise.reject(new Error(`${label}: aborted`));
    }
    externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  return run(controller.signal)
    .catch((err) => {
      if (controller.signal.aborted) {
        throw new Error(
          `${label}: timed out after ${timeoutMs}ms`,
          { cause: err instanceof Error ? err : undefined },
        );
      }
      throw err;
    })
    .finally(() => {
      if (timer !== undefined) clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", onExternalAbort);
      }
    });
}

export class PriorityTtsProvider implements TtsProviderWithCallMeta {
  private activeInfo: TtsProviderInfo;
  lastCallMeta: TtsCallMeta | null = null;

  constructor(
    private readonly providers: TtsProvider[],
    private readonly maxAttemptsPerProvider: number = DEFAULT_TTS_PROVIDER_MAX_ATTEMPTS,
    private readonly attemptTimeoutMs: number = DEFAULT_TTS_ATTEMPT_TIMEOUT_MS,
    private readonly retryPolicy: TtsRetryPolicy = "default",
  ) {
    if (!providers.length) {
      throw new Error("PriorityTtsProvider requires at least one provider.");
    }
    if (maxAttemptsPerProvider < 1) {
      throw new Error("maxAttemptsPerProvider must be >= 1.");
    }
    this.activeInfo = providers[0]!.info;
  }

  get info(): TtsProviderInfo {
    return this.activeInfo;
  }

  async synthesize(
    input: TtsSynthesizeInput,
  ): Promise<TtsProviderSynthesizeResult> {
    const started = Date.now();
    const errors: Error[] = [];
    // Tutor: one OpenAI attempt by default; second attempt only for immediate glitches.
    const maxAttempts =
      this.retryPolicy === "tutor" ? 2 : this.maxAttemptsPerProvider;

    for (let i = 0; i < this.providers.length; i++) {
      const candidate = this.providers[i]!;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const attemptStarted = Date.now();
        try {
          const raw = await runWithTimeout(
            (signal) =>
              candidate.synthesize({
                ...input,
                signal,
              }),
            this.attemptTimeoutMs,
            `PriorityTtsProvider:${candidate.info.id}`,
            input.signal,
          );
          this.activeInfo = candidate.info;
          this.lastCallMeta = {
            provider: candidate.info.provider,
            name: candidate.info.provider,
            model: candidate.info.model,
            latency: Date.now() - started,
            retryCount: i,
            fallbackUsed: i > 0,
            providerRetryCount: attempt - 1,
            characters: raw.characters,
            estimatedCostUsd: raw.estimatedCostUsd,
          };
          return raw;
        } catch (err) {
          const asError =
            err instanceof Error ? err : new Error(String(err ?? "unknown"));
          errors.push(asError);
          const attemptElapsed = Date.now() - attemptStarted;

          const canRetrySame =
            this.retryPolicy === "tutor"
              ? isImmediateTutorTtsRetryable(err, attemptElapsed) &&
                attempt < maxAttempts
              : isTransientTtsProviderError(err) &&
                attempt < this.maxAttemptsPerProvider;

          if (canRetrySame) {
            if (process.env.NODE_ENV === "development") {
              console.log(
                `PriorityTtsProvider: ${candidate.info.id} transient failure (attempt ${attempt}/${maxAttempts}); retrying same provider.`,
              );
              console.log(asError.message);
            }
            continue;
          }

          const transient =
            this.retryPolicy === "tutor"
              ? isImmediateTutorTtsRetryable(err, attemptElapsed)
              : isTransientTtsProviderError(err);
          const isLastProvider = i === this.providers.length - 1;
          if (!transient || isLastProvider) {
            if (isLastProvider && errors.length > 1) {
              throw new Error(
                `PriorityTtsProvider: all providers failed. Last: ${asError.message}`,
                { cause: asError },
              );
            }
            throw asError;
          }

          if (process.env.NODE_ENV === "development") {
            console.log(
              `PriorityTtsProvider: ${candidate.info.id} failed after ${attempt} attempt(s) (transient); falling back to next provider.`,
            );
            console.log(asError.message);
          }
          break;
        }
      }
    }

    throw new Error("PriorityTtsProvider: no providers available.");
  }
}
