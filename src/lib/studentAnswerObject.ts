/**
 * Student Answer Object (SAO) — Single Source of Truth for homework.
 *
 * Phase 1: produce + store only. Tutor / Signals still use legacy paths.
 * Extends Eyes (`HomeworkVisionResult`) rather than inventing a parallel model.
 */

import type { HomeworkVisionResult } from "@/lib/vision/types";
import { HOMEWORK_VISION_SCHEMA_VERSION } from "@/lib/vision/types";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

export const STUDENT_ANSWER_OBJECT_VERSION = "1.0.0";

export type SaoAnswerStatus =
  | "answered"
  | "blank"
  | "not_visible"
  | "unclear";

export type SaoPhotoRef = {
  photoId: string;
  photoIndex: number;
  name: string;
};

export type SaoQuestion = {
  id: number;
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  answerStatus: SaoAnswerStatus;
  /** 0–1 */
  confidence: number;
  sourcePhoto: string;
  knowledgePoints: string[];
  explanation: string;
};

export type SaoOcr = {
  rawTextPerPhoto: Array<{ photoId: string; rawText: string }>;
  mergedRawText: string;
};

export type SaoSummary = {
  totalQuestions: number;
  answered: number;
  correct: number;
  incorrect: number;
  blank: number;
};

/**
 * Long-term homework data model. Future Tutor / Signals / Ability Map /
 * Parent Reports / Learning History must read this object (not re-OCR images).
 */
export type StudentAnswerObject = {
  version: string;
  photos: SaoPhotoRef[];
  ocr: SaoOcr;
  questions: SaoQuestion[];
  summary: SaoSummary;
  /** Eyes extraction used for student answers when available. */
  eyes: HomeworkVisionResult | null;
  producedAt: number;
  photoIds: string[];
};

export type BuildStudentAnswerObjectInput = {
  session: WorksheetCaptureSession;
  /** photoId → Tesseract raw text (must be retained from photo-quality). */
  ocrRawTextByPhotoId: Record<string, string>;
  /** Optional Eyes result — Phase 1 answer extraction source. */
  eyes?: HomeworkVisionResult | null;
  producedAt?: number;
};

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))]
    .map((n) => Math.round(n))
    .sort((a, b) => a - b);
}

function emptyQuestion(
  id: number,
  sourcePhoto: string,
  answerStatus: SaoAnswerStatus = "not_visible",
): SaoQuestion {
  return {
    id,
    questionText: "",
    studentAnswer: "",
    correctAnswer: "",
    answerStatus,
    confidence: 0,
    sourcePhoto,
    knowledgePoints: [],
    explanation: "",
  };
}

function summarize(questions: SaoQuestion[]): SaoSummary {
  let answered = 0;
  let blank = 0;
  for (const q of questions) {
    if (q.answerStatus === "answered") answered += 1;
    else if (q.answerStatus === "blank") blank += 1;
  }
  return {
    totalQuestions: questions.length,
    answered,
    correct: 0,
    incorrect: 0,
    blank,
  };
}

/**
 * Build SAO from capture session + retained OCR (+ optional Eyes).
 * Pure — no network. Callers fetch Eyes separately in Phase 1.
 */
