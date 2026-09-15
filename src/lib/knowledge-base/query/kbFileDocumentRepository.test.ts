import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import { writeImportedDocument } from "@/lib/knowledge-base/import/kbDocumentStore";
import {
  getKbFileDocumentById,
  listKbDocumentFiles,
  loadKbDocumentServiceFromDir,
  loadKbDocumentsFromDir,
} from "@/lib/knowledge-base/query/kbFileDocumentRepository";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

async function bioRaw(): Promise<string> {
  return "Cell is the basic unit of life.\nDNA inside nucleus.\n";
}

async function chemRaw(): Promise<string> {
  return "Acid and base reaction sample.\nMole calculation page.\n";
}

async function writeDoc(
  dir: string,
  fileName: string,
  rawText: string,
  subject: "biology" | "chemistry",
  sourcePath: string,
): Promise<string> {
  const { document } = await importOcrTextSource(
    {
      subject,
      sourceType: subject === "biology" ? "textbook" : "exam_paper",
      title: `TEST FIXTURE — ${fileName}`,
      originalFileName: fileName,
      sourcePath,
      rawText,
    },
    { importedAt: IMPORTED_AT },
  );
  const filePath = path.join(dir, `${document.documentId}.json`);
  await writeImportedDocument(filePath, document);
  return document.documentId;
}

describe("KB Stage 6 file document repository", () => {
  it("loads valid docs into the service with deterministic order", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-repo-"));
    try {
      const chemId = await writeDoc(dir, "chem.txt", await chemRaw(), "chemistry", "t/chem.txt");
      const bioId = await writeDoc(dir, "bio.txt", await bioRaw(), "biology", "t/bio.txt");
      const files = await listKbDocumentFiles(dir);
      expect(files).toEqual([...files].sort());

      const { service, documents, skipped } = await loadKbDocumentServiceFromDir(dir);
      expect(skipped).toEqual([]);
      expect(documents.map((d) => d.documentId)).toEqual([bioId, chemId].sort());
      expect(service.listDocuments().map((d) => d.documentId)).toEqual(
        documents.map((d) => d.documentId),
      );
      expect((await getKbFileDocumentById(dir, bioId))?.subject).toBe("biology");
      expect(await getKbFileDocumentById(dir, "doc_missing")).toBeNull();
      expect(service.searchDocuments("nucleus")).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("skip-and-reports invalid files and ignores unsafe names", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-repo-bad-"));
    try {
      const validId = await writeDoc(dir, "ok.txt", await bioRaw(), "biology", "t/ok.txt");
      await writeFile(path.join(dir, "broken.json"), "{ not json", "utf8");
      await writeFile(
        path.join(dir, "wrong.json"),
        JSON.stringify({ version: 1, nope: true }),
        "utf8",
      );
      await writeFile(path.join(dir, "notes.txt"), "ignore me", "utf8");
      await writeFile(path.join(dir, "../evil.json"), "ignore me", "utf8").catch(() => undefined);

      const { documents, skipped, service } = await loadKbDocumentServiceFromDir(dir);
      expect(documents.map((d) => d.documentId)).toEqual([validId]);
      expect(skipped.map((s) => path.basename(s.file)).sort()).toEqual(
        ["broken.json", "wrong.json"],
      );
      expect(skipped.every((s) => s.reason.length > 0)).toBe(true);
      expect(service.listDocuments()).toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("handles empty and missing directories per policy", async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), "ss-kb-repo-empty-"));
    try {
      const loaded = await loadKbDocumentsFromDir(emptyDir);
      expect(loaded.documents).toEqual([]);
      expect(loaded.skipped).toEqual([]);
      const viaService = await loadKbDocumentServiceFromDir(emptyDir);
      expect(viaService.service.listDocuments()).toEqual([]);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
    const missing = path.join(tmpdir(), `ss-kb-missing-${Date.now()}`);
    await expect(loadKbDocumentsFromDir(missing)).rejects.toThrow(missing);
  });
});
