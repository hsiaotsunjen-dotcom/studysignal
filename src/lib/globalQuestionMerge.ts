/**
 * Global Question Merge — deterministic multi-photo question aggregation.
 *
 * Never infer homework total from a single photo's Vision estimate.
 * Total grows only when at least one photo clearly detects that question number.
 */

import type {
  PhotoQualityCheckResult,
  PhotoQualityIssueType,
  WorksheetPhotoEntry,
} from "@/lib/worksheetCapture";

export type GlobalQuestionStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "MISSING"
  | "LOW_CONFIDENCE";

export type GlobalQuestionCoverage = {
  questionNumber: number;
  status: GlobalQuestionStatus;
  /** Photo ids that detected this question number (any signal). */
  seenInPhotoIds: string[];
  /** Photo ids where the question was clearly visible. */
  clearInPhotoIds: string[];
};

export type GlobalQuestionMergeResult = {
  /** Union of every detected question number across all photos. */
  globalQuestionSet: number[];
  /**
   * Homework total = max(globalQuestionSet).
   * Never taken from a single photo's estimatedTotalQuestions.
   */
  estimatedTotalQuestions: number;
  /** Questions with COMPLETE status (enough quality to analyze). */
  coveredQuestions: number[];
  /**
   * Questions with COMPLETE or PARTIAL status — i.e. positively detected by
   * Vision in some photo, regardless of quality. Progress-display only;
   * never use for analyze gating / evidence (use coveredQuestions instead).
   */
  detectedQuestions: number[];
  /** Questions in 1..total that are not COMPLETE. */
  missingQuestions: number[];
  /** Per-question coverage + status for every number in 1..total. */
  questionCoverage: GlobalQuestionCoverage[];
  /** First clear photo id per COMPLETE question (for evidence / photo map). */
  questionPhotoMap: Record<number, string>;
  questionsNeedingRetake: Array<{
    questionNumber: number;
    issueType: PhotoQualityIssueType;
    fixInstruction: string;
  }>;
};

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))].sort(
    (a, b) => a - b,
  );
}

/**
 * All question numbers detected on one photo (Vision + OCR + issues).
 * Does NOT use estimatedTotalQuestions — that may hallucinate unseen numbers.
 */
export function collectDetectedQuestionNumbersFromPhoto(
  quality: PhotoQualityCheckResult,
): number[] {
  return uniqueSorted([
    ...(quality.detectedQuestionNumbers ?? []),
    ...quality.questionsClearlyVisible,
    ...quality.questionsWithIssues.map((i) => i.questionNumber),
    ...quality.globalIssues.flatMap((g) => g.affectedQuestions ?? []),
    ...(quality.additionalPhotoRequest?.targetQuestions ?? []),
  ]);
}

/**
 * Step 1–5: collect → merge set → coverage → quality status → summary inputs.
 */
