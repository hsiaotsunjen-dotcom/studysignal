/**
 * ElevenLabsTtsProvider — stub until ElevenLabs is wired.
 */

import type { TtsProvider, TtsProviderInfo } from "@/lib/tts/TtsProvider";
import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";

const INFO: TtsProviderInfo = {
  id: "elevenlabs",
  provider: "elevenlabs",
  model: "eleven_multilingual_pending",
};

export class ElevenLabsTtsProvider implements TtsProvider {
  readonly info = INFO;

  async synthesize(_input: TtsSynthesizeInput): Promise<TtsProviderSynthesizeResult> {
    throw new Error(
      "ElevenLabsTtsProvider: not implemented yet. Add ElevenLabs HTTP API here.",
    );
  }
}
