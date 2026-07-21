/**
 * OCR Auto Zoom — EXPERIMENTAL, ISOLATED module.
 *
 * NOT wired into any production path. Nothing in worksheetCapture.ts,
 * globalQuestionMerge.ts, /api/photo-quality, or any UI component imports
 * this file. It exists purely so the "auto zoom the last ~40% of the photo
 * and re-check with Vision before asking the student to retake" idea can be
 * evaluated in isolation, gated behind the OCR_AUTO_ZOOM_EXPERIMENT feature
 * flag (see src/app/api/experimental/ocr-auto-zoom/route.ts).
 *
 * Self-contained on purpose (no imports) so it can be exercised both by
 * vitest and by a plain Node script (via --experimental-strip-types)
 * without pulling in any Next.js/app runtime.
 *
 * Does NOT touch: production OCR, mergeGlobalQuestions / mergeWorksheetCaptureSession,
 * analysisScope/coverage logic, any UI component, or the Vision system prompt.
 */

export type AutoZoomIssue = {
  questionNumber: number;
  issueType: string;
};

export type AutoZoomVisionLikeResult = {
  estimatedTotalQuestions: number;
  questionsClearlyVisible: number[];
  questionsWithIssues: AutoZoomIssue[];
};

export type AutoZoomTriggerReason =
  | "issues-on-last-three"
  | "estimated-total-exceeds-visible-max"
  | "last-question-low-confidence";

export type AutoZoomTriggerDecision = {
  shouldTrigger: boolean;
  reasons: AutoZoomTriggerReason[];
};

/**
 * Trigger conditions (exactly the 3 the user specified):
 * 1. questionsWithIssues contains any of the last three question numbers
 *    (total, total-1, total-2) — e.g. 10/11/12 or 11/12/13.
 * 2. estimatedTotalQuestions > max(questionsClearlyVisible) — Vision itself
 *    believes there are more questions than it could clearly read.
 * 3. The single highest-numbered question is low confidence — i.e. it is
 *    NOT in questionsClearlyVisible, or it IS flagged in questionsWithIssues.
 */
export function evaluateAutoZoomTrigger(
  result: AutoZoomVisionLikeResult,
): AutoZoomTriggerDecision {
  const reasons: AutoZoomTriggerReason[] = [];
  const total = result.estimatedTotalQuestions;
  const visibleMax =
    result.questionsClearlyVisible.length > 0
      ? Math.max(...result.questionsClearlyVisible)
      : 0;

  if (total > 0) {
    const lastThree = new Set(
      [total, total - 1, total - 2].filter((n) => n > 0),
    );
    const issueNums = new Set(
      result.questionsWithIssues.map((i) => i.questionNumber),
    );
    if ([...lastThree].some((n) => issueNums.has(n))) {
      reasons.push("issues-on-last-three");
    }
  }

  if (total > visibleMax) {
    reasons.push("estimated-total-exceeds-visible-max");
  }

  if (total > 0) {
    const lastClear = result.questionsClearlyVisible.includes(total);
    const lastFlagged = result.questionsWithIssues.some(
      (i) => i.questionNumber === total,
    );
    if (!lastClear || lastFlagged) {
      reasons.push("last-question-low-confidence");
    }
  }

  return { shouldTrigger: reasons.length > 0, reasons };
}

export type AutoZoomRegion = {
  strategy: "bottom-right" | "bottom-half";
  x: number;
  y: number;
  width: number;
  height: number;
};

const AUTO_ZOOM_REGION_HEIGHT_FRACTION = 0.4;
const AUTO_ZOOM_BOTTOM_RIGHT_WIDTH_FRACTION = 0.6;
const MIN_REGION_DIMENSION_PX = 20;

/**
 * Crop region = last 40% of the photo's height.
 * Preferred: bottom-right (last 40% height x right 60% width) — the region
 * most worksheets place trailing questions in when a photo runs off frame.
 * Fallback: bottom-half (last 40% height x full width) when the
 * bottom-right region would be degenerate (image too small/narrow).
 */
export function computeAutoZoomRegion(
  imageWidth: number,
  imageHeight: number,
): AutoZoomRegion {
  const height = Math.max(
    Math.round(imageHeight * AUTO_ZOOM_REGION_HEIGHT_FRACTION),
    MIN_REGION_DIMENSION_PX,
  );
  const y = Math.max(0, imageHeight - height);

  const bottomRightWidth = Math.round(
    imageWidth * AUTO_ZOOM_BOTTOM_RIGHT_WIDTH_FRACTION,
  );
  const bottomRightX = imageWidth - bottomRightWidth;

  const bottomRightValid =
    bottomRightWidth >= MIN_REGION_DIMENSION_PX &&
    bottomRightX >= 0 &&
    height >= MIN_REGION_DIMENSION_PX;

  if (bottomRightValid) {
    return {
      strategy: "bottom-right",
      x: bottomRightX,
      y,
      width: bottomRightWidth,
      height,
    };
  }

  return {
    strategy: "bottom-half",
    x: 0,
    y,
    width: imageWidth,
    height,
  };
}

