import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KbImportedDocument } from "./kbDocument";
import { validateImportedDocument } from "./validateKbDocument";

/** Predictable on-disk location for serialized KB documents. */
export const KB_DOCUMENTS_DIR = "content/knowledge-base/documents";

export function importedDocumentFileName(documentId: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(documentId)) {
    throw new Error(`Unsafe documentId: ${documentId}`);
  }
  return `${documentId}.json`;
}

export function importedDocumentPath(documentId: string, baseDir = KB_DOCUMENTS_DIR): string {
  return path.join(baseDir, importedDocumentFileName(documentId));
}

/** Deterministic serialization: stable key order comes from buildKbDocument. */
export function serializeImportedDocument(doc: KbImportedDocument): string {
  const result = validateImportedDocument(doc);
  if (!result.ok) {
    throw new Error(
      `Invalid KbImportedDocument: ${result.issues
        .slice(0, 5)
        .map((i) => `${i.field}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** Validate then atomically persist one KB document file. */
export async function writeImportedDocument(
  filePath: string,
  doc: KbImportedDocument,
): Promise<void> {
  const payload = serializeImportedDocument(doc);
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, payload, "utf8");
  try {
    await rename(tmp, filePath);
  } catch {
    await writeFile(filePath, payload, "utf8");
    try {
      await unlink(tmp);
    } catch {
      // ignore temp cleanup
    }
  }
}

/** Read a persisted KB document and re-validate it. */
export async function readImportedDocument(filePath: string): Promise<KbImportedDocument> {
  const raw = await readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Invalid KbImportedDocument JSON: ${filePath}`);
  }
  const result = validateImportedDocument(parsed);
  if (!result.ok) {
    throw new Error(
      `Invalid KbImportedDocument: ${result.issues
        .slice(0, 5)
        .map((i) => `${i.field}: ${i.message}`)
        .join("; ")}`,
    );
  }
  return structuredClone(parsed) as KbImportedDocument;
}
