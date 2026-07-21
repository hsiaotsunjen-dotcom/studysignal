/**
 * LocalTtsProvider — stub for future on-device / offline TTS.
 */

import type { TtsProvider, TtsProviderInfo } from "@/lib/tts/TtsProvider";
import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";

const INFO: TtsProviderInfo = {
  id: "local",
  provider: "local",
  model: "local-tts-pending",
};

export class LocalTtsProvider implements TtsProvider {
  readonly info = INFO;

  async synthesize(_input: TtsSynthesizeInput): Promise<TtsProviderSynthesizeResult> {
    throw new Error(
      "LocalTtsProvider: not implemented yet. Reserve for on-device TTS.",
    );
  }
}
