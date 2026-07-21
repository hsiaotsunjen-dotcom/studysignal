import { describe, expect, it, vi } from "vitest";

import type { TtsProvider } from "@/lib/tts/TtsProvider";
import { PriorityTtsProvider } from "@/lib/tts/PriorityTtsProvider";
import { TtsService } from "@/lib/tts/TtsService";
import { isTransientTtsProviderError } from "@/lib/tts/ttsFallbackErrors";
import type { TtsProviderSynthesizeResult } from "@/lib/tts/types";

function fakeAudio(label: string): TtsProviderSynthesizeResult {
  const bytes = new TextEncoder().encode(label);
  return {
    audio: bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ),
    format: "mp3",
    contentType: "audio/mpeg",
    characters: 12,
    estimatedCostUsd: 0.0001,
  };
}

function trackingProvider(opts: {
  id: "openai" | "gemini" | "azure";
  provider: string;
  model: string;
  impl: TtsProvider["synthesize"];
}): TtsProvider & { synthesize: ReturnType<typeof vi.fn> } {
  const synthesize = vi.fn(opts.impl);
  return {
    info: {
      id: opts.id,
      provider: opts.provider,
      model: opts.model,
    },
    synthesize,
  };
}

const baseInput = {
  text: "Hello StudySignal",
  language: "en-US",
  voiceProfileId: "teacher_female_tw",
  speed: 1,
  format: "mp3" as const,
};

describe("isTransientTtsProviderError", () => {
  it("detects 429 / 503 / timeout", () => {
    expect(
      isTransientTtsProviderError(
        new Error("OpenAITtsProvider: HTTP 429: rate_limit"),
      ),
    ).toBe(true);
    expect(
      isTransientTtsProviderError(
        new Error("PriorityTtsProvider:openai: timed out after 8000ms"),
      ),
    ).toBe(true);
    expect(
      isTransientTtsProviderError(
        new Error("OpenAITtsProvider: empty audio body."),
      ),
    ).toBe(false);
  });
});

describe("PriorityTtsProvider", () => {
  it("returns first provider result without calling fallback", async () => {
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => fakeAudio("openai"),
    });
    const azure = trackingProvider({
      id: "azure",
      provider: "azure",
      model: "neural",
      impl: async () => fakeAudio("azure"),
    });

    const priority = new PriorityTtsProvider([openai, azure], 2, 5_000);
    const raw = await priority.synthesize(baseInput);

    expect(new TextDecoder().decode(raw.audio)).toBe("openai");
    expect(openai.synthesize).toHaveBeenCalledTimes(1);
    expect(azure.synthesize).not.toHaveBeenCalled();
    expect(priority.lastCallMeta?.fallbackUsed).toBe(false);
    expect(priority.lastCallMeta?.retryCount).toBe(0);
    expect(priority.info.model).toBe("tts-1");
  });

  it("retries same provider on transient error then succeeds", async () => {
    let calls = 0;
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("OpenAITtsProvider: HTTP 503: high demand");
        }
        return fakeAudio("openai-retry");
      },
    });
    const azure = trackingProvider({
      id: "azure",
      provider: "azure",
      model: "neural",
      impl: async () => fakeAudio("azure"),
    });

    const priority = new PriorityTtsProvider([openai, azure], 2, 5_000);
    const raw = await priority.synthesize(baseInput);
    expect(new TextDecoder().decode(raw.audio)).toBe("openai-retry");
    expect(openai.synthesize).toHaveBeenCalledTimes(2);
    expect(azure.synthesize).not.toHaveBeenCalled();
    expect(priority.lastCallMeta?.providerRetryCount).toBe(1);
    expect(priority.lastCallMeta?.fallbackUsed).toBe(false);
  });

  it("falls back to next provider after transient exhaustion", async () => {
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => {
        throw new Error("OpenAITtsProvider: HTTP 429: rate_limit");
      },
    });
    const azure = trackingProvider({
      id: "azure",
      provider: "azure",
      model: "neural",
      impl: async () => fakeAudio("azure"),
    });

    const priority = new PriorityTtsProvider([openai, azure], 2, 5_000);
    const raw = await priority.synthesize(baseInput);
    expect(new TextDecoder().decode(raw.audio)).toBe("azure");
    expect(openai.synthesize).toHaveBeenCalledTimes(2);
    expect(azure.synthesize).toHaveBeenCalledTimes(1);
    expect(priority.lastCallMeta?.fallbackUsed).toBe(true);
    expect(priority.lastCallMeta?.retryCount).toBe(1);
    expect(priority.info.provider).toBe("azure");
  });

  it("does not fall back on non-transient errors", async () => {
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => {
        throw new Error("OpenAITtsProvider: empty audio body.");
      },
    });
    const azure = trackingProvider({
      id: "azure",
      provider: "azure",
      model: "neural",
      impl: async () => fakeAudio("azure"),
    });

    const priority = new PriorityTtsProvider([openai, azure], 2, 5_000);
    await expect(priority.synthesize(baseInput)).rejects.toThrow(/empty audio/);
    expect(azure.synthesize).not.toHaveBeenCalled();
  });

  it("tutor policy does not retry after an attempt timeout error", async () => {
    let calls = 0;
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => {
        calls += 1;
        throw new Error("PriorityTtsProvider:openai: timed out after 8000ms");
      },
    });
    const priority = new PriorityTtsProvider([openai], 2, 8_000, "tutor");
    await expect(priority.synthesize(baseInput)).rejects.toThrow(/timed out/);
    expect(calls).toBe(1);
  });

  it("tutor policy retries immediate 429", async () => {
    let calls = 0;
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => {
        calls += 1;
        if (calls === 1) throw new Error("HTTP 429 rate_limit");
        return fakeAudio("ok");
      },
    });
    const priority = new PriorityTtsProvider([openai], 2, 8_000, "tutor");
    const raw = await priority.synthesize(baseInput);
    expect(new TextDecoder().decode(raw.audio)).toBe("ok");
    expect(calls).toBe(2);
  });
});

describe("TtsService", () => {
  it("returns unified TtsAudioResult without vendor voice names", async () => {
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async () => fakeAudio("svc"),
    });
    const service = new TtsService(new PriorityTtsProvider([openai], 1, 5_000));
    const result = await service.synthesize(baseInput);

    expect(result.contentType).toBe("audio/mpeg");
    expect(result.voiceProfileId).toBe("teacher_female_tw");
    expect(result.meta.provider).toBe("openai");
    expect(result.meta.model).toBe("tts-1");
    expect(result.meta.fallbackUsed).toBe(false);
    expect(result.meta.estimatedCostUsd).toBe(0.0001);
    expect(JSON.stringify(result.meta)).not.toMatch(/nova|onyx|fable/i);
  });

  it("normalizes legacy voiceProfile aliases to canonical catalog ids", async () => {
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "tts-1",
      impl: async (input) => {
        expect(input.voiceProfileId).toBe("teacher_female_tw");
        return fakeAudio("alias");
      },
    });
    const service = new TtsService(new PriorityTtsProvider([openai], 1, 5_000));
    const result = await service.synthesize({
      ...baseInput,
      voiceProfileId: "teacher_female",
    });
    expect(result.voiceProfileId).toBe("teacher_female_tw");
  });
});
