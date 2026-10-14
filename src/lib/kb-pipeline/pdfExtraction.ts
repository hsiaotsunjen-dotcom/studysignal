/**
 * KB Import Pipeline — S1: PDF extraction engine (subject-agnostic core).
 *
 * Design principles honored here:
 *  - Cross-subject reuse: this module knows nothing about biology/chemistry/
 *    english/math. It only turns PDF bytes into per-page text + positioned
 *    items + image counts. Subject-specific symbol handling happens later, in
 *    per-subject modules (principle B).
 *  - Deterministic, local-only: pure pdf.js + node fs/crypto. No AI, no
 *    network, no vendor calls (principle C).
 *  - Immutable source (principle G): we only ever READ the PDF. We record its
 *    SHA-256 so a caller can prove it was never overwritten. We never write to
 *    the source path.
 *
 * Why the "legacy" build: pdfjs-dist ships a browser build and a Node-friendly
 * "legacy" build. The legacy build avoids DOM globals, so it runs cleanly under
 * Node/vitest. We enable cMapUrl + standardFontDataUrl + cMapPacked so CJK
 * (Traditional Chinese) glyphs decode correctly — without them, exam papers
 * extract as mojibake / replacement characters.
 *
 * Output preserves, per the pipeline contract:
 *  - page numbers (1-based, contiguous with numPages)
 *  - per-page text (stream order, with line breaks at hasEOL boundaries)
 *  - positioned text items (x/y/width/height) for downstream superscript /
 *    subscript / charge-symbol recovery (e.g. chemistry formulas)
 *  - image-object count per page (to flag image questions for review)
 *  - the source SHA-256 checksum and byte length (source traceability)
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as path from "node:path";

// Runtime API from the Node-friendly legacy build.
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

/** A single positioned text fragment on a page. */
export type PositionedTextItem = {
  /** The extracted string for this fragment. */
  str: string;
  /** Horizontal position (PDF user space, origin bottom-left). */
  x: number;
  /** Vertical position / baseline (PDF user space, origin bottom-left). */
  y: number;
  /** Fragment width in user-space units. */
  width: number;
  /** Fragment height in user-space units (font size proxy). */
  height: number;
  /** True when the fragment ends a visual line (pdf.js line-break hint). */
  hasEOL: boolean;
};

/** One extracted PDF page. */
export type ExtractedPage = {
  /** 1-based page number, contiguous from 1..numPages. */
  pageNumber: number;
  /** Full page text in stream order; lines joined with "\n" at EOL hints. */
  text: string;
  /** Positioned fragments in stream order (for symbol / layout recovery). */
  items: PositionedTextItem[];
  /** Number of image XObjects painted on this page (0 for text-only pages). */
  imageCount: number;
};

/** The complete, deterministic result of extracting one PDF. */
export type PdfExtraction = {
  /** SHA-256 of the exact bytes read from disk (source traceability). */
  sourceChecksum: string;
  /** Byte length of the source file. */
  sourceBytes: number;
  /** Total page count reported by the PDF. */
  numPages: number;
  /** Per-page extraction, in page order. */
  pages: ExtractedPage[];
  /** Sum of all page text lengths (quick sanity metric). */
  totalChars: number;
  /** Count of U+FFFD replacement chars across all pages (0 == clean decode). */
  replacementChars: number;
  /** Total painted image objects across all pages. */
  totalImages: number;
};

export type PdfExtractionInput = {
  /** Absolute or cwd-relative path to the immutable source PDF. */
  pdfPath: string;
};

/** Package-relative cMap asset URLs, resolved once from the installed package. */
type PdfjsAssets = {
  cMapUrl: string;
  standardFontDataUrl: string;
  cMapPacked: boolean;
};

/**
 * Resolve the cmap / standard-font asset directories shipped inside
 * pdfjs-dist. Returned as file:// URLs so pdf.js can fetch them locally with
 * no network access. Uses packed cmaps (the format the package ships).
 */
function resolvePdfjsAssets(): PdfjsAssets {
  const require = createRequire(import.meta.url);
  // Locate the installed package root via its package.json.
  const pkgJsonPath = require.resolve("pdfjs-dist/package.json");
  const pkgDir = path.dirname(pkgJsonPath);
  const cmapsDir = path.join(pkgDir, "cmaps");
  const fontsDir = path.join(pkgDir, "standard_fonts");
  return {
    cMapUrl: pathToFileURL(cmapsDir + path.sep).href,
    standardFontDataUrl: pathToFileURL(fontsDir + path.sep).href,
    cMapPacked: true,
  };
}

/**
 * Extract text, positions and image counts from a PDF.
 *
 * Reads the file once, hashes the exact bytes, and never writes anything back
 * to disk. Throws only on unreadable/corrupt input; a normal (even empty) PDF
 * returns a structured result.
 */
export async function extractPdf(
  input: PdfExtractionInput,
): Promise<PdfExtraction> {
  const bytes = await readFile(input.pdfPath);
  const sourceChecksum = createHash("sha256").update(bytes).digest("hex");

  const assets = resolvePdfjsAssets();
  // Copy into a standalone Uint8Array so pdf.js never aliases the Buffer.
  const data = new Uint8Array(bytes.length);
  data.set(bytes);

  const loadingTask = getDocument({
    data,
    useSystemFonts: true,
    cMapUrl: assets.cMapUrl,
    cMapPacked: assets.cMapPacked,
    standardFontDataUrl: assets.standardFontDataUrl,
  });

  const doc = await loadingTask.promise;
  try {
    const numPages = doc.numPages;
    const pages: ExtractedPage[] = [];
    let totalChars = 0;
    let replacementChars = 0;
    let totalImages = 0;

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);

      const textContent = await page.getTextContent();
      const items: PositionedTextItem[] = [];
      let text = "";
      for (const raw of textContent.items) {
        // Items are TextItem | TextMarkedContent; only TextItem carries text.
        // Skip marked-content markers (no `str`) rather than guessing content.
        if (!("str" in raw)) continue;
        const str: string = raw.str;
        // transform = [a, b, c, d, translateX, translateY]; tx/ty are x/y.
        const x = raw.transform?.[4] ?? 0;
        const y = raw.transform?.[5] ?? 0;
        const width = raw.width ?? 0;
        const height = raw.height ?? 0;
        const hasEOL = Boolean(raw.hasEOL);
        items.push({ str, x, y, width, height, hasEOL });
        text += str;
        if (hasEOL) text += "\n";
      }

      // Count painted image XObjects on the page.
      const ops = await page.getOperatorList();
      let imageCount = 0;
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === OPS.paintImageXObject) imageCount++;
      }

      for (const ch of text) {
        if (ch === "\ufffd") replacementChars++;
      }

      totalChars += text.length;
      totalImages += imageCount;
      pages.push({ pageNumber, text, items, imageCount });
    }

    return {
      sourceChecksum,
      sourceBytes: bytes.length,
      numPages,
      pages,
      totalChars,
      replacementChars,
      totalImages,
    };
  } finally {
    // Release worker / cached-page resources. (cleanup, not destroy, in v6.)
    if (typeof doc.cleanup === "function") doc.cleanup();
  }
}

/** Re-exported for callers that want to inspect the resolved asset URLs. */
export function pdfjsAssetProbe(): PdfjsAssets {
  return resolvePdfjsAssets();
}
