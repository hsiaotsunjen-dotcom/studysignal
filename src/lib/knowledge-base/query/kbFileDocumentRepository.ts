import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  importedDocumentFileName,
  readImportedDocument,
} from "../import/kbDocumentStore";
import type { KbImportedDocument } from "../import/kbDocument";
import {
  createKbDocumentService,
} from "./kbDocumentService";
import type { KbDocumentService } from "./kbDocumentService";

/**
 * KB Stage 6 — read-only filesystem repository over Stage 3 documents.
 * Loads validated `*.json` documents from a directory and exposes them
 * through the Stage 5 `KbDocumentService` boundary.
 * No query logic here: Stage 4/5 own retrieval, listing, and search.
 * No watching, caching, network, UI, Tutor, or API integration.
 */

export type KbSkippedDocumentFile = {
  file: string;
  reason: string;
};

export type KbRepositoryLoadResult = {
  service: KbDocumentService;
  documents: KbImportedDocument[];
  skipped: KbSkippedDocumentFile[];
};

function isSafeDocumentStem(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function toSkipped(file: string, error: unknown): KbSkippedDocumentFile {
  const reason = error instanceof Error ? error.message : String(error);
  return { file, reason };
}

/**
 * List candidate document files in a directory.
 * Only direct-child `*.json` files with safe-id stems are accepted;
 * anything else (unsafe names, traversal, other extensions) is ignored.
 * Returned paths are sorted for determinism.
 */
export async function listKbDocumentFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (error) {
    throw new Error(
      `KB documents directory not found: ${dir} (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const accepted = entries.filter((entry) => {
    if (!entry.endsWith(".json")) return false;
    const stem = entry.slice(0, -".json".length);
    if (!isSafeDocumentStem(stem)) return false;
    if (entry !== importedDocumentFileName(stem)) return false;
    return true;
  });
  accepted.sort();
  return accepted.map((entry) => path.join(dir, entry));
}

/**
 * Load and validate every accepted document file.
 * Invalid JSON / schema-invalid documents are skipped and reported;
 * valid documents always load. Accepted documents are sorted by
 * documentId so results never depend on OS filesystem ordering.
 * Empty directory returns an empty set; missing directory throws.
 */
export async function loadKbDocumentsFromDir(dir: string): Promise<{
  documents: KbImportedDocument[];
  skipped: KbSkippedDocumentFile[];
}> {
  const files = await listKbDocumentFiles(dir);
  const documents: KbImportedDocument[] = [];
  const skipped: KbSkippedDocumentFile[] = [];
  for (const file of files) {
    try {
      documents.push(await readImportedDocument(file));
    } catch (error) {
      skipped.push(toSkipped(file, error));
    }
  }
  documents.sort((a, b) => (a.documentId < b.documentId ? -1 : a.documentId > b.documentId ? 1 : 0));
  skipped.sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return { documents, skipped };
}

/** Load a directory into the Stage 5 document service boundary. */
export async function loadKbDocumentServiceFromDir(
  dir: string,
): Promise<KbRepositoryLoadResult> {
  const { documents, skipped } = await loadKbDocumentsFromDir(dir);
  return {
    service: createKbDocumentService(documents),
    documents,
    skipped,
  };
}

/**
 * Read one document by id directly from a directory.
 * Returns null for missing/unsafe ids or invalid files (never throws
 * for those); throws only when the directory itself is missing.
 */
export async function getKbFileDocumentById(
  dir: string,
  documentId: string,
): Promise<KbImportedDocument | null> {
  if (!isSafeDocumentStem(documentId)) return null;
  try {
    return await readImportedDocument(path.join(dir, importedDocumentFileName(documentId)));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("KB documents directory not found")) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) return null;
    return null;
  }
}
