import { describe, expect, it } from "vitest";

import {
  computeAutoZoomRegion,
  computeContentAwareAutoZoomRegion,
  evaluateAutoZoomTrigger,
  getLastClearQuestionNumber,
  isAutoZoomExperimentEnabled,
  mergeAutoZoomResults,
  AUTO_ZOOM_FACTOR,
} from "@/lib/ocrAutoZoomExperiment";

describe("OCR Auto Zoom Experiment — evaluateAutoZoomTrigger", () => {
  it("triggers on condition 1: issues on the last three question numbers (10/11/12)", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 12,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      questionsWithIssues: [
        { questionNumber: 10, issueType: "readability" },
        { questionNumber: 11, issueType: "readability" },
        { questionNumber: 12, issueType: "readability" },
      ],
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.reasons).toContain("issues-on-last-three");
  });

  it("triggers on condition 1 with 11/12/13 pattern", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 13,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      questionsWithIssues: [
        { questionNumber: 11, issueType: "readability" },
        { questionNumber: 12, issueType: "readability" },
        { questionNumber: 13, issueType: "readability" },
      ],
    });
    expect(decision.reasons).toContain("issues-on-last-three");
  });

  it("triggers on condition 2: estimatedTotalQuestions > max(clearlyVisible)", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 13,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      questionsWithIssues: [],
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.reasons).toContain("estimated-total-exceeds-visible-max");
  });

  it("triggers on condition 3: last question is low confidence (missing from clearlyVisible)", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 10,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      questionsWithIssues: [],
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.reasons).toContain("last-question-low-confidence");
  });

  it("triggers on condition 3 when the last question is flagged as an issue", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 10,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      questionsWithIssues: [{ questionNumber: 10, issueType: "blur" }],
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.reasons).toContain("last-question-low-confidence");
  });

  it("does NOT trigger when everything up to the total is clearly visible and no issues", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 10,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      questionsWithIssues: [],
    });
    expect(decision.shouldTrigger).toBe(false);
    expect(decision.reasons).toEqual([]);
  });

  it("does NOT trigger on an early-question issue far from the end (not last three)", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 10,
      questionsClearlyVisible: [1, 3, 4, 5, 6, 7, 8, 9, 10],
      questionsWithIssues: [{ questionNumber: 2, issueType: "glare" }],
    });
    expect(decision.shouldTrigger).toBe(false);
  });

  it("handles estimatedTotalQuestions === 0 without throwing", () => {
    const decision = evaluateAutoZoomTrigger({
      estimatedTotalQuestions: 0,
      questionsClearlyVisible: [],
      questionsWithIssues: [],
    });
    expect(decision.shouldTrigger).toBe(false);
  });
});

describe("OCR Auto Zoom Experiment — computeAutoZoomRegion", () => {
  it("prefers bottom-right: last 40% height x right 60% width for a normal photo", () => {
    const region = computeAutoZoomRegion(3120, 4160);
    expect(region.strategy).toBe("bottom-right");
    expect(region.height).toBe(Math.round(4160 * 0.4));
    expect(region.y).toBe(4160 - region.height);
    expect(region.width).toBe(Math.round(3120 * 0.6));
    expect(region.x).toBe(3120 - region.width);
    // Region must stay fully inside the image bounds.
    expect(region.x + region.width).toBeLessThanOrEqual(3120);
    expect(region.y + region.height).toBeLessThanOrEqual(4160);
  });

  it("falls back to bottom-half when the image is too narrow for a bottom-right crop", () => {
    const region = computeAutoZoomRegion(10, 4160);
    expect(region.strategy).toBe("bottom-half");
    expect(region.x).toBe(0);
    expect(region.width).toBe(10);
  });

  it("never returns a negative or zero-sized region for a tiny image", () => {
    const region = computeAutoZoomRegion(30, 30);
    expect(region.width).toBeGreaterThan(0);
    expect(region.height).toBeGreaterThan(0);
    expect(region.x).toBeGreaterThanOrEqual(0);
    expect(region.y).toBeGreaterThanOrEqual(0);
  });

  it("zoom factor is fixed at 2x per the experiment spec", () => {
    expect(AUTO_ZOOM_FACTOR).toBe(2);
  });
});

describe("OCR Auto Zoom Experiment — getLastClearQuestionNumber", () => {
  it("returns the max of questionsClearlyVisible (e.g. 1..9 -> 9)", () => {
    expect(
      getLastClearQuestionNumber({
        questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      }),
    ).toBe(9);
  });

  it("is order-independent", () => {
    expect(
      getLastClearQuestionNumber({ questionsClearlyVisible: [9, 3, 7, 1] }),
    ).toBe(9);
  });

  it("returns null when nothing is clearly visible", () => {
    expect(
      getLastClearQuestionNumber({ questionsClearlyVisible: [] }),
    ).toBeNull();
  });
});

