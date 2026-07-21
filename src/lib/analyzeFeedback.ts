/** Structured feedback from `/api/analyze` (OpenAI). */

import {
  applyHomeworkStudentAnswersGuard,
  homeworkAllowsPerformanceEvaluation,
  parseStudentAnswersStatus,
} from "@/lib/homeworkStudentAnswers";
import type { StudentAnswerObject } from "@/lib/studentAnswerObject";
import type { QuestionEvidenceMap } from "@/lib/worksheetCapture";

export type ScoreCategoryFeedback = {
  score: number;
  strengths: string[];
  /** Concrete score-gap notes (should quote learner wording + fix); UI label avoids generic “why not 100”. */
  whyNot100: string[];
  improvementExamples: string[];
};

/** Model rewrite ladder for the same communicative intent (English + brief 繁中 optional). */
export type TutorModelAnswerBlock = {
  studentVersion: string;
  betterVersion: string;
  nativeLikeVersion: string;
};

/** High-level recap for learning review style reports. */
export type LearningSummaryBlock = {
  strengths: string[];
  weaknesses: string[];
  whatToPracticeNext: string[];
};

export type PronunciationFocusItem = {
  word: string;
  /** General American–style IPA with slashes, e.g. "/ɪˈrɑːn/". Omit when unknown. */
  ipaUs?: string;
  /** British (RP-style) IPA with slashes, e.g. "/ɪˈræn/". Omit when unknown. */
  ipaUk?: string;
  reasonToPractice: string;
  pronunciationTip: string;
};

export type TutorPersonalizedComment = {
  whatWentWell: string;
  biggestImprovementOpportunity: string;
  whatToTryNextTime: string;
};

/** Pronunciation rubric from GPT (only when speech audio was analyzed). */
export type PronunciationScoresBlock = {
  overallScore: number;
  accuracy: number;
  fluency: number;
  clarity: number;
  feedback: string;
};

/** OCR + visual explanation when analysis used attached images. */
export type HomeworkKeyExplanation = {
  questionLabel: string;
  correctAnswer: string;
  /** 繁體中文 overview / summary for this question. */
  why: string;
  example?: string;
  grammarExplanation?: string;
  vocabularyExplanation?: string;
  whyWrongChoices?: string;
  commonMistakes?: string;
  learningTips?: string;
  learningTakeaway?: string;
};

export type HomeworkPronunciationRow = {
  word: string;
  ipa: string;
  tip: string;
};

/** Per-question OCR / vision failure — only questions that could not be read clearly. */
export type HomeworkQuestionRecognitionIssue = {
  questionLabel: string;
  issue: string;
};

export type HomeworkReport = {
  homeworkType: string;
  questionCount: string | number;
  imageQuality: string;
  /** Whether visible student handwriting / filled answers exist on the worksheet. */
  studentAnswersStatus?: "detected" | "none" | "unclear" | "insufficient";
  /** Legacy boolean from model JSON before studentAnswersStatus. */
  studentAnswersDetected?: boolean;
  /** Total worksheet questions (evidence; may mirror questionCount). */
  totalQuestionCount?: number;
  /** Count of questions with visible student answers. */
  studentAnsweredQuestions?: number;
  /** Answer coverage 0–100 (% of questions with student work). */
  studentAnswerCoveragePercent?: number;
  /** Shown when studentAnswersStatus is "none". */
  noStudentAnswersMessage?: string;
  /** Shown when studentAnswersStatus is "unclear". */
  unclearPhotoMessage?: string;
  /** Shown when studentAnswersStatus is "insufficient". */
  insufficientEvidenceMessage?: string;
  /** Per-question handwriting audit (answered vs blank). */
  questionAnswerAudit?: Array<{
    questionNumber: number;
    questionLabel?: string;
    status: "answered" | "blank";
    reason: string;
    studentAnswerSnippet?: string;
    answerAreaOcr?: string;
    handwritingDetected?: boolean;
    confidence?: number;
    handwritingDetection?: {
      ocrTextInAnswerArea: string;
      handwritingDetected: boolean;
      confidence: number;
      classificationReason: string;
      rejectedByRule?: string;
      exactEvidence: string[];
    };
  }>;
  /** Questions with real OCR/vision/image-quality failures only. Empty = all recognized. */
  questionRecognitionIssues?: HomeworkQuestionRecognitionIssue[];
  /**
   * Question numbers from capture quality check that were found but not clearly
   * readable — analysis still runs; UI should mark lower confidence.
   */
  lowConfidenceQuestions?: number[];
  /** Evidence Layer echoed from capture — for UI debug / source labels. */
  questionEvidenceMap?: QuestionEvidenceMap;
  hintsFirst?: string;
  answerOverview: string;
  keyExplanations: HomeworkKeyExplanation[];
  pronunciationFocus: HomeworkPronunciationRow[];
  learningSignal: string[];
  studentIntent?: string;
  /** Full markdown report with emoji section headers for UI display. */
  formattedReport?: string;
  /** Worksheet-level recap (not speech rubric). */
  learningSummary?: LearningSummaryBlock;
};

export type ImageInsights = {
  ocrText: string;
  visualSummaryZh: string;
  homeworkReport?: HomeworkReport;
};

/** Which analysis sections the client may render for this request. */
export type AnalysisCapabilities = {
  imageAnalysis: boolean;
  learningSummary: boolean;
  grammar: boolean;
  vocabulary: boolean;
  fluency: boolean;
  pronunciation: boolean;
  tutorModelAnswer: boolean;
  tutorComment: boolean;
};

export type AnalysisCapabilitiesInput = {
  hasStudentCorpus: boolean;
  hasImageInsights: boolean;
  requireSpeechPronunciation: boolean;
  /** Homework worksheet: false when no student answers detected. */
  homeworkPerformanceEvaluation?: boolean;
};

export function buildAnalysisCapabilities(
  input: AnalysisCapabilitiesInput,
): AnalysisCapabilities {
  const {
    hasStudentCorpus,
    hasImageInsights,
    requireSpeechPronunciation,
    homeworkPerformanceEvaluation = true,
  } = input;
  /** Image homework (OCR/worksheet) — never use Talk speech rubric sections. */
  const isHomeworkVision = hasImageInsights && !requireSpeechPronunciation;
  const studentRubric = hasStudentCorpus && !isHomeworkVision;
  const homeworkAnalytics = isHomeworkVision && homeworkPerformanceEvaluation;
  return {
    imageAnalysis: hasImageInsights,
    learningSummary: studentRubric || homeworkAnalytics,
    grammar: studentRubric,
    vocabulary: studentRubric,
    fluency: studentRubric,
    pronunciation:
      studentRubric && (requireSpeechPronunciation || !hasImageInsights),
    tutorModelAnswer: studentRubric,
    tutorComment: studentRubric,
  };
}

