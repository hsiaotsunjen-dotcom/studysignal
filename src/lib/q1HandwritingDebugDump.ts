/**
 * Q1-only handwriting evidence dump (debug instrumentation).
 * Does NOT modify detection logic — reads existing outputs and re-invokes
 * detectQuestionHandwriting with the same inputs the pipeline uses.
 */

import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import type { ImageInsights } from "@/lib/analyzeFeedback";
import {
  detectQuestionHandwriting,
  extractOcrAnswerArea,
  type HandwritingRuleId,
} from "@/lib/handwritingDetection";
import { saveQ1DebugImages } from "@/lib/q1DebugImages";
import fs from "node:fs/promises";
import path from "node:path";

const ORDERED_RULES: HandwritingRuleId[] = [
  "empty_input",
  "explicit_blank_marker",
  "ocr_noise_only",
  "printed_instruction",
  "printed_chinese_hint",
  "model_or_answer_key",
  "correct_marker_without_handwriting",
  "long_question_stem",
  "model_handwriting_flag",
  "model_handwriting_reason",
  "model_snippet_confirmed",
  "ocr_answer_area_match",
  "short_handwritten_token",
  "explicit_student_marker",
  "no_confirmed_handwriting",
];

function toTrimmed(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function readHomeworkReportRoot(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const hr =
    o.homeworkReport ??
    o.homework_report ??
    (o.imageInsights as Record<string, unknown> | undefined)?.homeworkReport ??
    (o.imageInsights as Record<string, unknown> | undefined)?.homework_report;
  if (hr && typeof hr === "object") return hr as Record<string, unknown>;
  return null;
}

function readOcrText(raw: unknown, insights: ImageInsights): string {
  if (!raw || typeof raw !== "object") return insights.ocrText;
  const o = raw as Record<string, unknown>;
  const ii = o.imageInsights ?? o.image_insights;
  if (ii && typeof ii === "object") {
    const t = toTrimmed(
      (ii as Record<string, unknown>).ocrText ??
        (ii as Record<string, unknown>).ocr_text,
    );
    if (t) return t;
  }
  return toTrimmed(o.ocrText ?? o.ocr_text) || insights.ocrText;
}

function readAnswerOverviewRaw(raw: unknown): string {
  const hr = readHomeworkReportRoot(raw);
  if (!hr) return "";
  return toTrimmed(hr.answerOverview ?? hr.answer_overview ?? hr.answers);
}

function parseOverviewLineForQ1(text: string): string {
  for (const rawLine of text.split(/\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m =
      /^(?:question\s*)?1[.)]\s*(.*)$/i.exec(line) ??
      /^Q1\s*[:：.-]?\s*(.*)$/i.exec(line);
    if (m) return m[1] ?? "";
  }
  return "";
}

function readModelAuditQ1(raw: unknown): Record<string, unknown> | null {
  const hr = readHomeworkReportRoot(raw);
  if (!hr) return null;
  const auditRaw =
    hr.questionAnswerAudit ?? hr.question_answer_audit ?? hr.perQuestionAnswerStatus;
  if (!Array.isArray(auditRaw)) return null;
  for (const item of auditRaw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const n =
      typeof row.questionNumber === "number"
        ? row.questionNumber
        : typeof row.question_number === "number"
          ? row.question_number
          : null;
    if (n === 1) return row;
  }
  return null;
}

function extractVisionModelResponseQ1(
  raw: unknown,
  rawContent: string,
): string {
  const row = readModelAuditQ1(raw);
  if (row) return JSON.stringify(row, null, 2);
  const snippet = rawContent.match(
    /"questionNumber"\s*:\s*1[\s\S]{0,800}?\}/,
  );
  return snippet?.[0] ?? "(questionAnswerAudit entry for Q1 not found in raw JSON)";
}

