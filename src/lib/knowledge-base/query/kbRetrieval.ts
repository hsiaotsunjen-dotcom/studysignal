import type { KbSourceType, KbSubject } from "./kbQuery";
import type { KbSkippedDocumentFile } from "./kbFileDocumentRepository";
import type { KbEvidencePack } from "./kbEvidence";

/**
 * KB Stage 8 — stable bounded retrieval-result boundary.
 * Pure synchronous projection of a Stage 7 Evidence Pack into citable,
 * model-neutral results. No search, ranking, filesystem, UI, Tutor,
 * Course, OCR, DB, embeddings, LLM, network, or provider-specific code.
 */

export const KB_RETRIEVAL_DEFAULT_MAX_ITEMS = 3;
export const KB_RETRIEVAL_MAX_ITEMS_CAP = 8;
export const KB_RETRIEVAL_DEFAULT_MAX_SNIPPETS = 1;
export const KB_RETRIEVAL_MAX_SNIPPETS_CAP = 2;
export const KB_RETRIEVAL_DEFAULT_MAX_EXCERPT_CHARS = 400;
export const KB_RETRIEVAL_MAX_EXCERPT_CHARS_CAP = 1000;

export type KbRetrievalOptions = {
  maxItems?: number;
  maxSnippetsPerItem?: number;
  maxExcerptChars?: number;
  includeSkipped?: boolean;
};

export type KbRetrievalCitation = {
  documentId: string;
  sourceId: string;
  subject: KbSubject;
  sourceType: KbSourceType;
  title: string;
  sourcePath: string;
  normalizedChecksum: string;
  importedAt: string;
  matchCount: number;
  excerpts: string[];
  citation: string;
};

export type KbRetrievalResult = {
  normalizedQuery: string;
  totalEvidenceHits: number;
  returnedItems: number;
  truncated: boolean;
  citations: KbRetrievalCitation[];
  skipped: KbSkippedDocumentFile[];
};

function clampInt(value: number | undefined, def: number, cap: number): number {
  if (value === undefined) return def;
  if (!Number.isFinite(value)) return def;
  const floored = Math.floor(value);
  if (floored <= 0) return 0;
  return Math.min(floored, cap);
}

function truncateExcerpt(excerpt: string, maxChars: number): { text: string; cut: boolean } {
  if (excerpt.length <= maxChars) return { text: excerpt, cut: false };
  return { text: `${excerpt.slice(0, Math.max(0, maxChars - 1))}…`, cut: true };
}

/**
 * Project an Evidence Pack into a bounded retrieval result.
 * Preserves pack ordering; totalEvidenceHits stays the pre-limit total.
 * Never exposes full document content; inputs are never mutated.
 */
export function buildKbRetrievalResult(
  pack: KbEvidencePack,
  options: KbRetrievalOptions = {},
): KbRetrievalResult {
  const maxItems = clampInt(
    options.maxItems,
    KB_RETRIEVAL_DEFAULT_MAX_ITEMS,
    KB_RETRIEVAL_MAX_ITEMS_CAP,
  );
  const maxSnippets = clampInt(
    options.maxSnippetsPerItem,
    KB_RETRIEVAL_DEFAULT_MAX_SNIPPETS,
    KB_RETRIEVAL_MAX_SNIPPETS_CAP,
  );
  const maxExcerptChars = clampInt(
    options.maxExcerptChars,
    KB_RETRIEVAL_DEFAULT_MAX_EXCERPT_CHARS,
    KB_RETRIEVAL_MAX_EXCERPT_CHARS_CAP,
  );
  const includeSkipped = options.includeSkipped ?? false;

  const totalEvidenceHits = pack.totalHits;
  const bounded = pack.items.slice(0, maxItems);
  let truncated = pack.items.length > bounded.length;
  const citations: KbRetrievalCitation[] = bounded.map((item) => {
    const snippets = item.snippets.slice(0, maxSnippets);
    if (item.snippets.length > snippets.length) truncated = true;
    const excerpts = snippets.map((s) => {
      const { text, cut } = truncateExcerpt(s.excerpt, maxExcerptChars);
      if (cut) truncated = true;
      return text;
    });
    return {
      documentId: item.documentId,
      sourceId: item.sourceId,
      subject: item.subject,
      sourceType: item.sourceType,
      title: item.title,
      sourcePath: item.sourcePath,
      normalizedChecksum: item.normalizedChecksum,
      importedAt: item.importedAt,
      matchCount: item.matchCount,
      excerpts,
      citation: `[${item.documentId}] ${item.title} (${item.sourcePath}) · matches ${item.matchCount}`,
    };
  });
  return {
    normalizedQuery: pack.normalizedQuery,
    totalEvidenceHits,
    returnedItems: citations.length,
    truncated,
    citations,
    skipped: includeSkipped ? structuredClone([...pack.skipped]) : [],
  };
}