/** Fallback for stored feedback created before capabilities were added. */
export function resolveAnalysisCapabilities(
  feedback: AnalyzeFeedback,
): AnalysisCapabilities {
  if (!feedback) {
    return buildAnalysisCapabilities({
      hasStudentCorpus: false,
      hasImageInsights: false,
      requireSpeechPronunciation: false,
    });
  }
  if (feedback.analysisCapabilities) {
    return feedback.analysisCapabilities;
  }
  const hasImage = Boolean(feedback.imageInsights);
  const isHomeworkVision =
    hasImage && !feedback.pronunciationScores;
  if (isHomeworkVision) {
    return buildAnalysisCapabilities({
      hasStudentCorpus: false,
      hasImageInsights: true,
      requireSpeechPronunciation: false,
      homeworkPerformanceEvaluation: homeworkAllowsPerformanceEvaluation(
        feedback.imageInsights?.homeworkReport?.studentAnswersStatus,
      ),
    });
  }
  const tutorComment = feedback.tutorComment;
  const grammar = feedback.grammar;
  const hasStudentContent =
    Boolean(feedback.learningSummary) ||
    Boolean(feedback.tutorModelAnswer) ||
    Boolean(feedback.pronunciationScores) ||
    (tutorComment?.whatWentWell?.trim().length ?? 0) > 0 ||
    (tutorComment?.biggestImprovementOpportunity?.trim().length ?? 0) > 0 ||
    (grammar?.strengths?.some(
      (s) => s.length > 0 && !s.startsWith("See homework"),
    ) ??
      false) ||
    (grammar?.score ?? 0) > 0;
  return buildAnalysisCapabilities({
    hasStudentCorpus: hasStudentContent,
    hasImageInsights: hasImage,
    requireSpeechPronunciation: Boolean(feedback.pronunciationScores),
  });
}

export type AnalyzeFeedback = {
  /** Present only when speech audio was used for pronunciation analysis. */
  pronunciationScores?: PronunciationScoresBlock;
  grammar: ScoreCategoryFeedback;
  vocabulary: ScoreCategoryFeedback;
  fluency: ScoreCategoryFeedback;
  /** Communication / tone / dialogue naturalness (optional; learning review & richer analyses). */
  expression?: ScoreCategoryFeedback;
  /** Speech rubric items, or text-derived read-aloud targets (words from student writing). */
  pronunciationFocus: PronunciationFocusItem[];
  tutorComment: TutorPersonalizedComment;
  /** Present when request included images; prioritize this over pronunciation. */
  imageInsights?: ImageInsights;
  /** Optional: same idea expressed as student / improved / native-like English. */
  tutorModelAnswer?: TutorModelAnswerBlock;
  /** Optional: strengths / gaps / next practice. */
  learningSummary?: LearningSummaryBlock;
  /** Which sections the UI may render for this analysis. */
  analysisCapabilities?: AnalysisCapabilities;
};

/** True when `/api/analyze` already returned a parsed `AnalyzeFeedback` body. */
export function isParsedAnalyzeFeedbackResponse(
  data: unknown,
): data is AnalyzeFeedback {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.analysisCapabilities != null &&
    typeof o.analysisCapabilities === "object" &&
    o.grammar != null &&
    typeof o.grammar === "object" &&
    o.vocabulary != null &&
    typeof o.vocabulary === "object" &&
    o.fluency != null &&
    typeof o.fluency === "object" &&
    Array.isArray(o.pronunciationFocus) &&
    o.tutorComment != null &&
    typeof o.tutorComment === "object"
  );
}

const IMAGE_ONLY_SCORE_STUB: ScoreCategoryFeedback = {
  score: 0,
  strengths: [],
  whyNot100: [],
  improvementExamples: [],
};

const IMAGE_ONLY_TUTOR_COMMENT_STUB: TutorPersonalizedComment = {
  whatWentWell: "",
  biggestImprovementOpportunity: "",
  whatToTryNextTime: "",
};

export type ParseAnalyzeOptions = {
  /** Whether this submission includes student speech/typed/review corpus (never true for homework image submissions). */
  hasStudentCorpus: boolean;
  /**
   * Phase 2+: Student Answer Object — Signals inventory authority.
   * When set, answer counts / status / overview are derived from SAO only.
   */
  studentAnswerObject?: StudentAnswerObject | null;
};

/** @deprecated Use resolveHasStudentCorpusForParser(submissionKind) from analyzeApiRequest. */
export function hasStudentSubmissionCorpus(
  text: string,
  requireSpeechPronunciation: boolean,
): boolean {
  return text.trim().length > 0 || requireSpeechPronunciation;
}

/** Count numbered blanks like (1), (2) in OCR text. */
export function countOcrQuestionNumbers(ocrText: string): number {
  const nums = new Set<number>();
  for (const m of ocrText.matchAll(/\((\d+)\)/g)) {
    const n = parseInt(m[1]!, 10);
    if (Number.isFinite(n) && n > 0) nums.add(n);
  }
  return nums.size;
}

/** Count numbered answer lines in answerOverview or formattedReport excerpt. */
export function countAnswerOverviewEntries(text: string): number {
  if (!text || text === "—") return 0;
  let n = 0;
  for (const line of text.split(/\n/)) {
    const t = line.trim();
    if (/^\d+[.)]\s+\S/.test(t)) n++;
    else if (/^Question\s+\d+/i.test(t)) n++;
  }
  return n;
}

export function parseDeclaredQuestionCount(
  value: string | number | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "string") {
    const m = /(\d+)/.exec(value.trim());
    if (m) return parseInt(m[1]!, 10);
  }
  return null;
}

/** Answer Overview entry count as shown in HomeworkReport UI path. */
export function countHomeworkUiAnswerEntries(report: HomeworkReport): number {
  if (report.formattedReport) {
    const extracted = extractAnswerOverviewFromFormattedReport(
      report.formattedReport,
    );
    const fromFormatted = countAnswerOverviewEntries(extracted);
    if (fromFormatted > 0) return fromFormatted;
  }
  return countAnswerOverviewEntries(report.answerOverview);
}

export function logHomeworkQuestionCountTrace(
  layer: string,
  payload: Record<string, unknown>,
): void {
  homeworkTrace(`question_count:${layer}`, payload);
}

function clampScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeBoundedStrings(
  value: unknown,
  min: number,
  max: number,
  fallback: string
): string[] {
  const arr = Array.isArray(value)
    ? value
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];
  const out = arr.slice(0, max);
  const copy = [...out];
  while (copy.length < min) copy.push(fallback);
  return copy;
}

