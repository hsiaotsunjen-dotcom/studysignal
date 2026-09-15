import { describe, expect, it } from "vitest";

import type { KbImportedDocument } from "@/lib/knowledge-base/import/kbDocument";
import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import { createKbDocumentService } from "@/lib/knowledge-base/query/kbDocumentService";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

async function buildDocs(): Promise<KbImportedDocument[]> {
  const bio = await importOcrTextSource(
    {
      subject: "biology",
      sourceType: "textbook",
      title: "TEST FIXTURE — biology chapter one sample",
      originalFileName: "biology-ch1.raw.txt",
      sourcePath: "tests/kb/fixtures/biology-ch1.raw.txt",
      rawText: "Cell is the basic unit of life.\nDNA inside nucleus.\n",
    },
    { importedAt: IMPORTED_AT },
  );
  const chem = await importOcrTextSource(
    {
      subject: "chemistry",
      sourceType: "exam_paper",
      title: "TEST FIXTURE — chemistry sample",
      originalFileName: "chemistry-sample.txt",
      sourcePath: "tests/kb/fixtures/chemistry-sample.txt",
      rawText: "Acid and base reaction sample.\nMole calculation page.\n",
    },
    { importedAt: IMPORTED_AT },
  );
  return [bio.document, chem.document];
}

describe("KB Stage 5 document service boundary", () => {
  it("gets by id and returns null when missing", async () => {
    const service = createKbDocumentService(await buildDocs());
    const docs = service.listDocuments();
    const target = docs[0] as KbImportedDocument;
    expect(service.getDocumentById(target.documentId)).toEqual(target);
    expect(service.getDocumentById("doc_missing")).toBeNull();
  });

  it("lists with source filter and limit deterministically", async () => {
    const service = createKbDocumentService(await buildDocs());
    expect(service.listDocuments({ subject: "biology" })).toHaveLength(1);
    expect(service.listDocuments({}, { limit: 1 })).toHaveLength(1);
    expect(
      service.listDocuments({ sourcePath: "tests/kb/fixtures/nope.txt" }),
    ).toHaveLength(0);
  });

  it("searches text and skips unrelated documents", async () => {
    const service = createKbDocumentService(await buildDocs());
    const hits = service.searchDocuments("nucleus");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.document.subject).toBe("biology");
    expect(hits[0]?.snippets[0]?.excerpt).toContain("nucleus");
    expect(service.searchDocuments("photosynthesis-xyz")).toHaveLength(0);
  });
});