function tokenizeOcr(text: string): string[] {
  return text
    .split(/[\s,，;；|/\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function formatRuleBlock(
  index: number,
  rule: HandwritingRuleId,
  trace: { passed: boolean; detail: string } | null,
  rejectedByRule: HandwritingRuleId | undefined,
  notReached: boolean,
  exactEvidence: string[],
): string {
  if (notReached || !trace) {
    return [
      `Rule ${index}:`,
      "NOT EVALUATED",
      `Reason: detector short-circuited before rule "${rule}"`,
      "",
    ].join("\n");
  }
  const accepted = exactEvidence.some((e) => e.includes(`ACCEPTED by ${rule}`));
  const rejectedThis = rejectedByRule === rule;
  let verdict: string;
  if (accepted) verdict = "PASS";
  else if (rejectedThis) verdict = "FAIL";
  else if (trace.passed) verdict = "FAIL";
  else verdict = "PASS";
  const reasonSuffix = rejectedThis
    ? " (this rule rejected the answer)"
    : accepted
      ? " (this rule accepted the answer)"
      : trace.passed
        ? " (rule condition matched)"
        : " (rule condition not matched / cleared)";
  return [
    `Rule ${index}:`,
    verdict,
    `Reason: ${trace.detail}${reasonSuffix}`,
    "",
  ].join("\n");
}

export type Q1DebugDumpInput = {
  rawParsed: unknown;
  rawContent: string;
  images: AnalyzeImagePayload[];
  imageInsights: ImageInsights;
};

export async function runQ1HandwritingDebugDump(
  input: Q1DebugDumpInput,
): Promise<void> {
  const { rawParsed, rawContent, images, imageInsights } = input;
  const report = imageInsights.homeworkReport;
  const ocrText = readOcrText(rawParsed, imageInsights);
  const answerOverviewRaw = readAnswerOverviewRaw(rawParsed);
  const overviewBody =
    parseOverviewLineForQ1(answerOverviewRaw) ||
    parseOverviewLineForQ1(report?.answerOverview ?? "");

  const modelRow = readModelAuditQ1(rawParsed);
  const modelAuditInput = modelRow
    ? {
        status: toTrimmed(modelRow.status ?? modelRow.answerStatus),
        reason: toTrimmed(modelRow.reason ?? modelRow.note),
        studentAnswerSnippet: toTrimmed(
          modelRow.studentAnswerSnippet ??
            modelRow.student_answer_snippet ??
            modelRow.snippet,
        ),
        answerAreaOcr: toTrimmed(
          modelRow.answerAreaOcr ??
            modelRow.answer_area_ocr ??
            modelRow.ocrInAnswerArea,
        ),
        handwritingDetected:
          modelRow.handwritingDetected === true ||
          modelRow.handwriting_detected === true,
        confidence:
          typeof modelRow.confidence === "number"
            ? modelRow.confidence
            : typeof modelRow.handwritingConfidence === "number"
              ? modelRow.handwritingConfidence
              : undefined,
      }
    : undefined;

  const ocrExtracted = extractOcrAnswerArea(ocrText, 1);
  const detection = detectQuestionHandwriting({
    questionNumber: 1,
    ocrText,
    ...(overviewBody ? { answerOverviewBody: overviewBody } : {}),
    ...(modelAuditInput ? { modelAudit: modelAuditInput } : {}),
  });

  const finalQ1 = report?.questionAnswerAudit?.find((q) => q.questionNumber === 1);
  const ruleTraceMap = new Map(
    detection.rulesApplied.map((r) => [r.rule, r] as const),
  );
  const firstRejectIndex = ORDERED_RULES.findIndex((rule) => {
    const t = ruleTraceMap.get(rule);
    return t?.passed === true && detection.rejectedByRule === rule;
  });
  const shortCircuitAfter =
    firstRejectIndex >= 0
      ? firstRejectIndex
      : detection.rulesApplied.length > 0
        ? ORDERED_RULES.indexOf(
            detection.rulesApplied[detection.rulesApplied.length - 1]!.rule,
          )
        : -1;

  let imageMeta: Awaited<ReturnType<typeof saveQ1DebugImages>> | null = null;
  if (images[0]) {
    try {
      imageMeta = await saveQ1DebugImages(images[0]!);
    } catch (err) {
      imageMeta = {
        cropSaved: false,
        overlaySaved: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const ocrTokens = tokenizeOcr(ocrExtracted.ocrRawContext || ocrText);
  const ocrConfidence =
    imageMeta?.targetWordConfidence != null
      ? String(imageMeta.targetWordConfidence)
      : modelAuditInput?.confidence != null
        ? `model_audit.confidence=${modelAuditInput.confidence} (no per-token OCR confidence in production pipeline)`
        : "(unavailable — production pipeline uses LLM ocrText, not scored OCR tokens)";

  const lines: string[] = [
    "===== Q1 DEBUG =====",
    `Question label: Q1`,
    `Answer box coordinates: ${
      imageMeta?.answerBoxCoordinates ??
      "(unavailable — production handwriting detector does not use image coordinates; see Tesseract debug crop below if saved)"
    }`,
    `OCR extracted from answer area: ${JSON.stringify(detection.ocrTextInAnswerArea)} (${detection.ocrExtractionMethod})`,
    `Raw OCR tokens: ${JSON.stringify(ocrTokens)}`,
    `OCR confidence: ${ocrConfidence}`,
    `Vision model response for Q1:`,
    extractVisionModelResponseQ1(rawParsed, rawContent),
    `Model audit:`,
    JSON.stringify(modelAuditInput ?? null, null, 2),
    `handwritingDetected: ${detection.handwritingDetected}`,
    `classificationReason: ${detection.classificationReason}`,
    `studentAnswered: ${report?.studentAnsweredQuestions ?? "(not set)"}`,
    `status: ${finalQ1?.status ?? detection.classification}`,
    `reason: ${finalQ1?.reason ?? detection.classificationReason}`,
    "Every detection rule:",
  ];

  ORDERED_RULES.forEach((rule, i) => {
    const trace = ruleTraceMap.get(rule) ?? null;
    const notReached = shortCircuitAfter >= 0 && i > shortCircuitAfter && !trace;
    lines.push(
      formatRuleBlock(
        i + 1,
        rule,
        trace,
        detection.rejectedByRule,
        notReached,
        detection.exactEvidence,
      ),
    );
  });

  lines.push(
    `Final decision:`,
    detection.classification,
    `Why was this decision made?`,
    detection.classificationReason,
  );

  if (detection.classification === "blank") {
    lines.push(
      `If blank:`,
      `which SINGLE rule rejected the handwritten answer?`,
      detection.rejectedByRule ?? "(no rejectedByRule recorded)",
    );
  } else {
    lines.push(
      `If answered:`,
      `why?`,
      detection.exactEvidence.filter((e) => e.startsWith("ACCEPTED")).join("; ") ||
        detection.classificationReason,
    );
  }

  lines.push(
    "Exact evidence chain:",
    ...detection.exactEvidence.map((e) => `  - ${e}`),
    `answerOverviewBody (raw model): ${JSON.stringify(overviewBody)}`,
    `answerOverview after guard: ${JSON.stringify(parseOverviewLineForQ1(report?.answerOverview ?? ""))}`,
    `full ocrText length: ${ocrText.length}`,
    `ocrRawContext: ${detection.ocrRawContext}`,
  );

  if (imageMeta) {
    lines.push(
      `debug image crop saved: ${imageMeta.cropSaved ? "debug/q1-answer-crop.png" : "no"}`,
      `debug OCR overlay saved: ${imageMeta.overlaySaved ? "debug/q1-ocr-overlay.png" : "no"}`,
    );
    if (imageMeta.error) lines.push(`debug image error: ${imageMeta.error}`);
    if (imageMeta.tesseractWords?.length) {
      lines.push(
        `Tesseract words near Q1:`,
        ...imageMeta.tesseractWords.map(
          (w) =>
            `  "${w.text}" conf=${w.confidence} bbox=[${w.bbox.join(",")}]`,
        ),
      );
    }
  }

  lines.push("====================");

  const dump = lines.join("\n");
  console.log(dump);

  const debugDir = path.join(process.cwd(), "debug");
  await fs.mkdir(debugDir, { recursive: true });
  await fs.writeFile(path.join(debugDir, "q1-evidence-dump.txt"), dump, "utf8");
}
