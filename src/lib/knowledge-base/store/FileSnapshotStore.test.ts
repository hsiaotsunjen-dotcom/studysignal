import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadBiologyMinimalSeed } from "@/lib/knowledge-base/seed/loadSeed";
import { validateKnowledgeBaseSnapshot } from "@/lib/knowledge-base/utils/validateSnapshot";
import {
  readSnapshot,
  writeSnapshot,
} from "@/lib/knowledge-base/store/FileSnapshotStore";

const TRACKED_SKELETON = path.resolve(
  process.cwd(),
  "content/knowledge-base/snapshots/biology.skeleton.v1.json",
);

describe("FileSnapshotStore (KB-Persist-01)", () => {
  it("existing biology seed snapshot validates successfully", () => {
    const { snapshot, validation } = loadBiologyMinimalSeed({ validate: true });
    expect(validation?.ok).toBe(true);
    expect(validation?.issues ?? []).toEqual([]);
    expect(validateKnowledgeBaseSnapshot(snapshot).ok).toBe(true);
  });

  it("tracked skeleton fixture matches the current seed and validates", async () => {
    const raw = await readFile(TRACKED_SKELETON, "utf8");
    const fixture = JSON.parse(raw) as ReturnType<
      typeof loadBiologyMinimalSeed
    >["snapshot"];
    const { snapshot: seed } = loadBiologyMinimalSeed();
    expect(fixture).toEqual(seed);
    expect(validateKnowledgeBaseSnapshot(fixture).ok).toBe(true);
  });

  it("write -> read round-trip preserves deep equality", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-"));
    try {
      const filePath = path.join(dir, "snapshot.json");
      const { snapshot: seed } = loadBiologyMinimalSeed();
      await writeSnapshot(filePath, seed);
      const roundTripped = await readSnapshot(filePath);
      expect(roundTripped).toEqual(seed);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects an invalid/broken foreign-key snapshot", async () => {
    const { snapshot } = loadBiologyMinimalSeed();
    snapshot.knowledgeNodes[0]!.curriculumUnitId = "missing-unit";
    expect(validateKnowledgeBaseSnapshot(snapshot).ok).toBe(false);

    const dir = await mkdtemp(path.join(tmpdir(), "ss-kb-invalid-"));
    try {
      const filePath = path.join(dir, "broken.json");
      await expect(writeSnapshot(filePath, snapshot)).rejects.toThrow(
        /Invalid KnowledgeBaseSnapshot/,
      );

      // readSnapshot must also reject a broken file already on disk.
      await writeFile(filePath, JSON.stringify(snapshot), "utf8");
      await expect(readSnapshot(filePath)).rejects.toThrow(
        /Invalid KnowledgeBaseSnapshot/,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
