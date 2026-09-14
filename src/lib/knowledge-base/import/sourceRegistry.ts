import { createHash } from "node:crypto";

import { kbId } from "../utils/ids";
import type {
  KbRegisterSourceInput,
  KbSourceRecord,
  KbSourceRegistryFile,
  KbSourceStatus,
} from "./types";

/**
 * KB Stage 2 — raw source registration helpers.
 * Raw bytes are never modified here; checksum is computed before normalization.
 * Provider-agnostic; no AI / SQL / vendor calls.
 */

export function checksumRawText(rawText: string): string {
  return createHash("sha256").update(rawText, "utf8").digest("hex");
}

function toNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableYear(value: number | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  return Number.isInteger(value) ? value : null;
}

/**
 * Build a source record without inventing unknown metadata.
 * Caller supplies importedAt for deterministic tests; defaults to now.
 */
export function buildSourceRecord(
  input: KbRegisterSourceInput,
  options?: { importedAt?: string; status?: KbSourceStatus },
): KbSourceRecord {
  const checksum = checksumRawText(input.rawText);
  const id = kbId("src", `${input.subject}-${input.sourceType}-${checksum.slice(0, 12)}`);
  return {
    id,
    subject: input.subject,
    sourceType: input.sourceType,
    title: input.title,
    year: toNullableYear(input.year),
    publisher: toNullableString(input.publisher),
    edition: toNullableString(input.edition),
    originalFileName: input.originalFileName,
    sourcePath: input.sourcePath,
    checksum,
    ocrEngine: toNullableString(input.ocrEngine),
    language: toNullableString(input.language),
    importedAt: options?.importedAt ?? new Date().toISOString(),
    operator: toNullableString(input.operator),
    reviewer: toNullableString(input.reviewer),
    notes: toNullableString(input.notes),
    status: options?.status ?? "registered",
  };
}

/** Append-safe registry update: same checksum + path is a duplicate. */
export function appendSourceRecord(
  registry: KbSourceRegistryFile,
  record: KbSourceRecord,
): { registry: KbSourceRegistryFile; duplicate: boolean } {
  const duplicate = registry.sources.some(
    (s) => s.checksum === record.checksum && s.sourcePath === record.sourcePath,
  );
  if (duplicate) return { registry, duplicate: true };
  return {
    registry: { version: 1, sources: [...registry.sources, record] },
    duplicate: false,
  };
}

/** Detect identical raw content already registered (checksum match). */
export function findDuplicateSource(
  registry: KbSourceRegistryFile,
  rawText: string,
): KbSourceRecord | null {
  const checksum = checksumRawText(rawText);
  return registry.sources.find((s) => s.checksum === checksum) ?? null;
}

export function emptySourceRegistry(): KbSourceRegistryFile {
  return { version: 1, sources: [] };
}
