import type { HomeworkReport, ImageInsights, LearningSummaryBlock } from "@/lib/analyzeFeedback";
import {
  detectQuestionHandwriting,
  logHandwritingDetectionEvidence,
  type HandwritingDetectionEvidence,
} from "@/lib/handwritingDetection";
import { formatQuestionRangesZh } from "@/lib/worksheetCapture";
export type StudentAnswersStatus = "none" | "unclear" | "insufficient" | "detected";

export type QuestionAnswerState = "answered" | "blank";

export type QuestionAnswerAuditEntry = {
  questionNumber: number;
  questionLabel: string;
  status: QuestionAnswerState;
  reason: string;
  source: "model_audit" | "answer_overview" | "default_blank" | "handwriting_detection";
  studentAnswerSnippet?: string;
  handwritingDetection?: HandwritingDetectionEvidence;
};

/** Minimum answered questions before learning analytics are allowed. */
export const MIN_ANSWERED_QUESTIONS_FOR_EVALUATION = 3;
/** Minimum answer coverage (%) before learning analytics are allowed. */
export const MIN_ANSWER_COVERAGE_PERCENT_FOR_EVALUATION = 20;

const HOMEWORK_ANSWER_AUDIT_DEBUG = true;

export type StudentAnswerEvidence = {
  totalQuestions: number;
  answeredQuestions: number;
  answerCoveragePercent: number;
  perQuestion: QuestionAnswerAuditEntry[];
  debugLog: string[];
};

export const NO_STUDENT_ANSWERS_MESSAGE_EN =
  "No student answers were detected.\nI cannot evaluate learning performance yet.\nI can explain the questions, teach the concepts, or wait until the student finishes the worksheet.";

export const NO_STUDENT_ANSWERS_MESSAGE_ZH =
  "未偵測到學生作答。\n我還無法評估學習表現。\n我可以說明題目、教學概念，或等你完成作業後再分析。";

export const UNCLEAR_STUDENT_ANSWERS_MESSAGE_EN =
  "I cannot tell whether the student has written answers on this photo.\nPlease upload a clearer picture (better lighting, less glare, full worksheet in frame).\nI will not guess student performance from unclear images.";

export const UNCLEAR_STUDENT_ANSWERS_MESSAGE_ZH =
  "無法確認作業上是否有學生手寫作答。\n請重新拍攝更清楚的照片（光線充足、減少反光、完整入鏡）。\n在無法確認前，我不會推測學生的學習表現。";

/** Minimum worksheet answer coverage (%) before treating partial work as ready for analysis intro. */
export const PARTIAL_ANSWER_COVERAGE_READY_PERCENT = 80;

const CONTRADICTORY_EVIDENCE_PATTERNS = [
  /Only a small number of answers were detected\.?/gi,
  /There is not enough evidence to evaluate learning performance yet\.?/gi,
  /not enough evidence to evaluate/gi,
  /Unable to evaluate(?: learning performance)?/gi,
  /只偵測到少量作答。?/g,
  /尚無足夠證據評估整體學習表現。?/g,
  /無法評估(?:整體)?學習表現/g,
];

export function formatStudentAnswersNotice(
  status: Exclude<StudentAnswersStatus, "detected">,
  evidence?: StudentAnswerEvidence,
): string {
  if (status === "unclear") {
    return UNCLEAR_STUDENT_ANSWERS_MESSAGE_ZH;
  }
  if (status === "insufficient" && evidence) {
    return formatTutorAnswerSummary(evidence);
  }
  return NO_STUDENT_ANSWERS_MESSAGE_ZH;
}

function preferTraditionalChineseNotice(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const blocks = trimmed.split(/\n\n+/);
  const zhBlocks = blocks.filter((b) => /[\u4e00-\u9fff]/.test(b));
  if (zhBlocks.length > 0) return zhBlocks.join("\n\n");
  return trimmed;
}

