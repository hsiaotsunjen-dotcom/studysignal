/**
 * KB Stage 2 — source ingestion types.
 * Provider-agnostic; no AI / RAG / embeddings / SQL / vendor code here.
 * Unknown metadata stays null / "unknown" — never invented.
 */

export const KB_SUBJECTS = ["biology", "chemistry"] as const;
export type KbSubject = (typeof KB_SUBJECTS)[number];

export const KB_SOURCE_TYPES = [
  "textbook",
  "exam_paper",
  "toc",
  "other",
] as const;
export type KbSourceType = (typeof KB_SOURCE_TYPES)[number];

export const KB_SOURCE_STATUSES = [
  "registered",
  "normalized",
  "rejected",
] as const;
export type KbSourceStatus = (typeof KB_SOURCE_STATUSES)[number];

/**
 * One immutable raw source (OCR TXT / PDF text export / TOC text).
 * Conceptual model only — storage is a versioned JSON registry for now.
 * Later migratable to SQLite without changing this shape.
 */
export type KbSourceRecord = {
  id: string;
  subject: KbSubject;
  sourceType: KbSourceType;
  title: string;
  /** Publication / exam year when known, else null. */
  year: number | null;
  publisher: string | null;
  edition: string | null;
  originalFileName: string;
  /** Repo-relative path of the immutable raw file. */
  sourcePath: string;
  /** SHA-256 hex of the exact raw bytes, stored before normalization. */
  checksum: string;
  /** OCR engine name when known, else null. */
  ocrEngine: string | null;
  /** BCP-47-ish tag when known, else null (e.g. "zh-Hant"). */
  language: string | null;
  /** ISO-8601 timestamp of registration. */
  importedAt: string;
  operator: string | null;
  reviewer: string | null;
  notes: string | null;
  status: KbSourceStatus;
};

/** Input for registering a raw source; unknown fields stay null. */
export type KbRegisterSourceInput = {
  subject: KbSubject;
  sourceType: KbSourceType;
  title: string;
  originalFileName: string;
  sourcePath: string;
  rawText: string;
  year?: number | null;
  publisher?: string | null;
  edition?: string | null;
  ocrEngine?: string | null;
  language?: string | null;
  operator?: string | null;
  reviewer?: string | null;
  notes?: string | null;
};

export type KbSourceRegistryFile = {
  version: 1;
  sources: KbSourceRecord[];
};