export function mergeGlobalQuestions(
  photos: WorksheetPhotoEntry[],
): GlobalQuestionMergeResult {
  const checked = photos.filter((p) => p.quality);

  const globalSet = new Set<number>();
  const seenIn = new Map<number, Set<string>>();
  const clearIn = new Map<number, Set<string>>();
  const issueByQuestion = new Map<
    number,
    { issueType: PhotoQualityIssueType; fixInstruction: string }
  >();
  const lowConfidenceOnly = new Set<number>();

  const ensureSeen = (n: number, photoId: string) => {
    globalSet.add(n);
    let set = seenIn.get(n);
    if (!set) {
      set = new Set();
      seenIn.set(n, set);
    }
    set.add(photoId);
  };

  for (const photo of checked) {
    const q = photo.quality!;
    const detected = collectDetectedQuestionNumbersFromPhoto(q);
    const clearSet = new Set(uniqueSorted(q.questionsClearlyVisible));
    const issueSet = new Set(
      q.questionsWithIssues.map((i) => i.questionNumber),
    );

    for (const n of detected) {
      ensureSeen(n, photo.id);
    }

    for (const n of clearSet) {
      ensureSeen(n, photo.id);
      let set = clearIn.get(n);
      if (!set) {
        set = new Set();
        clearIn.set(n, set);
      }
      set.add(photo.id);
      // Clear evidence upgrades / clears retake + low-confidence.
      issueByQuestion.delete(n);
      lowConfidenceOnly.delete(n);
    }

    for (const issue of q.questionsWithIssues) {
      const n = issue.questionNumber;
      ensureSeen(n, photo.id);
      if (!clearIn.has(n) && !issueByQuestion.has(n)) {
        issueByQuestion.set(n, {
          issueType: issue.issueType,
          fixInstruction: issue.fixInstruction,
        });
      }
    }

    // OCR-/payload-only detections (not clearly visible, no structured issue)
    // → LOW_CONFIDENCE rather than inventing COMPLETE coverage.
    for (const n of detected) {
      if (!clearSet.has(n) && !issueSet.has(n) && !clearIn.has(n)) {
        if (!issueByQuestion.has(n)) {
          lowConfidenceOnly.add(n);
        }
      }
    }
  }

  const globalQuestionSet = uniqueSorted([...globalSet]);
  // Total from merged detections only — never from a single photo estimate.
  const estimatedTotalQuestions =
    globalQuestionSet.length > 0 ? Math.max(...globalQuestionSet) : 0;

  const questionPhotoMap: Record<number, string> = {};
  for (const [n, photoIds] of clearIn) {
    const first = [...photoIds][0];
    if (first) questionPhotoMap[n] = first;
  }

  const questionCoverage: GlobalQuestionCoverage[] = [];
  const coveredQuestions: number[] = [];
  const missingQuestions: number[] = [];

  for (let n = 1; n <= estimatedTotalQuestions; n++) {
    const seenInPhotoIds = [...(seenIn.get(n) ?? [])];
    const clearInPhotoIds = [...(clearIn.get(n) ?? [])];

    let status: GlobalQuestionStatus;
    if (clearInPhotoIds.length > 0) {
      status = "COMPLETE";
      coveredQuestions.push(n);
    } else if (issueByQuestion.has(n)) {
      status = "PARTIAL";
      missingQuestions.push(n);
    } else if (lowConfidenceOnly.has(n) || seenInPhotoIds.length > 0) {
      // Seen via weak signal only (e.g. OCR without clear Vision).
      status = "LOW_CONFIDENCE";
      missingQuestions.push(n);
    } else {
      // Gap in 1..max that no photo detected — still report as missing coverage.
      status = "MISSING";
      missingQuestions.push(n);
    }

    questionCoverage.push({
      questionNumber: n,
      status,
      seenInPhotoIds,
      clearInPhotoIds,
    });
  }

  const questionsNeedingRetake = [...issueByQuestion.entries()]
    .filter(([n]) => !clearIn.has(n))
    .map(([questionNumber, row]) => ({
      questionNumber,
      issueType: row.issueType,
      fixInstruction: row.fixInstruction,
    }))
    .sort((a, b) => a.questionNumber - b.questionNumber);

  // Progress-display derivation only (COMPLETE + PARTIAL). Does not affect
  // coveredQuestions, which stays COMPLETE-only for analyze gating / evidence.
  const detectedQuestions = questionCoverage
    .filter((c) => c.status === "COMPLETE" || c.status === "PARTIAL")
    .map((c) => c.questionNumber);

  return {
    globalQuestionSet,
    estimatedTotalQuestions,
    coveredQuestions,
    detectedQuestions,
    missingQuestions,
    questionCoverage,
    questionPhotoMap,
    questionsNeedingRetake,
  };
}

/** Debug log for the Global Question Merge pipeline. */
export function logGlobalQuestionMerge(
  photos: WorksheetPhotoEntry[],
  result: GlobalQuestionMergeResult,
): void {
  console.log("==================================================");
  console.log("Global Question Merge");
  console.log("==================================================");
  const checked = photos.filter((p) => p.quality);
  for (let i = 0; i < checked.length; i++) {
    const photo = checked[i]!;
    const detected = collectDetectedQuestionNumbersFromPhoto(photo.quality!);
    console.log(`Photo ${i + 1} (${photo.id}) detected:`, detected);
    console.log(
      `  clearlyVisible:`,
      uniqueSorted(photo.quality!.questionsClearlyVisible),
    );
    console.log(
      `  withIssues:`,
      uniqueSorted(
        photo.quality!.questionsWithIssues.map((x) => x.questionNumber),
      ),
    );
    console.log(
      `  detectedQuestionNumbers:`,
      uniqueSorted(photo.quality!.detectedQuestionNumbers ?? []),
    );
  }
  console.log("Global question set:", result.globalQuestionSet);
  console.log("Global total:", result.estimatedTotalQuestions);
  console.log("COMPLETE (covered):", result.coveredQuestions);
  console.log("DETECTED (COMPLETE + PARTIAL, display only):", result.detectedQuestions);
  console.log("Missing / incomplete:", result.missingQuestions);
  for (const row of result.questionCoverage) {
    if (row.status === "COMPLETE" && row.seenInPhotoIds.length <= 1) continue;
    console.log(
      `  Q${row.questionNumber}: ${row.status} seenIn=[${row.seenInPhotoIds.join(",")}] clearIn=[${row.clearInPhotoIds.join(",")}]`,
    );
  }
  console.log(
    `Summary: Detected ${result.coveredQuestions.length} / ${result.estimatedTotalQuestions}`,
  );
  console.log("==================================================");
}
