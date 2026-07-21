import { describe, expect, it } from "vitest";

import { splitTutorSentences } from "@/lib/tts/client/splitTutorSentences";
import {
  isImmediateTutorTtsRetryable,
  isTtsAttemptTimeoutError,
  isTutorTtsPurpose,
} from "@/lib/tts/ttsFallbackErrors";

describe("splitTutorSentences", () => {
  it("splits on English sentence endings", () => {
    expect(
      splitTutorSentences(
        "Taiwan is an island. Taipei is the capital. What do you want to know?",
      ),
    ).toEqual([
      "Taiwan is an island.",
      "Taipei is the capital.",
      "What do you want to know?",
    ]);
  });

  it("returns a single chunk when there is one sentence", () => {
    expect(splitTutorSentences("Hello there!")).toEqual(["Hello there!"]);
  });
});

describe("tutor TTS retry policy helpers", () => {
  it("detects attempt timeout errors", () => {
    expect(
      isTtsAttemptTimeoutError(
        new Error("PriorityTtsProvider:openai: timed out after 8000ms"),
      ),
    ).toBe(true);
  });

  it("does not retry long timeouts", () => {
    expect(
      isImmediateTutorTtsRetryable(
        new Error("PriorityTtsProvider:openai: timed out after 8000ms"),
        8000,
      ),
    ).toBe(false);
  });

  it("retries immediate 429 within 2s", () => {
    expect(
      isImmediateTutorTtsRetryable(new Error("HTTP 429 rate limit"), 400),
    ).toBe(true);
  });

  it("detects tutor purposes", () => {
    expect(isTutorTtsPurpose("tutor_reply")).toBe(true);
    expect(isTutorTtsPurpose("welcome")).toBe(false);
  });
});
