import { importOcrTextSource } from "./importOcrText";
import { validateKbCandidateRecord } from "./kbIngestionBoundary";
import type { KbIngestionIssue } from "./kbIngestionBoundary";
import type { KbImportedDocument } from "./kbDocument";
import { validateImportedDocument } from "./validateKbDocument";

/**
 * KB Stage 11 — single-candidate safe import.
 * Accepts the unknown Stage 10 candidate shape, enforces the Stage 10
 * boundary FIRST, and only then enters the existing Stage 2 -> Stage 3
 * pipeline (`importOcrTextSource`, rawText only — never `rawFilePath`).
 * No filesystem scanning, no file writes, no OCR, no AI / network calls.
 * Invalid candidates fail safely with structured issues and never reach
 * the pipeline. Traditional Chinese / UTF-8 preserved by the pipeline.
 */

export const KB_CANDIDATE_IMPORT_VERSION = 1 as const;

export type KbCandidateImportResult =
  | { ok: true; document: KbImportedDocument; rawText: string; importedAt: string; issues: [] }
  | { ok: false; document: null; rawText: null; importedAt: null; issues: KbIngestionIssue[] };

/**
 * Import one boundary candidate into a validated KB document.
 * Deterministic for the same input + importedAt; never mutates `input`.
 * Throws only on unexpected internal inconsistency (pipeline validation
 * failing after a boundary accept); candidate rejections are values.
 */
export async function importKbCandidate(
  input: unknown,
  options?: { importedAt?: string },
): Promise<KbCandidateImportResult> {
  const boundary = validateKbCandidateRecord(input, options);
  if (!boundary.ok) {
    return { ok: false, document: null, rawText: null, importedAt: null, issues: boundary.issues };
  }
  const { document, rawText } = await importOcrTextSource(
    { ...boundary.candidate },
    { importedAt: boundary.importedAt },
  );
  const check = validateImportedDocument(document);
  if (!check.ok) {
    throw new Error(
      `KbCandidateImport pipeline produced an invalid document: ${check.issues
        .slice(0, 5)
        .map((i) => `${i.field}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return { ok: true, document, rawText, importedAt: boundary.importedAt, issues: [] };
}