export function buildStudentAnswerObject(
  input: BuildStudentAnswerObjectInput,
): StudentAnswerObject {
  const { session, ocrRawTextByPhotoId, eyes = null } = input;
  const producedAt = input.producedAt ?? Date.now();

  const photos: SaoPhotoRef[] = session.photos.map((p, index) => ({
    photoId: p.id,
    photoIndex: index,
    name: p.name,
  }));

  const rawTextPerPhoto = photos.map((p) => ({
    photoId: p.photoId,
    rawText: ocrRawTextByPhotoId[p.photoId] ?? "",
  }));

  const mergedRawText = rawTextPerPhoto
    .map((r) => r.rawText.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");

  const total = Math.max(
    0,
    session.estimatedTotalQuestions,
    eyes?.assignment.totalQuestions ?? 0,
  );
  const covered = new Set(session.coveredQuestions);
  const photoLabelById = new Map(
    photos.map((p) => [p.photoId, `Photo${p.photoIndex + 1}`]),
  );

  const eyesByNumber = new Map(
    (eyes?.questions ?? []).map((q) => [q.number, q]),
  );

  const questionIds =
    total > 0
      ? Array.from({ length: total }, (_, i) => i + 1)
      : uniqueSorted([
          ...session.coveredQuestions,
          ...session.detectedQuestions,
          ...eyesByNumber.keys(),
        ]);

  const questions: SaoQuestion[] = questionIds.map((id) => {
    const sourcePhotoId = session.questionPhotoMap[id] ?? "";
    const sourcePhoto =
      (sourcePhotoId && photoLabelById.get(sourcePhotoId)) ||
      (covered.has(id) ? "Photo?" : "");
    const eye = eyesByNumber.get(id);

    if (eye) {
      const answerStatus: SaoAnswerStatus =
        eye.status === "answered" ||
        eye.status === "blank" ||
        eye.status === "not_visible"
          ? eye.status
          : "unclear";
      return {
        id,
        questionText: "",
        studentAnswer:
          typeof eye.studentAnswer === "string" ? eye.studentAnswer : "",
        correctAnswer: "",
        answerStatus,
        confidence:
          typeof eye.confidence === "number" && Number.isFinite(eye.confidence)
            ? Math.min(1, Math.max(0, eye.confidence))
            : 0,
        sourcePhoto: sourcePhoto || sourcePhotoId || "",
        knowledgePoints: [],
        explanation: "",
      };
    }

    if (!covered.has(id)) {
      return emptyQuestion(id, sourcePhoto, "not_visible");
    }
    return emptyQuestion(id, sourcePhoto, "blank");
  });

  return {
    version: STUDENT_ANSWER_OBJECT_VERSION,
    photos,
    ocr: {
      rawTextPerPhoto,
      mergedRawText,
    },
    questions,
    summary: summarize(questions),
    eyes: eyes
      ? {
          ...eyes,
          provider: {
            ...eyes.provider,
            version: eyes.provider.version || HOMEWORK_VISION_SCHEMA_VERSION,
          },
        }
      : null,
    producedAt,
    photoIds: photos.map((p) => p.photoId),
  };
}

/** True when SAO was built for exactly this photo id list (order-sensitive). */
export function studentAnswerObjectMatchesPhotos(
  sao: StudentAnswerObject | null | undefined,
  photoIds: string[],
): boolean {
  if (!sao) return false;
  if (sao.photoIds.length !== photoIds.length) return false;
  return sao.photoIds.every((id, i) => id === photoIds[i]);
}

/** Debug snapshot for Phase 1 review (no secrets / no full OCR dump). */
export function summarizeStudentAnswerObjectForLog(
  sao: StudentAnswerObject,
): Record<string, unknown> {
  return {
    version: sao.version,
    photoCount: sao.photos.length,
    photoIds: sao.photoIds,
    ocrMergedLength: sao.ocr.mergedRawText.length,
    ocrPerPhotoLengths: sao.ocr.rawTextPerPhoto.map((r) => ({
      photoId: r.photoId,
      rawTextLength: r.rawText.length,
    })),
    summary: sao.summary,
    answers: Object.fromEntries(
      sao.questions.map((q) => [
        `Q${q.id}`,
        {
          studentAnswer: q.studentAnswer,
          answerStatus: q.answerStatus,
          confidence: q.confidence,
          sourcePhoto: q.sourcePhoto,
        },
      ]),
    ),
    eyesPresent: Boolean(sao.eyes),
    eyesModel: sao.eyes?.provider.model ?? null,
  };
}

/**
 * Signals answer overview derived only from SAO answered rows.
 * Example: "1. end\n9. picture"
 */
export function buildAnswerOverviewFromStudentAnswerObject(
  sao: StudentAnswerObject,
): string {
  const lines = sao.questions
    .filter(
      (q) =>
        q.answerStatus === "answered" &&
        typeof q.studentAnswer === "string" &&
        q.studentAnswer.trim().length > 0,
    )
    .map((q) => `${q.id}. ${q.studentAnswer.trim()}`);
  return lines.length > 0 ? lines.join("\n") : "—";
}

/** Minimal structural parse for analyze request payload (Phase 2). */
export function parseStudentAnswerObject(
  raw: unknown,
): StudentAnswerObject | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.version !== "string" || !o.version.trim()) return null;
  if (!Array.isArray(o.photos) || !Array.isArray(o.questions)) return null;
  if (!o.ocr || typeof o.ocr !== "object") return null;
  if (!o.summary || typeof o.summary !== "object") return null;
  if (!Array.isArray(o.photoIds)) return null;

  const ocr = o.ocr as Record<string, unknown>;
  if (!Array.isArray(ocr.rawTextPerPhoto)) return null;
  if (typeof ocr.mergedRawText !== "string") return null;

  const summary = o.summary as Record<string, unknown>;
  const totalQuestions =
    typeof summary.totalQuestions === "number" ? summary.totalQuestions : NaN;
  const answered =
    typeof summary.answered === "number" ? summary.answered : NaN;
  const blank = typeof summary.blank === "number" ? summary.blank : NaN;
  const correct =
    typeof summary.correct === "number" ? summary.correct : 0;
  const incorrect =
    typeof summary.incorrect === "number" ? summary.incorrect : 0;
  if (
    !Number.isFinite(totalQuestions) ||
    !Number.isFinite(answered) ||
    !Number.isFinite(blank)
  ) {
    return null;
  }

  const photos: SaoPhotoRef[] = [];
  for (const item of o.photos) {
    if (!item || typeof item !== "object") return null;
    const p = item as Record<string, unknown>;
    if (typeof p.photoId !== "string" || !p.photoId) return null;
    if (typeof p.photoIndex !== "number" || !Number.isFinite(p.photoIndex)) {
      return null;
    }
    if (typeof p.name !== "string") return null;
    photos.push({
      photoId: p.photoId,
      photoIndex: Math.round(p.photoIndex),
      name: p.name,
    });
  }

  const rawTextPerPhoto: SaoOcr["rawTextPerPhoto"] = [];
  for (const item of ocr.rawTextPerPhoto) {
    if (!item || typeof item !== "object") return null;
    const r = item as Record<string, unknown>;
    if (typeof r.photoId !== "string" || typeof r.rawText !== "string") {
      return null;
    }
    rawTextPerPhoto.push({ photoId: r.photoId, rawText: r.rawText });
  }

  const questions: SaoQuestion[] = [];
  for (const item of o.questions) {
    if (!item || typeof item !== "object") return null;
    const q = item as Record<string, unknown>;
    if (typeof q.id !== "number" || !Number.isFinite(q.id) || q.id <= 0) {
      return null;
    }
    const answerStatus = q.answerStatus;
    if (
      answerStatus !== "answered" &&
      answerStatus !== "blank" &&
      answerStatus !== "not_visible" &&
      answerStatus !== "unclear"
    ) {
      return null;
    }
    questions.push({
      id: Math.round(q.id),
      questionText: typeof q.questionText === "string" ? q.questionText : "",
      studentAnswer:
        typeof q.studentAnswer === "string" ? q.studentAnswer : "",
      correctAnswer:
        typeof q.correctAnswer === "string" ? q.correctAnswer : "",
      answerStatus,
      confidence:
        typeof q.confidence === "number" && Number.isFinite(q.confidence)
          ? q.confidence
          : 0,
      sourcePhoto: typeof q.sourcePhoto === "string" ? q.sourcePhoto : "",
      knowledgePoints: Array.isArray(q.knowledgePoints)
        ? q.knowledgePoints.filter((x): x is string => typeof x === "string")
        : [],
      explanation: typeof q.explanation === "string" ? q.explanation : "",
    });
  }

  const photoIds = o.photoIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  if (photoIds.length !== o.photoIds.length) return null;

  return {
    version: o.version.trim(),
    photos,
    ocr: {
      rawTextPerPhoto,
      mergedRawText: ocr.mergedRawText,
    },
    questions,
    summary: {
      totalQuestions: Math.round(totalQuestions),
      answered: Math.round(answered),
      correct: Math.round(correct),
      incorrect: Math.round(incorrect),
      blank: Math.round(blank),
    },
    eyes:
      o.eyes && typeof o.eyes === "object"
        ? (o.eyes as HomeworkVisionResult)
        : null,
    producedAt:
      typeof o.producedAt === "number" && Number.isFinite(o.producedAt)
        ? o.producedAt
        : Date.now(),
    photoIds,
  };
}
