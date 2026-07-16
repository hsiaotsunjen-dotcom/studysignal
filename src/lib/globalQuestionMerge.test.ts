import { describe, expect, it } from "vitest";

import {
  collectDetectedQuestionNumbersFromPhoto,
  mergeGlobalQuestions,
} from "@/lib/globalQuestionMerge";
import {
  mergeWorksheetCaptureSession,
  type PhotoQualityCheckResult,
  type WorksheetPhotoEntry,
} from "@/lib/worksheetCapture";

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function makePhoto(input: {
  id: string;
  index: number;
  clearlyVisible: number[];
  withIssues?: number[];
  detectedQuestionNumbers?: number[];
  /** Hallucinated / wrong per-photo Vision total — must be ignored by global merge. */
  estimatedTotalQuestions?: number;
}): WorksheetPhotoEntry {
  const withIssues = (input.withIssues ?? []).map((questionNumber) => ({
    questionNumber,
    issueType: "blur" as const,
    fixInstruction: "請靠近一點",
  }));
  const detectedQuestionNumbers =
    input.detectedQuestionNumbers ??
    [...input.clearlyVisible, ...(input.withIssues ?? [])];
  const quality: PhotoQualityCheckResult = {
    photoId: input.id,
    photoIndex: input.index,
    estimatedTotalQuestions:
      input.estimatedTotalQuestions ??
      Math.max(0, ...detectedQuestionNumbers),
    questionsClearlyVisible: input.clearlyVisible,
    questionsWithIssues: withIssues,
    detectedQuestionNumbers,
    globalIssues: [],
    readyForAnalysis: true,
    tutorMessage: "",
  };
  return {
    id: input.id,
    name: `${input.id}.jpg`,
    qualityStatus: "ok",
    quality,
  };
}

