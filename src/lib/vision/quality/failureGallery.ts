/**
 * AI Quality Platform — classify and persist recognition failures.
 */

import fs from "node:fs";
import path from "node:path";

import { buildStudentAnswerObject } from "@/lib/studentAnswerObject";
import { EYES_PROMPT_VERSION } from "@/lib/vision/quality/constants";
import { classifyAnswerMismatch } from "@/lib/vision/quality/classify";
import { resolveAiQualityReportsRoot } from "@/lib/vision/quality/dataset";
import type {
  EyesFailureCategory,
  EyesFailureRecord,
  EyesQualitySample,
  EyesQualitySampleMetrics,
  EyesQualitySampleRun,
} from "@/lib/vision/quality/types";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

function makeMinimalSession(sample: EyesQualitySample): WorksheetCaptureSession {
  const photos = sample.photoPaths.map((p, i) => {
    const id = `p${i + 1}`;
    return {
      id,
      name: path.basename(p),
      qualityStatus: "ok" as const,
      quality: {
        photoId: id,
        photoIndex: i,
        estimatedTotalQuestions: sample.expected.expectedQuestionCount,
        questionsClearlyVisible: [] as number[],
        questionsWithIssues: [],
        detectedQuestionNumbers: [],
        ocrRawText: "",
        globalIssues: [],
        readyForAnalysis: true,
        tutorMessage: "",
      },
    };
  });
  return {
    photos,
    estimatedTotalQuestions: sample.expected.expectedQuestionCount,
    coveredQuestions: [],
    detectedQuestions: [],
    questionsNeedingRetake: [],
    openIssues: [],
    questionPhotoMap: {},
    questionEvidenceMap: {},
    analysis: {
      coverageComplete: false,
      qualityAcceptable: true,
      canAnalyzeCurrent: true,
      recommendedAction: "analyze" as const,
      analysisScope: "partial" as const,
      analysisConfidence: "medium" as const,
      missingQuestions: [],
      lowQualityQuestions: [],
    },
    tutorMessage: "",
  };
}

export { classifyAnswerMismatch };

