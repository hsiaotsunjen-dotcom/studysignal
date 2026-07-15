import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import type { FinalCoverageResponse } from "@/lib/finalCoverageApi";
import {
  collectQuestionNumbersFromQualityResult,
  inferWorksheetQuestionTotal,
} from "@/lib/worksheetQuestionNumbers";

export type PhotoQualityIssueType =
  | "blur"
  | "focus"
  | "perspective"
  | "glare"
  | "shadow"
  | "crop"
  | "corner_missing"
  | "readability"
  | "answer_area";

export type PhotoQualityIssue = {
  issueType: PhotoQualityIssueType;
  severity: "minor" | "major";
  affectedQuestions?: number[];
  affectedRegion?: string;
  fixInstruction: string;
};

export type AdditionalPhotoRequest = {
  reason: string;
  captureHint: string;
  targetQuestions?: number[];
  targetRegion?: string;
};

export type PhotoQualityCheckResult = {
  photoId: string;
  photoIndex: number;
  estimatedTotalQuestions: number;
  questionsClearlyVisible: number[];
  questionsWithIssues: Array<{
    questionNumber: number;
    issueType: PhotoQualityIssueType;
    fixInstruction: string;
  }>;
  globalIssues: PhotoQualityIssue[];
  readyForAnalysis: boolean;
  tutorMessage: string;
  additionalPhotoRequest?: AdditionalPhotoRequest;
};

export type WorksheetPhotoEntry = {
  id: string;
  name: string;
  payload?: AnalyzeImagePayload;
  quality?: PhotoQualityCheckResult;
  qualityStatus: "pending" | "checking" | "ok" | "needs_improvement" | "error";
  qualityError?: string;
};

/**
 * Capture analysis state machine (Coverage × Quality → Action).
 * Do not collapse these into a single boolean.
 */
export type CaptureRecommendedAction =
  | "wait"
  | "retake-none-found"
  | "retake-missing"
  | "analyze"
  | "analyze-low-confidence";

/** How much of the worksheet this analyze request is allowed to cover. */
export type AnalysisScope = "full" | "partial" | "unknown";

/** How strongly Vision / UI may trust this analyze turn. */
export type AnalysisConfidence = "high" | "medium" | "low";

/** UI copy for analysisConfidence — read-only map; do not recompute confidence in components. */
export const ANALYSIS_CONFIDENCE_UI: Record<
  AnalysisConfidence,
  { emoji: string; label: string }
> = {
  high: { emoji: "🟢", label: "分析可信度高" },
  medium: { emoji: "🟡", label: "部分題目辨識可信度較低" },
  low: {
    emoji: "🔴",
    label: "照片品質不足，分析結果可能不完整",
  },
};

export type WorksheetCaptureAnalysisState = {
  /** A — all expected question numbers are present (known total only). */
  coverageComplete: boolean;
  /** B — no unresolved per-question quality issues. */
  qualityAcceptable: boolean;
  /** C — enough covered content to run /api/analyze now. */
  canAnalyzeCurrent: boolean;
  recommendedAction: CaptureRecommendedAction;
  /**
   * D — what the AI may analyze this turn.
   * full = coverage complete; partial = missing questions; unknown = total unknown.
   */
  analysisScope: AnalysisScope;
  /** E — overall trust level for this analyze turn (derived with A–D). */
  analysisConfidence: AnalysisConfidence;
  /** Question numbers in 1..estimatedTotal that are not covered. */
  missingQuestions: number[];
  /** Covered questions that still have quality issues (Quality axis). */
  lowQualityQuestions: number[];
};

export type WorksheetCaptureSession = {
  photos: WorksheetPhotoEntry[];
  estimatedTotalQuestions: number;
  coveredQuestions: number[];
  questionsNeedingRetake: Array<{
    questionNumber: number;
    issueType: PhotoQualityIssueType;
    fixInstruction: string;
  }>;
  openIssues: PhotoQualityIssue[];
  tutorMessage: string;
  /** Vision-suggested extra crop — Quality hint only; never means "missing questions". */
  pendingCaptureRequest?: AdditionalPhotoRequest;
  questionPhotoMap: Record<number, string>;
  /** Evidence Layer — built with the state machine; source of truth for analyze. */
  questionEvidenceMap: QuestionEvidenceMap;
  /** Derived state machine — source of truth for UI / analyze gating. */
  analysis: WorksheetCaptureAnalysisState;
  /**
   * Questions seen in more than one photo, per Final Coverage Verify.
   * Optional — only set by reconcileFinalCoverage(); merge never populates it.
   */
  duplicateQuestions?: number[];
};

