/**
 * OCR Multi-Window Experiment — EXPERIMENTAL, ISOLATED module.
 *
 * This is NOT Auto Zoom. It does not estimate any question's position, does
 * not use a yFraction, does not use an "anchor question", and does not call
 * computeContentAwareAutoZoomRegion. None of that concept exists in this
 * file at all — this experiment blindly covers the bottom of the photo with
 * three fixed, OVERLAPPING windows instead of guessing where a specific
 * question is.
 *
 * NOT wired into any production path. Nothing in worksheetCapture.ts,
 * globalQuestionMerge.ts, /api/photo-quality, the Auto Zoom experiment
 * (src/lib/ocrAutoZoomExperiment.ts — untouched by this file), or any UI
 * component imports this module. Gated behind the
 * OCR_MULTI_WINDOW_EXPERIMENT feature flag (see
 * src/app/api/experimental/ocr-multi-window/route.ts).
 *
 * Self-contained on purpose (no imports) so it can be exercised both by
 * vitest and by a plain Node script (via --experimental-strip-types)
 * without pulling in any Next.js/app runtime.
 */

export type MultiWindowIssue = {
  questionNumber: number;
  issueType: string;
};

export type MultiWindowVisionLikeResult = {
  estimatedTotalQuestions: number;
  questionsClearlyVisible: number[];
  questionsWithIssues: MultiWindowIssue[];
};

export type MultiWindowTriggerReason =
  | "estimated-total-exceeds-visible-max"
  | "last-three-low-confidence";

export type MultiWindowTriggerDecision = {
  shouldTrigger: boolean;
  reasons: MultiWindowTriggerReason[];
};

/**
 * BOTH conditions must hold (AND — not OR like the earlier Auto Zoom trigger):
 * 1. estimatedTotalQuestions > max(questionsClearlyVisible)
 * 2. the last three question numbers (total, total-1, total-2) are ALL
 *    still low confidence — i.e. none of them are in questionsClearlyVisible
 *    (regardless of whether they're flagged in questionsWithIssues).
 */
export function evaluateMultiWindowTrigger(
  result: MultiWindowVisionLikeResult,
): MultiWindowTriggerDecision {
  const total = result.estimatedTotalQuestions;
  const visibleMax =
    result.questionsClearlyVisible.length > 0
      ? Math.max(...result.questionsClearlyVisible)
      : 0;
  const reasons: MultiWindowTriggerReason[] = [];

  const condition1 = total > visibleMax;
  if (condition1) reasons.push("estimated-total-exceeds-visible-max");

  let condition2 = false;
  if (total > 0) {
    const lastThree = [total, total - 1, total - 2].filter((n) => n > 0);
    const clearSet = new Set(result.questionsClearlyVisible);
    condition2 =
      lastThree.length > 0 && lastThree.every((n) => !clearSet.has(n));
    if (condition2) reasons.push("last-three-low-confidence");
  }

  return { shouldTrigger: condition1 && condition2, reasons };
}

export type MultiWindowName = "A" | "B" | "C";

export type MultiWindowDefinition = {
  name: MultiWindowName;
  startFraction: number;
  endFraction: number;
};

/** Fixed, overlapping windows — exactly as specified. Not derived from any estimate. */
export const MULTI_WINDOW_DEFINITIONS: MultiWindowDefinition[] = [
  { name: "A", startFraction: 0.4, endFraction: 0.7 },
  { name: "B", startFraction: 0.55, endFraction: 0.85 },
  { name: "C", startFraction: 0.7, endFraction: 1.0 },
];

export type MultiWindowRegion = {
  name: MultiWindowName;
  startFraction: number;
  endFraction: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_WINDOW_DIMENSION_PX = 20;

/** Pure — converts one fixed fractional window into a pixel region (full width, no position guessing). */
export function computeWindowRegion(
  imageWidth: number,
  imageHeight: number,
  window: MultiWindowDefinition,
): MultiWindowRegion {
  const startFraction = Math.min(1, Math.max(0, window.startFraction));
  const endFraction = Math.min(1, Math.max(startFraction, window.endFraction));
  const y = Math.round(imageHeight * startFraction);
  const rawHeight = Math.round(imageHeight * (endFraction - startFraction));
  const height = Math.min(
    Math.max(rawHeight, Math.min(MIN_WINDOW_DIMENSION_PX, imageHeight)),
    imageHeight,
  );
  const clampedY = Math.min(y, Math.max(0, imageHeight - height));

  return {
    name: window.name,
    startFraction,
    endFraction,
    x: 0,
    y: clampedY,
    width: imageWidth,
    height,
  };
}

/** All 3 fixed windows for one photo, in A/B/C order. */
export function computeAllWindowRegions(
  imageWidth: number,
  imageHeight: number,
): MultiWindowRegion[] {
  return MULTI_WINDOW_DEFINITIONS.map((w) =>
    computeWindowRegion(imageWidth, imageHeight, w),
  );
}

export const MULTI_WINDOW_ZOOM_FACTOR = 2;

export type MultiWindowPassResult = {
  name: MultiWindowName;
  questionsClearlyVisible: number[];
  questionsWithIssues: MultiWindowIssue[];
};

export type MultiWindowMergeInput = {
  pass1: MultiWindowVisionLikeResult;
  windows: MultiWindowPassResult[];
};

export type MultiWindowMergeResult = {
  questionsClearlyVisible: number[];
  questionsWithIssues: MultiWindowIssue[];
  /** Questions NOT clear in pass 1 that became clear from ANY window. */
  recoveredQuestions: number[];
  /** Which window(s) first contributed clear evidence for each recovered question. */
  recoveredQuestionSources: Record<number, MultiWindowName[]>;
};

/**
 * Union merge — pass1 + every window's result. "Union, not overwrite": every
 * source's questionsClearlyVisible is combined into one set (a question
 * clear in ANY source is clear in the final result); questionsWithIssues is
 * unioned the same way. Clear evidence from any source wins over an issue
 * flag from any other source (never demotes a clear question back to an
 * issue).
 */
export function mergeMultiWindowResults(
  input: MultiWindowMergeInput,
): MultiWindowMergeResult {
  const firstClearSet = new Set(input.pass1.questionsClearlyVisible);
  const clearSet = new Set(input.pass1.questionsClearlyVisible);
  const issueMap = new Map<number, string>();
  for (const i of input.pass1.questionsWithIssues) {
    issueMap.set(i.questionNumber, i.issueType);
  }

  const recoveredQuestionSources: Record<number, MultiWindowName[]> = {};
  for (const w of input.windows) {
    for (const n of w.questionsClearlyVisible) {
      clearSet.add(n);
      if (!firstClearSet.has(n)) {
        (recoveredQuestionSources[n] ??= []).push(w.name);
      }
    }
    for (const i of w.questionsWithIssues) {
      if (!issueMap.has(i.questionNumber)) {
        issueMap.set(i.questionNumber, i.issueType);
      }
    }
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
    recoveredQuestionSources,
  };
}

/** Feature flag gate — checked by the experimental route only. */
export function isMultiWindowExperimentEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.OCR_MULTI_WINDOW_EXPERIMENT === "1";
}
