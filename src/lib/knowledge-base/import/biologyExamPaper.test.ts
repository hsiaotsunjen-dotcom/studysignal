import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BIOLOGY_EXAM_SERIES_ID,
  biologyExamFolderName,
  processBiologyExamPaperSource,
  sha256FileBuffer,
  validateBiologyExamPaperMetadata,
} from "@/lib/knowledge-base/import/biologyExamPaper";
import type { BiologyExamPaperMetadata } from "@/lib/knowledge-base/import/biologyExamPaper";
import type { KbSourceRegistryFile } from "@/lib/knowledge-base/import/types";

const IMPORTED_AT = "2026-09-27T00:00:00.000Z";
const FIXTURE_MARK =
  "<!-- TEST FIXTURE ONLY — not an official 四技二專 past paper. -->\n";

const tempRoots: string[] = [];

afterEach(async () => {
  // Best-effort cleanup is unnecessary for OS temp; keep list for debugging hooks.
  tempRoots.length = 0;
});

function sha(text: string | Buffer): string {
  return createHash("sha256").update(text).digest("hex");
}

async function makeSandbox(): Promise<{
  root: string;
  sourceDir: string;
  repoSourceDir: string;
  registryPath: string;
  documentsDir: string;
  pdfName: string;
  pdfBytes: Buffer;
  pdfSha: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "kb-bio-exam-"));
  tempRoots.push(root);
  const folder = biologyExamFolderName(115);
  const sourceDir = path.join(root, "sources", "biology", folder);
  const originalsDir = path.join(sourceDir, "originals");
  await mkdir(originalsDir, { recursive: true });
  const documentsDir = path.join(root, "documents");
  const registryPath = path.join(root, "metadata", "source-registry.json");
  await mkdir(documentsDir, { recursive: true });
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(
    registryPath,
    `${JSON.stringify({ version: 1, sources: [] }, null, 2)}\n`,
    "utf8",
  );

  const pdfName = "fixture-ut-bio-roc115.pdf";
  const pdfBytes = Buffer.from("%PDF-1.4\n% fixture exam paper bytes\n", "utf8");
  const pdfSha = sha256FileBuffer(pdfBytes);
  await writeFile(path.join(originalsDir, pdfName), pdfBytes);

  const repoSourceDir = path.posix.join("sources", "biology", folder);
  const metadata: BiologyExamPaperMetadata = {
    version: 1,
    academicYear: 115,
    subject: "biology",
    sourceType: "exam_paper",
    title: "TEST FIXTURE — 115學年度 四技二專 衛生與護理類 專業科目(一) 生物",
    publisher: null,
    language: "zh-Hant",
    seriesId: BIOLOGY_EXAM_SERIES_ID,
    materialStatus: "test-fixture",
    scope: "official-past-paper-fixture",
    originals: [
      {
        filename: pdfName,
        path: path.posix.join(repoSourceDir, "originals", pdfName),
        sha256: pdfSha,
        bytes: pdfBytes.length,
        originalPath: null,
      },
    ],
    transcriptionMethod: "fixture hand-authored markdown (not OCR)",
    reviewStatus: "fixture-only; not for production KB",
    notes: "Synthetic fixture for import pipeline tests. Not an official exam paper.",
  };

  await writeFile(
    path.join(sourceDir, "paper.md"),
    `${FIXTURE_MARK}\n# 115學年度 試題文字稿（fixture）\n\n1. 細胞是生物的基本單位。\n`,
    "utf8",
  );
  await writeFile(
    path.join(sourceDir, "paper.json"),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(sourceDir, "README.md"),
    "# TEST FIXTURE\n\nNot an official past paper.\n",
    "utf8",
  );

  return {
    root,
    sourceDir,
    repoSourceDir,
    registryPath,
    documentsDir,
    pdfName,
    pdfBytes,
    pdfSha,
  };
}