/** @deprecated Use AnalysisScope (`full` | `partial` | `unknown`). */
export type WorksheetCaptureAnalyzeScope = AnalysisScope;

/**
 * Evidence Layer — one record per covered question.
 * Vision may only analyze questions that appear in questionEvidenceMap.
 */
export type QuestionEvidence = {
  questionNumber: number;
  sourcePhotoId: string;
  sourcePhotoIndex: number;
  sourcePhotoLabel: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ocrText: string;
  visionConfidence: AnalysisConfidence;
  quality: "clear" | PhotoQualityIssueType;
  isLowConfidence: boolean;
};

/** JSON-safe map keyed by question number string ("1", "2", …). */
export type QuestionEvidenceMap = Record<string, QuestionEvidence>;

export type WorksheetCaptureContext = {
  photos: Array<{
    photoIndex: number;
    photoLabel: string;
    coversQuestions: number[];
  }>;
  estimatedTotalQuestions: number;
  /** True only when analysisScope === "full". */
  captureComplete: boolean;
  coveredQuestions: number[];
  missingQuestions: number[];
  analysisScope: AnalysisScope;
  analysisConfidence: AnalysisConfidence;
  /**
   * Question numbers found with quality issues (Quality axis).
   * Independent of missingQuestions (Coverage axis).
   */
  lowQualityQuestions: number[];
  /** Evidence Layer — Vision may only cite these questions. */
  questionEvidenceMap: QuestionEvidenceMap;
};

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))].sort(
    (a, b) => a - b,
  );
}

function logWorksheetCaptureMergeDebug(input: {
  photos: WorksheetPhotoEntry[];
  perPhotoClearlyVisible: Record<string, number[]>;
  perPhotoWithIssues: Record<string, number[]>;
  coveredQuestions: number[];
  questionsNeedingRetake: number[];
  estimatedTotalQuestions: number;
}): void {
  console.log("==================================================");
  console.log("All photos merged");
  for (let i = 0; i < input.photos.length; i++) {
    const photo = input.photos[i]!;
    const label = `Photo${i + 1}`;
    console.log(`${label} questions (clearly visible)：`, input.perPhotoClearlyVisible[photo.id] ?? []);
    console.log(`${label} questions (with issues)：`, input.perPhotoWithIssues[photo.id] ?? []);
  }
  const union = uniqueSorted(input.coveredQuestions);
  const total = input.estimatedTotalQuestions;
  const missing =
    total > 0
      ? Array.from({ length: total }, (_, idx) => idx + 1).filter(
          (n) => !union.includes(n),
        )
      : [];
  console.log("Union (coveredQuestions)：", union);
  console.log("Missing (not in covered)：", missing);
  console.log("questionsNeedingRetake：", input.questionsNeedingRetake);
  console.log("estimatedTotalQuestions：", total);
  console.log("==================================================");
}

