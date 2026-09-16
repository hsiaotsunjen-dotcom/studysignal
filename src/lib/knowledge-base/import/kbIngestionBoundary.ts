import { KB_SOURCE_TYPES, KB_SUBJECTS } from "./types";
import type { KbRegisterSourceInput, KbSourceType, KbSubject } from "./types";

/**
 * KB Stage 10 — safe ingestion boundary for externally prepared text.
 * Validates candidate records BEFORE the Stage 2 -> Stage 3 pipeline.
 * Pure + deterministic: no filesystem, parsing, writes, or AI calls.
 * Traditional Chinese / UTF-8 preserved byte-for-byte (NFC for compare).
 */

export const KB_INGESTION_VERSION = 1 as const;
export const KB_INGESTION_MAX_TITLE_LENGTH = 200;
export const KB_INGESTION_MAX_CONTENT_LENGTH = 200_000;
export const KB_INGESTION_MAX_PATH_LENGTH = 260;
export const KB_INGESTION_ALLOWED_EXTENSIONS = [".txt", ".md"] as const;

export type KbCandidateRecord = {
  subject: unknown;
  sourceType: unknown;
  title: unknown;
  originalFileName: unknown;
  sourcePath: unknown;
  content: unknown;
  year?: unknown;
  publisher?: unknown;
  edition?: unknown;
  language?: unknown;
  operator?: unknown;
  reviewer?: unknown;
  notes?: unknown;
  importedAt?: unknown;
};

export type KbIngestionIssue = { field: string; message: string };

export type KbIngestionResult =
  | { ok: true; candidate: KbRegisterSourceInput; importedAt: string; issues: [] }
  | { ok: false; candidate: null; importedAt: null; issues: KbIngestionIssue[] };

function isKbSubject(value: unknown): value is KbSubject {
  return typeof value === "string" && (KB_SUBJECTS as readonly string[]).includes(value);
}

function isKbSourceType(value: unknown): value is KbSourceType {
  return typeof value === "string" && (KB_SOURCE_TYPES as readonly string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeFileName(value: string): boolean {
  if (value !== value.trim() || value === "." || value === "..") return false;
  if (value.includes("/") || value.includes("\\")) return false;
  if (!/^[A-Za-z0-9_.\-()[\] ]+$/.test(value)) return false;
  const lower = value.toLowerCase();
  return (KB_INGESTION_ALLOWED_EXTENSIONS as readonly string[]).some((e) => lower.endsWith(e));
}

function isSafeSourcePath(value: string): boolean {
  if (value !== value.trim() || value.length > KB_INGESTION_MAX_PATH_LENGTH) return false;
  if (value.startsWith("/") || value.startsWith("\\") || /^[A-Za-z]:/.test(value)) return false;
  const parts = value.split("/");
  if (parts.some((p) => p === "" || p === "." || p === "..")) return false;
  if (parts.some((p) => p.includes("\\"))) return false;
  return parts.every((p) => /^[A-Za-z0-9_.\-()[\] ]+$/.test(p));
}

function toOptionalTrimmed(value: unknown): string | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return "invalid";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateKbCandidateRecord(
  input: unknown,
  options?: { importedAt?: string },
): KbIngestionResult {
  const issues: KbIngestionIssue[] = [];
  const fail = (field: string, message: string): void => {
    issues.push({ field, message });
  };
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  if (!record) {
    return { ok: false, candidate: null, importedAt: null, issues: [{ field: "", message: "expected a candidate object" }] };
  }
  if (!isKbSubject(record["subject"])) fail("subject", "must be biology or chemistry");
  if (!isKbSourceType(record["sourceType"])) fail("sourceType", "must be textbook, exam_paper, toc, or other");
  if (!isNonEmptyString(record["title"])) fail("title", "must be a non-empty string");
  else if (record["title"].normalize("NFC").length > KB_INGESTION_MAX_TITLE_LENGTH) {
    fail("title", "must be at most 200 characters");
  }
  if (typeof record["originalFileName"] !== "string" || !isSafeFileName(record["originalFileName"])) {
    fail("originalFileName", "must be a safe .txt/.md filename without paths");
  }
  if (typeof record["sourcePath"] !== "string" || !isSafeSourcePath(record["sourcePath"])) {
    fail("sourcePath", "must be a safe repo-relative path without traversal");
  }
  if (typeof record["content"] !== "string" || record["content"].trim().length === 0) {
    fail("content", "must be non-empty prepared text");
  } else if (record["content"].length > KB_INGESTION_MAX_CONTENT_LENGTH) {
    fail("content", "must be at most 200000 characters");
  }
  const importedAt = options?.importedAt ?? (record["importedAt"] as string | undefined);
  if (importedAt !== undefined && (typeof importedAt !== "string" || Number.isNaN(Date.parse(importedAt)))) {
    fail("importedAt", "must be an ISO-8601 timestamp when provided");
  }
  let year: number | null | undefined;
  if (record["year"] !== undefined) {
    if (record["year"] === null) year = null;
    else if (typeof record["year"] === "number" && Number.isInteger(record["year"])) year = record["year"];
    else fail("year", "must be an integer year or null when provided");
  }
  const optionalFields = ["publisher", "edition", "language", "operator", "reviewer", "notes"] as const;
  const optional: Record<string, string | null | undefined> = {};
  for (const field of optionalFields) {
    const mapped = toOptionalTrimmed(record[field]);
    if (mapped === "invalid") fail(field, "must be a string or null when provided");
    else optional[field] = mapped;
  }
  if (issues.length > 0) {
    issues.sort((a, b) => (a.field < b.field ? -1 : a.field > b.field ? 1 : a.message < b.message ? -1 : 1));
    return { ok: false, candidate: null, importedAt: null, issues };
  }
  return {
    ok: true,
    candidate: {
      subject: record["subject"] as KbSubject,
      sourceType: record["sourceType"] as KbSourceType,
      title: (record["title"] as string).normalize("NFC"),
      originalFileName: record["originalFileName"] as string,
      sourcePath: record["sourcePath"] as string,
      rawText: record["content"] as string,
      ...(year !== undefined ? { year } : {}),
      ...(optional["publisher"] !== undefined ? { publisher: optional["publisher"] } : {}),
      ...(optional["edition"] !== undefined ? { edition: optional["edition"] } : {}),
      ...(optional["language"] !== undefined ? { language: optional["language"] } : {}),
      ...(optional["operator"] !== undefined ? { operator: optional["operator"] } : {}),
      ...(optional["reviewer"] !== undefined ? { reviewer: optional["reviewer"] } : {}),
      ...(optional["notes"] !== undefined ? { notes: optional["notes"] } : {}),
    },
    importedAt: importedAt ?? "2026-01-01T00:00:00.000Z",
    issues: [],
  };
}