describe("biology exam paper metadata validation", () => {
  it("accepts a well-formed single-year exam_paper record", () => {
    const result = validateBiologyExamPaperMetadata({
      version: 1,
      academicYear: 115,
      subject: "biology",
      sourceType: "exam_paper",
      title: "official title",
      publisher: null,
      language: "zh-Hant",
      seriesId: BIOLOGY_EXAM_SERIES_ID,
      materialStatus: "real-source",
      scope: "official-past-paper",
      originals: [
        {
          filename: "a.pdf",
          path: "content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc115/originals/a.pdf",
          sha256: "a".repeat(64),
        },
      ],
      transcriptionMethod: "manual",
      reviewStatus: "pending",
      notes: null,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects wrong sourceType, subject, empty originals, and multi-meaning year", () => {
    const base = {
      version: 1,
      academicYear: 115,
      subject: "biology",
      sourceType: "exam_paper",
      title: "t",
      publisher: null,
      language: "zh-Hant",
      seriesId: BIOLOGY_EXAM_SERIES_ID,
      materialStatus: "real-source",
      scope: "official-past-paper",
      originals: [
        {
          filename: "a.pdf",
          path: "x/a.pdf",
          sha256: "b".repeat(64),
        },
      ],
      transcriptionMethod: "manual",
      reviewStatus: "pending",
      notes: null,
    };
    expect(
      validateBiologyExamPaperMetadata({ ...base, sourceType: "toc" }).ok,
    ).toBe(false);
    expect(
      validateBiologyExamPaperMetadata({ ...base, subject: "chemistry" }).ok,
    ).toBe(false);
    expect(
      validateBiologyExamPaperMetadata({ ...base, originals: [] }).ok,
    ).toBe(false);
    expect(
      validateBiologyExamPaperMetadata({ ...base, academicYear: 99 }).ok,
    ).toBe(false);
    expect(
      validateBiologyExamPaperMetadata(
        { ...base, academicYear: 99 },
        { enforceOfficialYearRange: false },
      ).ok,
    ).toBe(true);
  });
});

describe("biology exam paper import pipeline (temp fixture)", () => {
  it("imports paper.md into isolated registry/documents with exam_paper", async () => {
    const box = await makeSandbox();
    const first = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
      enforceOfficialYearRange: true,
    });
    expect(first.ok).toBe(true);
    expect(first.document?.sourceType).toBe("exam_paper");
    expect(first.document?.subject).toBe("biology");
    expect(first.document?.sourcePath).toBe(
      path.posix.join(box.repoSourceDir, "paper.md"),
    );
    expect(first.document?.originalFileName).toBe("paper.md");
    expect(first.source?.year).toBe(115);
    expect(first.duplicateRegistry).toBe(false);

    const registry = JSON.parse(
      await readFile(box.registryPath, "utf8"),
    ) as KbSourceRegistryFile;
    expect(registry.sources).toHaveLength(1);
    expect(registry.sources[0]?.sourceType).toBe("exam_paper");
    expect(registry.sources[0]?.sourcePath.endsWith("paper.md")).toBe(true);

    const paperJson = JSON.parse(
      await readFile(path.join(box.sourceDir, "paper.json"), "utf8"),
    ) as BiologyExamPaperMetadata;
    expect(paperJson.sourceId).toBe(first.source?.id);
    expect(paperJson.documentId).toBe(first.document?.documentId);

    // PDF bytes remain only under originals/; pipeline content is markdown text.
    expect(first.document?.content).toContain("TEST FIXTURE");
    expect(first.document?.content.includes("%PDF")).toBe(false);
    expect(sha(box.pdfBytes)).toBe(box.pdfSha);
  });

  it("re-run does not duplicate registry or documents", async () => {
    const box = await makeSandbox();
    const first = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
    });
    expect(first.ok).toBe(true);

    const second = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
    });
    expect(second.ok).toBe(true);
    expect(second.duplicateRegistry).toBe(true);
    expect(second.source?.id).toBe(first.source?.id);
    expect(second.document?.documentId).toBe(first.document?.documentId);

    const registry = JSON.parse(
      await readFile(box.registryPath, "utf8"),
    ) as KbSourceRegistryFile;
    expect(registry.sources).toHaveLength(1);

    const verify = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: false,
      importedAt: IMPORTED_AT,
    });
    expect(verify.ok).toBe(true);
    expect(verify.mode).toBe("verify-only");
  });

  it("rejects empty paper.md and bad PDF checksum", async () => {
    const box = await makeSandbox();
    await writeFile(path.join(box.sourceDir, "paper.md"), "   \n", "utf8");
    const empty = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
    });
    expect(empty.ok).toBe(false);
    expect(empty.issues.some((i) => i.field === "paper.md")).toBe(true);

    const box2 = await makeSandbox();
    const meta = JSON.parse(
      await readFile(path.join(box2.sourceDir, "paper.json"), "utf8"),
    ) as BiologyExamPaperMetadata;
    meta.originals[0]!.sha256 = "c".repeat(64);
    await writeFile(
      path.join(box2.sourceDir, "paper.json"),
      `${JSON.stringify(meta, null, 2)}\n`,
      "utf8",
    );
    const badSha = await processBiologyExamPaperSource({
      sourceDir: box2.sourceDir,
      repoSourceDir: box2.repoSourceDir,
      registryPath: box2.registryPath,
      documentsDir: box2.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
    });
    expect(badSha.ok).toBe(false);
    expect(
      badSha.issues.some((i) => i.field.includes("sha256")),
    ).toBe(true);
  });

  it("refuses changed paper.md when sourcePath is already registered", async () => {
    const box = await makeSandbox();
    const first = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
    });
    expect(first.ok).toBe(true);

    const registryBefore = await readFile(box.registryPath, "utf8");
    await writeFile(
      path.join(box.sourceDir, "paper.md"),
      `${FIXTURE_MARK}\n# changed content that must not silently overwrite\n`,
      "utf8",
    );
    const second = await processBiologyExamPaperSource({
      sourceDir: box.sourceDir,
      repoSourceDir: box.repoSourceDir,
      registryPath: box.registryPath,
      documentsDir: box.documentsDir,
      write: true,
      importedAt: IMPORTED_AT,
    });
    expect(second.ok).toBe(false);
    expect(
      second.issues.some(
        (i) =>
          i.field === "registry" ||
          i.field === "paper.json" ||
          i.message.includes("refusing"),
      ),
    ).toBe(true);
    expect(await readFile(box.registryPath, "utf8")).toBe(registryBefore);
    const registry = JSON.parse(registryBefore) as KbSourceRegistryFile;
    expect(registry.sources).toHaveLength(1);
    expect(registry.sources[0]?.id).toBe(first.source?.id);
  });
});