export function mergeWorksheetCaptureSession(
  photos: WorksheetPhotoEntry[],
): WorksheetCaptureSession {
  const checked = photos.filter((p) => p.quality);
  const reportedTotals = checked.map((p) => p.quality!.estimatedTotalQuestions);
  const allReferencedNumbers = uniqueSorted(
    checked.flatMap((p) => collectQuestionNumbersFromQualityResult(p.quality!)),
  );

  const covered = new Set<number>();
  const questionPhotoMap: Record<number, string> = {};
  const openIssues: PhotoQualityIssue[] = [];
  const retakeByQuestion = new Map<
    number,
    { issueType: PhotoQualityIssueType; fixInstruction: string }
  >();
  let pendingCaptureRequest: AdditionalPhotoRequest | undefined;
  const perPhotoClearlyVisible: Record<string, number[]> = {};
  const perPhotoWithIssues: Record<string, number[]> = {};
  const perPhotoMergeDebugSnapshots: Array<{
    photoNumber: number;
    questionsClearlyVisible: number[];
    questionsWithIssues: Array<{
      questionNumber: number;
      issueType: PhotoQualityIssueType;
    }>;
    mergedQuestionNumbers: number[];
    covered: number[];
    openIssues: PhotoQualityIssue[];
    pendingCaptureRequest: AdditionalPhotoRequest | null;
    estimatedTotalQuestions: number;
  }> = [];

  for (const photo of checked) {
    const q = photo.quality!;
    perPhotoClearlyVisible[photo.id] = uniqueSorted(q.questionsClearlyVisible);
    perPhotoWithIssues[photo.id] = uniqueSorted(
      q.questionsWithIssues.map((issue) => issue.questionNumber),
    );
    for (const n of q.questionsClearlyVisible) {
      covered.add(n);
      if (!questionPhotoMap[n]) {
        questionPhotoMap[n] = photo.id;
      }
      retakeByQuestion.delete(n);
    }
    for (const issue of q.questionsWithIssues) {
      if (!covered.has(issue.questionNumber)) {
        retakeByQuestion.set(issue.questionNumber, {
          issueType: issue.issueType,
          fixInstruction: issue.fixInstruction,
        });
        openIssues.push({
          issueType: issue.issueType,
          severity: "major",
          affectedQuestions: [issue.questionNumber],
          fixInstruction: issue.fixInstruction,
        });
      }
    }
    for (const g of q.globalIssues) {
      openIssues.push(g);
    }
    if (q.additionalPhotoRequest && !pendingCaptureRequest) {
      pendingCaptureRequest = q.additionalPhotoRequest;
    }

    const photoNumber = photos.findIndex((p) => p.id === photo.id) + 1;
    const questionsClearlyVisible = uniqueSorted(q.questionsClearlyVisible);
    const questionsWithIssues = q.questionsWithIssues.map((issue) => ({
      questionNumber: issue.questionNumber,
      issueType: issue.issueType,
    }));
    perPhotoMergeDebugSnapshots.push({
      photoNumber,
      questionsClearlyVisible,
      questionsWithIssues,
      mergedQuestionNumbers: uniqueSorted([
        ...questionsClearlyVisible,
        ...questionsWithIssues.map((issue) => issue.questionNumber),
      ]),
      covered: uniqueSorted([...covered]),
      openIssues: openIssues.map((issue) => ({ ...issue })),
      pendingCaptureRequest: pendingCaptureRequest
        ? { ...pendingCaptureRequest }
        : null,
      estimatedTotalQuestions: q.estimatedTotalQuestions,
    });
  }

  console.log("====================================");
  console.log("mergeWorksheetCaptureSession — ALL PHOTOS");
  console.log("====================================");
  for (const snap of perPhotoMergeDebugSnapshots) {
    console.log(`Photo ${snap.photoNumber}`);
    console.log("questionsClearlyVisible:", snap.questionsClearlyVisible);
    console.log("questionsWithIssues:", snap.questionsWithIssues);
    console.log("Merged question numbers:", snap.mergedQuestionNumbers);
    console.log("covered:", snap.covered);
    console.log("openIssues:", snap.openIssues);
    console.log("pendingCaptureRequest:", snap.pendingCaptureRequest);
    console.log("estimatedTotalQuestions:", snap.estimatedTotalQuestions);
    console.log("------------------------------------");
  }
  console.log("====================================");
  console.log("END mergeWorksheetCaptureSession — ALL PHOTOS");
  console.log("====================================");

  const coveredQuestions = uniqueSorted([...covered]);
  // Do not invent a total from covered.length — that would force analysisScope=full
  // when the real total is unknown (Case 1 → analysisScope=unknown).
  const resolvedTotal = inferWorksheetQuestionTotal(
    Math.max(0, ...reportedTotals),
    allReferencedNumbers,
  );
  const questionsNeedingRetake = [...retakeByQuestion.entries()]
    .filter(([questionNumber]) => !covered.has(questionNumber))
    .map(([questionNumber, row]) => ({
      questionNumber,
      issueType: row.issueType,
      fixInstruction: row.fixInstruction,
    }))
    .sort((a, b) => a.questionNumber - b.questionNumber);

  logWorksheetCaptureMergeDebug({
    photos,
    perPhotoClearlyVisible,
    perPhotoWithIssues,
    coveredQuestions,
    questionsNeedingRetake: questionsNeedingRetake.map((row) => row.questionNumber),
    estimatedTotalQuestions: resolvedTotal,
  });

  const anyPhotoInProgress = photos.some(
    (p) =>
      p.qualityStatus === "checking" ||
      (p.qualityStatus === "pending" && photos.length > 0),
  );

  const analysis = buildCaptureAnalysisState({
    estimatedTotalQuestions: resolvedTotal,
    coveredQuestions,
    questionsNeedingRetake,
    anyPhotoInProgress,
    checkedCount: checked.length,
  });

  console.log("[worksheetCapture analysis state]", {
    estimatedTotalQuestions: resolvedTotal,
    coveredQuestions,
    missingQuestions: analysis.missingQuestions,
    lowQualityQuestions: analysis.lowQualityQuestions,
    coverageComplete: analysis.coverageComplete,
    qualityAcceptable: analysis.qualityAcceptable,
    canAnalyzeCurrent: analysis.canAnalyzeCurrent,
    recommendedAction: analysis.recommendedAction,
    analysisScope: analysis.analysisScope,
    analysisConfidence: analysis.analysisConfidence,
    // pendingCaptureRequest is Quality/crop hint only — not Coverage
    pendingCaptureRequest: pendingCaptureRequest ?? null,
  });

  const questionEvidenceMap = buildQuestionEvidenceMap({
    photos,
    coveredQuestions,
    questionPhotoMap,
    questionsNeedingRetake,
    analysis,
  });

  console.log(
    "[worksheetCapture evidence]",
    Object.keys(questionEvidenceMap).map((k) => questionEvidenceMap[k]),
  );

  const tutorMessage = formatCaptureTutorMessage({
    analysis,
    coveredQuestions,
    estimatedTotalQuestions: resolvedTotal,
    photoCount: photos.length,
  });

  return {
    photos,
    estimatedTotalQuestions: resolvedTotal,
    coveredQuestions,
    questionsNeedingRetake,
    openIssues,
    tutorMessage,
    pendingCaptureRequest,
    questionPhotoMap,
    questionEvidenceMap,
    analysis,
  };
}

