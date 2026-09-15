import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import type { KbImportedDocument } from "@/lib/knowledge-base/import/kbDocument";
import { writeImportedDocument } from "@/lib/knowledge-base/import/kbDocumentStore";
import { loadKbDocumentServiceFromDir } from "@/lib/knowledge-base/query/kbFileDocumentRepository";
import {
  buildKbEvidencePack,
  normalizeEvidenceQuery,
} from "@/lib/knowledge-base/query/kbEvidence";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

async function bioDoc(): Promise<KbImportedDocument> {
  const { document } = await importOcrTextSource(
    {
      subject: "biology",
      sourceType: "textbook",
      title: "TEST FIXTURE — biology",
      originalFileName: "bio.txt",
      sourcePath: "t/bio.txt",
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
      title: "TEST FIXTURE — chemistry",
      originalFileName: "chem.txt",
      sourcePath: "t/chem.txt",
      rawText: "Acid and base reaction sample.\nMole calculation page.\n",
    },
    { importedAt: IMPORTED_AT },
  );
  return document;
}

async function serviceFromTempDir(): Promise<{
  dir: string;
  cleanup: () => Promise<void>;
  bioId: string;
}> {
  const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-evidence-"));
  const bio = await bioDoc();
  const chem = await chemDoc();
  await writeImportedDocument(path.join(dir, `${bio.documentId}.json`), bio);
  await writeImportedDocument(path.join(dir, `${chem.documentId}.json`), chem);
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }), bioId: bio.documentId };
}

describe("KB Stage 7 evidence pack", () => {
  it("finds expected evidence with citations and no full content", async () => {
    const { dir, cleanup, bioId } = await serviceFromTempDir();
    try {
      const { service } = await loadKbDocumentServiceFromDir(dir);
      const pack = buildKbEvidencePack(service, { queryText: "nucleus" });
      expect(pack.totalHits).toBe(1);
      expect(pack.items).toHaveLength(1);
      expect(pack.items[0]?.documentId).toBe(bioId);
      expect(pack.items[0]?.sourcePath).toBe("t/bio.txt");
      expect(pack.items[0]).not.toHaveProperty("content");
      expect(pack.items[0]?.snippets[0]?.excerpt).toContain("nucleus");
      expect(pack.normalizedQuery).toBe("nucleus");
    } finally {
      await cleanup();
    }
  });

  it("is deterministic, case-insensitive, and honors limit/totalHits", async () => {
    const { dir, cleanup } = await serviceFromTempDir();
    try {
      const { service } = await loadKbDocumentServiceFromDir(dir);
      expect(buildKbEvidencePack(service, { queryText: "CELL" })).toEqual(
        buildKbEvidencePack(service, { queryText: "cell" }),
      );
      expect(normalizeEvidenceQuery("  Cell\nNucleus  ")).toBe("cell nucleus");
      const both = buildKbEvidencePack(service, { queryText: "sample", limit: 10 });
      void both;
      const limited = buildKbEvidencePack(service, { queryText: "e", limit: 1 });
      expect(limited.items).toHaveLength(1);
      expect(limited.totalHits).toBeGreaterThanOrEqual(1);
      const bioOnly = buildKbEvidencePack(service, {
        queryText: "e",
        sourceFilter: { subject: "biology" },
        limit: 10,
      });
      expect(bioOnly.items.every((i) => i.subject === "biology")).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("handles empty, no-result, and skipped files", async () => {
    const { dir, cleanup } = await serviceFromTempDir();
    try {
      const { service } = await loadKbDocumentServiceFromDir(dir);
      expect(buildKbEvidencePack(service, { queryText: "   " })).toEqual({
        normalizedQuery: "",
        totalHits: 0,
        items: [],
        skipped: [],
      });
      const miss = buildKbEvidencePack(service, { queryText: "photosynthesis-xyz" });
      expect(miss.totalHits).toBe(0);
      expect(miss.items).toEqual([]);

      await writeFile(path.join(dir, "broken.json"), "{ bad", "utf8");
      const reloaded = await loadKbDocumentServiceFromDir(dir);
      const withSkipped = buildKbEvidencePack(
        reloaded.service,
        { queryText: "nucleus" },
        reloaded.skipped,
      );
      expect(withSkipped.skipped).toHaveLength(1);
      expect(withSkipped.totalHits).toBe(1);
    } finally {
      await cleanup();
    }
  });
});