function normalizeScoreCategory(
  obj: unknown,
  bulletFallback: string,
  exampleFallback: string
): ScoreCategoryFeedback | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  return {
    score: clampScore(o.score),
    strengths: normalizeBoundedStrings(o.strengths, 2, 3, bulletFallback),
    whyNot100: normalizeBoundedStrings(o.whyNot100, 2, 3, bulletFallback),
    improvementExamples: normalizeBoundedStrings(
      o.improvementExamples,
      1,
      3,
      exampleFallback
    ),
  };
}

const PRON_FALLBACK: PronunciationFocusItem = {
  word: "—",
  reasonToPractice: "—",
  pronunciationTip: "—",
};

/** Coerce model JSON (string | number | boolean) to trimmed display string. */
function toTrimmedDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function normalizePronunciationItem(raw: unknown): PronunciationFocusItem {
  if (!raw || typeof raw !== "object") return { ...PRON_FALLBACK };
  const o = raw as Record<string, unknown>;
  const word = toTrimmedDisplayString(o.word);
  const reasonToPractice = toTrimmedDisplayString(o.reasonToPractice);
  const pronunciationTip = toTrimmedDisplayString(o.pronunciationTip);
  const ipaUsRaw = toTrimmedDisplayString(o.ipaUs);
  const ipaUkRaw = toTrimmedDisplayString(o.ipaUk);
  /** Older API shape: single `ipa` — treat as US-only so one row still shows. */
  const ipaLegacy = toTrimmedDisplayString(o.ipa);
  const out: PronunciationFocusItem = {
    word: word || PRON_FALLBACK.word,
    reasonToPractice: reasonToPractice || PRON_FALLBACK.reasonToPractice,
    pronunciationTip: pronunciationTip || PRON_FALLBACK.pronunciationTip,
  };
  if (ipaUsRaw) out.ipaUs = ipaUsRaw;
  if (ipaUkRaw) out.ipaUk = ipaUkRaw;
  if (!out.ipaUs && !out.ipaUk && ipaLegacy) out.ipaUs = ipaLegacy;
  return out;
}

/** Exactly three practice items (speech mode). */
function normalizePronunciationFocusStrict(
  value: unknown
): PronunciationFocusItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items = value.slice(0, 3).map(normalizePronunciationItem);
  while (items.length < 3) items.push({ ...PRON_FALLBACK });
  return items;
}

const TUTOR_COMMENT_FALLBACK_ZH = "（此欄位模型未回傳內容。）";

function pickTutorStringField(
  o: Record<string, unknown>,
  keys: string[]
): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

/**
 * Normalize `tutorComment` from various model shapes into `TutorPersonalizedComment`.
 * Never returns null — missing or alien shapes use zh fallbacks so a valid image
 * analysis is not discarded.
 */
function normalizeTutorComment(raw: unknown): TutorPersonalizedComment {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      whatWentWell: TUTOR_COMMENT_FALLBACK_ZH,
      biggestImprovementOpportunity: TUTOR_COMMENT_FALLBACK_ZH,
      whatToTryNextTime: TUTOR_COMMENT_FALLBACK_ZH,
    };
  }
  const o = raw as Record<string, unknown>;
  const whatWentWell = pickTutorStringField(o, [
    "whatWentWell",
    "what_went_well",
    "positive",
    "wentWell",
  ]);
  const biggestImprovementOpportunity = pickTutorStringField(o, [
    "biggestImprovementOpportunity",
    "biggest_improvement_opportunity",
    "improvement",
    "improvementOpportunity",
    "biggestImprovement",
  ]);
  const whatToTryNextTime = pickTutorStringField(o, [
    "whatToTryNextTime",
    "what_to_try_next_time",
    "nextSteps",
    "next_steps",
    "tryNext",
    "nextStep",
  ]);
  return {
    whatWentWell: whatWentWell || TUTOR_COMMENT_FALLBACK_ZH,
    biggestImprovementOpportunity:
      biggestImprovementOpportunity || TUTOR_COMMENT_FALLBACK_ZH,
    whatToTryNextTime: whatToTryNextTime || TUTOR_COMMENT_FALLBACK_ZH,
  };
}

function normalizeTutorModelAnswer(raw: unknown): TutorModelAnswerBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const studentVersion = pickTutorStringField(o, [
    "studentVersion",
    "student_version",
  ]);
  const betterVersion = pickTutorStringField(o, [
    "betterVersion",
    "better_version",
  ]);
  const nativeLikeVersion = pickTutorStringField(o, [
    "nativeLikeVersion",
    "native_like_version",
  ]);
  if (!studentVersion && !betterVersion && !nativeLikeVersion) return null;
  return {
    studentVersion: studentVersion || "—",
    betterVersion: betterVersion || "—",
    nativeLikeVersion: nativeLikeVersion || "—",
  };
}

function normalizeLearningSummary(raw: unknown): LearningSummaryBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const pull = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 5)
      : [];
  const strengths = pull(o.strengths);
  const weaknesses = pull(o.weaknesses ?? o.gaps);
  const whatToPracticeNext = pull(
    o.whatToPracticeNext ?? o.what_to_practice_next
  );
  if (
    strengths.length === 0 &&
    weaknesses.length === 0 &&
    whatToPracticeNext.length === 0
  ) {
    return null;
  }
  return { strengths, weaknesses, whatToPracticeNext };
}

/** Up to three pronunciation rows from model JSON (text or speech path). */
function normalizePronunciationFocusFromModel(
  value: unknown
): PronunciationFocusItem[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const items = value.slice(0, 3).map(normalizePronunciationItem);
  while (items.length < 3) items.push({ ...PRON_FALLBACK });
  const hasReal = items.some((i) => i.word && i.word !== PRON_FALLBACK.word);
  return hasReal ? items : [];
}

function normalizePronunciationScores(
  raw: unknown
): PronunciationScoresBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedback =
    typeof o.feedback === "string" ? o.feedback.trim() : "";
  if (!feedback) return null;
  const overallScore = clampScore(o.overallScore);
  const accuracy = clampScore(o.accuracy);
  const fluency = clampScore(o.fluency);
  const clarity = clampScore(o.clarity);
  if (
    typeof o.overallScore !== "number" ||
    typeof o.accuracy !== "number" ||
    typeof o.fluency !== "number" ||
    typeof o.clarity !== "number" ||
    !Number.isFinite(o.overallScore) ||
    !Number.isFinite(o.accuracy) ||
    !Number.isFinite(o.fluency) ||
    !Number.isFinite(o.clarity)
  ) {
    return null;
  }
  return { overallScore, accuracy, fluency, clarity, feedback };
}

function firstNonEmptyString(
  obj: Record<string, unknown>,
  keys: string[]
): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

/** TEMPORARY: homework Answer Overview trace (disable after debugging). */
const HOMEWORK_TRACE_DEBUG = true;

