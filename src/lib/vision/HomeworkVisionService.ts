/**
 * HomeworkVisionService — Eyes orchestration.
 *
 * Responsibilities (only):
 * 1. Call VisionProvider (REAL mode; may be PriorityVisionProvider with fallback)
 * 2. Schema validate
 * 3. Map → HomeworkVisionResult (stamp provider metadata)
 *
 * Must NOT: OCR, coverage, analysisScope, merge, regex question numbers,
 * local handwriting inference, or missingQuestions calculation.
 *
 * Mode switch (HOMEWORK_VISION_USE_MOCK):
 * - true  → fixed mock result; VisionProvider is never called
 * - false → provider.analyzeHomework → validateRaw → mapToResult
 *
 * Toggle with setHomeworkVisionUseMock(true|false). Default is MOCK=false (REAL).
 */

import type { VisionProvider } from "@/lib/vision/VisionProvider";
import { getVisionCallMeta, getVisionTokenUsage } from "@/lib/vision/VisionProvider";
import {
  HomeworkVisionSchemaError,
  parseHomeworkVisionModelPayload,
} from "@/lib/vision/homeworkVisionSchema";
import { logEyesProviderDevSummary } from "@/lib/vision/eyesProviderLog";
import type {
  HomeworkVisionAnalyzeInput,
  HomeworkVisionModelPayload,
  HomeworkVisionResult,
} from "@/lib/vision/types";
import { HOMEWORK_VISION_SCHEMA_VERSION } from "@/lib/vision/types";

export { HomeworkVisionSchemaError };

let homeworkVisionUseMock = false;

/**
 * MOCK ↔ REAL switch for Homework Vision.
 * Default: false (REAL — calls VisionProvider via priority / fallback).
 * Set true to return fixed mock without calling providers.
 */
export function isHomeworkVisionUseMock(): boolean {
  return homeworkVisionUseMock;
}

/** Flip MOCK/REAL. Pass true anytime to return to mock (no provider call). */
export function setHomeworkVisionUseMock(enabled: boolean): void {
  homeworkVisionUseMock = enabled;
}

/**
 * Retained flag name. Prefer isHomeworkVisionUseMock() / setHomeworkVisionUseMock().
 * `.enabled` mirrors the switch (assignable for tests and local flips).
 */
export const HOMEWORK_VISION_USE_MOCK = {
  get enabled(): boolean {
    return homeworkVisionUseMock;
  },
  set enabled(value: boolean) {
    homeworkVisionUseMock = value;
  },
};

/** Fixed model payload for MOCK mode (no API call). */
export const HOMEWORK_VISION_MOCK_PAYLOAD: HomeworkVisionModelPayload = {
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
  missingSections: ["bottom of page (mock)"],
  photoQuality: "good",
  confidence: 0.88,
};

export class HomeworkVisionService {
  constructor(private readonly provider: VisionProvider) {}

  /**
   * Eyes entry:
   * MOCK → fixed HomeworkVisionResult (provider skipped)
   * REAL → provider.analyzeHomework → validateRaw → mapToResult (+ call meta)
   */
  async analyze(
    input: HomeworkVisionAnalyzeInput,
  ): Promise<HomeworkVisionResult> {
    if (!input.images.length) {
      throw new Error(
        "HomeworkVisionService.analyze requires at least one image.",
      );
    }

    // --- MOCK mode ---
    if (isHomeworkVisionUseMock()) {
      const mocked = this.mapToResult(
        this.validateRaw(HOMEWORK_VISION_MOCK_PAYLOAD),
      );
      return {
        ...mocked,
        provider: {
          ...mocked.provider,
          name: mocked.provider.provider,
          latency: 0,
          retryCount: 0,
          fallbackUsed: false,
          providerRetryCount: 0,
        },
      };
    }

    // --- REAL mode ---
    const started = Date.now();
    const raw = await this.provider.analyzeHomework(input);
    const serviceLatency = Date.now() - started;
    const validated = this.validateRaw(raw);
    const mapped = this.mapToResult(validated);
    const callMeta = getVisionCallMeta(this.provider);
    const usage = callMeta?.usage ?? getVisionTokenUsage(this.provider);
    const result: HomeworkVisionResult = !callMeta
      ? {
          ...mapped,
          provider: {
            ...mapped.provider,
            name: mapped.provider.provider,
            latency: serviceLatency,
            retryCount: mapped.provider.retryCount ?? 0,
            fallbackUsed: mapped.provider.fallbackUsed ?? false,
            providerRetryCount: mapped.provider.providerRetryCount ?? 0,
            usage,
          },
        }
      : {
          ...mapped,
          provider: {
            ...mapped.provider,
            provider: callMeta.provider,
            name: callMeta.name,
            model: callMeta.model,
            // Prefer PriorityVisionProvider wall-clock (includes retries/fallback).
            latency: callMeta.latency > 0 ? callMeta.latency : serviceLatency,
            retryCount: callMeta.retryCount,
            fallbackUsed: callMeta.fallbackUsed,
            providerRetryCount: callMeta.providerRetryCount,
            usage,
          },
        };

    logEyesProviderDevSummary(result);
    return result;
  }

  /**
   * Validate provider JSON (object or string). Returns normalized model payload.
   * Does not stamp provider metadata and does not call any API.
   */
  validateRaw(raw: unknown): HomeworkVisionModelPayload {
    return parseHomeworkVisionModelPayload(raw);
  }

  /**
   * Map validated payload → HomeworkVisionResult.
   * Stamps provider / model / schema version from this service's VisionProvider.
   * Does not re-infer questions, totals, or coverage.
   */
  mapToResult(validated: HomeworkVisionModelPayload): HomeworkVisionResult {
    return {
      assignment: validated.assignment,
      questions: validated.questions,
      missingSections: validated.missingSections,
      photoQuality: validated.photoQuality,
      confidence: validated.confidence,
      provider: {
        provider: this.provider.info.provider,
        model: this.provider.info.model,
        version: HOMEWORK_VISION_SCHEMA_VERSION,
      },
    };
  }

  /** Schema / prompt contract version stamped on every result. */
  get schemaVersion(): string {
    return HOMEWORK_VISION_SCHEMA_VERSION;
  }
}
