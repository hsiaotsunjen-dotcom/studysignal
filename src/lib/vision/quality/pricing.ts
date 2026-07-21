/**
 * Approximate public token pricing for Eyes Quality cost estimates.
 * Not fetched live — verify against provider pages before budgeting.
 */

import type { VisionProviderId, VisionTokenUsage } from "@/lib/vision/VisionProvider";

/** USD per 1M tokens. */
export type EyesQualityModelPricing = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

/**
 * Snapshot prices (approximate, mid-2026 public list rates).
 * Update when models or pricing change — benchmark only.
 */
export const EYES_QUALITY_PRICING: Record<string, EyesQualityModelPricing> = {
  "gemini-3.5-flash": {
    inputPerMillionUsd: 0.1,
    outputPerMillionUsd: 0.4,
  },
  "gpt-4o-mini": {
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.6,
  },
};

export function estimateEyesCostUsd(
  model: string,
  usage: VisionTokenUsage | null,
): number | null {
  if (!usage) return null;
  const pricing = EYES_QUALITY_PRICING[model];
  if (!pricing) return null;
  const prompt = usage.promptTokens ?? 0;
  const completion = usage.completionTokens ?? 0;
  if (prompt <= 0 && completion <= 0) {
    if (usage.totalTokens != null && usage.totalTokens > 0) {
      // Split unknown mix 70/30 when only total is known.
      const total = usage.totalTokens;
      return (
        (total * 0.7 * pricing.inputPerMillionUsd +
          total * 0.3 * pricing.outputPerMillionUsd) /
        1_000_000
      );
    }
    return null;
  }
  return (
    (prompt * pricing.inputPerMillionUsd +
      completion * pricing.outputPerMillionUsd) /
    1_000_000
  );
}

export function providerLabel(id: VisionProviderId, model: string): string {
  switch (id) {
    case "gemini":
      return `Gemini (${model})`;
    case "openai":
      return `OpenAI (${model})`;
    case "claude":
      return `Claude (${model})`;
    case "local":
      return `Local (${model})`;
    case "qwen":
      return `Qwen (${model})`;
    default:
      return `${id} (${model})`;
  }
}