function homeworkTrace(layer: string, payload?: unknown) {
  if (!HOMEWORK_TRACE_DEBUG) return;
  if (payload !== undefined) {
    console.log(`[homework trace] ${layer}`, payload);
  } else {
    console.log(`[homework trace] ${layer}`);
  }
}

export function extractAnswerOverviewFromFormattedReport(formatted: string): string {
  const match =
    /✅\s*Answer Overview\s*\n([\s\S]*?)(?=\n\s*(?:🔍|📈|🔊|💡)|$)/.exec(
      formatted,
    );
  return match?.[1]?.trim() ?? "";
}

function parseNumberedAnswerLines(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\n/)) {
    const m = /^\s*(\d+)[.)]\s*(.+)$/.exec(line.trim());
    if (!m) continue;
    const answer = m[2]!.trim();
    if (!answer || /\(not visible\)/i.test(answer)) continue;
    map.set(m[1]!, answer);
  }
  return map;
}

function patchNotVisibleAnswersInFormattedReport(
  formattedReport: string,
  answerOverview: string,
): string {
  if (!/\(not visible\)/i.test(formattedReport)) return formattedReport;
  const answers = parseNumberedAnswerLines(answerOverview);
  if (answers.size === 0) return formattedReport;
  let out = formattedReport;
  for (const [num, ans] of answers) {
    out = out.replace(
      new RegExp(`(^|\\n)(\\s*${num}[.)]\\s*)\\(not visible\\)`, "gi"),
      `$1$2${ans}`,
    );
  }
  return out;
}

/** Accept camelCase / snake_case from model JSON. */
function extractImageInsightsContainer(
  root: Record<string, unknown>,
): unknown {
  const nested = root.imageInsights ?? root.image_insights;
  if (nested !== undefined && nested !== null) return nested;
  if (
    typeof root.ocrText === "string" ||
    typeof root.ocr_text === "string" ||
    typeof root.visualSummaryZh === "string" ||
    typeof root.visual_summary_zh === "string"
  ) {
    return {
      ocrText: root.ocrText ?? root.ocr_text,
      visualSummaryZh: root.visualSummaryZh ?? root.visual_summary_zh,
    };
  }
  return undefined;
}

function normalizeHomeworkKeyExplanation(raw: unknown): HomeworkKeyExplanation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const questionLabel = toTrimmedDisplayString(
    o.questionLabel ?? o.question ?? o.label,
  );
  const correctAnswer = toTrimmedDisplayString(
    o.correctAnswer ?? o.answer ?? o.correct_answer,
  );
  const why = toTrimmedDisplayString(o.why ?? o.explanation);
  if (!questionLabel && !correctAnswer && !why) return null;
  const example = toTrimmedDisplayString(o.example);
  const grammarExplanation = toTrimmedDisplayString(
    o.grammarExplanation ?? o.grammar_explanation,
  );
  const vocabularyExplanation = toTrimmedDisplayString(
    o.vocabularyExplanation ?? o.vocabulary_explanation,
  );
  const whyWrongChoices = toTrimmedDisplayString(
    o.whyWrongChoices ?? o.why_wrong_choices ?? o.wrongChoices,
  );
  const commonMistakes = toTrimmedDisplayString(
    o.commonMistakes ?? o.common_mistakes,
  );
  const learningTips = toTrimmedDisplayString(
    o.learningTips ?? o.learning_tips ?? o.tips,
  );
  const learningTakeaway = toTrimmedDisplayString(
    o.learningTakeaway ??
      o.learning_takeaway ??
      o.takeaway ??
      o.learningTips ??
      o.learning_tips,
  );
  return {
    questionLabel: questionLabel || "Question",
    correctAnswer: correctAnswer || "—",
    why: why || "—",
    ...(example ? { example } : {}),
    ...(grammarExplanation ? { grammarExplanation } : {}),
    ...(vocabularyExplanation ? { vocabularyExplanation } : {}),
    ...(whyWrongChoices ? { whyWrongChoices } : {}),
    ...(commonMistakes ? { commonMistakes } : {}),
    ...(learningTips ? { learningTips } : {}),
    ...(learningTakeaway ? { learningTakeaway } : {}),
  };
}

function formatHomeworkQuestionLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return "Question";
  if (/^question\s/i.test(t)) return t;
  if (/^q\.?\s*\d+/i.test(t)) return t.replace(/^q\.?\s*/i, "Question ");
  if (/^\d+$/.test(t)) return `Question ${t}`;
  return t;
}

const VAGUE_RECOGNITION_ISSUE =
  /may need verification|可能需要驗證|部分答案|uncertain answer|answer inference|推論答案|無法確認答案/i;

function isVagueRecognitionIssue(issue: string): boolean {
  return VAGUE_RECOGNITION_ISSUE.test(issue);
}

function normalizeHomeworkQuestionRecognitionIssue(
  raw: unknown,
): HomeworkQuestionRecognitionIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const questionLabel = formatHomeworkQuestionLabel(
    toTrimmedDisplayString(
      o.questionLabel ??
        o.question_label ??
        o.question ??
        o.questionNumber ??
        o.question_number ??
        o.number,
    ),
  );
  const issue = toTrimmedDisplayString(
    o.issue ?? o.reason ?? o.problem ?? o.note ?? o.description,
  );
  if (!questionLabel || questionLabel === "Question" || !issue) return null;
  if (isVagueRecognitionIssue(issue)) return null;
  return { questionLabel, issue };
}

const VAGUE_HOMEWORK_WARNING_PATTERNS = [
  /部分答案可能需要驗證[。.]?\s*/g,
  /some answers may need verification[.]?\s*/gi,
  /low ocr confidence[^.\n]*[.]?\s*/gi,
];