/**
 * VALIDATION FINDING (Photo 3, 2026-07-18): the fixed bottom-40% crop above
 * missed Q13 entirely — the crop landed on background/table, not worksheet
 * text, because this worksheet has a large graphic block below the last
 * question, so "the end of the content" is NOT "the bottom of the photo".
 * Kept (with its tests) as a record of that finding; no longer used by the
 * route/validation script — superseded by computeContentAwareAutoZoomRegion
 * below.
 */

/** Step 1 — largest question number Vision marked as clearly visible in pass 1. */
export function getLastClearQuestionNumber(
  result: Pick<AutoZoomVisionLikeResult, "questionsClearlyVisible">,
): number | null {
  return result.questionsClearlyVisible.length > 0
    ? Math.max(...result.questionsClearlyVisible)
    : null;
}

export type ContentAwareAutoZoomRegion = {
  strategy: "content-aware-from-last-clear-question";
  anchorQuestionNumber: number;
  /** 0 (top of photo) .. 1 (bottom of photo) — where the anchor question was estimated to be. */
  anchorYFraction: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const CONTENT_AWARE_MAX_Y_FRACTION = 0.95;

/**
 * Step 2/3 — content-aware region: NOT a fixed percentage of the photo.
 * The crop's TOP edge is wherever the anchor question (the last question
 * Vision could clearly read in pass 1) was actually estimated to be located
 * in THIS photo; the crop always runs down to the bottom of the photo
 * ("往下裁切直到頁尾"). Full width — no left/right assumption this time.
 *
 * `anchorYFraction` (0..1) must come from an actual position estimate for
 * THIS photo (e.g. a dedicated Vision call — see estimateQuestionYFraction
 * in the route/validation script). This function is pure; it does not
 * itself look at pixels or call Vision.
 */
export function computeContentAwareAutoZoomRegion(
  imageWidth: number,
  imageHeight: number,
  anchorQuestionNumber: number,
  anchorYFraction: number,
): ContentAwareAutoZoomRegion {
  const clampedFraction = Math.min(
    CONTENT_AWARE_MAX_Y_FRACTION,
    Math.max(0, Number.isFinite(anchorYFraction) ? anchorYFraction : 0),
  );
  const y = Math.min(
    Math.max(0, imageHeight - MIN_REGION_DIMENSION_PX),
    Math.round(imageHeight * clampedFraction),
  );
  const height = Math.max(imageHeight - y, MIN_REGION_DIMENSION_PX);

  return {
    strategy: "content-aware-from-last-clear-question",
    anchorQuestionNumber,
    anchorYFraction: clampedFraction,
    x: 0,
    y,
    width: imageWidth,
    height,
  };
}

export const AUTO_ZOOM_FACTOR = 2;

export type AutoZoomMergeInput = {
  first: AutoZoomVisionLikeResult;
  second: {
    questionsClearlyVisible: number[];
    questionsWithIssues: AutoZoomIssue[];
  };
};

export type AutoZoomMergeResult = {
  questionsClearlyVisible: number[];
  questionsWithIssues: AutoZoomIssue[];
  /** Questions that were NOT clear in pass 1 but became clear after auto-zoom pass 2. */
  recoveredQuestions: number[];
};

/**
 * Union pass 1 + pass 2. Clear evidence from EITHER pass wins over an issue
 * flag (mirrors the "clear evidence upgrades" rule already used by the
 * production mergeGlobalQuestions — reimplemented here, not imported, to
 * keep this experiment fully isolated from production merge code).
 */
export function mergeAutoZoomResults(
  input: AutoZoomMergeInput,
): AutoZoomMergeResult {
  const firstClearSet = new Set(input.first.questionsClearlyVisible);
  const clearSet = new Set([
    ...input.first.questionsClearlyVisible,
    ...input.second.questionsClearlyVisible,
  ]);

  const issueMap = new Map<number, string>();
  for (const i of input.first.questionsWithIssues) {
    issueMap.set(i.questionNumber, i.issueType);
  }
  for (const i of input.second.questionsWithIssues) {
    issueMap.set(i.questionNumber, i.issueType);
  }
  for (const n of clearSet) issueMap.delete(n);

  const recoveredQuestions = [...clearSet]
    .filter((n) => !firstClearSet.has(n))
    .sort((a, b) => a - b);

  return {
    questionsClearlyVisible: [...clearSet].sort((a, b) => a - b),
    questionsWithIssues: [...issueMap.entries()]
      .map(([questionNumber, issueType]) => ({ questionNumber, issueType }))
      .sort((a, b) => a.questionNumber - b.questionNumber),
    recoveredQuestions,
  };
}

/** Feature flag gate — checked by the experimental route only. */
export function isAutoZoomExperimentEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.OCR_AUTO_ZOOM_EXPERIMENT === "1";
}