describe("Global Question Merge", () => {
  it("merges multi-photo detections into total 13 (not a single-photo estimate of 12)", () => {
    // Photo1: 1~8, Photo2: 1~10, Photo3: 7~13
    // Vision wrongly estimates 12 on some photos — must not win.
    const photos = [
      makePhoto({
        id: "p1",
        index: 0,
        clearlyVisible: range(1, 8),
        estimatedTotalQuestions: 8,
      }),
      makePhoto({
        id: "p2",
        index: 1,
        clearlyVisible: range(1, 10),
        estimatedTotalQuestions: 12, // hallucinated total
      }),
      makePhoto({
        id: "p3",
        index: 2,
        clearlyVisible: range(7, 10),
        // OCR/Vision detected 7~13 but only 7~10 are clear enough
        detectedQuestionNumbers: range(7, 13),
        estimatedTotalQuestions: 12, // also wrong
      }),
    ];

    const merged = mergeGlobalQuestions(photos);

    expect(merged.globalQuestionSet).toEqual(range(1, 13));
    expect(merged.estimatedTotalQuestions).toBe(13);
    expect(merged.coveredQuestions).toEqual(range(1, 10));
    expect(merged.missingQuestions).toEqual([11, 12, 13]);
    expect(merged.coveredQuestions.length).toBe(10);

    const byNum = Object.fromEntries(
      merged.questionCoverage.map((c) => [c.questionNumber, c]),
    );
    expect(byNum[1]?.status).toBe("COMPLETE");
    expect(byNum[1]?.seenInPhotoIds.sort()).toEqual(["p1", "p2"]);
    expect(byNum[10]?.status).toBe("COMPLETE");
    expect(byNum[10]?.seenInPhotoIds.sort()).toEqual(["p2", "p3"]);
    expect(byNum[11]?.status).toBe("LOW_CONFIDENCE");
    expect(byNum[12]?.status).toBe("LOW_CONFIDENCE");
    expect(byNum[13]?.status).toBe("LOW_CONFIDENCE");
    expect(byNum[13]?.seenInPhotoIds).toEqual(["p3"]);
  });

  it("never lowers global total when another photo saw a lower max", () => {
    const photos = [
      makePhoto({
        id: "p1",
        index: 0,
        clearlyVisible: range(1, 10),
        estimatedTotalQuestions: 10,
      }),
      makePhoto({
        id: "p2",
        index: 1,
        clearlyVisible: [11, 12, 13],
        detectedQuestionNumbers: [11, 12, 13],
        estimatedTotalQuestions: 13,
      }),
    ];
    const merged = mergeGlobalQuestions(photos);
    expect(merged.estimatedTotalQuestions).toBe(13);
    expect(merged.coveredQuestions).toEqual(range(1, 13));
    expect(merged.missingQuestions).toEqual([]);
  });

  it("does not invent totals from Vision estimatedTotalQuestions alone", () => {
    const photos = [
      makePhoto({
        id: "p1",
        index: 0,
        clearlyVisible: [1, 2, 3],
        detectedQuestionNumbers: [1, 2, 3],
        estimatedTotalQuestions: 20, // hallucinated
      }),
    ];
    const merged = mergeGlobalQuestions(photos);
    expect(merged.estimatedTotalQuestions).toBe(3);
    expect(merged.globalQuestionSet).toEqual([1, 2, 3]);
  });

  it("marks quality issues as PARTIAL, not COMPLETE", () => {
    const photos = [
      makePhoto({
        id: "p1",
        index: 0,
        clearlyVisible: [1, 2],
        withIssues: [3],
        detectedQuestionNumbers: [1, 2, 3],
      }),
    ];
    const merged = mergeGlobalQuestions(photos);
    expect(merged.estimatedTotalQuestions).toBe(3);
    expect(merged.coveredQuestions).toEqual([1, 2]);
    expect(merged.questionCoverage.find((c) => c.questionNumber === 3)?.status).toBe(
      "PARTIAL",
    );
    expect(merged.questionsNeedingRetake.map((r) => r.questionNumber)).toEqual([
      3,
    ]);
  });

  it("wires through mergeWorksheetCaptureSession session fields", () => {
    const photos = [
      makePhoto({
        id: "p1",
        index: 0,
        clearlyVisible: range(1, 8),
        estimatedTotalQuestions: 8,
      }),
      makePhoto({
        id: "p2",
        index: 1,
        clearlyVisible: range(1, 10),
        estimatedTotalQuestions: 12,
      }),
      makePhoto({
        id: "p3",
        index: 2,
        clearlyVisible: range(7, 10),
        detectedQuestionNumbers: range(7, 13),
        estimatedTotalQuestions: 12,
      }),
    ];

    const session = mergeWorksheetCaptureSession(photos);
    expect(session.estimatedTotalQuestions).toBe(13);
    expect(session.coveredQuestions).toEqual(range(1, 10));
    expect(session.analysis.missingQuestions).toEqual([11, 12, 13]);
    expect(session.analysis.analysisScope).toBe("partial");
    expect(session.globalQuestionSet).toEqual(range(1, 13));
    expect(session.questionCoverage?.find((c) => c.questionNumber === 13)?.status).toBe(
      "LOW_CONFIDENCE",
    );
    expect(session.tutorMessage).toMatch(/10 \/ 13/);
  });

  it("collectDetectedQuestionNumbersFromPhoto unions all signals", () => {
    const quality: PhotoQualityCheckResult = {
      photoId: "x",
      photoIndex: 0,
      estimatedTotalQuestions: 99,
      questionsClearlyVisible: [1, 2],
      questionsWithIssues: [
        { questionNumber: 3, issueType: "glare", fixInstruction: "傾斜" },
      ],
      detectedQuestionNumbers: [2, 4, 5],
      globalIssues: [],
      readyForAnalysis: false,
      tutorMessage: "",
    };
    expect(collectDetectedQuestionNumbersFromPhoto(quality)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
});