function sanitizeHomeworkFormattedReport(text: string): string {
  let out = text;
  for (const pattern of VAGUE_HOMEWORK_WARNING_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

// =====================================================
// Architecture Rule
//
// Provider response
//          ↓
// Schema Mapping Layer  (homeworkSchemaMapping.ts)
//          ↓
// Internal Homework Schema
//          ↓
// Parser  (this function and parseAnalyzeApiData)
//          ↓
// UI
//
// Parser must never branch on Provider.
// Parser must only consume Internal Schema.
// Provider differences belong only in the Mapping Layer.
// =====================================================

function normalizeHomeworkReport(raw: unknown): HomeworkReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  homeworkTrace("homework_parser_input", {
    homeworkType: o.homeworkType ?? o.homework_type ?? o.type,
    answerOverview: o.answerOverview ?? o.answer_overview ?? o.answers,
    formattedReportLength:
      typeof o.formattedReport === "string"
        ? o.formattedReport.length
        : typeof o.formatted_report === "string"
          ? o.formatted_report.length
          : 0,
    formattedReportAnswerOverviewSnippet: extractAnswerOverviewFromFormattedReport(
      toTrimmedDisplayString(
        o.formattedReport ?? o.formatted_report ?? o.reportMarkdown,
      ),
    ).slice(0, 400),
  });
  const formattedReport = toTrimmedDisplayString(
    o.formattedReport ?? o.formatted_report ?? o.reportMarkdown,
  );
  const homeworkType = toTrimmedDisplayString(
    o.homeworkType ?? o.homework_type ?? o.type,
  );
  const answerOverview = toTrimmedDisplayString(
    o.answerOverview ?? o.answer_overview ?? o.answers,
  );
  const keyRaw = o.keyExplanations ?? o.key_explanations ?? o.explanations;
  const keyExplanations = Array.isArray(keyRaw)
    ? keyRaw
        .map(normalizeHomeworkKeyExplanation)
        .filter((x): x is HomeworkKeyExplanation => x != null)
    : [];
  const pronunciationFocus: HomeworkPronunciationRow[] = [];
  const learnRaw = o.learningSignal ?? o.learning_signal ?? o.todayLearned;
  const learningSignal = Array.isArray(learnRaw)
    ? learnRaw
        .map((x) => toTrimmedDisplayString(x))
        .filter((s) => s.length > 0)
    : [];
  const questionCountRaw = o.questionCount ?? o.question_count ?? o.questions;
  const questionCount =
    typeof questionCountRaw === "number" && Number.isFinite(questionCountRaw)
      ? questionCountRaw
      : toTrimmedDisplayString(questionCountRaw) || "—";
  const imageQuality = toTrimmedDisplayString(
    o.imageQuality ?? o.image_quality ?? o.quality,
  );
  const recognitionRaw =
    o.questionRecognitionIssues ??
    o.question_recognition_issues ??
    o.recognitionIssues ??
    o.recognition_issues;
  const questionRecognitionIssues = Array.isArray(recognitionRaw)
    ? recognitionRaw
        .map(normalizeHomeworkQuestionRecognitionIssue)
        .filter((x): x is HomeworkQuestionRecognitionIssue => x != null)
    : [];
  if (
    !formattedReport &&
    !homeworkType &&
    !answerOverview &&
    keyExplanations.length === 0
  ) {
    return null;
  }
  const answerOverviewFinal = answerOverview || "—";
  const formattedReportFinal = formattedReport
    ? patchNotVisibleAnswersInFormattedReport(
        sanitizeHomeworkFormattedReport(formattedReport),
        answerOverviewFinal,
      )
    : undefined;
  const learningSummary = normalizeLearningSummary(
    o.learningSummary ?? o.learning_summary,
  );
  const studentAnswersStatus =
    parseStudentAnswersStatus(
      o.studentAnswersStatus ?? o.student_answers_status,
    ) ??
    (typeof o.studentAnswersDetected === "boolean"
      ? o.studentAnswersDetected
        ? "detected"
        : "none"
      : typeof o.student_answers_detected === "boolean"
        ? o.student_answers_detected
          ? "detected"
          : "none"
        : undefined);
  const noStudentAnswersMessage = toTrimmedDisplayString(
    o.noStudentAnswersMessage ?? o.no_student_answers_message,
  );
  const unclearPhotoMessage = toTrimmedDisplayString(
    o.unclearPhotoMessage ?? o.unclear_photo_message,
  );
  const insufficientEvidenceMessage = toTrimmedDisplayString(
    o.insufficientEvidenceMessage ?? o.insufficient_evidence_message,
  );
  const totalQuestionCount = (() => {
    const raw =
      o.totalQuestionCount ??
      o.total_question_count ??
      o.studentTotalQuestions;
    if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
      return Math.round(raw);
    }
    const parsed = parseDeclaredQuestionCount(
      typeof raw === "string" ? raw : questionCount,
    );
    return parsed ?? undefined;
  })();
  const studentAnsweredQuestions = (() => {
    const raw =
      o.studentAnsweredQuestions ??
      o.student_answered_questions ??
      o.answeredQuestionCount ??
      o.answered_questions;
    if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
      return Math.round(raw);
    }
    const m = toTrimmedDisplayString(raw);
    const n = m ? parseInt(/(\d+)/.exec(m)?.[1] ?? "", 10) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  })();
  const coverageRaw =
    o.studentAnswerCoveragePercent ??
    o.student_answer_coverage_percent ??
    o.answerCoveragePercent ??
    o.answer_coverage_percent;
  const studentAnswerCoveragePercent =
    typeof coverageRaw === "number" && Number.isFinite(coverageRaw)
      ? Math.round(Math.min(100, Math.max(0, coverageRaw)))
      : undefined;
  const questionAnswerAuditRaw =
    o.questionAnswerAudit ?? o.question_answer_audit ?? o.perQuestionAnswerStatus;
  const questionAnswerAudit = Array.isArray(questionAnswerAuditRaw)
    ? questionAnswerAuditRaw
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const questionNumber =
            typeof row.questionNumber === "number"
              ? row.questionNumber
              : typeof row.question_number === "number"
                ? row.question_number
                : null;
          const statusRaw = toTrimmedDisplayString(
            row.status ?? row.answerStatus ?? row.answer_status,
          ).toLowerCase();
          const status =
            statusRaw === "answered" || statusRaw === "filled" || statusRaw === "handwritten"
              ? ("answered" as const)
              : statusRaw === "blank" ||
                  statusRaw === "empty" ||
                  statusRaw === "unanswered"
                ? ("blank" as const)
                : null;
          const reason = toTrimmedDisplayString(row.reason ?? row.note);
          if (!questionNumber || !status || !reason) return null;
          const snippet = toTrimmedDisplayString(
            row.studentAnswerSnippet ??
              row.student_answer_snippet ??
              row.snippet,
          );
          const answerAreaOcr = toTrimmedDisplayString(
            row.answerAreaOcr ?? row.answer_area_ocr ?? row.ocrInAnswerArea,
          );
          const handwritingDetected =
            row.handwritingDetected === true ||
            row.handwriting_detected === true;
          const confidenceRaw =
            row.confidence ?? row.handwritingConfidence ?? row.handwriting_confidence;
          const confidence =
            typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
              ? Math.round(Math.min(100, Math.max(0, confidenceRaw)))
              : undefined;
          return {
            questionNumber,
            ...(toTrimmedDisplayString(row.questionLabel ?? row.question_label)
              ? {
                  questionLabel: toTrimmedDisplayString(
                    row.questionLabel ?? row.question_label,
                  ),
                }
              : {}),
            status,
            reason,
            ...(snippet ? { studentAnswerSnippet: snippet } : {}),
            ...(answerAreaOcr ? { answerAreaOcr } : {}),
            ...(handwritingDetected ? { handwritingDetected: true } : {}),
            ...(confidence != null ? { confidence } : {}),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;
  const report: HomeworkReport = {
    homeworkType: homeworkType || "English worksheet",
    questionCount,
    imageQuality: imageQuality || "Fair",
    ...(studentAnswersStatus ? { studentAnswersStatus } : {}),
    ...(noStudentAnswersMessage ? { noStudentAnswersMessage } : {}),
    ...(unclearPhotoMessage ? { unclearPhotoMessage } : {}),
    ...(insufficientEvidenceMessage ? { insufficientEvidenceMessage } : {}),
    ...(totalQuestionCount != null ? { totalQuestionCount } : {}),
    ...(studentAnsweredQuestions != null
      ? { studentAnsweredQuestions }
      : {}),
    ...(studentAnswerCoveragePercent != null
      ? { studentAnswerCoveragePercent }
      : {}),
    ...(questionAnswerAudit && questionAnswerAudit.length > 0
      ? { questionAnswerAudit }
      : {}),
    ...(questionRecognitionIssues.length > 0
      ? { questionRecognitionIssues }
      : { questionRecognitionIssues: [] }),
    ...(Array.isArray(o.lowConfidenceQuestions) ||
    Array.isArray(o.low_confidence_questions)
      ? {
          lowConfidenceQuestions: [
            ...new Set(
              (
                (o.lowConfidenceQuestions ??
                  o.low_confidence_questions) as unknown[]
              )
                .map((n) =>
                  typeof n === "number" && Number.isFinite(n)
                    ? Math.round(n)
                    : 0,
                )
                .filter((n) => n > 0),
            ),
          ].sort((a, b) => a - b),
        }
      : {}),
    ...(o.questionEvidenceMap &&
    typeof o.questionEvidenceMap === "object" &&
    !Array.isArray(o.questionEvidenceMap)
      ? {
          questionEvidenceMap:
            o.questionEvidenceMap as HomeworkReport["questionEvidenceMap"],
        }
      : o.question_evidence_map &&
          typeof o.question_evidence_map === "object" &&
          !Array.isArray(o.question_evidence_map)
        ? {
            questionEvidenceMap:
              o.question_evidence_map as HomeworkReport["questionEvidenceMap"],
          }
        : {}),
    ...(toTrimmedDisplayString(o.hintsFirst ?? o.hints_first)
      ? { hintsFirst: toTrimmedDisplayString(o.hintsFirst ?? o.hints_first) }
      : {}),
    answerOverview: answerOverviewFinal,
    keyExplanations,
    pronunciationFocus,
    learningSignal,
    ...(toTrimmedDisplayString(o.studentIntent ?? o.student_intent)
      ? {
          studentIntent: toTrimmedDisplayString(
            o.studentIntent ?? o.student_intent,
          ),
        }
      : {}),
    ...(formattedReportFinal ? { formattedReport: formattedReportFinal } : {}),
    ...(learningSummary ? { learningSummary } : {}),
  };
  const parserAnswerCount = countAnswerOverviewEntries(report.answerOverview);
  const uiDisplayCount = countHomeworkUiAnswerEntries(report);
  const declaredCount = parseDeclaredQuestionCount(report.questionCount);
  logHomeworkQuestionCountTrace("parser_output", {
    declaredQuestionCount: declaredCount,
    parserAnswerOverviewCount: parserAnswerCount,
    uiDisplayAnswerCount: uiDisplayCount,
    hasFormattedReport: Boolean(report.formattedReport),
  });
  homeworkTrace("homework_parser_output", {
    answerOverview: report.answerOverview,
    formattedReportAnswerOverviewSnippet: report.formattedReport
      ? extractAnswerOverviewFromFormattedReport(report.formattedReport).slice(
          0,
          400,
        )
      : null,
    hasFormattedReport: Boolean(report.formattedReport),
    parserAnswerOverviewCount: parserAnswerCount,
    uiDisplayAnswerCount: uiDisplayCount,
  });
  return report;
}

