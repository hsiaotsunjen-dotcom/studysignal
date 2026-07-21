/**
 * Approximate TTS cost estimates for logging (not billing).
 * Provider adapters may override with more accurate figures.
 */

/** OpenAI tts-1 public list rate ≈ $15 / 1M characters. */
export const OPENAI_TTS_1_USD_PER_MILLION_CHARS = 15;

export function estimateOpenAiTts1CostUsd(characters: number): number {
  if (!Number.isFinite(characters) || characters <= 0) return 0;
  return (characters * OPENAI_TTS_1_USD_PER_MILLION_CHARS) / 1_000_000;
}
