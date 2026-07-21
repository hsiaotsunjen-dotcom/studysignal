/**
 * GeminiTtsProvider — stub until Google Cloud / Gemini TTS is wired.
 */

import type { TtsProvider, TtsProviderInfo } from "@/lib/tts/TtsProvider";
import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";

const INFO: TtsProviderInfo = {
  id: "gemini",
  provider: "google",
  model: "gemini-tts-pending",
};

export class GeminiTtsProvider implements TtsProvider {
  readonly info = INFO;

  async synthesize(_input: TtsSynthesizeInput): Promise<TtsProviderSynthesizeResult> {
    throw new Error(
      "GeminiTtsProvider: not implemented yet. Add Google Cloud / Gemini TTS here.",
    );
  }
}