function normalizeImageInsights(raw: unknown): ImageInsights | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  homeworkTrace("image_insights_input", {
    ocrTextSnippet: firstNonEmptyString(o, [
      "ocrText",
      "ocr_text",
      "ocr",
      "textInImage",
      "text_in_image",
    ]).slice(0, 400),
    homeworkReportAnswerOverview:
      o.homeworkReport &&
      typeof o.homeworkReport === "object" &&
      !Array.isArray(o.homeworkReport)
        ? (o.homeworkReport as Record<string, unknown>).answerOverview ??
          (o.homeworkReport as Record<string, unknown>).answer_overview
        : null,
  });
  const homeworkReport = normalizeHomeworkReport(
    o.homeworkReport ?? o.homework_report ?? o.homework,
  );
  const ocrText = firstNonEmptyString(o, [
    "ocrText",
    "ocr_text",
    "ocr",
    "textInImage",
    "text_in_image",
  ]);
  const visualSummaryZh = firstNonEmptyString(o, [
    "visualSummaryZh",
    "visual_summary_zh",
    "visualSummary",
    "visual_summary",
    "summaryZh",
    "summary_zh",
    "descriptionZh",
    "description_zh",
  ]);
  if (!homeworkReport && !ocrText && !visualSummaryZh) return null;
  const result: ImageInsights = {
    ocrText: ocrText || homeworkReport?.homeworkType || "（未偵測到可讀文字）",
    visualSummaryZh: visualSummaryZh || homeworkReport?.answerOverview || "—",
    ...(homeworkReport ? { homeworkReport } : {}),
  };
  homeworkTrace("image_insights_output", {
    ocrTextSnippet: result.ocrText.slice(0, 400),
    answerOverview: result.homeworkReport?.answerOverview ?? null,
    formattedReportAnswerOverviewSnippet: result.homeworkReport?.formattedReport
      ? extractAnswerOverviewFromFormattedReport(
          result.homeworkReport.formattedReport,
        ).slice(0, 400)
      : null,
  });
  return result;
}

/** Optional logger for temporary analyze debugging (server or browser console). */
export type AnalyzeParseLog = (label: string, payload?: unknown) => void;

/** Homework vision must never surface Talk / Learning Review language. */
const HOMEWORK_TALK_LEAK_PATTERN =
  /learning review|學習回顧|recent student (lines|responses|messages|answers)|tutoring conversation|analyze the student'?s recent|whisper transcript|【學生第\s*\d+\s*則】|LEARNING-REVIEW REQUIREMENTS|student lines from an english tutoring|conversation history|talk mode|口說分析|對話紀錄/i;

function homeworkTextLooksLikeTalkLeak(text: string): boolean {
  return HOMEWORK_TALK_LEAK_PATTERN.test(text);
}

