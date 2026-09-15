import type { KbImportedDocument } from "../import/kbDocument";
import {
  getKbDocumentById,
  listKbDocuments,
  searchKbDocuments,
} from "./kbQuery";
import type {
  KbDocumentFilter,
  KbListOptions,
  KbSearchHit,
  KbSearchOptions,
} from "./kbQuery";

/**
 * KB Stage 5 — application-facing read-only boundary over Stage 4.
 * Delegates to kbQuery.ts; no duplicated query/search logic.
 * Storage-agnostic: documents are injected, never read from disk here.
 * Provider-agnostic: no UI / LLM / embeddings / network / filesystem.
 */
export interface KbDocumentService {
  getDocumentById(documentId: string): KbImportedDocument | null;
  listDocuments(
    filter?: KbDocumentFilter,
    options?: KbListOptions,
  ): KbImportedDocument[];
  searchDocuments(queryText: string, options?: KbSearchOptions): KbSearchHit[];
}

export class MemoryKbDocumentService implements KbDocumentService {
  private readonly documents: readonly KbImportedDocument[];

  constructor(documents: readonly KbImportedDocument[] = []) {
    this.documents = [...documents];
  }

  getDocumentById(documentId: string): KbImportedDocument | null {
    const found = getKbDocumentById(this.documents, documentId);
    return found ? structuredClone(found) : null;
  }

  listDocuments(
    filter: KbDocumentFilter = {},
    options: KbListOptions = {},
  ): KbImportedDocument[] {
    return structuredClone(listKbDocuments(this.documents, filter, options));
  }

  searchDocuments(
    queryText: string,
    options: KbSearchOptions = {},
  ): KbSearchHit[] {
    return structuredClone(searchKbDocuments(this.documents, queryText, options));
  }
}

export function createKbDocumentService(
  documents: readonly KbImportedDocument[] = [],
): KbDocumentService {
  return new MemoryKbDocumentService(documents);
}
