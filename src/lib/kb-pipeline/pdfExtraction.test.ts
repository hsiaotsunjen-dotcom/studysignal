import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { extractPdf, pdfjsAssetProbe } from "./pdfExtraction";

/**
 * Small, real, in-repo fixture: the ROC111 official biology paper (12 pages).
 * This is a READ-ONLY extraction test — the immutable original is never
 * written. We assert structural correctness (page count, contiguous numbering,
 * clean CJK decode, positions present) rather than exact prose, so the test
 * stays valid if the fixture bytes ever change.
 */
const ROC111_PDF = path.resolve(
  __dirname,
  "../../../content/knowledge-base/sources/biology/tve-ut-health-nursing-bio-roc111/originals/111-4y-10-1.pdf",
);

// Expected SHA-256 recorded in roc111 paper.json (source traceability anchor).
const ROC111_SHA256 =
  "12fe94e4f1457ba2a501de7d241126bd84499283672c736a0c05bb95ce5b91ec";
const ROC111_BYTES = 852842;

describe("kb-pipeline/pdfExtraction", () => {
  it("resolves local cmap / standard-font asset URLs (file://, no network)", () => {
    const assets = pdfjsAssetProbe();
    expect(assets.cMapPacked).toBe(true);
    expect(assets.cMapUrl.startsWith("file://")).toBe(true);
    expect(assets.cMapUrl).toMatch(/cmaps[\\/]$/);
    expect(assets.standardFontDataUrl.startsWith("file://")).toBe(true);
    expect(assets.standardFontDataUrl).toMatch(/standard_fonts[\\/]$/);
  });

  it("extracts the ROC111 paper with correct page count and checksum", async () => {
    const result = await extractPdf({ pdfPath: ROC111_PDF });

    expect(result.numPages).toBe(12);
    expect(result.sourceChecksum).toBe(ROC111_SHA256);
    expect(result.sourceBytes).toBe(ROC111_BYTES);
    expect(result.pages).toHaveLength(12);
  });

  it("numbers pages contiguously 1..numPages", async () => {
    const result = await extractPdf({ pdfPath: ROC111_PDF });
    result.pages.forEach((p, i) => {
      expect(p.pageNumber).toBe(i + 1);
    });
  });

  it("decodes Traditional Chinese cleanly (no U+FFFD replacement chars)", async () => {
    const result = await extractPdf({ pdfPath: ROC111_PDF });
    expect(result.replacementChars).toBe(0);
    expect(result.totalChars).toBeGreaterThan(5000);
    // Spot-check real CJK content is present, not mojibake.
    const joined = result.pages.map((p) => p.text).join("");
    expect(/[\u4e00-\u9fff]/.test(joined)).toBe(true);
  });

  it("preserves positioned text items with x/y and height", async () => {
    const result = await extractPdf({ pdfPath: ROC111_PDF });
    const page5 = result.pages[4];
    expect(page5.items.length).toBeGreaterThan(10);
    for (const item of page5.items) {
      expect(typeof item.str).toBe("string");
      expect(typeof item.x).toBe("number");
      expect(typeof item.y).toBe("number");
      expect(typeof item.height).toBe("number");
      expect(typeof item.hasEOL).toBe("boolean");
    }
    // At least one item carries a positive font-height proxy.
    expect(page5.items.some((it) => it.height > 0)).toBe(true);
  });

  it("reports image counts as non-negative integers per page", async () => {
    const result = await extractPdf({ pdfPath: ROC111_PDF });
    let sum = 0;
    for (const p of result.pages) {
      expect(Number.isInteger(p.imageCount)).toBe(true);
      expect(p.imageCount).toBeGreaterThanOrEqual(0);
      sum += p.imageCount;
    }
    expect(result.totalImages).toBe(sum);
  });

  it("does not modify the source file (checksum stable across two reads)", async () => {
    const a = await extractPdf({ pdfPath: ROC111_PDF });
    const b = await extractPdf({ pdfPath: ROC111_PDF });
    expect(a.sourceChecksum).toBe(b.sourceChecksum);
    expect(a.sourceBytes).toBe(b.sourceBytes);
    expect(a.sourceChecksum).toBe(ROC111_SHA256);
  });

  it("throws a clear error for a missing source file", async () => {
    await expect(
      extractPdf({ pdfPath: path.resolve(__dirname, "does-not-exist.pdf") }),
    ).rejects.toThrow();
  });
});
