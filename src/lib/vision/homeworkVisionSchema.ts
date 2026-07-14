/**
 * Pure schema parse / validate for Homework Vision model payloads.
 * No OCR, coverage, or question inference — structural checks only.
 */

import type {
  HomeworkVisionAssignment,
  HomeworkVisionModelPayload,
  HomeworkVisionPhotoQuality,
  HomeworkVisionQuestion,
  HomeworkVisionQuestionStatus,
} from "@/lib/vision/types";

const PHOTO_QUALITIES = new Set<HomeworkVisionPhotoQuality>([
  "good",
  "fair",
  "poor",
]);

const QUESTION_STATUSES = new Set<HomeworkVisionQuestionStatus>([
  "answered",
  "blank",
  "not_visible",
]);

export class HomeworkVisionSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HomeworkVisionSchemaError";
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFiniteNumber(value: unknown, path: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  throw new HomeworkVisionSchemaError(`${path} must be a finite number.`);
}

function parseConfidence(value: unknown, path: string): number {
  const n = parseFiniteNumber(value, path);
  if (n < 0 || n > 1) {
    throw new HomeworkVisionSchemaError(`${path} must be between 0 and 1.`);
  }
  return n;
}

function parseString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new HomeworkVisionSchemaError(`${path} must be a string.`);
  }
  return value;
}

function parseAssignment(raw: unknown): HomeworkVisionAssignment {
  if (!isPlainObject(raw)) {
    throw new HomeworkVisionSchemaError("assignment must be an object.");
  }
  const totalQuestions = parseFiniteNumber(
    raw.totalQuestions ?? raw.total_questions,
    "assignment.totalQuestions",
  );
  if (!Number.isInteger(totalQuestions) || totalQuestions < 0) {
    throw new HomeworkVisionSchemaError(
      "assignment.totalQuestions must be a non-negative integer.",
    );
  }
  const sameAssignment = raw.sameAssignment ?? raw.same_assignment;
  if (typeof sameAssignment !== "boolean") {
    throw new HomeworkVisionSchemaError(
      "assignment.sameAssignment must be a boolean.",
    );
  }
  return {
    subject: parseString(raw.subject, "assignment.subject").trim(),
    type: parseString(raw.type, "assignment.type").trim(),
    totalQuestions,
    sameAssignment,
  };
}

function parseQuestion(raw: unknown, index: number): HomeworkVisionQuestion {
  const path = `questions[${index}]`;
  if (!isPlainObject(raw)) {
    throw new HomeworkVisionSchemaError(`${path} must be an object.`);
  }
  const number = parseFiniteNumber(raw.number, `${path}.number`);
  if (!Number.isInteger(number) || number < 1) {
    throw new HomeworkVisionSchemaError(
      `${path}.number must be a positive integer.`,
    );
  }
  if (typeof raw.answered !== "boolean") {
    throw new HomeworkVisionSchemaError(`${path}.answered must be a boolean.`);
  }
  const statusRaw = parseString(raw.status, `${path}.status`);
  if (!QUESTION_STATUSES.has(statusRaw as HomeworkVisionQuestionStatus)) {
    throw new HomeworkVisionSchemaError(
      `${path}.status must be answered | blank | not_visible.`,
    );
  }
  const status = statusRaw as HomeworkVisionQuestionStatus;

  let studentAnswer: string | null;
  if (raw.studentAnswer === null || raw.student_answer === null) {
    studentAnswer = null;
  } else if (raw.studentAnswer !== undefined) {
    studentAnswer = parseString(raw.studentAnswer, `${path}.studentAnswer`);
  } else if (raw.student_answer !== undefined) {
    studentAnswer = parseString(raw.student_answer, `${path}.studentAnswer`);
  } else {
    throw new HomeworkVisionSchemaError(
      `${path}.studentAnswer must be a string or null.`,
    );
  }

  return {
    number,
    answered: raw.answered,
    studentAnswer,
    status,
    confidence: parseConfidence(raw.confidence, `${path}.confidence`),
  };
}

function parsePhotoQuality(raw: unknown): HomeworkVisionPhotoQuality {
  const value = parseString(raw, "photoQuality");
  if (!PHOTO_QUALITIES.has(value as HomeworkVisionPhotoQuality)) {
    throw new HomeworkVisionSchemaError(
      "photoQuality must be good | fair | poor.",
    );
  }
  return value as HomeworkVisionPhotoQuality;
}

function parseMissingSections(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    throw new HomeworkVisionSchemaError("missingSections must be an array.");
  }
  return raw.map((item, i) =>
    parseString(item, `missingSections[${i}]`).trim(),
  );
}

/**
 * Accept object or JSON string; return normalized model payload (no provider).
 * Does not invent questions, totals, or coverage.
 */
export function parseHomeworkVisionModelPayload(
  raw: unknown,
): HomeworkVisionModelPayload {
  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new HomeworkVisionSchemaError("provider payload is an empty string.");
    }
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      throw new HomeworkVisionSchemaError(
        "provider payload is not valid JSON.",
      );
    }
  }

  if (value === null || value === undefined) {
    throw new HomeworkVisionSchemaError("provider payload is empty.");
  }
  if (!isPlainObject(value)) {
    throw new HomeworkVisionSchemaError("provider payload must be an object.");
  }

  if (!Array.isArray(value.questions)) {
    throw new HomeworkVisionSchemaError("questions must be an array.");
  }

  return {
    assignment: parseAssignment(value.assignment),
    questions: value.questions.map(parseQuestion),
    missingSections: parseMissingSections(
      value.missingSections ?? value.missing_sections ?? [],
    ),
    photoQuality: parsePhotoQuality(
      value.photoQuality ?? value.photo_quality,
    ),
    confidence: parseConfidence(value.confidence, "confidence"),
  };
}
