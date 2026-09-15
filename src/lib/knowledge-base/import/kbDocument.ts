import type { KbNormalizationReport } from "./normalizeText";
import type { KbSourceRecord, KbSourceType, KbSubject } from "./types";

/**
 * KB Stage 3 — deterministic structured Knowledge Base document.
 * Produced by: raw text -> normalize -> source/provenance ->
 * structured document -> serialized file.
 * Filesystem-based, provider-agnostic; no AI / RAG / embeddings / SQL.
 */

export const KB_DOCUMENT_VERSION = 1 as const;

export const KB_IMPORT_PIPELINE = {
  name: "ocr-text-import",
  version: 1,
} as const;

export type KbImportedDocument = {
  version: typeof KB_DOCUMENT_VERSION;
  /** Deterministic id derived from the normalized checksum. */
  documentId: string;
  pipeline: { name: typeof KB_IMPORT_PIPELINE.name; version: number };
  /** Identity of the registered raw source this document was built from. */
  sourceId: string;
  subject: KbSubject;
  sourceType: KbSourceType;
  title: string;
  originalFileName: string;
  /** Repo-relative path of the immutable raw file. */
  sourcePath: string;
  /** Normalized text content (Stage 2 normalization output). */
  content: string;
  /** SHA-256 of the exact raw input bytes. */
  rawChecksum: string;
  /** SHA-256 of the normalized content bytes. */
  normalizedChecksum: string;
  /** Full Stage 2 normalization report, kept for reproducibility. */
  normalization: KbNormalizationReport;
  /** Redundant-by-design provenance so content traces back to source. */
  provenance: {
    sourceId: string;
    subject: KbSubject;
    sourceType: KbSourceType;
    originalFileName: string;
    sourcePath: string;
    checksum: string;
    importedAt: string;
  };
  /** ISO-8601 timestamp, copied from the source record for determinism. */
  importedAt: string;
};

export type KbBuildDocumentInput = {
  sourceRecord: KbSourceRecord;
  normalizedText: string;
  normalization: KbNormalizationReport;
  importedAtOverride?: string;
};

/**
 * Build a deterministic structured KB document.
 * Pure function: same inputs always produce byte-identical output.
 * `importedAt` is copied from the source record unless explicitly
 * overridden, so re-importing the same registered source is reproducible.
 */
export function buildKbDocument(input: KbBuildDocumentInput): KbImportedDocument {
  const { sourceRecord, normalizedText, normalization } = input;
  const importedAt = input.importedAtOverride ?? sourceRecord.importedAt;
  const documentId = `doc_${normalization.normalizedChecksum.slice(0, 12)}`;
  return {
    version: KB_DOCUMENT_VERSION,
    documentId,
    pipeline: { name: KB_IMPORT_PIPELINE.name, version: KB_IMPORT_PIPELINE.version },
    sourceId: sourceRecord.id,
    subject: sourceRecord.subject,
    sourceType: sourceRecord.sourceType,
    title: sourceRecord.title,
    originalFileName: sourceRecord.originalFileName,
    sourcePath: sourceRecord.sourcePath,
    content: normalizedText,
    rawChecksum: normalization.rawChecksum,
    normalizedChecksum: normalization.normalizedChecksum,
    normalization: { ...normalization },
    provenance: {
      sourceId: sourceRecord.id,
      subject: sourceRecord.subject,
      sourceType: sourceRecord.sourceType,
      originalFileName: sourceRecord.originalFileName,
      sourcePath: sourceRecord.sourcePath,
      checksum: sourceRecord.checksum,
      importedAt: sourceRecord.importedAt,
    },
    importedAt,
  };
}
