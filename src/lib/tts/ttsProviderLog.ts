/**
 * Development-only TTS provider diagnostics (mirrors eyesProviderLog).
 */

import type { TtsAudioResult } from "@/lib/tts/types";

export function logTtsProviderDevSummary(result: TtsAudioResult): void {
  if (process.env.NODE_ENV !== "development") return;
  const m = result.meta;
  console.log("==================================================");
  console.log("===== TTS Provider =====");
  console.log("Provider:", m.provider);
  console.log("Provider id:", m.providerId);
  console.log("Model:", m.model);
  console.log("Voice profile:", result.voiceProfileId);
  console.log("Language:", result.language ?? "(none)");
  console.log("Format:", result.format);
  console.log("Speed:", result.speed);
  console.log("Latency:", `${(m.latencyMs / 1000).toFixed(2)}s`);
  console.log("Characters:", m.characters);
  console.log(
    "Est. cost:",
    m.estimatedCostUsd == null ? "n/a" : `$${m.estimatedCostUsd.toFixed(6)}`,
  );
  console.log("Fallback used:", m.fallbackUsed);
  console.log("Provider index (retryCount):", m.retryCount);
  console.log("Intra-provider retries:", m.providerRetryCount);
  console.log("Audio bytes:", result.audio.byteLength);
  console.log("==================================================");
}
