import { describe, expect, it } from "vitest";

import {
  listEyesQualitySampleIds,
  loadAllEyesQualitySamples,
  loadEyesQualityBaselines,
  resolveEyesQualityRoot,
} from "@/lib/vision/quality/dataset";
import {
  EYES_QUALITY_DIFFICULTIES,
  EYES_QUALITY_IMAGE_TAGS,
} from "@/lib/vision/quality/constants";

describe("AI Quality Platform dataset integrity", () => {
  const root = resolveEyesQualityRoot();

  it("has multiple permanent samples and valid baselines", () => {
    const ids = listEyesQualitySampleIds(root);
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(ids).toContain("001_three_photo_fill_blank");
    expect(ids).toContain("002_photo1_q1_end");
    expect(ids).toContain("003_photo2_q9_picture");
    expect(ids).toContain("004_photo3_blank_page");

    const baselines = loadEyesQualityBaselines(root);
    expect(baselines.version).toBeTruthy();
    expect(baselines.providers.gemini).toBeTruthy();
    expect(baselines.providers.openai).toBeTruthy();
    expect(baselines.maxLatencyMsAvg).toBeGreaterThan(0);
  });

  it("loads every sample with metadata + photos", () => {
    const samples = loadAllEyesQualitySamples(root, { enabledOnly: false });
    expect(samples.length).toBe(listEyesQualitySampleIds(root).length);

    for (const sample of samples) {
      const e = sample.expected;
      expect(sample.photoPaths.length).toBe(e.photos.length);
      expect(e.sampleId).toBe(e.id);
      expect(e.subject).toBeTruthy();
      expect(e.grade).toBeTruthy();
      expect(e.language).toBeTruthy();
      expect(
        (EYES_QUALITY_DIFFICULTIES as readonly string[]).includes(e.difficulty),
      ).toBe(true);
      expect(e.imageQuality.length).toBeGreaterThan(0);
      for (const tag of e.imageQuality) {
        expect(
          (EYES_QUALITY_IMAGE_TAGS as readonly string[]).includes(tag),
        ).toBe(true);
      }
      expect(e.expectedQuestionCount).toBeGreaterThan(0);
      expect(e.expectedOverview.length).toBeGreaterThan(0);

      const answered = new Set(
        e.expectedAnswers
          .filter((a) => a.studentAnswer != null && a.studentAnswer.trim() !== "")
          .map((a) => a.questionNumber),
      );
      for (const blank of e.expectedBlanks) {
        expect(answered.has(blank)).toBe(false);
      }
    }
  });
});
