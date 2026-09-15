import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import { writeImportedDocument } from "@/lib/knowledge-base/import/kbDocumentStore";
import type { KbSourceRegistryFile } from "@/lib/knowledge-base/import/types";
import { emptySourceRegistry } from "@/lib/knowledge-base/import/sourceRegistry";
import { buildSourceRecord } from "@/lib/knowledge-base/import/sourceRegistry";
import {
  buildKbManifest,
  serializeKbManifest,
} from "@/lib/knowledge-base/query/kbManifest";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

async function writeDoc(
  dir: string,
  rawText: string,
  subject: "biology" | "chemistry",
  fileName: string,
  sourcePath: string,
): Promise<string> {
  const { document } = await importOcrTextSource(
    {
      subject,
      sourceType: subject === "biology" ? "textbook" : "exam_paper",
      title: `TEST FIXTURE — ${fileName} 細胞測試`,
      originalFileName: fileName,
      sourcePath,
      rawText,
    },
    { importedAt: IMPORTED_AT },
  );
  await writeImportedDocument(path.join(dir, `${document.documentId}.json`), document);
  return document.documentId;
}

describe("KB Stage 9 manifest + integrity audit", () => {
  it("inventories valid docs deterministically with UTF-8 preserved", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-manifest-"));
    try {
      const bioId = await writeDoc(
        dir,
        "Cell 細胞是生物的基本單位 nucleus.\n",
        "biology",
        "bio.txt",
        "t/bio.txt",
      );
      const chemId = await writeDoc(
        dir,
        "Acid and base 酸鹼 sample.\n",
        "chemistry",
        "chem.txt",
        "t/chem.txt",
      );
      const first = await buildKbManifest(dir);
      const second = await buildKbManifest(dir);
      expect(second).toEqual(first);
      expect(first.validDocuments).toBe(2);
      expect(first.totalFiles).toBe(2);
      expect(first.documents.map((d) => d.documentId)).toEqual([bioId, chemId].sort());
      expect(first.issues).toEqual([]);
      expect(first.registryChecked).toBe(false);
      // Traditional Chinese titles survive byte-for-byte.
      expect(first.documents.some((d) => d.title.includes("細胞測試"))).toBe(true);
      expect(JSON.parse(serializeKbManifest(first))).toEqual(JSON.parse(JSON.stringify(first)));
      expect(serializeKbManifest(first).endsWith("\n")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports invalid, duplicate, orphan, and missing-registry issues", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-manifest-bad-"));
    try {
      const raw = "shared duplicate bytes\n";
      const bioId = await writeDoc(dir, raw, "biology", "a.txt", "t/a.txt");
      // Same bytes under a different declared path => same documentId file + duplicate checksum.
      const { document: dup } = await importOcrTextSource(
        {
          subject: "biology",
          sourceType: "textbook",
          title: "TEST FIXTURE — dup",
          originalFileName: "b.txt",
          sourcePath: "t/b.txt",
          rawText: raw,
        },
        { importedAt: IMPORTED_AT },
      );
      expect(dup.documentId).toBe(bioId);
      await writeFile(path.join(dir, "broken.json"), "{ bad", "utf8");

      const orphan = buildSourceRecord({
        subject: "chemistry",
        sourceType: "exam_paper",
        title: "orphan",
        originalFileName: "orphan.txt",
        sourcePath: "t/orphan.txt",
        rawText: "orphan raw bytes\n",
      });
      const registry: KbSourceRegistryFile = {
        ...emptySourceRegistry(),
        sources: [orphan],
      };
      const manifest = await buildKbManifest(dir, registry);
      const kinds = manifest.issues.map((i) => i.kind).sort();
      expect(kinds).toContain("invalid-file");
      expect(kinds).toContain("registry-orphan");
      expect(kinds).toContain("missing-registry");
      expect(manifest.validDocuments).toBe(1);
      expect(manifest.totalFiles).toBe(2);
      expect(manifest.registryChecked).toBe(true);
      // Non-mutation: rebuilding over the same dir is identical.
      expect(await buildKbManifest(dir, registry)).toEqual(manifest);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("handles empty and missing directories per policy", async () => {
    const emptyDir = await mkdtemp(path.join(tmpdir(), "ss-kb-manifest-empty-"));
    try {
      const empty = await buildKbManifest(emptyDir);
      expect(empty.validDocuments).toBe(0);
      expect(empty.totalFiles).toBe(0);
      expect(empty.documents).toEqual([]);
      expect(empty.issues).toEqual([]);
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
    const missing = path.join(tmpdir(), `ss-kb-manifest-missing-${Date.now()}`);
    await expect(buildKbManifest(missing)).rejects.toThrow(missing);
  });
});