function sanitizeHomeworkVisionText(text: string): string {
  if (!text.trim()) return text;
  const blocks = text.split(/\n{2,}/);
  const kept = blocks.filter((block) => !homeworkTextLooksLikeTalkLeak(block));
  let out = kept.join("\n\n").trim();
  if (!out && text.trim()) {
    out = text
      .split("\n")
      .filter((line) => !homeworkTextLooksLikeTalkLeak(line))
      .join("\n")
      .trim();
  }
  return out || text;
}

function sanitizeHomeworkLearningSummary(
  summary: LearningSummaryBlock,
): LearningSummaryBlock | null {
  const filter = (items: string[]) =>
    items.filter((s) => s.trim().length > 0 && !homeworkTextLooksLikeTalkLeak(s));
  const strengths = filter(summary.strengths);
  const weaknesses = filter(summary.weaknesses);
  const whatToPracticeNext = filter(summary.whatToPracticeNext);
  if (
    strengths.length === 0 &&
    weaknesses.length === 0 &&
    whatToPracticeNext.length === 0
  ) {
    return null;
  }
  return { strengths, weaknesses, whatToPracticeNext };
}

function sanitizeHomeworkKeyExplanation(
  item: HomeworkKeyExplanation,
): HomeworkKeyExplanation {
  const clean = (s: string | undefined) =>
    s && homeworkTextLooksLikeTalkLeak(s) ? undefined : s;
  return {
    ...item,
    why: sanitizeHomeworkVisionText(item.why),
    correctAnswer: item.correctAnswer,
    ...(clean(item.grammarExplanation)
      ? { grammarExplanation: item.grammarExplanation }
      : {}),
    ...(clean(item.vocabularyExplanation)
      ? { vocabularyExplanation: item.vocabularyExplanation }
      : {}),
    ...(clean(item.whyWrongChoices)
      ? { whyWrongChoices: item.whyWrongChoices }
      : {}),
    ...(clean(item.commonMistakes)
      ? { commonMistakes: item.commonMistakes }
      : {}),
    ...(clean(item.learningTips) ? { learningTips: item.learningTips } : {}),
    ...(clean(item.learningTakeaway)
      ? { learningTakeaway: item.learningTakeaway }
      : {}),
    ...(clean(item.example) ? { example: item.example } : {}),
  };
}

/** Homework vision: strip speech-practice rows and Talk/Learning Review leakage. */
function finalizeHomeworkVisionInsights(
  insights: ImageInsights,
  studentAnswerObject?: StudentAnswerObject | null,
): ImageInsights {
  if (!insights.homeworkReport) {
    return {
      ...insights,
      ocrText: sanitizeHomeworkVisionText(insights.ocrText),
      visualSummaryZh: sanitizeHomeworkVisionText(insights.visualSummaryZh),
    };
  }
  const guarded = applyHomeworkStudentAnswersGuard(
    {
      ...insights,
      ocrText: sanitizeHomeworkVisionText(insights.ocrText),
      visualSummaryZh: sanitizeHomeworkVisionText(insights.visualSummaryZh),
    },
    { studentAnswerObject },
  );
  const report = guarded.homeworkReport!;
  const learningSummary =
    report.learningSummary && homeworkAllowsPerformanceEvaluation(report.studentAnswersStatus)
      ? sanitizeHomeworkLearningSummary(report.learningSummary)
      : undefined;
  return {
    ...guarded,
    homeworkReport: {
      ...report,
      pronunciationFocus: [],
      hintsFirst: report.hintsFirst
        ? sanitizeHomeworkVisionText(report.hintsFirst)
        : undefined,
      answerOverview: sanitizeHomeworkVisionText(report.answerOverview),
      formattedReport: report.formattedReport
        ? sanitizeHomeworkVisionText(report.formattedReport)
        : undefined,
      keyExplanations: report.keyExplanations.map(sanitizeHomeworkKeyExplanation),
      learningSignal: report.learningSignal
        .map((s) => sanitizeHomeworkVisionText(s))
        .filter((s) => s.length > 0 && !homeworkTextLooksLikeTalkLeak(s)),
      ...(learningSummary ? { learningSummary } : {}),
    },
  };
}

function extractHomeworkLearningSummary(
  imageInsights: ImageInsights | null,
): LearningSummaryBlock | null {
  const report = imageInsights?.homeworkReport;
  if (!report || !homeworkAllowsPerformanceEvaluation(report.studentAnswersStatus)) {
    return null;
  }
  const raw = report.learningSummary ?? null;
  if (!raw) return null;
  return sanitizeHomeworkLearningSummary(raw);
}

// =====================================================
// Architecture Rule
//
// Provider response
//          ↓
// Schema Mapping Layer  (homeworkSchemaMapping.ts)
//          ↓
// Internal Homework Schema
//          ↓
// Parser  (parseAnalyzeApiData — entry point)
//          ↓
// UI
//
// Parser must never branch on Provider.
// Parser must only consume Internal Schema.
// Provider differences belong only in the Mapping Layer.
// =====================================================

/**
 * Parse successful `/api/analyze` JSON body into `AnalyzeFeedback`.
 * Returns `null` if required fields are missing or invalid.
 *
 * @param requireSpeechPronunciation — when true, `pronunciationScores` and three
 *   `pronunciationFocus` items are required (speech-test path). When false,
 *   optional `pronunciationFocus` is accepted only for **text-only** responses
 *   (no `imageInsights`); vision responses ignore it.
 * @param log — when set, each parse failure logs a concrete reason (temporary diagnostics).
 */
