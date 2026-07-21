import { afterEach, describe, expect, it, vi } from "vitest";

import type { VisionProvider } from "@/lib/vision/VisionProvider";
import {
  HomeworkVisionSchemaError,
  HomeworkVisionService,
  HOMEWORK_VISION_MOCK_PAYLOAD,
  isHomeworkVisionUseMock,
  setHomeworkVisionUseMock,
} from "@/lib/vision/HomeworkVisionService";
import { HOMEWORK_VISION_SCHEMA_VERSION } from "@/lib/vision/types";

/** Tracking provider — never calls a real Gemini API. */
function createTrackingProvider(rawResult: unknown): {
  provider: VisionProvider;
  analyzeHomework: ReturnType<typeof vi.fn>;
} {
  const analyzeHomework = vi.fn(async () => rawResult);
  return {
    analyzeHomework,
    provider: {
      info: {
        id: "gemini",
        provider: "google",
        model: "gemini-2.5-flash",
      },
      analyzeHomework,
    },
  };
}

const VALID_MOCK_JSON = {
  assignment: {
    subject: "English",
    type: "worksheet",
    totalQuestions: 3,
    sameAssignment: true,
  },
  questions: [
    {
      number: 1,
      answered: true,
      studentAnswer: "apple",
      status: "answered",
      confidence: 0.98,
    },
    {
      number: 2,
      answered: false,
      studentAnswer: null,
      status: "blank",
      confidence: 0.9,
    },
    {
      number: 3,
      answered: false,
      studentAnswer: null,
      status: "not_visible",
      confidence: 0.4,
    },
  ],
  missingSections: ["bottom right corner"],
  photoQuality: "fair",
  confidence: 0.85,
};

afterEach(() => {
  setHomeworkVisionUseMock(true);
});

describe("HomeworkVisionService validateRaw + mapToResult", () => {
  const { provider } = createTrackingProvider(VALID_MOCK_JSON);
  const service = new HomeworkVisionService(provider);

  it("validateRaw accepts valid mock object", () => {
    const payload = service.validateRaw(VALID_MOCK_JSON);
    expect(payload.assignment.totalQuestions).toBe(3);
    expect(payload.questions).toHaveLength(3);
    expect(payload.questions[2]?.status).toBe("not_visible");
    expect(payload.photoQuality).toBe("fair");
    expect(payload.missingSections).toEqual(["bottom right corner"]);
  });

  it("validateRaw accepts valid JSON string", () => {
    const payload = service.validateRaw(JSON.stringify(VALID_MOCK_JSON));
    expect(payload.assignment.subject).toBe("English");
    expect(payload.confidence).toBe(0.85);
  });

  it("mapToResult stamps provider metadata without changing question data", () => {
    const payload = service.validateRaw(VALID_MOCK_JSON);
    const result = service.mapToResult(payload);

    expect(result.provider).toEqual({
      provider: "google",
      model: "gemini-2.5-flash",
      version: HOMEWORK_VISION_SCHEMA_VERSION,
    });
    expect(result.questions).toEqual(payload.questions);
    expect(result.assignment).toEqual(payload.assignment);
    expect(result.missingSections).toEqual(payload.missingSections);
    expect(result.photoQuality).toBe("fair");
    expect(result.confidence).toBe(0.85);
  });

  it("validateRaw rejects empty payload", () => {
    expect(() => service.validateRaw(null)).toThrow(HomeworkVisionSchemaError);
    expect(() => service.validateRaw(undefined)).toThrow(
      HomeworkVisionSchemaError,
    );
  });

  it("validateRaw rejects invalid photoQuality", () => {
    expect(() =>
      service.validateRaw({
        ...VALID_MOCK_JSON,
        photoQuality: "excellent",
      }),
    ).toThrow(/photoQuality/);
  });

  it("validateRaw rejects confidence outside 0–1", () => {
    expect(() =>
      service.validateRaw({
        ...VALID_MOCK_JSON,
        confidence: 1.5,
      }),
    ).toThrow(/confidence/);
  });

  it("validateRaw rejects missing questions array", () => {
    const { questions: _removed, ...rest } = VALID_MOCK_JSON;
    expect(() => service.validateRaw(rest)).toThrow(/questions/);
  });

  it("validateRaw rejects invalid question status", () => {
    expect(() =>
      service.validateRaw({
        ...VALID_MOCK_JSON,
        questions: [
          {
            number: 1,
            answered: true,
            studentAnswer: "x",
            status: "maybe",
            confidence: 0.5,
          },
        ],
      }),
    ).toThrow(/status/);
  });
});

describe("HomeworkVisionService MOCK vs REAL", () => {
  it("MOCK=true returns fixed mock and does not call provider", async () => {
    setHomeworkVisionUseMock(true);
    const { provider, analyzeHomework } =
      createTrackingProvider(VALID_MOCK_JSON);
    const service = new HomeworkVisionService(provider);

    const result = await service.analyze({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });

    expect(analyzeHomework).not.toHaveBeenCalled();
    expect(result.assignment).toEqual(HOMEWORK_VISION_MOCK_PAYLOAD.assignment);
    expect(result.questions[0]?.studentAnswer).toBe("apple");
    expect(result.provider.model).toBe("gemini-2.5-flash");
    expect(isHomeworkVisionUseMock()).toBe(true);
  });

  it("MOCK=false calls provider then validateRaw + mapToResult", async () => {
    setHomeworkVisionUseMock(false);
    const providerRaw = {
      ...VALID_MOCK_JSON,
      assignment: {
        ...VALID_MOCK_JSON.assignment,
        subject: "Math",
        totalQuestions: 2,
      },
      questions: VALID_MOCK_JSON.questions.slice(0, 2),
      photoQuality: "poor",
      confidence: 0.55,
    };
    const { provider, analyzeHomework } =
      createTrackingProvider(providerRaw);
    const service = new HomeworkVisionService(provider);

    const images = [{ mimeType: "image/jpeg", base64: "dGVzdA==" }];
    const result = await service.analyze({ images });

    expect(analyzeHomework).toHaveBeenCalledTimes(1);
    expect(analyzeHomework).toHaveBeenCalledWith({ images });
    expect(result.assignment.subject).toBe("Math");
    expect(result.assignment.totalQuestions).toBe(2);
    expect(result.photoQuality).toBe("poor");
    expect(result.confidence).toBe(0.55);
    expect(result.provider).toEqual({
      provider: "google",
      name: "google",
      model: "gemini-2.5-flash",
      version: HOMEWORK_VISION_SCHEMA_VERSION,
      latency: expect.any(Number),
      retryCount: 0,
      fallbackUsed: false,
      providerRetryCount: 0,
      usage: null,
    });
    expect(result.provider.latency).toBeGreaterThanOrEqual(0);
  });

  it("can switch back to MOCK after REAL", async () => {
    const { provider, analyzeHomework } =
      createTrackingProvider(VALID_MOCK_JSON);
    const service = new HomeworkVisionService(provider);

    setHomeworkVisionUseMock(false);
    await service.analyze({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });
    expect(analyzeHomework).toHaveBeenCalledTimes(1);

    setHomeworkVisionUseMock(true);
    await service.analyze({
      images: [{ mimeType: "image/jpeg", base64: "dGVzdA==" }],
    });
    expect(analyzeHomework).toHaveBeenCalledTimes(1);
    expect(isHomeworkVisionUseMock()).toBe(true);
  });
});
