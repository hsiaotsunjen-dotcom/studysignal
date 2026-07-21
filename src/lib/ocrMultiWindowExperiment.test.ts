import { describe, expect, it } from "vitest";

import {
  MULTI_WINDOW_DEFINITIONS,
  MULTI_WINDOW_ZOOM_FACTOR,
  computeAllWindowRegions,
  computeWindowRegion,
  evaluateMultiWindowTrigger,
  isMultiWindowExperimentEnabled,
  mergeMultiWindowResults,
} from "@/lib/ocrMultiWindowExperiment";

describe("OCR Multi-Window Experiment — evaluateMultiWindowTrigger (AND, not OR)", () => {
  it("triggers when BOTH conditions hold: total > visibleMax AND last 3 are all low confidence", () => {
    const decision = evaluateMultiWindowTrigger({
      estimatedTotalQuestions: 12,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      questionsWithIssues: [
        { questionNumber: 10, issueType: "readability" },
        { questionNumber: 11, issueType: "readability" },
        { questionNumber: 12, issueType: "readability" },
      ],
    });
    expect(decision.shouldTrigger).toBe(true);
    expect(decision.reasons).toEqual([
      "estimated-total-exceeds-visible-max",
      "last-three-low-confidence",
    ]);
  });

  it("does NOT trigger when total > visibleMax but the last question IS clear (only condition 1 holds)", () => {
    const decision = evaluateMultiWindowTrigger({
      estimatedTotalQuestions: 10,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 10],
      questionsWithIssues: [],
    });
    // visibleMax = 10, total = 10 -> condition1 false (10 > 10 is false)
    expect(decision.shouldTrigger).toBe(false);
  });

  it("triggers when visibleMax is well below total and all of the last three are unclear", () => {
    const decision = evaluateMultiWindowTrigger({
      estimatedTotalQuestions: 9,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6],
      questionsWithIssues: [{ questionNumber: 7, issueType: "blur" }],
    });
    // visibleMax = 6, total = 9 -> condition1 true (9 > 6); last three = 9,8,7,
    // none clear -> condition2 true too -> overall trigger.
    expect(decision.shouldTrigger).toBe(true);
  });

  it("does NOT trigger when condition1 is false (total <= visibleMax), even with issues present", () => {
    const decision = evaluateMultiWindowTrigger({
      estimatedTotalQuestions: 9,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      questionsWithIssues: [],
    });
    // visibleMax = 9 = total -> condition1 false -> overall false regardless of condition2.
    expect(decision.shouldTrigger).toBe(false);
  });

  it("does NOT trigger when only ONE of the last three is low confidence (condition2 needs ALL three)", () => {
    const decision = evaluateMultiWindowTrigger({
      estimatedTotalQuestions: 12,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12],
      questionsWithIssues: [{ questionNumber: 10, issueType: "readability" }],
    });
    // visibleMax = 12 = total -> condition1 false already.
    expect(decision.shouldTrigger).toBe(false);
  });

  it("matches the real Photo 3 production scenario: [1..9] clear + issues on 10/11/12, total=12", () => {
    const decision = evaluateMultiWindowTrigger({
      estimatedTotalQuestions: 12,
      questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      questionsWithIssues: [
        { questionNumber: 10, issueType: "readability" },
        { questionNumber: 11, issueType: "readability" },
        { questionNumber: 12, issueType: "readability" },
      ],
    });
    expect(decision.shouldTrigger).toBe(true);
  });
});

describe("OCR Multi-Window Experiment — window definitions are fixed, not estimated", () => {
  it("defines exactly windows A (40~70%), B (55~85%), C (70~100%)", () => {
    expect(MULTI_WINDOW_DEFINITIONS).toEqual([
      { name: "A", startFraction: 0.4, endFraction: 0.7 },
      { name: "B", startFraction: 0.55, endFraction: 0.85 },
      { name: "C", startFraction: 0.7, endFraction: 1.0 },
    ]);
  });

  it("zoom factor is fixed at 2x", () => {
    expect(MULTI_WINDOW_ZOOM_FACTOR).toBe(2);
  });
});

