import path from "node:path";
import { describe, expect, it } from "vitest";

import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import {
  importedDocumentPath,
  readImportedDocument,
  serializeImportedDocument,
  writeImportedDocument,
} from "@/lib/knowledge-base/import/kbDocumentStore";
import { validateImportedDocument } from "@/lib/knowledge-base/import/validateKbDocument";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

const FIXTURE_ABS = path.resolve(process.cwd(), "tests/kb/fixtures/biology-ch1.raw.txt");
const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

describe("KB Stage 3 document store (filesystem persistence)", () => {
  it("serializes deterministically and validates", async () => {
    const { document } = await importOcrTextSource(
      {
        subject: "biology",
        sourceType: "textbook",
        title: "TEST FIXTURE — biology chapter one sample",
        originalFileName: "biology-ch1.raw.txt",
        sourcePath: "tests/kb/fixtures/biology-ch1.raw.txt",
        rawFilePath: FIXTURE_ABS,
      },
      { importedAt: IMPORTED_AT },
    );
    expect(validateImportedDocument(document).ok).toBe(true);
    expect(serializeImportedDocument(document)).toBe(serializeImportedDocument(document));
    expect(importedDocumentPath(document.documentId)).toBe(
      path.join("content/knowledge-base/documents", `${document.documentId}.json`),
    );
  });

  it("write -> read round-trip preserves deep equality", async () => {
    const { document } = await importOcrTextSource(
      {
        subject: "biology",
        sourceType: "textbook",
        title: "TEST FIXTURE — biology chapter one sample",
        originalFileName: "biology-ch1.raw.txt",
        sourcePath: "tests/kb/fixtures/biology-ch1.raw.txt",
        rawFilePath: FIXTURE_ABS,
      },
      { importedAt: IMPORTED_AT },
    );
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-doc-"));
    try {
      const filePath = path.join(dir, "doc.json");
      await writeImportedDocument(filePath, document);
      expect(await readImportedDocument(filePath)).toEqual(document);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
