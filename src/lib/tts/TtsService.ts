/**
 * TtsService — Eyes-style orchestration for TTS.
 *
 * Responsibilities:
 * 1. Normalize voiceProfileId via Teacher Voice Catalog
 * 2. Call TtsProvider (typically PriorityTtsProvider)
 * 3. Stamp unified TtsAudioResult meta (latency, fallback, cost)
 * 4. Dev provider logging
 *
 * Must NOT: talk to Tutor/SAO/Signals, or know vendor voice names.
 */

import {
  getTeacherVoiceProfile,
  normalizeTeacherVoiceProfileId,
} from "@/lib/tts/catalog";
import type { TtsProvider } from "@/lib/tts/TtsProvider";
import { getTtsCallMeta } from "@/lib/tts/TtsProvider";
import { logTtsProviderDevSummary } from "@/lib/tts/ttsProviderLog";
import type { TtsAudioResult, TtsSynthesizeInput } from "@/lib/tts/types";

export class TtsService {
  constructor(private readonly provider: TtsProvider) {}

  async synthesize(input: TtsSynthesizeInput): Promise<TtsAudioResult> {
    const canonicalId = normalizeTeacherVoiceProfileId(input.voiceProfileId);
    if (!canonicalId) {
      throw new Error(
        `TtsService: unknown voiceProfileId "${input.voiceProfileId}"`,
      );
    }
    const profile = getTeacherVoiceProfile(canonicalId);
    if (!profile) {
      throw new Error(`TtsService: missing catalog entry for "${canonicalId}"`);
    }

    const normalizedInput: TtsSynthesizeInput = {
      ...input,
      voiceProfileId: canonicalId,
      language: input.language ?? profile.locale,
      speed: Number.isFinite(input.speed) ? input.speed : profile.defaultSpeed,
    };

    const started = Date.now();
    const raw = await this.provider.synthesize(normalizedInput);
    const callMeta = getTtsCallMeta(this.provider);
    const latencyMs =
      callMeta && callMeta.latency > 0
        ? callMeta.latency
        : Date.now() - started;

    const result: TtsAudioResult = {
      audio: raw.audio,
      format: raw.format,
      contentType: raw.contentType,
      voiceProfileId: canonicalId,
      language: normalizedInput.language,
      speed: normalizedInput.speed,
      meta: {
        providerId: this.provider.info.id,
        provider: callMeta?.provider ?? this.provider.info.provider,
        model: callMeta?.model ?? this.provider.info.model,
        latencyMs,
        retryCount: callMeta?.retryCount ?? 0,
        providerRetryCount: callMeta?.providerRetryCount ?? 0,
        fallbackUsed: callMeta?.fallbackUsed ?? false,
        characters: callMeta?.characters ?? raw.characters,
        estimatedCostUsd:
          callMeta?.estimatedCostUsd ?? raw.estimatedCostUsd ?? null,
      },
    };

    if (callMeta) {
      result.meta.providerId = this.provider.info.id;
      result.meta.provider = callMeta.provider;
      result.meta.model = callMeta.model;
    }

    logTtsProviderDevSummary(result);
    return result;
  }
}
