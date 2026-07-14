/**
 * PriorityVisionProvider — tries VisionProviders in VISION_PROVIDER_PRIORITY order.
 *
 * Default: gemini,openai
 * On transient errors (503 / 429 / timeout / network), falls back to the next provider.
 * Successful first provider never calls later ones.
 */

import type {
  VisionCallMeta,
  VisionProvider,
  VisionProviderId,
  VisionProviderInfo,
  VisionProviderRawResult,
  VisionProviderWithCallMeta,
} from "@/lib/vision/VisionProvider";
import type { HomeworkVisionAnalyzeInput } from "@/lib/vision/types";
import { isTransientVisionProviderError } from "@/lib/vision/visionFallbackErrors";
import { GeminiVisionProvider } from "@/lib/vision/GeminiVisionProvider";
import { OpenAIVisionProvider } from "@/lib/vision/OpenAIVisionProvider";

export const DEFAULT_VISION_PROVIDER_PRIORITY = "gemini,openai";

export function parseVisionProviderPriority(
  raw: string | undefined = process.env.VISION_PROVIDER_PRIORITY,
): VisionProviderId[] {
  const source = (raw?.trim() || DEFAULT_VISION_PROVIDER_PRIORITY).toLowerCase();
  const ids: VisionProviderId[] = [];
  for (const part of source.split(",")) {
    const id = part.trim();
    if (id === "gemini" || id === "openai" || id === "claude" || id === "qwen") {
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
    default:
      throw new Error(`PriorityVisionProvider: unknown provider id "${id}".`);
  }
}

export function createHomeworkVisionProviderFromEnv(): PriorityVisionProvider {
  const ids = parseVisionProviderPriority();
  const providers = ids.map(createVisionProviderById);
  return new PriorityVisionProvider(providers);
}

export class PriorityVisionProvider implements VisionProviderWithCallMeta {
  private activeInfo: VisionProviderInfo;
  lastCallMeta: VisionCallMeta | null = null;

  constructor(private readonly providers: VisionProvider[]) {
    if (!providers.length) {
      throw new Error("PriorityVisionProvider requires at least one provider.");
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

    for (let i = 0; i < this.providers.length; i++) {
      const candidate = this.providers[i]!;
      try {
        const raw = await candidate.analyzeHomework(input);
        this.activeInfo = candidate.info;
        this.lastCallMeta = {
          provider: candidate.info.provider,
          name: candidate.info.provider,
          model: candidate.info.model,
          latency: Date.now() - started,
          retryCount: i,
          fallbackUsed: i > 0,
        };
        return raw;
      } catch (err) {
        const asError =
          err instanceof Error ? err : new Error(String(err ?? "unknown"));
        errors.push(asError);

        const isLast = i === this.providers.length - 1;
        if (!isTransientVisionProviderError(err) || isLast) {
          if (isLast && errors.length > 1) {
            throw new Error(
              `PriorityVisionProvider: all providers failed. Last: ${asError.message}`,
              { cause: asError },
            );
          }
          throw asError;
        }

        console.log(
          `PriorityVisionProvider: ${candidate.info.id} failed (transient); falling back to next provider.`,
        );
        console.log(asError.message);
      }
    }

    throw new Error("PriorityVisionProvider: no providers available.");
  }
}
