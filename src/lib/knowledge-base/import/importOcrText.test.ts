import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildKbDocument } from "@/lib/knowledge-base/import/kbDocument";
import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";

const FIXTURE_ABS = path.resolve(process.cwd(), "tests/kb/fixtures/biology-ch1.raw.txt");
const FIXTURE_REPO_PATH = "tests/kb/fixtures/biology-ch1.raw.txt";
const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

function bioInput(extra?: Record<string, string>) {
  return {
    subject: "biology" as const,
    sourceType: "textbook" as const,
    title: "TEST FIXTURE — biology chapter one sample",
    originalFileName: "biology-ch1.raw.txt",
    sourcePath: FIXTURE_REPO_PATH,
    rawFilePath: FIXTURE_ABS,
    ...extra,
  };
}

describe("KB Stage 3 OCR-to-KB import (biology fixture only)", () => {
  it("same source produces deterministic output", async () => {
    const first = await importOcrTextSource(bioInput(), { importedAt: IMPORTED_AT });
    const second = await importOcrTextSource(bioInput(), { importedAt: IMPORTED_AT });
    expect(second.document).toEqual(first.document);
  });

  it("normalization is actually applied and preserved", async () => {
    const raw = await readFile(FIXTURE_ABS, "utf8");
    const { document } = await importOcrTextSource(
      {
        subject: "biology",
        sourceType: "textbook",
        title: "TEST FIXTURE — biology chapter one sample",
        originalFileName: "biology-ch1.raw.txt",
        sourcePath: FIXTURE_REPO_PATH,
        rawText: raw,
      },
      { importedAt: IMPORTED_AT },
    );
    expect(document.content).not.toBe(raw);
    expect(document.content).toContain("Cell is the basic unit of life");
    expect(document.normalization.rawChecksum).toBe(document.rawChecksum);
    expect(document.normalization.normalizedChecksum).toBe(document.normalizedChecksum);
  });

  it("provenance and source identity survive the import", async () => {
    const { document } = await importOcrTextSource(bioInput(), { importedAt: IMPORTED_AT });
    expect(document.subject).toBe("biology");
    expect(document.sourcePath).toBe(FIXTURE_REPO_PATH);
    expect(document.originalFileName).toBe("biology-ch1.raw.txt");
    expect(document.provenance.sourceId).toBe(document.sourceId);
    expect(document.provenance.sourcePath).toBe(document.sourcePath);
    expect(document.provenance.checksum).toBe(document.rawChecksum);
    expect(document.version).toBe(1);
    expect(document.pipeline).toEqual({ name: "ocr-text-import", version: 1 });
  });

  it("unrelated files are not involved", async () => {
    const raw = await readFile(FIXTURE_ABS, "utf8");
    const fromPath = await importOcrTextSource(bioInput(), { importedAt: IMPORTED_AT });
    const fromText = await importOcrTextSource(
      {
        subject: "biology",
        sourceType: "textbook",
        title: "TEST FIXTURE — biology chapter one sample",
        originalFileName: "biology-ch1.raw.txt",
        sourcePath: FIXTURE_REPO_PATH,
        rawText: raw,
      },
      { importedAt: IMPORTED_AT },
    );
    expect(fromText.document).toEqual(fromPath.document);
    expect(fromText.rawText).toBe(raw);
    const renamed = await importOcrTextSource(
      {
        subject: "biology",
        sourceType: "textbook",
        title: "TEST FIXTURE — biology chapter one sample",
        originalFileName: "other.txt",
        sourcePath: "tests/kb/fixtures/other.txt",
        rawText: raw,
      },
      { importedAt: IMPORTED_AT },
    );
    // Stage 2 source ids are checksum-derived, so identical bytes share the
    // sourceId; the Stage 3 guarantee is that provenance still records the
    // declared path while normalized content stays identical.
    expect(renamed.document.sourceId).toBe(fromPath.document.sourceId);
    expect(renamed.document.content).toBe(fromPath.document.content);
    expect(renamed.document.provenance.sourcePath).toBe("tests/kb/fixtures/other.txt");
  });

  it("buildKbDocument is pure and rebuildable", async () => {
    const { document } = await importOcrTextSource(bioInput(), { importedAt: IMPORTED_AT });
    const rebuilt = buildKbDocument({
      sourceRecord: {
        id: document.sourceId,
        subject: document.subject,
        sourceType: document.sourceType,
        title: document.title,
        year: null,
        publisher: null,
        edition: null,
        originalFileName: document.originalFileName,
        sourcePath: document.sourcePath,
        checksum: document.rawChecksum,
        ocrEngine: null,
        language: null,
        importedAt: document.provenance.importedAt,
        operator: null,
        reviewer: null,
        notes: null,
        status: "registered",
      },
      normalizedText: document.content,
      normalization: document.normalization,
      importedAtOverride: document.importedAt,
    });
    expect(rebuilt).toEqual(document);
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-doc-"));
    await rm(dir, { recursive: true, force: true });
  });
});
