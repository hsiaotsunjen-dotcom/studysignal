import { readFile } from "node:fs/promises";
import { buildSourceRecord, checksumRawText } from "./sourceRegistry";
import { normalizeOcrText } from "./normalizeText";
import { buildKbDocument } from "./kbDocument";
import type { KbImportedDocument } from "./kbDocument";
import type { KbRegisterSourceInput } from "./types";

export type KbImportOcrInput = Omit<KbRegisterSourceInput, "rawText"> & {
  rawText?: string;
  rawFilePath?: string;
};

/**
 * KB Stage 3 — one-file OCR-to-KB import.
 * Flow: raw text -> Stage 2 normalize -> Stage 2 source record ->
 * deterministic structured KB document. Pure + filesystem read only.
 */
export async function importOcrTextSource(
  input: KbImportOcrInput,
  options?: { importedAt?: string },
): Promise<{ document: KbImportedDocument; rawText: string }> {
  let rawText = input.rawText ?? null;
  if (rawText === null) {
    if (!input.rawFilePath) throw new Error("importOcrTextSource needs rawText or rawFilePath");
    rawText = await readFile(input.rawFilePath, "utf8");
  }
  const text: string = rawText;
  const { normalizedText, report } = normalizeOcrText(text);
  const sourceRecord = buildSourceRecord(
    {
      subject: input.subject,
      sourceType: input.sourceType,
      title: input.title,
      originalFileName: input.originalFileName,
      sourcePath: input.sourcePath,
      rawText: text,
      year: input.year,
      publisher: input.publisher,
      edition: input.edition,
      ocrEngine: input.ocrEngine,
      language: input.language,
      operator: input.operator,
      reviewer: input.reviewer,
      notes: input.notes,
    },
    { importedAt: options?.importedAt ?? "2026-01-01T00:00:00.000Z" },
  );
  if (sourceRecord.checksum !== checksumRawText(text)) {
    throw new Error("source checksum mismatch");
  }
  if (sourceRecord.checksum !== report.rawChecksum) {
    throw new Error("normalization rawChecksum mismatch");
  }
  const document = buildKbDocument({
    sourceRecord,
    normalizedText,
    normalization: report,
  });
  return { document, rawText: text };
}
