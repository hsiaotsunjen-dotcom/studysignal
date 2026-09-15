import type { KbImportedDocument } from "../import/kbDocument";
import type { KbSourceRecord, KbSourceType, KbSubject } from "../import/types";

// Re-export for convenience without duplicating Stage 2/3 types.
export type { KbImportedDocument, KbSourceRecord, KbSourceType, KbSubject };

/**
 * KB Stage 4 — deterministic query/read layer over Stage 3 documents.
 * Pure in-memory functions over `KbImportedDocument` values.
 * No AI / RAG / embeddings / network / fuzzy-search dependencies.
 * Ordering is always stable (documentId ascending) so repeated queries
 * over the same inputs return byte-comparable results.
 */

export type KbDocumentFilter = {
  subject?: KbSubject;
  sourceType?: KbSourceType;
  sourceId?: string;
  sourcePath?: string;
  originalFileName?: string;
};

export type KbListOptions = {
  /** Max documents returned. Defaults to 20, capped at 100. */
  limit?: number;
};

export type KbTextSnippet = {
  /** Window of normalized content around one match. */
  excerpt: string;
  /** Character offset of the match start within the full content. */
  offset: number;
  /** Length of the matched query in characters. */
  matchLength: number;
};

export type KbSearchHit = {
  document: KbImportedDocument;
  /** Number of non-overlapping occurrences of the query in content. */
  matchCount: number;
  /** Excerpts in content order (capped per document). */
  snippets: KbTextSnippet[];
};

export type KbSearchOptions = {
  sourceFilter?: KbDocumentFilter;
  /** Max hits returned. Defaults to 20, capped at 100. */
  limit?: number;
  /** Characters of context on each side of a match. Default 40. */
  snippetRadius?: number;
  /** Max excerpts per document. Default 3. */
  maxSnippetsPerDocument?: number;
};

export const KB_QUERY_DEFAULT_LIMIT = 20;
export const KB_QUERY_MAX_LIMIT = 100;

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return KB_QUERY_DEFAULT_LIMIT;
  if (!Number.isFinite(limit)) return KB_QUERY_DEFAULT_LIMIT;
  const floored = Math.floor(limit);
  if (floored <= 0) return 0;
  return Math.min(floored, KB_QUERY_MAX_LIMIT);
}

function compareDocumentId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function matchesDocumentFilter(
  doc: KbImportedDocument,
  filter: KbDocumentFilter,
): boolean {
  if (filter.subject !== undefined && doc.subject !== filter.subject) return false;
  if (filter.sourceType !== undefined && doc.sourceType !== filter.sourceType) {
    return false;
  }
  if (filter.sourceId !== undefined && doc.sourceId !== filter.sourceId) return false;
  if (filter.sourcePath !== undefined && doc.sourcePath !== filter.sourcePath) {
    return false;
  }
  if (
    filter.originalFileName !== undefined &&
    doc.originalFileName !== filter.originalFileName
  ) {
    return false;
  }
  return true;
}

/** Retrieve one document by its stable id; null when absent. */
export function getKbDocumentById(
  documents: readonly KbImportedDocument[],
  documentId: string,
): KbImportedDocument | null {
  return documents.find((d) => d.documentId === documentId) ?? null;
}

/**
 * List documents matching an exact source-metadata filter.
 * Always sorted by documentId ascending; limit applied after sorting.
 */
export function listKbDocuments(
  documents: readonly KbImportedDocument[],
  filter: KbDocumentFilter = {},
  options: KbListOptions = {},
): KbImportedDocument[] {
  const limit = clampLimit(options.limit);
  const matched = documents.filter((d) => matchesDocumentFilter(d, filter));
  matched.sort((a, b) => compareDocumentId(a.documentId, b.documentId));
  return matched.slice(0, limit);
}

function normalizeSearchText(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

function buildSnippet(
  content: string,
  matchOffset: number,
  matchLength: number,
  radius: number,
): KbTextSnippet {
  const safeRadius = Math.max(0, Math.min(Math.floor(radius), 500));
  const start = Math.max(0, matchOffset - safeRadius);
  const end = Math.min(content.length, matchOffset + matchLength + safeRadius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return {
    excerpt: `${prefix}${content.slice(start, end)}${suffix}`,
    offset: matchOffset,
    matchLength,
  };
}

/**
 * Simple deterministic substring search over stored normalized content.
 * Case-insensitive (NFC + lowercase); CJK matches exactly as stored.
 * Hits sorted by documentId ascending; limit applied after sorting.
 */
export function searchKbDocuments(
  documents: readonly KbImportedDocument[],
  queryText: string,
  options: KbSearchOptions = {},
): KbSearchHit[] {
  const needle = normalizeSearchText(queryText.trim());
  if (needle.length === 0) return [];
  const limit = clampLimit(options.limit);
  if (limit === 0) return [];
  const radius = options.snippetRadius ?? 40;
  const maxSnippets = options.maxSnippetsPerDocument ?? 3;
  const safeMaxSnippets = Math.max(1, Math.min(Math.floor(maxSnippets), 10));
  const filter = options.sourceFilter ?? {};

  const hits: KbSearchHit[] = [];
  for (const document of documents) {
    if (!matchesDocumentFilter(document, filter)) continue;
    const haystack = normalizeSearchText(document.content);
    const snippets: KbTextSnippet[] = [];
    let matchCount = 0;
    let fromIndex = 0;
    while (true) {
      const found = haystack.indexOf(needle, fromIndex);
      if (found === -1) break;
      matchCount += 1;
      if (snippets.length < safeMaxSnippets) {
        snippets.push(buildSnippet(document.content, found, needle.length, radius));
      }
      fromIndex = found + needle.length;
      if (needle.length === 0) break;
    }
    if (matchCount > 0) {
      hits.push({ document, matchCount, snippets });
    }
  }
  hits.sort((a, b) => compareDocumentId(a.document.documentId, b.document.documentId));
  return hits.slice(0, limit);
}