function stripContradictoryEvidenceMessages(text: string): string {
  let out = text;
  for (const pattern of CONTRADICTORY_EVIDENCE_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Remove debug / contradictory English from text shown to students. */
export function sanitizeStudentFacingHomeworkText(text: string): string {
  let out = stripContradictoryEvidenceMessages(text);
  out = out.replace(
    /^(?:Q|第)\s*\d+\s*(?:題)?\s*[:：]\s*(?:answered|blank)\s*$/gim,
    "",
  );
  out = out.replace(/^model audit:.*$/gim, "");
  out = out.replace(
    /^(?:Status|OCR in answer area|Handwriting detected|Confidence|Why|Rejected by rule|Exact evidence|Reason):.*$/gim,
    "",
  );
  const headerReplacements: [RegExp, string][] = [
    [/📸\s*Homework analyzed/gi, "📸 作業分析完成"],
    [/✅\s*Answer Overview/gi, "✅ 作答總覽"],
    [/🔍\s*Key Explanations?/gi, "🔍 重點解析"],
    [/🔊\s*Pronunciation Practice/gi, "🔊 發音練習"],
    [/📈\s*Today'?s Learning Signal/gi, "📈 今日學習重點"],
    [/💡\s*Hints/gi, "💡 提示"],
    [/•\s*Homework type:/gi, "• 作業類型："],
    [/•\s*Number of questions:/gi, "• 題數："],
    [/•\s*Image quality:/gi, "• 照片品質："],
    [/Correct answer:\s*/gi, "正確答案："],
    [/Why\?\s*/gi, "說明："],
    [/Example:\s*/gi, "例句："],
  ];
  for (const [pattern, replacement] of headerReplacements) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Tutor-facing summary derived from per-question answer statistics — never contradicts counts. */
export function formatTutorAnswerSummary(evidence: StudentAnswerEvidence): string {
  const { answeredQuestions, totalQuestions, perQuestion } = evidence;
  const missing = perQuestion
    .filter((q) => q.status === "blank")
    .map((q) => q.questionNumber);
  const missingRange = formatQuestionRangesZh(missing);

  if (totalQuestions > 0 && answeredQuestions === totalQuestions) {
    return [
      "---",
      "太棒了！",
      `我已成功辨識全部 ${totalQuestions} 題作答。`,
      "接下來我會開始分析：",
      "• 每一題是否答對",
      "• 文法、拼字與用字",
      "• 哪些觀念需要加強",
      "• 哪些地方表現很好",
      "---",
    ].join("\n");
  }

  const coveragePercent =
    totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : evidence.answerCoveragePercent;

  if (coveragePercent >= PARTIAL_ANSWER_COVERAGE_READY_PERCENT && missing.length > 0) {
    return [
      `我已辨識 ${answeredQuestions} / ${totalQuestions} 題作答。`,
      "",
      `還有 ${missing.length} 題需要補清楚：`,
      missingRange ? `• ${missingRange}` : `• 第 ${missing.join("、")} 題`,
      "",
      "請只針對這幾題補拍即可，不用重拍整張作業。",
    ].join("\n");
  }

  if (missing.length > 0) {
    return [
      `目前辨識到 ${answeredQuestions} / ${totalQuestions} 題作答。`,
      "",
      "請補拍尚未清楚作答的題目：",
      missingRange ? `• ${missingRange}` : `• 第 ${missing.join("、")} 題`,
      "",
      "只要補拍缺少的題目就好，不需要重拍整張作業。",
    ].join("\n");
  }

  return [
    `目前已辨識 ${answeredQuestions} / ${totalQuestions} 題作答。`,
    "若還有漏掉的題目，請補拍該題附近即可。",
  ].join("\n");
}

function evidenceFromModelAudit(
  report: HomeworkReport,
  fallback: StudentAnswerEvidence,
): StudentAnswerEvidence {
  const modelAudit = parseModelQuestionAudit(report);
  if (!modelAudit?.length) return fallback;

  const total =
    toPositiveInt(report.totalQuestionCount) ??
    toPositiveInt(report.questionCount) ??
    fallback.totalQuestions ??
    Math.max(...modelAudit.map((a) => a.questionNumber));
  if (total <= 0) return fallback;

  const auditByNumber = new Map(modelAudit.map((a) => [a.questionNumber, a]));
  const perQuestion: QuestionAnswerAuditEntry[] = [];
  for (let n = 1; n <= total; n++) {
    const item = auditByNumber.get(n);
    perQuestion.push({
      questionNumber: n,
      questionLabel: `第${n}題`,
      status: item?.status ?? "blank",
      reason: item?.reason ?? "model audit: not listed",
      source: "model_audit",
      ...(item?.studentAnswerSnippet
        ? { studentAnswerSnippet: item.studentAnswerSnippet }
        : {}),
    });
  }

  const answeredQuestions = perQuestion.filter((q) => q.status === "answered").length;
  return {
    totalQuestions: total,
    answeredQuestions,
    answerCoveragePercent:
      total > 0 ? Math.round((answeredQuestions / total) * 100) : 0,
    perQuestion,
    debugLog: fallback.debugLog,
  };
}

const NO_STUDENT_WORK_TEXT =
  /blank worksheet|no (?:student )?(?:handwriting|written answers|answers filled)|only printed questions|empty (?:answer )?blanks?|未作答|空白作業|沒有手寫|無手寫|僅印題目|只有題目|答案欄(?:位)?空白|未填寫答案/i;

const UNCLEAR_WORK_TEXT =
  /cannot tell|can't tell|unclear whether|too blur|too blurry|glare|cannot read handwriting|無法確認.*作答|不清楚.*手寫|模糊|反光|無法辨識手寫/i;

const STUDENT_WORK_TEXT =
  /handwrit(?:ten|ing)|student(?:'s)? (?:answers?|responses?|writing)|filled[- ]in|學生(?:手寫|作答|填寫|寫的)|已作答|有手寫|手寫答案/i;

function toTrimmed(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function logHomeworkAnswerAudit(payload: Record<string, unknown>) {
  if (!HOMEWORK_ANSWER_AUDIT_DEBUG) return;
  console.log("[homework student answer audit]", payload);
}

function toPositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  const text = toTrimmed(value);
  if (!text) return null;
  const m = /(\d+)/.exec(text);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseStudentAnswersStatus(
  raw: unknown,
): StudentAnswersStatus | null {
  const text = toTrimmed(raw).toLowerCase();
  if (!text) return null;
  if (
    text === "detected" ||
    text === "present" ||
    text === "yes" ||
    text === "true" ||
    text === "sufficient"
  ) {
    return "detected";
  }
  if (
    text === "insufficient" ||
    text === "partial" ||
    text === "low_coverage" ||
    text === "low"
  ) {
    return "insufficient";
  }
  if (
    text === "none" ||
    text === "absent" ||
    text === "no" ||
    text === "false" ||
    text === "blank"
  ) {
    return "none";
  }
  if (text === "unclear" || text === "unknown" || text === "low_confidence") {
    return "unclear";
  }
  return null;
}

function parseAuditStatus(raw: unknown): QuestionAnswerState | null {
  const text = toTrimmed(raw).toLowerCase();
  if (!text) return null;
  if (
    text === "answered" ||
    text === "yes" ||
    text === "true" ||
    text === "filled" ||
    text === "handwritten" ||
    text === "present"
  ) {
    return "answered";
  }
  if (
    text === "blank" ||
    text === "empty" ||
    text === "no" ||
    text === "false" ||
    text === "unanswered" ||
    text === "none" ||
    text === "missing"
  ) {
    return "blank";
  }
  return null;
}

function extractQuestionNumberFromLabel(raw: unknown): number | null {
  const text = toTrimmed(raw);
  if (!text) return null;
  const m =
    /^Q(?:uestion)?\s*(\d+)$/i.exec(text) ??
    /^(\d+)[.)]?$/.exec(text) ??
    /question\s*(\d+)/i.exec(text);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type ModelAuditItem = {
  questionNumber: number;
  status: QuestionAnswerState;
  reason: string;
  studentAnswerSnippet?: string;
  answerAreaOcr?: string;
  handwritingDetected?: boolean;
  confidence?: number;
};

function parseModelQuestionAudit(
  report: HomeworkReport,
): ModelAuditItem[] | null {
  const raw =
    report.questionAnswerAudit ??
    (report as { question_answer_audit?: unknown }).question_answer_audit;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const parsed: ModelAuditItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const questionNumber =
      toPositiveInt(o.questionNumber ?? o.question_number ?? o.number) ??
      extractQuestionNumberFromLabel(o.questionLabel ?? o.question_label ?? o.label);
    if (!questionNumber) continue;
    const status = parseAuditStatus(o.status ?? o.answerStatus ?? o.answer_status);
    if (!status) continue;
    const reason =
      toTrimmed(o.reason ?? o.classificationReason ?? o.note) ||
      (status === "answered"
        ? "model audit: handwritten answer confirmed"
        : "model audit: blank");
    const handwritingDetected =
      o.handwritingDetected === true ||
      o.handwriting_detected === true ||
      o.handwritingPresent === true;
    const confidenceRaw =
      o.confidence ?? o.handwritingConfidence ?? o.handwriting_confidence;
    const confidence =
      typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
        ? confidenceRaw
        : undefined;
    parsed.push({
      questionNumber,
      status,
      reason,
      ...(toTrimmed(o.studentAnswerSnippet ?? o.student_answer_snippet ?? o.snippet)
        ? {
            studentAnswerSnippet: toTrimmed(
              o.studentAnswerSnippet ?? o.student_answer_snippet ?? o.snippet,
            ),
          }
        : {}),
      ...(toTrimmed(o.answerAreaOcr ?? o.answer_area_ocr ?? o.ocrInAnswerArea)
        ? {
            answerAreaOcr: toTrimmed(
              o.answerAreaOcr ?? o.answer_area_ocr ?? o.ocrInAnswerArea,
            ),
          }
        : {}),
      ...(handwritingDetected ? { handwritingDetected: true } : {}),
      ...(confidence != null ? { confidence } : {}),
    });
  }
  return parsed.length > 0 ? parsed : null;
}

function detectionToAuditEntry(
  detection: HandwritingDetectionEvidence,
  source: QuestionAnswerAuditEntry["source"],
): QuestionAnswerAuditEntry {
  const snippet =
    detection.modelAudit.studentAnswerSnippet ??
    (detection.classification === "answered" && detection.ocrTextInAnswerArea
      ? detection.ocrTextInAnswerArea
      : detection.answerOverviewBody || undefined);
  return {
    questionNumber: detection.questionNumber,
    questionLabel: detection.questionLabel,
    status: detection.classification,
    reason: detection.classificationReason,
    source,
    handwritingDetection: detection,
    ...(snippet && detection.classification === "answered"
      ? { studentAnswerSnippet: snippet }
      : {}),
  };
}

function stripQuestionPrefix(line: string): string {
  return line
    .replace(/^(?:question\s*)?\d+[.)]\s*/i, "")
    .replace(/^Q\d+\s*[:：.-]?\s*/i, "")
    .trim();
}

/** Conservative overview-only check (no OCR). Prefer detectQuestionHandwriting in pipeline. */
export function classifyAnswerBody(body: string): {
  status: QuestionAnswerState;
  reason: string;
  snippet?: string;
} {
  const detection = detectQuestionHandwriting({
    questionNumber: 0,
    ocrText: "",
    answerOverviewBody: body,
  });
  return {
    status: detection.classification,
    reason: detection.classificationReason,
    ...(detection.ocrTextInAnswerArea || body
      ? {
          snippet:
            detection.modelAudit.studentAnswerSnippet ??
            detection.ocrTextInAnswerArea ??
            (detection.classification === "answered" ? body : undefined),
        }
      : {}),
  };
}

export function answerLineLooksBlank(line: string): boolean {
  return classifyAnswerBody(stripQuestionPrefix(line)).status === "blank";
}

function parseAnswerOverviewMap(text: string): Map<number, string> {
  const map = new Map<number, string>();
  for (const rawLine of text.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m =
      /^(?:question\s*)?(\d+)[.)]\s*(.*)$/i.exec(line) ??
      /^Q(\d+)\s*[:：.-]?\s*(.*)$/i.exec(line);
    if (!m) continue;
    const n = parseInt(m[1]!, 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    map.set(n, m[2] ?? "");
  }
  return map;
}

function resolveTotalQuestionCount(
  report: HomeworkReport,
  ocrText: string,
  overviewMap: Map<number, string>,
): number {
  const declared =
    toPositiveInt(report.totalQuestionCount) ??
    toPositiveInt(report.questionCount);
  if (declared) return declared;

  if (overviewMap.size > 0) {
    return Math.max(...overviewMap.keys());
  }

  const ocrNums = new Set<number>();
  for (const m of ocrText.matchAll(/\((\d+)\)/g)) {
    const n = parseInt(m[1]!, 10);
    if (Number.isFinite(n) && n > 0) ocrNums.add(n);
  }
  if (ocrNums.size > 0) return Math.max(...ocrNums);

  return 0;
}

export function classifyWorksheetQuestions(
  report: HomeworkReport,
  ocrText: string,
): QuestionAnswerAuditEntry[] {
  const overviewMap = parseAnswerOverviewMap(report.answerOverview);
  const total = resolveTotalQuestionCount(report, ocrText, overviewMap);
  const modelAudit = parseModelQuestionAudit(report);
  const modelByNumber = new Map<number, ModelAuditItem>();
  if (modelAudit) {
    for (const item of modelAudit) {
      modelByNumber.set(item.questionNumber, item);
    }
  }

  const byNumber = new Map<number, QuestionAnswerAuditEntry>();
  const limit = total > 0 ? total : Math.max(0, ...overviewMap.keys(), 0);
  const start = limit > 0 ? 1 : 0;
  const end = limit > 0 ? limit : 0;

  const runDetection = (n: number) => {
    const modelItem = modelByNumber.get(n);
    const overviewBody = overviewMap.get(n);
    const detection = detectQuestionHandwriting({
      questionNumber: n,
      ocrText,
      ...(overviewBody != null ? { answerOverviewBody: overviewBody } : {}),
      ...(modelItem
        ? {
            modelAudit: {
              status: modelItem.status,
              reason: modelItem.reason,
              ...(modelItem.studentAnswerSnippet
                ? { studentAnswerSnippet: modelItem.studentAnswerSnippet }
                : {}),
              ...(modelItem.answerAreaOcr
                ? { answerAreaOcr: modelItem.answerAreaOcr }
                : {}),
              ...(modelItem.handwritingDetected != null
                ? { handwritingDetected: modelItem.handwritingDetected }
                : {}),
              ...(modelItem.confidence != null
                ? { confidence: modelItem.confidence }
                : {}),
            },
          }
        : {}),
    });
    if (n === 1) {
      logHandwritingDetectionEvidence(detection);
    }
    const source: QuestionAnswerAuditEntry["source"] = modelItem
      ? "handwriting_detection"
      : overviewBody != null
        ? "answer_overview"
        : "default_blank";
    return detectionToAuditEntry(detection, source);
  };

  for (let n = start; n <= end; n++) {
    byNumber.set(n, runDetection(n));
  }

  if (byNumber.size === 0 && overviewMap.size > 0) {
    for (const n of overviewMap.keys()) {
      byNumber.set(n, runDetection(n));
    }
  }

  return [...byNumber.values()].sort((a, b) => a.questionNumber - b.questionNumber);
}

export function countQuestionLinesInOverview(text: string): {
  total: number;
  answered: number;
} {
  const evidence = computeStudentAnswerEvidence(
    {
      answerOverview: text,
      questionCount: 0,
      homeworkType: "",
      imageQuality: "",
      keyExplanations: [],
      pronunciationFocus: [],
      learningSignal: [],
    },
    "",
  );
  return {
    total: evidence.totalQuestions,
    answered: evidence.answeredQuestions,
  };
}

export function answerOverviewLooksLikeNoStudentWork(text: string): boolean {
  const perQuestion = classifyWorksheetQuestions(
    {
      answerOverview: text,
      questionCount: 0,
      homeworkType: "",
      imageQuality: "",
      keyExplanations: [],
      pronunciationFocus: [],
      learningSignal: [],
    },
    "",
  );
  return perQuestion.every((q) => q.status === "blank");
}

function buildDebugLog(perQuestion: QuestionAnswerAuditEntry[]): string[] {
  return perQuestion.map((q) => {
    const det = q.handwritingDetection;
    const detSummary = det
      ? ` | ocr="${det.ocrTextInAnswerArea}" conf=${det.confidence}${det.rejectedByRule ? ` rejectedBy=${det.rejectedByRule}` : ""}`
      : "";
    return `${q.questionLabel}: ${q.status}${q.studentAnswerSnippet ? ` (“${q.studentAnswerSnippet}”)` : ""} — ${q.reason}${detSummary} [${q.source}]`;
  });
}

export function computeStudentAnswerEvidence(
  report: HomeworkReport,
  ocrText: string,
): StudentAnswerEvidence {
  const perQuestion = classifyWorksheetQuestions(report, ocrText);
  const overviewMap = parseAnswerOverviewMap(report.answerOverview);
  const totalQuestions = resolveTotalQuestionCount(report, ocrText, overviewMap);
  const scoped =
    totalQuestions > 0
      ? perQuestion.filter((q) => q.questionNumber <= totalQuestions)
      : perQuestion;
  const answeredQuestions = scoped.filter((q) => q.status === "answered").length;
  const total = totalQuestions > 0 ? totalQuestions : scoped.length;
  const answerCoveragePercent =
    total > 0 ? Math.round((answeredQuestions / total) * 100) : 0;

  const debugLog = buildDebugLog(scoped);
  logHomeworkAnswerAudit({
    totalQuestions: total,
    answeredQuestions,
    answerCoveragePercent,
    perQuestion: debugLog,
    note: "answered count uses confirmed handwriting only; model aggregate fields ignored",
  });

  return {
    totalQuestions: total,
    answeredQuestions,
    answerCoveragePercent,
    perQuestion: scoped,
    debugLog,
  };
}

export function meetsEvidenceThreshold(evidence: StudentAnswerEvidence): boolean {
  if (evidence.answeredQuestions <= 0) return false;
  if (evidence.answeredQuestions < MIN_ANSWERED_QUESTIONS_FOR_EVALUATION) {
    return false;
  }
  if (
    evidence.totalQuestions > 0 &&
    evidence.answerCoveragePercent < MIN_ANSWER_COVERAGE_PERCENT_FOR_EVALUATION
  ) {
    return false;
  }
  return true;
}

function corpusMentionsUnclearStudentWork(...parts: string[]): boolean {
  return parts.some((p) => UNCLEAR_WORK_TEXT.test(p));
}

function corpusMentionsStudentWork(...parts: string[]): boolean {
  return parts.some((p) => STUDENT_WORK_TEXT.test(p));
}

export function resolveStudentAnswersStatus(input: {
  declaredStatus?: unknown;
  declaredDetected?: unknown;
  ocrText: string;
  visualSummaryZh: string;
  answerOverview: string;
  formattedReport?: string;
  evidence: StudentAnswerEvidence;
}): StudentAnswersStatus {
  const declared =
    parseStudentAnswersStatus(input.declaredStatus) ??
    (typeof input.declaredDetected === "boolean"
      ? input.declaredDetected
        ? "detected"
        : "none"
      : null);

  const { answeredQuestions, totalQuestions, answerCoveragePercent } =
    input.evidence;

  if (
    totalQuestions > 0 &&
    answeredQuestions === totalQuestions
  ) {
    return "detected";
  }

  const corpus = [
    input.ocrText,
    input.visualSummaryZh,
    input.answerOverview,
    input.formattedReport ?? "",
  ];

  if (declared === "unclear" || corpusMentionsUnclearStudentWork(...corpus)) {
    return "unclear";
  }

  if (answeredQuestions <= 0) {
    return "none";
  }

  if (answerCoveragePercent >= PARTIAL_ANSWER_COVERAGE_READY_PERCENT) {
    return answeredQuestions === totalQuestions ? "detected" : "insufficient";
  }

  return "insufficient";
}

export function homeworkAllowsPerformanceEvaluation(
  status: StudentAnswersStatus | undefined,
): boolean {
  return status === "detected";
}

function emptyLearningSummary(): LearningSummaryBlock {
  return { strengths: [], weaknesses: [], whatToPracticeNext: [] };
}

function filterAnswerOverviewToAnsweredOnly(
  text: string,
  perQuestion: QuestionAnswerAuditEntry[],
): string {
  const answeredNums = new Set(
    perQuestion.filter((q) => q.status === "answered").map((q) => q.questionNumber),
  );
  const lines = text.split(/\n/);
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m =
      /^(?:question\s*)?(\d+)[.)]\s*/i.exec(trimmed) ??
      /^Q(\d+)\s*[:：.-]?\s*/i.exec(trimmed);
    if (m) {
      const n = parseInt(m[1]!, 10);
      if (answeredNums.has(n)) kept.push(trimmed);
      continue;
    }
    if (kept.length > 0) kept.push(trimmed);
  }
  return kept.join("\n").trim() || "—";
}

function stripPerformanceSectionsFromFormattedReport(text: string): string {
  let out = text;
  out = out.replace(/\n?📚\s*Learning Summary[\s\S]*$/i, "");
  out = out.replace(
    /\n?📈\s*Today'?s Learning Signal[\s\S]*?(?=\n📚|\n🔍|$)/i,
    "",
  );
  out = out.replace(
    /\n?(?:學習摘要|整體表現|能力評估)[\s\S]*?(?=\n(?:📚|🔍|📈|$))/gi,
    "",
  );
  out = out.replace(
    /\n?(?:Strengths|Weaknesses|What to practice next|優點|待加強|建議練習)[\s\S]*?(?=\n(?:📚|🔍|📈|$))/gi,
    "",
  );
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Enforce answer-evidence rules before homework analytics reach the UI. */
export function applyHomeworkStudentAnswersGuard(
  insights: ImageInsights,
): ImageInsights {
  const report = insights.homeworkReport;
  if (!report) return insights;

  const computed = computeStudentAnswerEvidence(report, insights.ocrText);
  const summaryEvidence = evidenceFromModelAudit(report, computed);
  const status = resolveStudentAnswersStatus({
    declaredStatus: report.studentAnswersStatus,
    declaredDetected: report.studentAnswersDetected,
    ocrText: insights.ocrText,
    visualSummaryZh: insights.visualSummaryZh,
    answerOverview: report.answerOverview,
    formattedReport: report.formattedReport,
    evidence: summaryEvidence,
  });

  const evidenceFields = {
    studentAnsweredQuestions: summaryEvidence.answeredQuestions,
    studentAnswerCoveragePercent: summaryEvidence.answerCoveragePercent,
    totalQuestionCount: summaryEvidence.totalQuestions,
    questionAnswerAudit: computed.perQuestion.map(
      ({
        questionNumber,
        questionLabel,
        status,
        reason,
        studentAnswerSnippet,
        handwritingDetection,
      }) => ({
        questionNumber,
        questionLabel,
        status,
        reason,
        ...(studentAnswerSnippet ? { studentAnswerSnippet } : {}),
        ...(handwritingDetection
          ? {
              handwritingDetection: {
                ocrTextInAnswerArea: handwritingDetection.ocrTextInAnswerArea,
                handwritingDetected: handwritingDetection.handwritingDetected,
                confidence: handwritingDetection.confidence,
                classificationReason: handwritingDetection.classificationReason,
                ...(handwritingDetection.rejectedByRule
                  ? { rejectedByRule: handwritingDetection.rejectedByRule }
                  : {}),
                exactEvidence: handwritingDetection.exactEvidence,
              },
            }
          : {}),
      }),
    ),
  };

  if (status === "detected") {
    const summary = formatTutorAnswerSummary(summaryEvidence);
    const cleanedReport = report.formattedReport
      ? sanitizeStudentFacingHomeworkText(report.formattedReport)
      : "";
    const formattedReport = cleanedReport
      ? `${summary}\n\n${cleanedReport}`
      : summary;
    return {
      ...insights,
      homeworkReport: {
        ...report,
        studentAnswersStatus: "detected",
        ...evidenceFields,
        formattedReport: sanitizeStudentFacingHomeworkText(formattedReport),
      },
    };
  }

  if (status === "insufficient") {
    const notice = formatTutorAnswerSummary(summaryEvidence);
    const partialOverview = filterAnswerOverviewToAnsweredOnly(
      report.answerOverview,
      computed.perQuestion,
    );
    const cleanedBody = report.formattedReport
      ? sanitizeStudentFacingHomeworkText(
          stripPerformanceSectionsFromFormattedReport(report.formattedReport),
        )
      : "";
    const partialFormatted = cleanedBody
      ? `${notice}\n\n${cleanedBody}`
      : notice;

    return {
      ...insights,
      homeworkReport: {
        ...report,
        studentAnswersStatus: "insufficient",
        insufficientEvidenceMessage: notice,
        ...evidenceFields,
        answerOverview: partialOverview,
        learningSignal: [],
        learningSummary: emptyLearningSummary(),
        formattedReport: sanitizeStudentFacingHomeworkText(partialFormatted.trim()),
      },
    };
  }

  const notice =
    preferTraditionalChineseNotice(
      toTrimmed(report.noStudentAnswersMessage) ||
        toTrimmed(report.unclearPhotoMessage) ||
        "",
    ) || formatStudentAnswersNotice(status, summaryEvidence);

  const safeReport: HomeworkReport = {
    ...report,
    studentAnswersStatus: status,
    ...evidenceFields,
    ...(status === "unclear"
      ? { unclearPhotoMessage: notice }
      : { noStudentAnswersMessage: notice }),
    answerOverview: "—",
    keyExplanations: [],
    pronunciationFocus: [],
    learningSignal: [],
    learningSummary: emptyLearningSummary(),
    formattedReport: sanitizeStudentFacingHomeworkText(notice),
    hintsFirst: report.hintsFirst,
  };

  return {
    ...insights,
    homeworkReport: safeReport,
  };
}