export function parseAnalyzeApiData(
  data: unknown,
  requireSpeechPronunciation: boolean,
  log?: AnalyzeParseLog,
  options?: ParseAnalyzeOptions,
): AnalyzeFeedback | null {
  if (!data || typeof data !== "object") {
    log?.("parse_fail_root_not_object", { typeofData: typeof data });
    return null;
  }
  const o = data as Record<string, unknown>;

  homeworkTrace("llm_parsed_root", {
    topLevelKeys: Object.keys(o),
    topLevelFormattedReportPresent: Boolean(
      o.formattedReport ?? o.formatted_report,
    ),
    topLevelAnswerOverview:
      o.answerOverview ?? o.answer_overview ?? o.answers ?? null,
    imageInsightsHomeworkAnswerOverview:
      o.imageInsights &&
      typeof o.imageInsights === "object" &&
      !Array.isArray(o.imageInsights) &&
      (o.imageInsights as Record<string, unknown>).homeworkReport &&
      typeof (o.imageInsights as Record<string, unknown>).homeworkReport ===
        "object"
        ? (
            (o.imageInsights as Record<string, unknown>)
              .homeworkReport as Record<string, unknown>
          ).answerOverview
        : null,
    ocrTextSnippet:
      o.imageInsights &&
      typeof o.imageInsights === "object" &&
      !Array.isArray(o.imageInsights)
        ? firstNonEmptyString(o.imageInsights as Record<string, unknown>, [
            "ocrText",
            "ocr_text",
          ]).slice(0, 400)
        : firstNonEmptyString(o, ["ocrText", "ocr_text"]).slice(0, 400),
  });

  const imageInsightsRaw = extractImageInsightsContainer(o);
  let imageInsights = normalizeImageInsights(imageInsightsRaw);
  const hasHomeworkReport = Boolean(imageInsights?.homeworkReport);
  const visionMode = Boolean(imageInsights);
  const isHomeworkVision = visionMode && !requireSpeechPronunciation;
  const studentCorpusPresent = isHomeworkVision
    ? false
    : (options?.hasStudentCorpus ?? !visionMode);

  const analysisCapabilities = buildAnalysisCapabilities({
    hasStudentCorpus: studentCorpusPresent,
    hasImageInsights: visionMode,
    requireSpeechPronunciation,
  });

  if (isHomeworkVision) {
    if (!imageInsights) {
      log?.("parse_fail_homework_vision_no_insights");
      return null;
    }
    imageInsights = finalizeHomeworkVisionInsights(
      imageInsights,
      options?.studentAnswerObject,
    );
    const learningSummary = extractHomeworkLearningSummary(imageInsights);
    const canEvaluateHomework = homeworkAllowsPerformanceEvaluation(
      imageInsights.homeworkReport?.studentAnswersStatus,
    );
    const homeworkCaps = buildAnalysisCapabilities({
      hasStudentCorpus: false,
      hasImageInsights: true,
      requireSpeechPronunciation: false,
      homeworkPerformanceEvaluation: canEvaluateHomework,
    });
    log?.("parse_ok_homework_vision", {
      analysisCapabilities: homeworkCaps,
      hasHomeworkReport,
      hasLearningSummary: Boolean(learningSummary),
    });
    return {
      grammar: IMAGE_ONLY_SCORE_STUB,
      vocabulary: IMAGE_ONLY_SCORE_STUB,
      fluency: IMAGE_ONLY_SCORE_STUB,
      pronunciationFocus: [],
      tutorComment: IMAGE_ONLY_TUTOR_COMMENT_STUB,
      imageInsights,
      ...(learningSummary ? { learningSummary } : {}),
      analysisCapabilities: homeworkCaps,
    };
  }

  const gapFallback = "（此處應有對照例：請重試分析或請老師補充具體寫法。）";
  const grammar = normalizeScoreCategory(
    o.grammar,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  const vocabulary = normalizeScoreCategory(
    o.vocabulary,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  const fluency = normalizeScoreCategory(
    o.fluency,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  const expression = normalizeScoreCategory(
    o.expression,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  if (!grammar || !vocabulary || !fluency) {
    if (!hasHomeworkReport) {
      log?.("parse_fail_score_category", {
        grammarOk: Boolean(grammar),
        vocabularyOk: Boolean(vocabulary),
        fluencyOk: Boolean(fluency),
        rawGrammar: o.grammar,
        rawVocabulary: o.vocabulary,
        rawFluency: o.fluency,
      });
      return null;
    }
  }

  const homeworkScoreFallback: ScoreCategoryFeedback = {
    score: 0,
    strengths: ["See homework report sections above."],
    whyNot100: ["See 🔍 Key Explanations in the homework report."],
    improvementExamples: ["See 📈 Today's Learning Signal."],
  };

  const grammarFinal = grammar ?? homeworkScoreFallback;
  const vocabularyFinal = vocabulary ?? homeworkScoreFallback;
  const fluencyFinal = fluency ?? homeworkScoreFallback;

  const tutorComment = normalizeTutorComment(o.tutorComment);
  log?.("parse_tutor_comment_normalized", {
    rawTutorComment: o.tutorComment,
    mapped: tutorComment,
  });

  const tutorModelAnswer = normalizeTutorModelAnswer(o.tutorModelAnswer);
  const learningSummary = normalizeLearningSummary(o.learningSummary);
  log?.("parse_image_insights_step", {
    extractedContainer: imageInsightsRaw,
    normalized: imageInsights,
    ocrText: imageInsights?.ocrText,
    visualSummaryZh: imageInsights?.visualSummaryZh,
    topLevelKeys: Object.keys(o),
  });

  if (requireSpeechPronunciation) {
    const pronunciationScores = normalizePronunciationScores(
      o.pronunciationScores
    );
    const pronunciationFocusStrict = normalizePronunciationFocusStrict(
      o.pronunciationFocus
    );
    if (!pronunciationScores || !pronunciationFocusStrict) {
      log?.("parse_fail_speech_pronunciation", {
        pronunciationScoresRaw: o.pronunciationScores,
        pronunciationFocusRaw: o.pronunciationFocus,
        normalizedScoresOk: Boolean(pronunciationScores),
        normalizedFocusOk: Boolean(pronunciationFocusStrict),
      });
      return null;
    }
    log?.("parse_ok_speech_mode", {
      hasImageInsights: Boolean(imageInsights),
      imageInsights,
    });
    return {
      pronunciationScores,
      grammar: grammarFinal,
      vocabulary: vocabularyFinal,
      fluency: fluencyFinal,
      ...(expression ? { expression } : {}),
      pronunciationFocus: pronunciationFocusStrict,
      tutorComment,
      ...(tutorModelAnswer ? { tutorModelAnswer } : {}),
      ...(learningSummary ? { learningSummary } : {}),
      ...(imageInsights ? { imageInsights } : {}),
      analysisCapabilities,
    };
  }

  /**
   * Typed text and/or images: optional dictionary-style pronunciation rows when
   * the model returns `pronunciationFocus` (text-only path). Vision responses
   * include `imageInsights` and must not surface text-derived pronunciation.
   */
  log?.("parse_ok_non_speech_mode", {
    hasImageInsights: Boolean(imageInsights),
    imageInsights,
    ocrText: imageInsights?.ocrText,
    visualSummaryZh: imageInsights?.visualSummaryZh,
  });
  const pronunciationFocusNonSpeech = visionMode
    ? []
    : normalizePronunciationFocusFromModel(o.pronunciationFocus);
  return {
    grammar: grammarFinal,
    vocabulary: vocabularyFinal,
    fluency: fluencyFinal,
    ...(expression ? { expression } : {}),
    pronunciationFocus: pronunciationFocusNonSpeech,
    tutorComment,
    ...(tutorModelAnswer ? { tutorModelAnswer } : {}),
    ...(learningSummary ? { learningSummary } : {}),
    ...(imageInsights ? { imageInsights } : {}),
    analysisCapabilities,
  };
}