describe("OCR Auto Zoom Experiment — computeContentAwareAutoZoomRegion", () => {
  it("crops from the anchor question's estimated Y position down to the bottom of the photo (full width)", () => {
    // Q9 estimated at 41% down a 3120x4160 photo (Photo 3's real position).
    const region = computeContentAwareAutoZoomRegion(3120, 4160, 9, 0.41);
    expect(region.strategy).toBe("content-aware-from-last-clear-question");
    expect(region.anchorQuestionNumber).toBe(9);
    expect(region.x).toBe(0);
    expect(region.width).toBe(3120);
    expect(region.y).toBe(Math.round(4160 * 0.41));
    expect(region.height).toBe(4160 - region.y);
    // Must reach exactly the bottom of the photo ("往下裁切直到頁尾").
    expect(region.y + region.height).toBe(4160);
  });

  it("does NOT use a fixed percentage — the crop height tracks whatever Y fraction is given", () => {
    const shallow = computeContentAwareAutoZoomRegion(1000, 1000, 9, 0.9);
    const deep = computeContentAwareAutoZoomRegion(1000, 1000, 9, 0.1);
    expect(shallow.height).toBeLessThan(deep.height);
  });

  it("clamps a Y fraction >= 1 so the region never collapses to zero height", () => {
    const region = computeContentAwareAutoZoomRegion(1000, 1000, 9, 1.2);
    expect(region.height).toBeGreaterThan(0);
    expect(region.y).toBeLessThan(1000);
  });

  it("clamps a negative Y fraction to the top of the photo", () => {
    const region = computeContentAwareAutoZoomRegion(1000, 2000, 9, -0.3);
    expect(region.y).toBe(0);
    expect(region.height).toBe(2000);
  });
});

describe("OCR Auto Zoom Experiment — mergeAutoZoomResults", () => {
  it("unions pass 1 [7..12] with pass 2 [11,12,13] into [7..13] (the user's worked example)", () => {
    const merged = mergeAutoZoomResults({
      first: {
        estimatedTotalQuestions: 12,
        questionsClearlyVisible: [7, 8, 9, 10, 11, 12],
        questionsWithIssues: [],
      },
      second: {
        questionsClearlyVisible: [11, 12, 13],
        questionsWithIssues: [],
      },
    });
    expect(merged.questionsClearlyVisible).toEqual([
      7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(merged.recoveredQuestions).toEqual([13]);
  });

  it("clear evidence from pass 2 removes a matching issue flag from pass 1", () => {
    const merged = mergeAutoZoomResults({
      first: {
        estimatedTotalQuestions: 12,
        questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        questionsWithIssues: [
          { questionNumber: 10, issueType: "readability" },
          { questionNumber: 11, issueType: "readability" },
          { questionNumber: 12, issueType: "readability" },
        ],
      },
      second: {
        questionsClearlyVisible: [11, 12],
        questionsWithIssues: [{ questionNumber: 13, issueType: "crop" }],
      },
    });
    expect(merged.questionsClearlyVisible).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12,
    ]);
    expect(merged.recoveredQuestions).toEqual([11, 12]);
    expect(merged.questionsWithIssues).toEqual([
      { questionNumber: 10, issueType: "readability" },
      { questionNumber: 13, issueType: "crop" },
    ]);
  });

  it("recoveredQuestions is empty when pass 2 adds nothing new", () => {
    const merged = mergeAutoZoomResults({
      first: {
        estimatedTotalQuestions: 10,
        questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        questionsWithIssues: [],
      },
      second: {
        questionsClearlyVisible: [8, 9, 10],
        questionsWithIssues: [],
      },
    });
    expect(merged.recoveredQuestions).toEqual([]);
    expect(merged.questionsClearlyVisible).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });
});

describe("OCR Auto Zoom Experiment — feature flag", () => {
  it("is disabled by default (flag absent)", () => {
    expect(isAutoZoomExperimentEnabled({})).toBe(false);
  });

  it("is disabled for any value other than the literal string \"1\"", () => {
    expect(isAutoZoomExperimentEnabled({ OCR_AUTO_ZOOM_EXPERIMENT: "true" })).toBe(
      false,
    );
  });

  it("is enabled only when OCR_AUTO_ZOOM_EXPERIMENT=\"1\"", () => {
    expect(
      isAutoZoomExperimentEnabled({ OCR_AUTO_ZOOM_EXPERIMENT: "1" }),
    ).toBe(true);
  });
});
