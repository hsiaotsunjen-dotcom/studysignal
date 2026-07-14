/**
 * One-shot REAL mode smoke test for Homework Vision.
 * Loads GEMINI_API_KEY from .env.local (never printed).
 * Uses tests/golden/001_complete/photo1.jpg.
 *
 * Retry: up to 5 attempts, 5s between failures (Gemini high-demand).
 * Does not change Vision / schema / validate / map logic.
 */
import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createHomeworkVisionProviderFromEnv,
  GEMINI_VISION_MODEL,
} from "@/lib/vision";
import {
  HomeworkVisionService,
  isHomeworkVisionUseMock,
  setHomeworkVisionUseMock,
} from "@/lib/vision/HomeworkVisionService";

function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const PHOTO_PATH = path.resolve(
  process.cwd(),
  "tests/golden/001_complete/photo1.jpg",
);

const MAX_PROVIDER_ATTEMPTS = 5;
const RETRY_WAIT_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Smoke-test-only diagnostic: one Generate Content call to print the full
 * HTTP JSON body after retries are exhausted. Does not alter VisionProvider.
 */
async function fetchLastGeminiHttpResponse(input: {
  apiKey: string;
  mimeType: string;
  base64: string;
}): Promise<{ httpStatus: number; body: unknown }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": input.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inline_data: {
                mime_type: input.mimeType,
                data: input.base64,
              },
            },
            {
              text: "Return a minimal JSON object: {\"ok\":true}",
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });
  const body: unknown = await res.json().catch(async () => ({
    rawText: await res.text().catch(() => "(unreadable body)"),
  }));
  return { httpStatus: res.status, body };
}

describe("Homework Vision REAL smoke", () => {
  afterEach(() => {
    // Leave process in a known state for other test files in the same run.
    setHomeworkVisionUseMock(false);
  });

  it(
    "Student image → Gemini → validateRaw → mapToResult → HomeworkVisionResult",
    async () => {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      expect(apiKey, "GEMINI_API_KEY must be set in .env.local").toBeTruthy();
      expect(fs.existsSync(PHOTO_PATH), `missing ${PHOTO_PATH}`).toBe(true);

      setHomeworkVisionUseMock(false);
      expect(isHomeworkVisionUseMock()).toBe(false);

      const base64 = fs.readFileSync(PHOTO_PATH).toString("base64");
      const images = [{ mimeType: "image/jpeg" as const, base64 }];

      const provider = createHomeworkVisionProviderFromEnv();
      const service = new HomeworkVisionService(provider);
      console.log("===== REAL MODE =====");
      console.log("mock:", isHomeworkVisionUseMock());
      console.log("priority provider start:", provider.info.model);
      console.log("photo:", PHOTO_PATH);
      console.log("base64 length:", base64.length);
      console.log(
        `retry: max ${MAX_PROVIDER_ATTEMPTS} attempts, wait ${RETRY_WAIT_MS}ms`,
      );

      let result: Awaited<ReturnType<HomeworkVisionService["analyze"]>> | undefined;
      let lastProviderError: unknown;

      for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt++) {
        console.log(
          `===== analyze attempt ${attempt}/${MAX_PROVIDER_ATTEMPTS} =====`,
        );
        try {
          result = await service.analyze({ images });
          console.log("===== HomeworkVisionResult =====");
          console.log(JSON.stringify(result, null, 2));
          console.log("===== provider meta =====");
          console.log(JSON.stringify(result.provider, null, 2));
          lastProviderError = undefined;
          break;
        } catch (err) {
          lastProviderError = err;
          console.log(
            `===== analyze FAILED attempt ${attempt}/${MAX_PROVIDER_ATTEMPTS} =====`,
          );
          console.log(err instanceof Error ? err.message : err);

          if (attempt < MAX_PROVIDER_ATTEMPTS) {
            console.log(`waiting ${RETRY_WAIT_MS}ms before retry...`);
            await sleep(RETRY_WAIT_MS);
            continue;
          }

          console.log(
            "===== LAST Gemini HTTP response (diagnostic after retries) =====",
          );
          try {
            const lastHttp = await fetchLastGeminiHttpResponse({
              apiKey: apiKey!,
              mimeType: "image/jpeg",
              base64,
            });
            console.log("httpStatus:", lastHttp.httpStatus);
            console.log(JSON.stringify(lastHttp.body, null, 2));
          } catch (diagErr) {
            console.log("===== diagnostic fetch FAILED =====");
            console.log(diagErr instanceof Error ? diagErr.message : diagErr);
          }

          console.log("===== last provider error =====");
          console.log(
            lastProviderError instanceof Error
              ? lastProviderError.stack || lastProviderError.message
              : lastProviderError,
          );
          throw lastProviderError;
        }
      }

      expect(result).toBeDefined();
      const finalResult = result!;

      // validateRaw / mapToResult already ran inside analyze(); re-check shape.
      expect(Array.isArray(finalResult.questions)).toBe(true);
      expect(finalResult.assignment.totalQuestions).toBeGreaterThanOrEqual(0);
      expect(["good", "fair", "poor"]).toContain(finalResult.photoQuality);
      expect(finalResult.provider.model).toBeTruthy();
      expect(typeof finalResult.provider.fallbackUsed).toBe("boolean");
      console.log("===== raw/validate/map via analyze: OK =====");
      console.log("fallbackUsed:", finalResult.provider.fallbackUsed);
      console.log("model:", finalResult.provider.model);
      void GEMINI_VISION_MODEL;
    },
    600_000,
  );
});
