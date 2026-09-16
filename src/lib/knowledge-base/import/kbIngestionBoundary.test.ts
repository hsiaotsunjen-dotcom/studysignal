import { describe, expect, it } from "vitest";

import { importOcrTextSource } from "@/lib/knowledge-base/import/importOcrText";
import { validateImportedDocument } from "@/lib/knowledge-base/import/validateKbDocument";
import { validateKbCandidateRecord } from "@/lib/knowledge-base/import/kbIngestionBoundary";

const IMPORTED_AT = "2026-01-01T00:00:00.000Z";

function validCandidate() {
  return {
    subject: "biology",
    sourceType: "textbook",
    title: "TEST FIXTURE — 細胞 ingestion",
    originalFileName: "ingest.txt",
    sourcePath: "incoming/ingest.txt",
    content: "Cell 細胞是生物的基本單位 nucleus.\n",
    language: "zh-Hant",
  };
}

describe("KB Stage 10 ingestion boundary", () => {
  it("accepts a valid Traditional Chinese candidate deterministically", () => {
    const input = validCandidate();
    const before = JSON.stringify(input);
    const first = validateKbCandidateRecord(input, { importedAt: IMPORTED_AT });
    const second = validateKbCandidateRecord(input, { importedAt: IMPORTED_AT });
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error("expected accept");
    expect(first.candidate.rawText).toContain("細胞是生物的基本單位");
    expect(first.importedAt).toBe(IMPORTED_AT);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("rejects malformed and unsafe candidates with structured issues", () => {
    expect(validateKbCandidateRecord(null).ok).toBe(false);
    const badSubject = validateKbCandidateRecord({ ...validCandidate(), subject: "physics" });
    expect(badSubject.ok).toBe(false);
    const traversal = validateKbCandidateRecord({ ...validCandidate(), sourcePath: "../evil.txt" });
    expect(traversal.ok).toBe(false);
    const badExt = validateKbCandidateRecord({ ...validCandidate(), originalFileName: "evil.pdf" });
    expect(badExt.ok).toBe(false);
    const empty = validateKbCandidateRecord({ ...validCandidate(), content: "   " });
    expect(empty.ok).toBe(false);
    const missing = validateKbCandidateRecord({ ...validCandidate(), title: "" });
    if (missing.ok) throw new Error("expected reject");
    expect(missing.issues.length).toBeGreaterThan(0);
    expect(missing.issues.map((i) => i.field)).toEqual(
      [...missing.issues.map((i) => i.field)].sort(),
    );
  });

  it("accepted candidates flow into the existing import pipeline", async () => {
    const result = validateKbCandidateRecord(validCandidate(), { importedAt: IMPORTED_AT });
    if (!result.ok) throw new Error("expected accept");
    const { document } = await importOcrTextSource(
      { ...result.candidate },
      { importedAt: result.importedAt },
    );
    expect(validateImportedDocument(document).ok).toBe(true);
    expect(document.content).toContain("細胞是生物的基本單位");
    expect(document.provenance.sourcePath).toBe("incoming/ingest.txt");
  });
});
