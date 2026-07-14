/**
 * OpenAIVisionProvider — Eyes provider for OpenAI Vision (gpt-4o-mini).
 *
 * Model is fixed: gpt-4o-mini (matches StudySignal Tutor / analyze OpenAI model).
 * Returns raw JSON only — no schema validate / map.
 */

import type {
  VisionProvider,
  VisionProviderInfo,
  VisionProviderRawResult,
} from "@/lib/vision/VisionProvider";
import type {
  HomeworkVisionAnalyzeInput,
  HomeworkVisionImageInput,
} from "@/lib/vision/types";

export const OPENAI_VISION_PROVIDER = "openai";
export const OPENAI_VISION_MODEL = "gpt-4o-mini";

const OPENAI_CHAT_COMPLETIONS = "https://api.openai.com/v1/chat/completions";

const OPENAI_VISION_INFO: VisionProviderInfo = {
  id: "openai",
  provider: OPENAI_VISION_PROVIDER,
  model: OPENAI_VISION_MODEL,
};

/** Same Eyes JSON contract as GeminiVisionProvider (prompt text not changed there). */
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

function stripDataUrlPrefix(base64: string): string {
  const trimmed = base64.trim();
  const marker = ";base64,";
  const idx = trimmed.indexOf(marker);
  if (trimmed.startsWith("data:") && idx !== -1) {
    return trimmed.slice(idx + marker.length);
  }
  return trimmed;
}

function toImageUrlPart(image: HomeworkVisionImageInput): {
  type: "image_url";
  image_url: { url: string };
} {
  const data = stripDataUrlPrefix(image.base64);
  const mime = image.mimeType || "image/jpeg";
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${data}` },
  };
}

function parseRawJsonPayload(text: string): VisionProviderRawResult {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(jsonText) as VisionProviderRawResult;
  } catch {
    throw new Error(
      "OpenAIVisionProvider: model response is not valid JSON.",
    );
  }
}

export class OpenAIVisionProvider implements VisionProvider {
  readonly info: VisionProviderInfo = OPENAI_VISION_INFO;

  async analyzeHomework(
    input: HomeworkVisionAnalyzeInput,
  ): Promise<VisionProviderRawResult> {
    if (!input.images.length) {
      throw new Error(
        "OpenAIVisionProvider.analyzeHomework requires at least one image.",
      );
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OpenAIVisionProvider: OPENAI_API_KEY is not set.");
    }

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      { type: "text", text: HOMEWORK_VISION_PROMPT },
      ...input.images.map(toImageUrlPart),
    ];

    let openaiRes: Response;
    try {
      openaiRes = await fetch(OPENAI_CHAT_COMPLETIONS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_VISION_MODEL,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: HOMEWORK_VISION_PROMPT },
            { role: "user", content: userContent },
          ],
          temperature: 0.2,
          max_tokens: 8192,
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `OpenAIVisionProvider: fetch error / network error — ${message}`,
      );
    }

    const rawBody = (await openaiRes.json()) as {
      error?: { message?: string; code?: string; type?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!openaiRes.ok) {
      const detail =
        rawBody.error?.message ||
        rawBody.error?.code ||
        `HTTP ${openaiRes.status}`;
      throw new Error(
        `OpenAIVisionProvider: OpenAI request failed — HTTP ${openaiRes.status}: ${detail}`,
      );
    }

    const text = rawBody.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      throw new Error(
        "OpenAIVisionProvider: empty model response (no content).",
      );
    }
    return parseRawJsonPayload(text);
  }
}
