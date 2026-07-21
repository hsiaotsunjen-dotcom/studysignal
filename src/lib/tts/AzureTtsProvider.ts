/**
 * AzureTtsProvider — stub until Azure Neural TTS is wired.
 */

import type { TtsProvider, TtsProviderInfo } from "@/lib/tts/TtsProvider";
import type {
  TtsProviderSynthesizeResult,
  TtsSynthesizeInput,
} from "@/lib/tts/types";

const INFO: TtsProviderInfo = {
  id: "azure",
  provider: "azure",
  model: "azure-neural-pending",
};

export class AzureTtsProvider implements TtsProvider {
  readonly info = INFO;

  async synthesize(_input: TtsSynthesizeInput): Promise<TtsProviderSynthesizeResult> {
    throw new Error(
      "AzureTtsProvider: not implemented yet. Add Azure Speech SDK / REST here.",
    );
  }
}
