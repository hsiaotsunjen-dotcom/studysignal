import { describe, expect, it } from "vitest";

import type { KbImportedDocument } from "@/lib/knowledge-base/import/kbDocument";
import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import {
  getKbDocumentById,
  listKbDocuments,
  searchKbDocuments,
} from "@/lib/knowledge-base/query/kbQuery";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

async function bioDoc(): Promise<KbImportedDocument> {
  const { document } = await importOcrTextSource(
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
  return document;
}

async function chemDoc(): Promise<KbImportedDocument> {
  const { document } = await importOcrTextSource(
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
  return document;
}

describe("KB Stage 4 query layer", () => {
  it("retrieves a document by id and returns null when missing", async () => {
    const docs = [await bioDoc(), await chemDoc()];
    const target = docs[0] as KbImportedDocument;
    expect(getKbDocumentById(docs, target.documentId)).toEqual(target);
    expect(getKbDocumentById(docs, "doc_missing")).toBeNull();
  });

  it("filters by source metadata", async () => {
    const docs = [await bioDoc(), await chemDoc()];
    expect(listKbDocuments(docs, { subject: "biology" })).toHaveLength(1);
    expect(listKbDocuments(docs, { subject: "chemistry" })[0]?.sourcePath).toBe(
      "tests/kb/fixtures/chemistry-sample.txt",
    );
    expect(listKbDocuments(docs, { sourceType: "exam_paper" })).toHaveLength(1);
    expect(
      listKbDocuments(docs, { sourcePath: "tests/kb/fixtures/nope.txt" }),
    ).toHaveLength(0);
  });

  it("finds expected text and skips unrelated documents", async () => {
    const docs = [await bioDoc(), await chemDoc()];
    const hits = searchKbDocuments(docs, "nucleus");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.document.subject).toBe("biology");
    expect(hits[0]?.matchCount).toBe(1);
    expect(hits[0]?.snippets[0]?.excerpt).toContain("nucleus");
    expect(searchKbDocuments(docs, "photosynthesis-xyz")).toHaveLength(0);
  });

  it("is case-insensitive and deterministic with limit", async () => {
    const docs = [await bioDoc(), await chemDoc()];
    const lower = searchKbDocuments(docs, "cell");
    const upper = searchKbDocuments(docs, "CELL");
    expect(upper).toEqual(lower);
    expect(lower).toHaveLength(1);

    const both = searchKbDocuments(docs, "sample");
    expect(both.map((h) => h.document.documentId)).toEqual(
      [...both.map((h) => h.document.documentId)].sort(),
    );
    expect(searchKbDocuments(docs, "sample", { limit: 1 })).toHaveLength(1);
    expect(searchKbDocuments(docs, "   ")).toEqual([]);
  });
});
