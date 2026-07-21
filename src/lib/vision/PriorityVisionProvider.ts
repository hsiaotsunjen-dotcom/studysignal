/**
 * PriorityVisionProvider — tries VisionProviders in VISION_PROVIDER_PRIORITY order.
 *
 * Default production order (unchanged): gemini,openai
 * On transient errors: retry the same provider, then fall back to the next.
 * Successful first provider never calls later ones.
 *
 * Do not change DEFAULT_VISION_PROVIDER_PRIORITY without product review.
 */

import type {
  VisionCallMeta,
  VisionProvider,
  VisionProviderId,
  VisionProviderInfo,
  VisionProviderRawResult,
  VisionProviderWithCallMeta,
  VisionTokenUsage,
} from "@/lib/vision/VisionProvider";
import { getVisionTokenUsage } from "@/lib/vision/VisionProvider";
import type { HomeworkVisionAnalyzeInput } from "@/lib/vision/types";
import { isTransientVisionProviderError } from "@/lib/vision/visionFallbackErrors";
import { GeminiVisionProvider } from "@/lib/vision/GeminiVisionProvider";
import { OpenAIVisionProvider } from "@/lib/vision/OpenAIVisionProvider";

/** Production default — do not change without explicit review. */
export const DEFAULT_VISION_PROVIDER_PRIORITY = "gemini,openai";

/** Try each provider this many times before moving to the next (transient errors only). */
export const DEFAULT_PROVIDER_MAX_ATTEMPTS = 2;

export function parseVisionProviderPriority(
  raw: string | undefined = process.env.VISION_PROVIDER_PRIORITY,
): VisionProviderId[] {
  const source = (raw?.trim() || DEFAULT_VISION_PROVIDER_PRIORITY).toLowerCase();
  const ids: VisionProviderId[] = [];
  for (const part of source.split(",")) {
    const id = part.trim();
    if (
      id === "gemini" ||
      id === "openai" ||
      id === "claude" ||
      id === "qwen" ||
      id === "local"
    ) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids.length > 0 ? ids : ["gemini", "openai"];
}

export function createVisionProviderById(id: VisionProviderId): VisionProvider {
  switch (id) {
    case "gemini":
      return new GeminiVisionProvider();
    case "openai":
      return new OpenAIVisionProvider();
    case "claude":
      throw new Error(
        "PriorityVisionProvider: ClaudeVisionProvider is not implemented yet.",
      );
    case "qwen":
      throw new Error(
        "PriorityVisionProvider: QwenVisionProvider is not implemented yet.",
      );
    case "local":
      throw new Error(
        "PriorityVisionProvider: LocalVisionProvider is not implemented yet.",
      );
    default:
      throw new Error(`PriorityVisionProvider: unknown provider id "${id}".`);
  }
}

/**
 * Production Eyes wiring. Provider order comes from env / default only —
 * Tutor and Signals never select providers.
 */
export function createHomeworkVisionProviderFromEnv(): PriorityVisionProvider {
  const ids = parseVisionProviderPriority();
  const providers = ids.map(createVisionProviderById);
  return new PriorityVisionProvider(providers);
}

export class PriorityVisionProvider implements VisionProviderWithCallMeta {
  private activeInfo: VisionProviderInfo;
  lastCallMeta: VisionCallMeta | null = null;
  lastUsage: VisionTokenUsage | null = null;

  constructor(
    private readonly providers: VisionProvider[],
    private readonly maxAttemptsPerProvider: number = DEFAULT_PROVIDER_MAX_ATTEMPTS,
  ) {
    if (!providers.length) {
      throw new Error("PriorityVisionProvider requires at least one provider.");
    }
    if (maxAttemptsPerProvider < 1) {
      throw new Error("maxAttemptsPerProvider must be >= 1.");
    }
    this.activeInfo = providers[0]!.info;
  }

  get info(): VisionProviderInfo {
    return this.activeInfo;
  }

  async analyzeHomework(
    input: HomeworkVisionAnalyzeInput,
  ): Promise<VisionProviderRawResult> {
    const started = Date.now();
    const errors: Error[] = [];
    this.lastUsage = null;

    for (let i = 0; i < this.providers.length; i++) {
      const candidate = this.providers[i]!;

      for (let attempt = 1; attempt <= this.maxAttemptsPerProvider; attempt++) {
        try {
          const raw = await candidate.analyzeHomework(input);
          const usage = getVisionTokenUsage(candidate);
          this.activeInfo = candidate.info;
          this.lastUsage = usage;
          this.lastCallMeta = {
            provider: candidate.info.provider,
            name: candidate.info.provider,
            model: candidate.info.model,
            latency: Date.now() - started,
            retryCount: i,
            fallbackUsed: i > 0,
            providerRetryCount: attempt - 1,
            usage,
          };
          return raw;
        } catch (err) {
          const asError =
            err instanceof Error ? err : new Error(String(err ?? "unknown"));
          errors.push(asError);

          const transient = isTransientVisionProviderError(err);
          const canRetrySame =
            transient && attempt < this.maxAttemptsPerProvider;

          if (canRetrySame) {
            if (process.env.NODE_ENV === "development") {
              console.log(
                `PriorityVisionProvider: ${candidate.info.id} transient failure (attempt ${attempt}/${this.maxAttemptsPerProvider}); retrying same provider.`,
              );
              console.log(asError.message);
            }
            continue;
          }

          const isLastProvider = i === this.providers.length - 1;
          if (!transient || isLastProvider) {
            if (isLastProvider && errors.length > 1) {
              throw new Error(
                `PriorityVisionProvider: all providers failed. Last: ${asError.message}`,
                { cause: asError },
              );
            }
            throw asError;
          }

          if (process.env.NODE_ENV === "development") {
            console.log(
              `PriorityVisionProvider: ${candidate.info.id} failed after ${attempt} attempt(s) (transient); falling back to next provider.`,
            );
            console.log(asError.message);
          }
          break;
        }
      }
    }

    throw new Error("PriorityVisionProvider: no providers available.");
  }
}