describe("OCR Multi-Window Experiment — computeWindowRegion / computeAllWindowRegions", () => {
  it("computes window A as the top 40~70% band, full width, no position guessing", () => {
    const region = computeWindowRegion(3120, 4160, {
      name: "A",
      startFraction: 0.4,
      endFraction: 0.7,
    });
    expect(region.x).toBe(0);
    expect(region.width).toBe(3120);
    expect(region.y).toBe(Math.round(4160 * 0.4));
    expect(region.height).toBe(Math.round(4160 * 0.7) - Math.round(4160 * 0.4));
  });

  it("computes window C reaching exactly the bottom of the photo (70~100%)", () => {
    const region = computeWindowRegion(3120, 4160, {
      name: "C",
      startFraction: 0.7,
      endFraction: 1.0,
    });
    expect(region.y + region.height).toBe(4160);
  });

  it("computeAllWindowRegions returns 3 regions in A/B/C order, all overlapping vertically", () => {
    const regions = computeAllWindowRegions(3120, 4160);
    expect(regions.map((r) => r.name)).toEqual(["A", "B", "C"]);
    // A and B overlap (55~70% is shared); B and C overlap (70~85% shared).
    const [a, b, c] = regions;
    expect(a!.y + a!.height).toBeGreaterThan(b!.y); // A's bottom is past B's top -> overlap
    expect(b!.y + b!.height).toBeGreaterThan(c!.y); // B's bottom is past C's top -> overlap
  });

  it("never produces a zero-height region even for a tiny image", () => {
    const regions = computeAllWindowRegions(10, 10);
    for (const r of regions) {
      expect(r.height).toBeGreaterThan(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y + r.height).toBeLessThanOrEqual(10);
    }
  });
});

describe("OCR Multi-Window Experiment — mergeMultiWindowResults (union, never overwrite)", () => {
  it("the user's exact worked example: Pass1=1~9, A=9~11, B=10~12, C=11~13 -> merge = 1~13", () => {
    const range = (start: number, end: number) =>
      Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const merged = mergeMultiWindowResults({
      pass1: {
        estimatedTotalQuestions: 12,
        questionsClearlyVisible: range(1, 9),
        questionsWithIssues: [],
      },
      windows: [
        { name: "A", questionsClearlyVisible: range(9, 11), questionsWithIssues: [] },
        { name: "B", questionsClearlyVisible: range(10, 12), questionsWithIssues: [] },
        { name: "C", questionsClearlyVisible: range(11, 13), questionsWithIssues: [] },
      ],
    });

    expect(merged.questionsClearlyVisible).toEqual(range(1, 13));
    expect(merged.recoveredQuestions).toEqual([10, 11, 12, 13]);
  });

  it("is a true union — a question missed by one window but caught by another is still recovered", () => {
    const merged = mergeMultiWindowResults({
      pass1: {
        estimatedTotalQuestions: 13,
        questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        questionsWithIssues: [
          { questionNumber: 10, issueType: "readability" },
          { questionNumber: 11, issueType: "readability" },
          { questionNumber: 12, issueType: "readability" },
        ],
      },
      windows: [
        { name: "A", questionsClearlyVisible: [], questionsWithIssues: [] }, // A found nothing
        { name: "B", questionsClearlyVisible: [10, 11], questionsWithIssues: [] },
        { name: "C", questionsClearlyVisible: [13], questionsWithIssues: [] }, // only C found Q13
      ],
    });
    expect(merged.questionsClearlyVisible).toContain(13);
    expect(merged.recoveredQuestions).toEqual([10, 11, 13]);
    expect(merged.recoveredQuestionSources[13]).toEqual(["C"]);
  });

  it("never overwrites: clear evidence from ANY source beats an issue flag from pass1 or another window", () => {
    const merged = mergeMultiWindowResults({
      pass1: {
        estimatedTotalQuestions: 12,
        questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        questionsWithIssues: [{ questionNumber: 12, issueType: "readability" }],
      },
      windows: [
        { name: "A", questionsClearlyVisible: [], questionsWithIssues: [{ questionNumber: 12, issueType: "blur" }] },
        { name: "B", questionsClearlyVisible: [], questionsWithIssues: [] },
        { name: "C", questionsClearlyVisible: [12], questionsWithIssues: [] }, // C says Q12 IS clear
      ],
    });
    expect(merged.questionsClearlyVisible).toContain(12);
    expect(merged.questionsWithIssues.some((i) => i.questionNumber === 12)).toBe(false);
  });

  it("recoveredQuestions is empty when no window adds anything new", () => {
    const merged = mergeMultiWindowResults({
      pass1: {
        estimatedTotalQuestions: 10,
        questionsClearlyVisible: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        questionsWithIssues: [],
      },
      windows: [
        { name: "A", questionsClearlyVisible: [8, 9], questionsWithIssues: [] },
        { name: "B", questionsClearlyVisible: [9, 10], questionsWithIssues: [] },
        { name: "C", questionsClearlyVisible: [10], questionsWithIssues: [] },
      ],
    });
    expect(merged.recoveredQuestions).toEqual([]);
  });
});

describe("OCR Multi-Window Experiment — feature flag", () => {
  it("is disabled by default", () => {
    expect(isMultiWindowExperimentEnabled({})).toBe(false);
  });

  it("is enabled only when OCR_MULTI_WINDOW_EXPERIMENT=\"1\"", () => {
    expect(
      isMultiWindowExperimentEnabled({ OCR_MULTI_WINDOW_EXPERIMENT: "1" }),
    ).toBe(true);
  });
});
