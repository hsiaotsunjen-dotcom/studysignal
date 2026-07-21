/**
 * AI Quality Platform — load permanent Eyes Quality dataset.
 */

import fs from "node:fs";
import path from "node:path";

import {
  EYES_QUALITY_DIFFICULTIES,
  EYES_QUALITY_IMAGE_TAGS,
  EYES_QUALITY_SUBJECTS,
  type EyesQualityDifficulty,
  type EyesQualityImageTag,
  type EyesQualitySubject,
} from "@/lib/vision/quality/constants";
import type {
  EyesQualityBaselines,
  EyesQualitySample,
  EyesQualitySampleExpected,
} from "@/lib/vision/quality/types";

export function resolveEyesQualityRoot(
  cwd: string = process.cwd(),
): string {
  return path.resolve(cwd, "tests/eyes-quality");
}

export function resolveAiQualityReportsRoot(
  cwd: string = process.cwd(),
): string {
  return path.resolve(cwd, "debug/ai-quality");
}

export function listEyesQualitySampleIds(datasetRoot: string): string[] {
  const samplesDir = path.join(datasetRoot, "samples");
  if (!fs.existsSync(samplesDir)) return [];
  return fs
    .readdirSync(samplesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((id) => /^\d{3}_[a-z0-9_]+$/.test(id))
    .sort();
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function assertPositiveInt(label: string, v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1) {
    throw new Error(`EyesQuality: ${label} must be a positive integer`);
  }
  return v;
}

function parseDifficulty(raw: unknown, folderId: string): EyesQualityDifficulty {
  if (
    typeof raw === "string" &&
    (EYES_QUALITY_DIFFICULTIES as readonly string[]).includes(raw)
  ) {
    return raw as EyesQualityDifficulty;
  }
  throw new Error(
    `EyesQuality: difficulty must be one of ${EYES_QUALITY_DIFFICULTIES.join(", ")} (${folderId})`,
  );
}

function parseSubject(raw: unknown, folderId: string): EyesQualitySubject {
  if (
    typeof raw === "string" &&
    (EYES_QUALITY_SUBJECTS as readonly string[]).includes(raw)
  ) {
    return raw as EyesQualitySubject;
  }
  throw new Error(
    `EyesQuality: subject must be one of ${EYES_QUALITY_SUBJECTS.join(", ")} (${folderId})`,
  );
}

function parseImageQuality(
  raw: unknown,
  folderId: string,
): EyesQualityImageTag[] {
  if (!Array.isArray(raw) || raw.length < 1) {
    throw new Error(
      `EyesQuality: imageQuality[] required with ≥1 tag (${folderId})`,
    );
  }
  const out: EyesQualityImageTag[] = [];
  for (const tag of raw) {
    if (
      typeof tag !== "string" ||
      !(EYES_QUALITY_IMAGE_TAGS as readonly string[]).includes(tag)
    ) {
      throw new Error(
        `EyesQuality: unknown imageQuality tag "${String(tag)}" (${folderId})`,
      );
    }
    if (!out.includes(tag as EyesQualityImageTag)) {
      out.push(tag as EyesQualityImageTag);
    }
  }
  return out;
}

/** Structural validation for expected.json (aligned with sample.schema.json). */
export function parseEyesQualityExpected(
  raw: unknown,
  folderId: string,
): EyesQualitySampleExpected {
  if (!raw || typeof raw !== "object") {
    throw new Error(`EyesQuality: expected.json must be an object (${folderId})`);
  }
  const o = raw as Record<string, unknown>;
  const sampleId =
    typeof o.sampleId === "string" && o.sampleId.trim()
      ? o.sampleId.trim()
      : typeof o.id === "string"
        ? o.id
        : folderId;
  if (sampleId !== folderId) {
    throw new Error(
      `EyesQuality: sampleId/id "${sampleId}" !== folder "${folderId}"`,
    );
  }
  if (o.id != null && o.id !== folderId) {
    throw new Error(
      `EyesQuality: expected.id "${String(o.id)}" !== folder "${folderId}"`,
    );
  }
  if (!isNonEmptyString(o.description)) {
    throw new Error(`EyesQuality: description required (${folderId})`);
  }
  if (!Array.isArray(o.photos) || o.photos.length < 1) {
    throw new Error(`EyesQuality: photos[] required (${folderId})`);
  }
  const photos: string[] = [];
  for (const p of o.photos) {
    if (typeof p !== "string" || !/^photo\d+\.jpg$/i.test(p)) {
      throw new Error(`EyesQuality: invalid photo name ${String(p)}`);
    }
    photos.push(p);
  }

  const expectedQuestionCount = assertPositiveInt(
    "expectedQuestionCount|questionCount",
    o.expectedQuestionCount ?? o.questionCount,
  );

  let expectedQuestionNumbers: number[] | undefined;
  if (o.expectedQuestionNumbers != null) {
    if (!Array.isArray(o.expectedQuestionNumbers)) {
      throw new Error("EyesQuality: expectedQuestionNumbers must be an array");
    }
    expectedQuestionNumbers = o.expectedQuestionNumbers.map((n, i) =>
      assertPositiveInt(`expectedQuestionNumbers[${i}]`, n),
    );
  }

  if (!Array.isArray(o.expectedAnswers)) {
    throw new Error(`EyesQuality: expectedAnswers required (${folderId})`);
  }
  const expectedAnswers = o.expectedAnswers.map((row, i) => {
    if (!row || typeof row !== "object") {
      throw new Error(`EyesQuality: expectedAnswers[${i}] invalid`);
    }
    const a = row as Record<string, unknown>;
    const questionNumber = assertPositiveInt(
      `expectedAnswers[${i}].questionNumber`,
      a.questionNumber,
    );
    if (a.studentAnswer != null && typeof a.studentAnswer !== "string") {
      throw new Error(
        `EyesQuality: expectedAnswers[${i}].studentAnswer must be string|null`,
      );
    }
    const acceptedAnswers = Array.isArray(a.acceptedAnswers)
      ? a.acceptedAnswers.filter((x): x is string => typeof x === "string")
      : undefined;
    const minConfidence =
      typeof a.minConfidence === "number" ? a.minConfidence : undefined;
    return {
      questionNumber,
      studentAnswer: (a.studentAnswer as string | null) ?? null,
      ...(acceptedAnswers ? { acceptedAnswers } : {}),
      ...(minConfidence != null ? { minConfidence } : {}),
    };
  });

  if (!Array.isArray(o.expectedBlanks)) {
    throw new Error(`EyesQuality: expectedBlanks required (${folderId})`);
  }
  const expectedBlanks = o.expectedBlanks.map((n, i) =>
    assertPositiveInt(`expectedBlanks[${i}]`, n),
  );

  if (!isNonEmptyString(o.expectedOverview)) {
    throw new Error(`EyesQuality: expectedOverview required (${folderId})`);
  }
  if (!isNonEmptyString(o.grade)) {
    throw new Error(`EyesQuality: grade required (${folderId})`);
  }
  if (!isNonEmptyString(o.language)) {
    throw new Error(`EyesQuality: language required (${folderId})`);
  }

  const answeredNums = new Set(
    expectedAnswers
      .filter((a) => a.studentAnswer != null && a.studentAnswer.trim() !== "")
      .map((a) => a.questionNumber),
  );
  for (const b of expectedBlanks) {
    if (answeredNums.has(b)) {
      throw new Error(
        `EyesQuality: Q${b} cannot be both answered and blank (${folderId})`,
      );
    }
  }

  const enabled = o.enabled === false ? false : true;

  return {
    id: folderId,
    sampleId: folderId,
    description: o.description,
    photos,
    enabled,
    subject: parseSubject(o.subject, folderId),
    grade: o.grade,
    language: o.language,
    difficulty: parseDifficulty(o.difficulty, folderId),
    imageQuality: parseImageQuality(o.imageQuality, folderId),
    ...(isNonEmptyString(o.providerNotes)
      ? { providerNotes: o.providerNotes }
      : {}),
    questionCount: expectedQuestionCount,
    expectedQuestionCount,
    ...(expectedQuestionNumbers ? { expectedQuestionNumbers } : {}),
    expectedAnswers,
    expectedBlanks,
    ...(typeof o.expectedConfidenceMin === "number"
      ? { expectedConfidenceMin: o.expectedConfidenceMin }
      : {}),
    ...(typeof o.expectedConfidenceMax === "number"
      ? { expectedConfidenceMax: o.expectedConfidenceMax }
      : {}),
    expectedOverview: o.expectedOverview,
  };
}

export function loadEyesQualitySample(
  datasetRoot: string,
  sampleId: string,
): EyesQualitySample {
  const rootDir = path.join(datasetRoot, "samples", sampleId);
  const expectedPath = path.join(rootDir, "expected.json");
  if (!fs.existsSync(expectedPath)) {
    throw new Error(`EyesQuality: missing ${expectedPath}`);
  }
  const raw = JSON.parse(fs.readFileSync(expectedPath, "utf8")) as unknown;
  const expected = parseEyesQualityExpected(raw, sampleId);
  const photoPaths = expected.photos.map((name) => {
    const p = path.join(rootDir, name);
    if (!fs.existsSync(p)) {
      throw new Error(`EyesQuality: missing photo ${p}`);
    }
    return p;
  });
  return { rootDir, expected, photoPaths };
}

export function loadAllEyesQualitySamples(
  datasetRoot: string = resolveEyesQualityRoot(),
  options: { enabledOnly?: boolean } = {},
): EyesQualitySample[] {
  const enabledOnly = options.enabledOnly !== false;
  return listEyesQualitySampleIds(datasetRoot)
    .map((id) => loadEyesQualitySample(datasetRoot, id))
    .filter((s) => (enabledOnly ? s.expected.enabled !== false : true));
}

export function loadEyesQualityBaselines(
  datasetRoot: string = resolveEyesQualityRoot(),
): EyesQualityBaselines {
  const p = path.join(datasetRoot, "baselines.json");
  if (!fs.existsSync(p)) {
    throw new Error(`EyesQuality: missing baselines at ${p}`);
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as EyesQualityBaselines;
}

export function sampleImagesToAnalyzeInput(sample: EyesQualitySample): {
  images: Array<{ mimeType: string; base64: string }>;
} {
  return {
    images: sample.photoPaths.map((p) => ({
      mimeType: "image/jpeg",
      base64: fs.readFileSync(p).toString("base64"),
    })),
  };
}