/** Pure Coverage × Quality → Analysis state machine. */
export function buildCaptureAnalysisState(input: {
  estimatedTotalQuestions: number;
  coveredQuestions: number[];
  questionsNeedingRetake: Array<{ questionNumber: number }>;
  anyPhotoInProgress: boolean;
  checkedCount: number;
}): WorksheetCaptureAnalysisState {
  const total = Math.max(0, input.estimatedTotalQuestions);
  const covered = uniqueSorted(input.coveredQuestions);
  const lowQualityQuestions = uniqueSorted(
    input.questionsNeedingRetake.map((row) => row.questionNumber),
  );

  const missingQuestions =
    total > 0
      ? Array.from({ length: total }, (_, i) => i + 1).filter(
          (n) => !covered.includes(n),
        )
      : [];

  // Coverage complete only when total is known and every 1..N is covered.
  const coverageComplete =
    total > 0 && missingQuestions.length === 0 && covered.length > 0;

  const analysisScope: AnalysisScope =
    total === 0 ? "unknown" : coverageComplete ? "full" : "partial";

  // Quality axis only — never conflate with missing Coverage.
  const qualityAcceptable = lowQualityQuestions.length === 0;

  const canAnalyzeCurrent = covered.length > 0;

  let recommendedAction: CaptureRecommendedAction;
  if (input.anyPhotoInProgress) {
    recommendedAction = "wait";
  } else if (!canAnalyzeCurrent) {
    recommendedAction = "retake-none-found";
  } else if (analysisScope === "partial") {
    recommendedAction = "retake-missing";
  } else if (!qualityAcceptable) {
    recommendedAction = "analyze-low-confidence";
  } else {
    recommendedAction = "analyze";
  }

  // E — Analysis Confidence (same state machine; not computed in UI).
  const lowQualityRatio =
    lowQualityQuestions.length / Math.max(covered.length, 1);
  const manyLowQuality =
    lowQualityQuestions.length >= 3 || lowQualityRatio > 0.5;

  let analysisConfidence: AnalysisConfidence;
  if (
    !canAnalyzeCurrent ||
    analysisScope === "partial" ||
    manyLowQuality
  ) {
    analysisConfidence = "low";
  } else if (coverageComplete && qualityAcceptable) {
    analysisConfidence = "high";
  } else {
    // coverageComplete + few low-quality, or unknown total (with/without few issues)
    analysisConfidence = "medium";
  }

  return {
    coverageComplete,
    qualityAcceptable,
    canAnalyzeCurrent,
    recommendedAction,
    analysisScope,
    analysisConfidence,
    missingQuestions,
    lowQualityQuestions,
  };
}

