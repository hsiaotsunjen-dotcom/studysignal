import type {
  KbDocumentFilter,
  KbSubject,
  KbSourceType,
  KbTextSnippet,
} from "./kbQuery";
import type { KbSkippedDocumentFile } from "./kbFileDocumentRepository";
import type { KbDocumentService } from "./kbDocumentService";

/**
 * KB Stage 7 — minimal read-only Evidence Pack layer above Stage 5/6.
 * Query normalization + delegation to `KbDocumentService.searchDocuments`
 * + citation projection only. No retrieval logic, filesystem, UI, Tutor,
 * Course, OCR, DB, embeddings, LLM, network, or provider-specific code.
 */

export const KB_EVIDENCE_DEFAULT_LIMIT = 5;
export const KB_EVIDENCE_MAX_LIMIT = 20;
export const KB_EVIDENCE_MAX_QUERY_LENGTH = 200;

export type KbEvidenceQuery = {
  queryText: string;
  sourceFilter?: KbDocumentFilter;
  /** Max evidence items. Default 5, capped at 20. */
  limit?: number;
  snippetRadius?: number;
  maxSnippetsPerDocument?: number;
};

export type KbEvidenceItem = {
  documentId: string;
  sourceId: string;
  subject: KbSubject;
  sourceType: KbSourceType;
  title: string;
  originalFileName: string;
  sourcePath: string;
  rawChecksum: string;
  normalizedChecksum: string;
  importedAt: string;
  matchCount: number;
  snippets: KbTextSnippet[];
};

export type KbEvidencePack = {
  normalizedQuery: string;
  totalHits: number;
  items: KbEvidenceItem[];
  skipped: KbSkippedDocumentFile[];
};

/** Normalize raw query text deterministically for matching + logging. */
export function normalizeEvidenceQuery(queryText: string): string {
  const collapsed = queryText
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return collapsed.slice(0, KB_EVIDENCE_MAX_QUERY_LENGTH);
}

function clampEvidenceLimit(limit: number | undefined): number {
  if (limit === undefined) return KB_EVIDENCE_DEFAULT_LIMIT;
  if (!Number.isFinite(limit)) return KB_EVIDENCE_DEFAULT_LIMIT;
  const floored = Math.floor(limit);
  if (floored <= 0) return 0;
  return Math.min(floored, KB_EVIDENCE_MAX_LIMIT);
}

/**
 * Build a deterministic, citable evidence pack.
 * Delegates matching to the Stage 5 service (Stage 4 semantics);
 * projects only provenance/citation fields + snippets, never full content.
 */
export function buildKbEvidencePack(
  service: KbDocumentService,
  query: KbEvidenceQuery,
  skipped: readonly KbSkippedDocumentFile[] = [],
): KbEvidencePack {
  const normalizedQuery = normalizeEvidenceQuery(query.queryText);
  const skippedCopy: KbSkippedDocumentFile[] = structuredClone([...skipped]);
  if (normalizedQuery.length === 0) {
    return { normalizedQuery, totalHits: 0, items: [], skipped: skippedCopy };
  }
  const limit = clampEvidenceLimit(query.limit);
  const hits =
    limit === 0
      ? []
      : service.searchDocuments(normalizedQuery, {
          sourceFilter: query.sourceFilter,
          // Ask the service for everything; Stage 7 applies its own cap
          // so totalHits stays the pre-limit count.
          limit: 100,
          snippetRadius: query.snippetRadius,
          maxSnippetsPerDocument: query.maxSnippetsPerDocument ?? 2,
        });
  const totalHits = hits.length;
  const items: KbEvidenceItem[] = hits.slice(0, limit).map((hit) => ({
    documentId: hit.document.documentId,
    sourceId: hit.document.sourceId,
    subject: hit.document.subject,
    sourceType: hit.document.sourceType,
    title: hit.document.title,
    originalFileName: hit.document.originalFileName,
    sourcePath: hit.document.sourcePath,
    rawChecksum: hit.document.rawChecksum,
    normalizedChecksum: hit.document.normalizedChecksum,
    importedAt: hit.document.importedAt,
    matchCount: hit.matchCount,
    snippets: structuredClone(hit.snippets),
  }));
  return { normalizedQuery, totalHits, items, skipped: skippedCopy };
}
