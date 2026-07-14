import { describe, expect, it, vi } from "vitest";

import type { VisionProvider } from "@/lib/vision/VisionProvider";
import { PriorityVisionProvider } from "@/lib/vision/PriorityVisionProvider";
import { HomeworkVisionService } from "@/lib/vision/HomeworkVisionService";
import { setHomeworkVisionUseMock } from "@/lib/vision/HomeworkVisionService";
import { isTransientVisionProviderError } from "@/lib/vision/visionFallbackErrors";

const VALID_RAW = {
  assignment: {
    subject: "English",
    type: "worksheet",
    totalQuestions: 1,
    sameAssignment: true,
  },
  questions: [
    {
      number: 1,
      answered: true,
      studentAnswer: "cat",
      status: "answered",
      confidence: 0.95,
    },
  ],
  missingSections: [],
  photoQuality: "good",
  confidence: 0.95,
};

function trackingProvider(opts: {
  id: "gemini" | "openai";
  provider: string;
  model: string;
  impl: VisionProvider["analyzeHomework"];
}): VisionProvider & { analyzeHomework: ReturnType<typeof vi.fn> } {
  const analyzeHomework = vi.fn(opts.impl);
  return {
    info: {
      id: opts.id,
      provider: opts.provider,
      model: opts.model,
    },
    analyzeHomework,
  };
}

describe("isTransientVisionProviderError", () => {
  it("detects HTTP 503 / high demand", () => {
    expect(
      isTransientVisionProviderError(
        new Error(
          "GeminiVisionProvider: Gemini request failed — HTTP 503: high demand",
        ),
      ),
    ).toBe(true);
  });

  it("detects 429", () => {
    expect(
      isTransientVisionProviderError(
        new Error("OpenAI request failed — HTTP 429: rate_limit"),
      ),
    ).toBe(true);
  });

  it("does not treat schema errors as transient", () => {
    expect(
      isTransientVisionProviderError(
        new Error("GeminiVisionProvider: model response is not valid JSON."),
      ),
    ).toBe(false);
  });
});

describe("PriorityVisionProvider fallback", () => {
  it("returns Gemini result and does not call OpenAI when Gemini succeeds", async () => {
    const gemini = trackingProvider({
      id: "gemini",
      provider: "google",
      model: "gemini-3.5-flash",
      impl: async () => VALID_RAW,
    });
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "gpt-4o-mini",
      impl: async () => {
        throw new Error("OpenAI should not be called");
      },
    });

    const priority = new PriorityVisionProvider([gemini, openai]);
    const raw = await priority.analyzeHomework({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });

    expect(raw).toEqual(VALID_RAW);
    expect(gemini.analyzeHomework).toHaveBeenCalledTimes(1);
    expect(openai.analyzeHomework).not.toHaveBeenCalled();
    expect(priority.lastCallMeta?.fallbackUsed).toBe(false);
    expect(priority.lastCallMeta?.retryCount).toBe(0);
    expect(priority.lastCallMeta?.provider).toBe("google");
    expect(priority.info.model).toBe("gemini-3.5-flash");
  });

  it("falls back to OpenAI on Gemini HTTP 503 and returns HomeworkVisionResult", async () => {
    setHomeworkVisionUseMock(false);
    const gemini = trackingProvider({
      id: "gemini",
      provider: "google",
      model: "gemini-3.5-flash",
      impl: async () => {
        throw new Error(
          "GeminiVisionProvider: Gemini request failed — HTTP 503: high demand",
        );
      },
    });
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "gpt-4o-mini",
      impl: async () => VALID_RAW,
    });

    const priority = new PriorityVisionProvider([gemini, openai]);
    const service = new HomeworkVisionService(priority);
    const result = await service.analyze({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });

    expect(gemini.analyzeHomework).toHaveBeenCalledTimes(1);
    expect(openai.analyzeHomework).toHaveBeenCalledTimes(1);
    expect(result.provider.provider).toBe("openai");
    expect(result.provider.name).toBe("openai");
    expect(result.provider.model).toBe("gpt-4o-mini");
    expect(result.provider.fallbackUsed).toBe(true);
    expect(result.provider.retryCount).toBe(1);
    expect(result.questions[0]?.studentAnswer).toBe("cat");
    expect(typeof result.provider.latency).toBe("number");
  });

  it("does not fall back on non-transient Gemini errors", async () => {
    const gemini = trackingProvider({
      id: "gemini",
      provider: "google",
      model: "gemini-3.5-flash",
      impl: async () => {
        throw new Error("GeminiVisionProvider: model response is not valid JSON.");
      },
    });
    const openai = trackingProvider({
      id: "openai",
      provider: "openai",
      model: "gpt-4o-mini",
      impl: async () => VALID_RAW,
    });

    const priority = new PriorityVisionProvider([gemini, openai]);
    await expect(
      priority.analyzeHomework({
        images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
      }),
    ).rejects.toThrow(/not valid JSON/);
    expect(openai.analyzeHomework).not.toHaveBeenCalled();
  });
});
