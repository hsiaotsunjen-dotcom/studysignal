import { KB_DOCUMENT_VERSION, KB_IMPORT_PIPELINE } from "./kbDocument";

export type KbDocumentValidationIssue = { field: string; message: string };

function isHex64(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isSafeId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value);
}

/** Validate the structured document shape + provenance consistency. */
export function validateImportedDocument(value: unknown): {
  ok: boolean;
  issues: KbDocumentValidationIssue[];
} {
  const issues: KbDocumentValidationIssue[] = [];
  const fail = (field: string, message: string): void => {
    issues.push({ field, message });
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, issues: [{ field: "", message: "expected a JSON object" }] };
  }
  const doc = value as Record<string, unknown>;
  if (doc["version"] !== KB_DOCUMENT_VERSION) fail("version", "must be 1");
  if (!isSafeId(doc["documentId"])) fail("documentId", "must be a safe id");
  const pipeline = doc["pipeline"] as Record<string, unknown> | undefined;
  if (
    !pipeline ||
    pipeline["name"] !== KB_IMPORT_PIPELINE.name ||
    pipeline["version"] !== KB_IMPORT_PIPELINE.version
  ) {
    fail("pipeline", "must match the ocr-text-import pipeline version");
  }
  if (!isSafeId(doc["sourceId"])) fail("sourceId", "must be a safe id");
  if (doc["subject"] !== "biology" && doc["subject"] !== "chemistry") {
    fail("subject", "must be a known KbSubject");
  }
  if (typeof doc["title"] !== "string" || doc["title"].length === 0) {
    fail("title", "must be a non-empty string");
  }
  if (typeof doc["originalFileName"] !== "string" || doc["originalFileName"].length === 0) {
    fail("originalFileName", "must be a non-empty string");
  }
  if (typeof doc["sourcePath"] !== "string" || doc["sourcePath"].length === 0) {
    fail("sourcePath", "must be a non-empty string");
  }
  if (typeof doc["content"] !== "string") fail("content", "must be a string");
  if (!isHex64(doc["rawChecksum"])) fail("rawChecksum", "must be sha256 hex");
  if (!isHex64(doc["normalizedChecksum"])) fail("normalizedChecksum", "must be sha256 hex");
  if (typeof doc["importedAt"] !== "string" || Number.isNaN(Date.parse(doc["importedAt"]))) {
    fail("importedAt", "must be an ISO-8601 timestamp");
  }
  const normalization = doc["normalization"] as Record<string, unknown> | undefined;
  if (!normalization || typeof normalization !== "object") {
    fail("normalization", "must carry the Stage 2 normalization report");
  } else {
    if (normalization["rawChecksum"] !== doc["rawChecksum"]) {
      fail("normalization.rawChecksum", "must match document rawChecksum");
    }
    if (normalization["normalizedChecksum"] !== doc["normalizedChecksum"]) {
      fail("normalization.normalizedChecksum", "must match document normalizedChecksum");
    }
  }
  const provenance = doc["provenance"] as Record<string, unknown> | undefined;
  if (!provenance || typeof provenance !== "object") {
    fail("provenance", "must carry source provenance");
  } else {
    if (provenance["sourceId"] !== doc["sourceId"]) {
      fail("provenance.sourceId", "must match document sourceId");
    }
    if (provenance["checksum"] !== doc["rawChecksum"]) {
      fail("provenance.checksum", "must match document rawChecksum");
    }
    if (provenance["sourcePath"] !== doc["sourcePath"]) {
      fail("provenance.sourcePath", "must match document sourcePath");
    }
    if (provenance["originalFileName"] !== doc["originalFileName"]) {
      fail("provenance.originalFileName", "must match document originalFileName");
    }
    if (provenance["subject"] !== doc["subject"]) {
      fail("provenance.subject", "must match document subject");
    }
  }
  return { ok: issues.length === 0, issues };
}
