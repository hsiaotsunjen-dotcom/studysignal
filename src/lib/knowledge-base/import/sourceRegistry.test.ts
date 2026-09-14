import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { normalizeOcrText } from "@/lib/knowledge-base/import/normalizeText";
import {
  appendSourceRecord,
  buildSourceRecord,
  checksumRawText,
  emptySourceRegistry,
  findDuplicateSource,
} from "@/lib/knowledge-base/import/sourceRegistry";

const FIXTURE = path.resolve(
  process.cwd(),
  "tests/kb/fixtures/biology-ch1.raw.txt",
);

describe("KB Stage 2 source registry + normalization pilot", () => {
  it("normalization is deterministic and byte-reproducible", async () => {
    const raw = await readFile(FIXTURE, "utf8");
    const first = normalizeOcrText(raw);
    const second = normalizeOcrText(raw);
    expect(second.normalizedText).toBe(first.normalizedText);
    expect(second.report).toEqual(first.report);
  });

  it("raw input is not modified and normalized output is separate", async () => {
    const raw = await readFile(FIXTURE, "utf8");
    const before = raw;
    const { normalizedText } = normalizeOcrText(raw);
    expect(raw).toBe(before);
    expect(normalizedText).not.toBe(raw);
  });

  it("checksum/source identity is stable and duplicates are detectable", async () => {
    const raw = await readFile(FIXTURE, "utf8");
    expect(checksumRawText(raw)).toBe(checksumRawText(raw));

    let registry = emptySourceRegistry();
    const record = buildSourceRecord(
      {
        subject: "biology",
        sourceType: "textbook",
        title: "TEST FIXTURE — biology chapter one sample",
        originalFileName: "biology-ch1.raw.txt",
        sourcePath: "tests/kb/fixtures/biology-ch1.raw.txt",
        rawText: raw,
      },
      { importedAt: "2026-01-01T00:00:00.000Z" },
    );
    const added = appendSourceRecord(registry, record);
    expect(added.duplicate).toBe(false);
    registry = added.registry;
    expect(findDuplicateSource(registry, raw)?.id).toBe(record.id);
    expect(appendSourceRecord(registry, record).duplicate).toBe(true);
  });

  it("unknown metadata is not invented", () => {
    const record = buildSourceRecord({
      subject: "biology",
      sourceType: "textbook",
      title: "TEST FIXTURE — minimal metadata",
      originalFileName: "biology-ch1.raw.txt",
      sourcePath: "tests/kb/fixtures/biology-ch1.raw.txt",
      rawText: "sample",
    });
    expect(record.year).toBeNull();
    expect(record.publisher).toBeNull();
    expect(record.edition).toBeNull();
    expect(record.ocrEngine).toBeNull();
    expect(record.language).toBeNull();
    expect(record.operator).toBeNull();
    expect(record.reviewer).toBeNull();
    expect(record.notes).toBeNull();
  });

  it("Traditional Chinese + English mixed text and markers survive", async () => {
    const raw = await readFile(FIXTURE, "utf8");
    const { normalizedText, report } = normalizeOcrText(raw);
    expect(normalizedText).toContain("細胞是生物的基本單位");
    expect(normalizedText).toContain("Cell is the basic unit of life");
    expect(normalizedText).toContain("DNA 位於細胞核內");
    expect(normalizedText).toContain("nucleus contains DNA");
    expect(normalizedText).toContain("[CHAPTER]");
    expect(normalizedText).toContain("[PAGE 1]");
    expect(normalizedText).toContain("[PAGE 2]");
    expect(normalizedText).toContain("[SECTION]");
    expect(report.trailingWhitespaceTrimmedLines).toBeGreaterThan(0);
    expect(report.trailingNewlineEnsured).toBe(true);
  });
});
