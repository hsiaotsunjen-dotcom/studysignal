import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import { writeImportedDocument } from "@/lib/knowledge-base/import/kbDocumentStore";
import { loadKbDocumentServiceFromDir } from "@/lib/knowledge-base/query/kbFileDocumentRepository";
import { buildKbEvidencePack } from "@/lib/knowledge-base/query/kbEvidence";
import { buildKbRetrievalResult } from "@/lib/knowledge-base/query/kbRetrieval";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

describe("KB Stage 8 retrieval result", () => {
  it("bounds items while preserving the pre-limit total", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-ret-"));
    try {
      for (let i = 0; i < 4; i += 1) {
        const { document } = await importOcrTextSource(
          {
            subject: "biology",
            sourceType: "textbook",
            title: `TEST FIXTURE — bio ${i}`,
            originalFileName: `bio-${i}.txt`,
            sourcePath: `t/bio-${i}.txt`,
            rawText: `shared retrieval token alpha ${i}\n`,
          },
          { importedAt: IMPORTED_AT },
        );
        await writeImportedDocument(path.join(dir, `${document.documentId}.json`), document);
      }
      const { service } = await loadKbDocumentServiceFromDir(dir);
      const pack = buildKbEvidencePack(service, {
        queryText: "shared retrieval token",
        limit: 10,
      });
      expect(pack.totalHits).toBe(4);
      const result = buildKbRetrievalResult(pack, { maxItems: 2 });
      expect(result.totalEvidenceHits).toBe(4);
      expect(result.returnedItems).toBe(2);
      expect(result.truncated).toBe(true);
      expect(result.citations).toHaveLength(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("truncates excerpts and projects traceable citations", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-ret-cite-"));
    try {
      const { document } = await importOcrTextSource(
        {
          subject: "biology",
          sourceType: "textbook",
          title: "TEST FIXTURE — citation",
          originalFileName: "cite.txt",
          sourcePath: "t/cite.txt",
          rawText: `citation boundary check nucleus ${"x".repeat(600)}\n`,
        },
        { importedAt: IMPORTED_AT },
      );
      await writeImportedDocument(path.join(dir, `${document.documentId}.json`), document);
      const { service } = await loadKbDocumentServiceFromDir(dir);
      const pack = buildKbEvidencePack(service, { queryText: "nucleus" });
      const result = buildKbRetrievalResult(pack, {
        maxItems: 3,
        maxSnippetsPerItem: 1,
        maxExcerptChars: 50,
      });
      expect(result.citations).toHaveLength(1);
      const citation = result.citations[0];
      if (!citation) throw new Error("missing citation");
      expect(citation.documentId).toBe(document.documentId);
      expect(citation.sourceId).toBe(document.sourceId);
      expect(citation.sourcePath).toBe("t/cite.txt");
      expect(citation.normalizedChecksum).toBe(document.normalizedChecksum);
      expect(citation.citation).toContain(document.documentId);
      expect(citation.excerpts[0]?.length).toBeLessThanOrEqual(50);
      expect(result).not.toHaveProperty("content");
      expect(JSON.stringify(result)).not.toContain("x".repeat(600));
      expect(result.truncated).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("handles empty packs, skipped flags, and determinism", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-ret-empty-"));
    try {
      const { service } = await loadKbDocumentServiceFromDir(dir);
      const emptyPack = buildKbEvidencePack(service, { queryText: "nucleus" });
      const empty = buildKbRetrievalResult(emptyPack);
      expect(empty).toEqual({
        normalizedQuery: "nucleus",
        totalEvidenceHits: 0,
        returnedItems: 0,
        truncated: false,
        citations: [],
        skipped: [],
      });

      const packWithSkipped = {
        ...emptyPack,
        skipped: [{ file: "broken.json", reason: "bad" }],
      };
      expect(buildKbRetrievalResult(packWithSkipped).skipped).toEqual([]);
      expect(
        buildKbRetrievalResult(packWithSkipped, { includeSkipped: true }).skipped,
      ).toEqual([{ file: "broken.json", reason: "bad" }]);

      const { document } = await importOcrTextSource(
        {
          subject: "biology",
          sourceType: "textbook",
          title: "TEST FIXTURE — deterministic",
          originalFileName: "det.txt",
          sourcePath: "t/det.txt",
          rawText: "deterministic nucleus sample\n",
        },
        { importedAt: IMPORTED_AT },
      );
      await writeImportedDocument(path.join(dir, `${document.documentId}.json`), document);
      const { service: reloaded } = await loadKbDocumentServiceFromDir(dir);
      const pack = buildKbEvidencePack(reloaded, { queryText: "nucleus" });
      const before = JSON.stringify(pack);
      const first = buildKbRetrievalResult(pack);
      const second = buildKbRetrievalResult(pack);
      expect(first).toEqual(second);
      expect(JSON.stringify(pack)).toBe(before);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