export function classifySampleFailures(
  sample: EyesQualitySample,
  metrics: EyesQualitySampleMetrics,
  run: EyesQualitySampleRun,
): EyesFailureRecord[] {
  const records: EyesFailureRecord[] = [];
  const createdAt = new Date().toISOString();
  const baseId = `${metrics.sampleId}__${metrics.providerId}__${createdAt.replace(/[:.]/g, "-")}`;

  let sao = null;
  try {
    if (!run.error) {
      const session = makeMinimalSession(sample);
      const ocr: Record<string, string> = {};
      for (const p of session.photos) ocr[p.id] = "";
      sao = buildStudentAnswerObject({
        session,
        ocrRawTextByPhotoId: ocr,
        eyes: run.result,
      });
    }
  } catch {
    sao = null;
  }

  if (run.error) {
    const lower = run.error.toLowerCase();
    let category: EyesFailureCategory = "Other";
    if (lower.includes("timeout") || lower.includes("timed out")) {
      category = "Provider Timeout";
    } else if (lower.includes("schema") || lower.includes("valid json")) {
      category = "Schema Error";
    }
    records.push({
      id: `${baseId}__run`,
      createdAt,
      sampleId: sample.expected.id,
      photoPaths: sample.photoPaths,
      providerId: run.providerId,
      providerLabel: run.providerLabel,
      model: run.model,
      promptVersion: run.promptVersion || EYES_PROMPT_VERSION,
      rawResponse: run.rawResponse,
      parsedResponse: null,
      sao,
      expectedAnswer: null,
      actualAnswer: null,
      questionNumber: null,
      failureCategory: category,
      confidence: null,
      latencyMs: run.latencyMs,
      tokenUsage: run.usage,
      costUsd: run.estimatedCostUsd,
      notes: run.error,
    });
    return records;
  }

  const expectedQs = new Set(
    sample.expected.expectedQuestionNumbers ??
      Array.from(
        { length: sample.expected.expectedQuestionCount },
        (_, i) => i + 1,
      ),
  );
  const predictedQs = new Set(run.result.questions.map((q) => q.number));
  for (const n of expectedQs) {
    if (!predictedQs.has(n)) {
      records.push({
        id: `${baseId}__qmiss_${n}`,
        createdAt,
        sampleId: sample.expected.id,
        photoPaths: sample.photoPaths,
        providerId: run.providerId,
        providerLabel: run.providerLabel,
        model: run.model,
        promptVersion: run.promptVersion || EYES_PROMPT_VERSION,
        rawResponse: run.rawResponse,
        parsedResponse: run.result,
        sao,
        expectedAnswer: null,
        actualAnswer: null,
        questionNumber: n,
        failureCategory: "Question Missing",
        confidence: null,
        latencyMs: run.latencyMs,
        tokenUsage: run.usage,
        costUsd: run.estimatedCostUsd,
      });
    }
  }

  for (const mismatch of metrics.answerMismatches) {
    const categories =
      mismatch.categories.length > 0
        ? mismatch.categories
        : classifyAnswerMismatch({
            expected: mismatch.expected,
            predicted: mismatch.predicted,
            expectedBlank: mismatch.expected == null,
          });
    const q = run.result.questions.find(
      (x) => x.number === mismatch.questionNumber,
    );
    for (const failureCategory of categories) {
      records.push({
        id: `${baseId}__q${mismatch.questionNumber}__${failureCategory.replace(/\s+/g, "_")}`,
        createdAt,
        sampleId: sample.expected.id,
        photoPaths: sample.photoPaths,
        providerId: run.providerId,
        providerLabel: run.providerLabel,
        model: run.model,
        promptVersion: run.promptVersion || EYES_PROMPT_VERSION,
        rawResponse: run.rawResponse,
        parsedResponse: run.result,
        sao,
        expectedAnswer: mismatch.expected,
        actualAnswer: mismatch.predicted,
        questionNumber: mismatch.questionNumber,
        failureCategory,
        confidence: q?.confidence ?? run.result.confidence,
        latencyMs: run.latencyMs,
        tokenUsage: run.usage,
        costUsd: run.estimatedCostUsd,
      });
    }
  }

  // Confidence calibration failures on answered expectations
  for (const exp of sample.expected.expectedAnswers) {
    if (exp.studentAnswer == null || exp.studentAnswer.trim() === "") continue;
    const q = run.result.questions.find((x) => x.number === exp.questionNumber);
    if (!q) continue;
    if (
      typeof exp.minConfidence === "number" &&
      q.confidence < exp.minConfidence
    ) {
      records.push({
        id: `${baseId}__q${exp.questionNumber}__Confidence_Too_Low`,
        createdAt,
        sampleId: sample.expected.id,
        photoPaths: sample.photoPaths,
        providerId: run.providerId,
        providerLabel: run.providerLabel,
        model: run.model,
        promptVersion: run.promptVersion || EYES_PROMPT_VERSION,
        rawResponse: run.rawResponse,
        parsedResponse: run.result,
        sao,
        expectedAnswer: exp.studentAnswer,
        actualAnswer: q.studentAnswer,
        questionNumber: exp.questionNumber,
        failureCategory: "Confidence Too Low",
        confidence: q.confidence,
        latencyMs: run.latencyMs,
        tokenUsage: run.usage,
        costUsd: run.estimatedCostUsd,
      });
    }
    if (
      sample.expected.expectedConfidenceMax != null &&
      q.status === "blank" &&
      q.confidence > sample.expected.expectedConfidenceMax
    ) {
      records.push({
        id: `${baseId}__q${exp.questionNumber}__Confidence_Too_High`,
        createdAt,
        sampleId: sample.expected.id,
        photoPaths: sample.photoPaths,
        providerId: run.providerId,
        providerLabel: run.providerLabel,
        model: run.model,
        promptVersion: run.promptVersion || EYES_PROMPT_VERSION,
        rawResponse: run.rawResponse,
        parsedResponse: run.result,
        sao,
        expectedAnswer: exp.studentAnswer,
        actualAnswer: q.studentAnswer,
        questionNumber: exp.questionNumber,
        failureCategory: "Confidence Too High",
        confidence: q.confidence,
        latencyMs: run.latencyMs,
        tokenUsage: run.usage,
        costUsd: run.estimatedCostUsd,
      });
    }
  }

  return records;
}

export function persistFailureGallery(
  failures: EyesFailureRecord[],
  reportsRoot: string = resolveAiQualityReportsRoot(),
): string {
  const dir = path.join(reportsRoot, "failure-gallery");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `failures-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(failures, null, 2), "utf8");
  fs.writeFileSync(
    path.join(dir, "failures-latest.json"),
    JSON.stringify(failures, null, 2),
    "utf8",
  );
  // Append to running index
  const indexPath = path.join(dir, "index.jsonl");
  for (const f of failures) {
    fs.appendFileSync(
      indexPath,
      JSON.stringify({
        id: f.id,
        sampleId: f.sampleId,
        providerId: f.providerId,
        failureCategory: f.failureCategory,
        questionNumber: f.questionNumber,
        createdAt: f.createdAt,
      }) + "\n",
      "utf8",
    );
  }
  return file;
}