/**
 * Evidence Layer — one entry per covered question from the capture session.
 * Built only from existing merge outputs (no separate decision flow).
 */
export function buildQuestionEvidenceMap(input: {
  photos: WorksheetPhotoEntry[];
  coveredQuestions: number[];
  questionPhotoMap: Record<number, string>;
  questionsNeedingRetake: Array<{
    questionNumber: number;
    issueType: PhotoQualityIssueType;
  }>;
  analysis: WorksheetCaptureAnalysisState;
}): QuestionEvidenceMap {
  const lowSet = new Set(input.analysis.lowQualityQuestions);
  const issueByQuestion = new Map(
    input.questionsNeedingRetake.map((row) => [row.questionNumber, row.issueType]),
  );
  const photoIndexById = new Map(
    input.photos.map((photo, index) => [photo.id, index]),
  );

  const map: QuestionEvidenceMap = {};
  for (const questionNumber of uniqueSorted(input.coveredQuestions)) {
    const sourcePhotoId = input.questionPhotoMap[questionNumber] ?? "";
    const sourcePhotoIndex = sourcePhotoId
      ? (photoIndexById.get(sourcePhotoId) ?? -1)
      : -1;
    const isLowConfidence = lowSet.has(questionNumber);
    const quality = isLowConfidence
      ? (issueByQuestion.get(questionNumber) ?? "readability")
      : "clear";
    const visionConfidence: AnalysisConfidence = isLowConfidence
      ? "low"
      : input.analysis.analysisConfidence === "high"
        ? "high"
        : "medium";

    map[String(questionNumber)] = {
      questionNumber,
      sourcePhotoId,
      sourcePhotoIndex,
      sourcePhotoLabel:
        sourcePhotoIndex >= 0 ? `Photo${sourcePhotoIndex + 1}` : "Photo?",
      ocrText: "",
      visionConfidence,
      quality,
      isLowConfidence,
    };
  }
  return map;
}

