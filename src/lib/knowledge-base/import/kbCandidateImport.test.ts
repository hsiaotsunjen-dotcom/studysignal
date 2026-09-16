import { describe, expect, it } from "vitest";

import { validateImportedDocument } from "@/lib/knowledge-base/import/validateKbDocument";
import { validateKbCandidateRecord } from "@/lib/knowledge-base/import/kbIngestionBoundary";
import { importKbCandidate } from "@/lib/knowledge-base/import/kbCandidateImport";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";
const ZH_TEXT = "Cell 細胞是生物的基本單位 nucleus。臺灣繁體 — 測試\n第二行 mitochondria。\n";

function validCandidate() {
  return {
    subject: "biology",
    sourceType: "textbook",
    title: "TEST FIXTURE — 細胞 import",
    originalFileName: "candidate.txt",
    sourcePath: "incoming/candidate.txt",
    content: ZH_TEXT,
    language: "zh-Hant",
  };
}

describe("KB Stage 11 single-candidate import", () => {
  it("valid candidate enters the existing pipeline as a validated document", async () => {
    const result = await importKbCandidate(validCandidate(), { importedAt: IMPORTED_AT });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected accept");
    expect(result.importedAt).toBe(IMPORTED_AT);
    expect(result.rawText).toBe(ZH_TEXT);
    expect(validateImportedDocument(result.document).ok).toBe(true);
    expect(result.document.content).toContain("細胞是生物的基本單位");
    expect(result.document.provenance.sourcePath).toBe("incoming/candidate.txt");
    expect(result.document.provenance.originalFileName).toBe("candidate.txt");
    expect(result.issues).toEqual([]);
  });

  it("invalid candidates are rejected before pipeline processing", async () => {
    const cases: unknown[] = [
      null,
      { ...validCandidate(), subject: "physics" },
      { ...validCandidate(), sourcePath: "../evil.txt" },
      { ...validCandidate(), originalFileName: "evil.pdf" },
      { ...validCandidate(), content: "   " },
      { ...validCandidate(), title: "" },
    ];
    for (const bad of cases) {
      const result = await importKbCandidate(bad, { importedAt: IMPORTED_AT });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected reject");
      expect(result.document).toBeNull();
      expect(result.rawText).toBeNull();
      expect(result.importedAt).toBeNull();
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("preserves Traditional Chinese / UTF-8 exactly", async () => {
    const result = await importKbCandidate(validCandidate(), { importedAt: IMPORTED_AT });
    if (!result.ok) throw new Error("expected accept");
    expect(result.rawText).toBe(ZH_TEXT);
    expect(result.document.content).toContain("臺灣繁體 — 測試");
    expect(result.document.content).toContain("mitochondria");
  });

  it("is deterministic for repeated input", async () => {
    const input = validCandidate();
    const first = await importKbCandidate(input, { importedAt: IMPORTED_AT });
    const second = await importKbCandidate(input, { importedAt: IMPORTED_AT });
    expect(first).toEqual(second);
  });

  it("does not mutate the original candidate", async () => {
    const input = validCandidate();
    const before = JSON.stringify(input);
    await importKbCandidate(input, { importedAt: IMPORTED_AT });
    expect(JSON.stringify(input)).toBe(before);
    const bad = { ...validCandidate(), title: "" };
    const badBefore = JSON.stringify(bad);
    await importKbCandidate(bad, { importedAt: IMPORTED_AT });
    expect(JSON.stringify(bad)).toBe(badBefore);
  });

  it("leaves existing Stage 10 boundary behavior intact", () => {
    const accepted = validateKbCandidateRecord(validCandidate(), { importedAt: IMPORTED_AT });
    expect(accepted.ok).toBe(true);
    const rejected = validateKbCandidateRecord({ ...validCandidate(), subject: "physics" });
    expect(rejected.ok).toBe(false);
  });
});
