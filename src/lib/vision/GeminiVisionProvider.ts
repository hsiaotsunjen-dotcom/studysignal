/**
 * GeminiVisionProvider — Eyes provider for Gemini Vision (Generate Content).
 *
 * Model is fixed: gemini-3.5-flash (current Google AI Studio Flash vision model;
 * gemini-2.5-flash is no longer available to new API users).
 * Uses Google Generative Language REST API (same fetch style as OpenAI
 * routes in this repo). No npm AI SDK — none is installed for Gemini.
 *
 * Returns raw provider JSON only. Schema validate / map belong in
 * HomeworkVisionService (not done here).
 */

import type {
  VisionProvider,
  VisionProviderInfo,
  VisionProviderRawResult,
  VisionProviderWithUsage,
  VisionTokenUsage,
} from "@/lib/vision/VisionProvider";
import type {
  HomeworkVisionAnalyzeInput,
  HomeworkVisionImageInput,
} from "@/lib/vision/types";

export const GEMINI_VISION_PROVIDER = "google";
export const GEMINI_VISION_MODEL = "gemini-3.5-flash";

const GEMINI_GENERATE_CONTENT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`;

const GEMINI_VISION_INFO: VisionProviderInfo = {
  id: "gemini",
  provider: GEMINI_VISION_PROVIDER,
  model: GEMINI_VISION_MODEL,
};

/**
 * Eyes-only instructions. Brain (tutoring / marking) is out of scope.
 * Full prompt polish is a later step; shape must match HomeworkVisionModelPayload.
 */
const HOMEWORK_VISION_PROMPT = `You are the Eyes of StudySignal. Analyze the homework photo(s) and return ONLY one JSON object (no markdown).

Rules:
1. Decide whether all photos belong to the same assignment (sameAssignment).
2. Understand multiple photos together as one worksheet when possible.
3. Find every question you can see; set assignment.totalQuestions.
4. For each question: number, answered, studentAnswer, status, confidence.
5. status must be "answered" | "blank" | "not_visible".
6. If content is not visible, use status "not_visible", answered false, studentAnswer null — do not guess.
7. Blank questions: answered false, status "blank", studentAnswer null.
8. List unreadable / off-frame regions in missingSections (strings).
9. photoQuality must be "good" | "fair" | "poor".
10. Provide per-question confidence and overall confidence in 0–1.
11. Do not invent content that is not in the photos.
12. Do not grade, teach, or write a tutor report — visibility and answers only.

JSON shape:
{
  "assignment": {
    "subject": "string",
    "type": "string",
    "totalQuestions": 0,
    "sameAssignment": true
  },
  "questions": [
    {
      "number": 1,
      "answered": true,
      "studentAnswer": "string or null",
      "status": "answered",
      "confidence": 0.98
    }
  ],
  "missingSections": [],
  "photoQuality": "good",
  "confidence": 0.9
}`;

type GeminiInlinePart = {
  inline_data: {
    mime_type: string;
    data: string;
  };
};

type GeminiTextPart = { text: string };

type GeminiPart = GeminiInlinePart | GeminiTextPart;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
    status?: string;
  };
};

function stripDataUrlPrefix(base64: string): string {
  const trimmed = base64.trim();
  const marker = ";base64,";
  const idx = trimmed.indexOf(marker);
  if (trimmed.startsWith("data:") && idx !== -1) {
    return trimmed.slice(idx + marker.length);
  }
  return trimmed;
}

function toInlinePart(image: HomeworkVisionImageInput): GeminiInlinePart {
  return {
    inline_data: {
      mime_type: image.mimeType || "image/jpeg",
      data: stripDataUrlPrefix(image.base64),
    },
  };
}

function extractTextFromGeminiResponse(
  data: GeminiGenerateContentResponse,
): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
  if (!text) {
    throw new Error(
      "GeminiVisionProvider: empty model response (no text parts).",
    );
  }
  return text;
}

/**
 * Parse model text into a raw JSON value.
 * Does not validate against HomeworkVisionResult schema.
 */
function parseRawJsonPayload(text: string): VisionProviderRawResult {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(jsonText) as VisionProviderRawResult;
  } catch {
    throw new Error(
      "GeminiVisionProvider: model response is not valid JSON.",
    );
  }
}

export class GeminiVisionProvider implements VisionProviderWithUsage {
  readonly info: VisionProviderInfo = GEMINI_VISION_INFO;
  lastUsage: VisionTokenUsage | null = null;

  /**
   * Send all worksheet photos to Gemini Vision (gemini-3.5-flash) in one request.
   * Returns raw JSON only — no schema validate, no mapping.
   */
  async analyzeHomework(
    input: HomeworkVisionAnalyzeInput,
  ): Promise<VisionProviderRawResult> {
    this.lastUsage = null;
    if (!input.images.length) {
      throw new Error(
        "GeminiVisionProvider.analyzeHomework requires at least one image.",
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "GeminiVisionProvider: GEMINI_API_KEY is not set.",
      );
    }

    const parts: GeminiPart[] = [
      ...input.images.map(toInlinePart),
      { text: HOMEWORK_VISION_PROMPT },
    ];

    let geminiRes: Response;
    try {
      geminiRes = await fetch(GEMINI_GENERATE_CONTENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `GeminiVisionProvider: fetch error / network error — ${message}`,
      );
    }

    const rawBody = (await geminiRes.json()) as GeminiGenerateContentResponse;

    if (!geminiRes.ok) {
      const detail =
        rawBody.error?.message ||
        rawBody.error?.status ||
        `HTTP ${geminiRes.status}`;
      throw new Error(
        `GeminiVisionProvider: Gemini request failed — HTTP ${geminiRes.status}: ${detail}`,
      );
    }

    if (rawBody.error?.message) {
      throw new Error(
        `GeminiVisionProvider: Gemini error — ${rawBody.error.message}`,
      );
    }

    const u = rawBody.usageMetadata;
    if (u) {
      this.lastUsage = {
        promptTokens:
          typeof u.promptTokenCount === "number" ? u.promptTokenCount : null,
        completionTokens:
          typeof u.candidatesTokenCount === "number"
            ? u.candidatesTokenCount
            : null,
        totalTokens:
          typeof u.totalTokenCount === "number" ? u.totalTokenCount : null,
      };
    }

    const text = extractTextFromGeminiResponse(rawBody);
    return parseRawJsonPayload(text);
  }
}