export function formatCaptureTutorMessage(input: {
  analysis: WorksheetCaptureAnalysisState;
  coveredQuestions: number[];
  estimatedTotalQuestions: number;
  photoCount: number;
}): string {
  const {
    analysis,
    coveredQuestions,
    estimatedTotalQuestions: total,
    photoCount,
  } = input;
  const { recommendedAction, missingQuestions, lowQualityQuestions } = analysis;

  if (recommendedAction === "wait") {
    return [
      "📷 正在幫你看照片…",
      "我會先確認題目覆蓋範圍與清晰度，再告訴你下一步。",
    ].join("\n");
  }

  if (recommendedAction === "retake-none-found") {
    if (photoCount === 0) {
      return "📷 請拍一張作業照片，我會幫你看清楚每一題。";
    }
    return [
      "📷 作業照片檢查完成",
      "目前完全找不到題目。",
      "請再拍一張，讓題目清楚入鏡後再試。",
      "",
      "📷 請點擊「補拍缺少題目」。",
    ].join("\n");
  }

  if (recommendedAction === "retake-missing") {
    const missingLabel =
      formatQuestionRangesZh(missingQuestions) ||
      missingQuestions.map((n) => `第${n}題`).join("、");
    const coveredLabel = formatQuestionRangesZh(coveredQuestions);
    const lines = [
      "📷 作業照片檢查完成",
      "目前已辨識：",
      `${coveredQuestions.length} / ${total} 題`,
      "",
      "尚缺：",
      missingLabel,
      "",
      "建議補拍缺少題目後再分析。",
      "也可以直接分析目前已辨識的題目（AI 不會假裝整份作業完整）。",
    ];
    if (coveredLabel) {
      lines.push("", "目前已完成：", coveredLabel);
    }
    if (lowQualityQuestions.length > 0) {
      lines.push(
        "",
        "另：以下題目已找到但可信度較低：",
        formatQuestionRangesZh(lowQualityQuestions) ||
          lowQualityQuestions.map((n) => `第${n}題`).join("、"),
      );
    }
    return lines.join("\n");
  }

  // coverageComplete / unknown-total analyze paths
  if (analysis.analysisScope === "unknown") {
    const lines = [
      "📷 作業照片檢查完成",
      "目前尚不確定整份作業總題數。",
      `已辨識 ${coveredQuestions.length} 題，可先分析目前已辨識內容。`,
    ];
    if (lowQualityQuestions.length > 0) {
      lines.push(
        "",
        "以下題目可信度較低：",
        formatQuestionRangesZh(lowQualityQuestions) ||
          lowQualityQuestions.map((n) => `第${n}題`).join("、"),
      );
    }
    lines.push("", "📷 點擊「分析」即可。");
    return lines.join("\n");
  }

  const lines = [
    "📷 作業照片檢查完成",
    "✅ 已完整辨識：",
    `${coveredQuestions.length} / ${total} 題`,
    "",
  ];
  if (recommendedAction === "analyze-low-confidence") {
    lines.push(
      "照片覆蓋已完整，可以開始分析。",
      "",
      "以下題目可信度較低：",
      formatQuestionRangesZh(lowQualityQuestions) ||
        lowQualityQuestions.map((n) => `第${n}題`).join("、"),
      "",
      "📷 點擊「分析」即可（結果會標示低可信度題目）。",
    );
  } else {
    lines.push(
      "照片已完整辨識，可以開始分析。",
      ...(formatQuestionRangesZh(coveredQuestions)
        ? ["", "目前已完成：", formatQuestionRangesZh(coveredQuestions)]
        : []),
      "",
      "📷 點擊「分析」即可。",
    );
  }
  return lines.join("\n");
}

/** @deprecated Prefer formatCaptureTutorMessage via mergeWorksheetCaptureSession. */
export function formatCaptureReadyMessage(
  covered: number[],
  total: number,
): string {
  return formatCaptureTutorMessage({
    analysis: buildCaptureAnalysisState({
      estimatedTotalQuestions: total,
      coveredQuestions: covered,
      questionsNeedingRetake: [],
      anyPhotoInProgress: false,
      checkedCount: covered.length > 0 ? 1 : 0,
    }),
    coveredQuestions: covered,
    estimatedTotalQuestions: total,
    photoCount: covered.length > 0 ? 1 : 0,
  });
}

/** Natural tutoring language for students — not OCR/debug terms. */
export function issueProblemLabelZh(type: PhotoQualityIssueType): string {
  const map: Record<PhotoQualityIssueType, string> = {
    blur: "有些模糊",
    focus: "對焦不太清楚",
    perspective: "角度有些歪",
    glare: "有反光",
    shadow: "有陰影",
    crop: "這一題沒有完整入鏡",
    corner_missing: "邊角沒有拍完整",
    readability: "字跡不太容易看清",
    answer_area: "作答的地方不太清楚",
  };
  return map[type] ?? "照片還需要調整一下";
}

/** e.g. [1,2,3,8,9] → "第1～3題、第8～9題" */
export function formatQuestionRangesZh(nums: number[]): string {
  const sorted = uniqueSorted(nums);
  if (sorted.length === 0) return "";
  const ranges: string[] = [];
  let start = sorted[0]!;
  let prev = start;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    ranges.push(start === prev ? `第${start}題` : `第${start}～${prev}題`);
    start = n;
    prev = n;
  }
  ranges.push(start === prev ? `第${start}題` : `第${start}～${prev}題`);
  return ranges.join("、");
}

