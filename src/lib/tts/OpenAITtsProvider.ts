/**
 * OpenAITtsProvider — Eyes-style adapter for OpenAI /v1/audio/speech.
 *
 * OpenAI vendor voice names are resolved ONLY via Teacher Voice Catalog
 * (resolveProviderVoiceName). Never hardcode profile→voice maps here.
 */

import type {
  TtsProvider,
  TtsProviderInfo,
} from "@/lib/tts/TtsProvider";
import { resolveProviderVoiceName } from "@/lib/tts/catalog";
import { estimateOpenAiTts1CostUsd } from "@/lib/tts/ttsCost";
import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";

export const OPENAI_TTS_PROVIDER = "openai";
export const OPENAI_TTS_MODEL = "tts-1";

const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";

const OPENAI_TTS_INFO: TtsProviderInfo = {
  id: "openai",
  provider: OPENAI_TTS_PROVIDER,
  model: OPENAI_TTS_MODEL,
};

function clampOpenAiSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(4, Math.max(0.25, speed));
}

export class OpenAITtsProvider implements TtsProvider {
  readonly info: TtsProviderInfo = OPENAI_TTS_INFO;

  async synthesize(
    input: TtsSynthesizeInput,
  ): Promise<TtsProviderSynthesizeResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OpenAITtsProvider: OPENAI_API_KEY is not set.");
    }

    const text = input.text.trim();
    if (!text) {
      throw new Error("OpenAITtsProvider: text is empty.");
    }

    // Catalog is the only source of OpenAI voice names.
    const voice = resolveProviderVoiceName(input.voiceProfileId, "openai");
    const speed = clampOpenAiSpeed(input.speed);
    const format = input.format === "opus" ? "opus" : "mp3";

    let res: Response;
    try {
      res = await fetch(OPENAI_SPEECH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_TTS_MODEL,
          input: text,
          voice,
          response_format: format,
          speed,
        }),
        signal: input.signal,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `OpenAITtsProvider: request timed out / aborted — ${message}`,
        );
      }
      throw new Error(
        `OpenAITtsProvider: fetch error / network error — ${message}`,
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `OpenAITtsProvider: OpenAI request failed — HTTP ${res.status}: ${detail.slice(0, 300)}`,
      );
    }

    const audio = await res.arrayBuffer();
    if (!audio.byteLength) {
      throw new Error("OpenAITtsProvider: empty audio body.");
    }

    const characters = text.length;
    return {
      audio,
      format,
      contentType: format === "opus" ? "audio/ogg" : "audio/mpeg",
      characters,
      estimatedCostUsd: estimateOpenAiTts1CostUsd(characters),
    };
  }
}