/** @deprecated Prefer formatCaptureTutorMessage. */
export function formatCaptureGuidanceMessage(input: {
  coveredQuestions: number[];
  totalQuestions: number;
  questionsNeedingRetake: Array<{
    questionNumber: number;
    issueType: PhotoQualityIssueType;
    fixInstruction: string;
  }>;
  openIssues: PhotoQualityIssue[];
  pendingCaptureRequest?: AdditionalPhotoRequest;
  photoCount: number;
  worksheetDetected: boolean;
}): string {
  return formatCaptureTutorMessage({
    analysis: buildCaptureAnalysisState({
      estimatedTotalQuestions: input.totalQuestions,
      coveredQuestions: input.coveredQuestions,
      questionsNeedingRetake: input.questionsNeedingRetake,
      anyPhotoInProgress: false,
      checkedCount: input.photoCount,
    }),
    coveredQuestions: input.coveredQuestions,
    estimatedTotalQuestions: input.totalQuestions,
    photoCount: input.photoCount,
  });
}

/** @deprecated Internal — use issueProblemLabelZh for student-facing text. */
export function issueShortLabel(type: PhotoQualityIssueType): string {
  return issueProblemLabelZh(type);
}

export function buildWorksheetCaptureContext(
  session: WorksheetCaptureSession,
): WorksheetCaptureContext {
  const photos = session.photos
    .map((p, index) => {
      const covers = uniqueSorted(p.quality?.questionsClearlyVisible ?? []);
      if (covers.length === 0) return null;
      return {
        photoIndex: index,
        photoLabel: `照片${index + 1}`,
        coversQuestions: covers,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const { analysis, estimatedTotalQuestions, coveredQuestions } = session;

  return {
    photos,
    estimatedTotalQuestions,
    captureComplete: analysis.analysisScope === "full",
    coveredQuestions,
    missingQuestions: analysis.missingQuestions,
    analysisScope: analysis.analysisScope,
    analysisConfidence: analysis.analysisConfidence,
    lowQualityQuestions: analysis.lowQualityQuestions,
    questionEvidenceMap: session.questionEvidenceMap,
  };
}

/**
 * Phase 2 — pure reconcile of a capture session with a Final Coverage Verify
 * result. Returns a new WorksheetCaptureSession.
 *
 * STANDALONE: nothing calls this yet. It is not wired into merge, the state
 * machine, buildWorksheetCaptureContext, UI, or runAnalyze. It has no side
 * effects and mutates nothing.
 *
 * What it does:
 * - total = max(session total, Final Coverage total) — never lowers the total,
 *   so it can only reveal missing questions, never hide them.
 * - Re-derives missingQuestions / analysisScope / analysisConfidence via the
 *   existing state machine (buildCaptureAnalysisState) against the new total, so
 *   these stay mutually consistent. (coverageComplete / recommendedAction follow
 *   as consequences; qualityAcceptable / canAnalyzeCurrent / lowQualityQuestions
 *   are unchanged because their inputs are unchanged.)
 * - Attaches duplicateQuestions from Final Coverage.
 *
 * What it preserves byte-for-byte (never touched):
 * - questionPhotoMap, questionEvidenceMap (sourcePhotoId / sourcePhotoIndex /
 *   ocrText and the whole Evidence Layer)
 * - coveredQuestions, questionsNeedingRetake, openIssues, pendingCaptureRequest,
 *   photos, tutorMessage
 */
export function reconcileFinalCoverage(
  session: WorksheetCaptureSession,
  finalCoverage: FinalCoverageResponse,
): WorksheetCaptureSession {
  const reconciledTotal = Math.max(
    Math.max(0, session.estimatedTotalQuestions),
    Math.max(0, finalCoverage.result.estimatedTotalQuestions),
  );

  // Inputs the state machine needs, read straight from the (unchanged) session.
  // Reading photo state here does not modify merge or the state machine.
  const checkedCount = session.photos.filter((p) => p.quality).length;
  const anyPhotoInProgress = session.photos.some(
    (p) =>
      p.qualityStatus === "checking" ||
      (p.qualityStatus === "pending" && session.photos.length > 0),
  );

  const analysis = buildCaptureAnalysisState({
    estimatedTotalQuestions: reconciledTotal,
    coveredQuestions: session.coveredQuestions,
    questionsNeedingRetake: session.questionsNeedingRetake,
    anyPhotoInProgress,
    checkedCount,
  });

  return {
    ...session,
    estimatedTotalQuestions: reconciledTotal,
    duplicateQuestions: uniqueSorted(finalCoverage.result.duplicateQuestions),
    analysis,
  };
}
