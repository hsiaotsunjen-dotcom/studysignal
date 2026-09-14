import { createHash } from "node:crypto";

/**
 * KB Stage 2 — deterministic OCR text normalization.
 * No prose rewriting, summarization, translation, inference, or AI calls.
 * Same input bytes must produce byte-identical normalized output.
 */

export type KbNormalizationReport = {
  /** SHA-256 of exact raw input (UTF-8). */
  rawChecksum: string;
  /** SHA-256 of normalized output (UTF-8). */
  normalizedChecksum: string;
  rawLength: number;
  normalizedLength: number;
  crlfConverted: boolean;
  trailingWhitespaceTrimmedLines: number;
  blankLinesCollapsed: number;
  fullwidthAsciiNormalized: number;
  leadingBlankLinesRemoved: number;
  trailingBlankLinesRemoved: number;
  trailingNewlineEnsured: boolean;
};

export type KbNormalizeResult = {
  normalizedText: string;
  report: KbNormalizationReport;
};

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function normalizeFullwidthAsciiChar(ch: string): string | null {
  const code = ch.codePointAt(0);
  if (code === undefined) return null;
  // Fullwidth ASCII U+FF01..U+FF5E -> U+0021..U+007E.
  if (code >= 0xff01 && code <= 0xff5e) {
    return String.fromCodePoint(code - 0xfee0);
  }
  // Fullwidth space U+3000 -> ASCII space (safe whitespace folding).
  if (code === 0x3000) return " ";
  return null;
}

/**
 * Normalize OCR text deterministically:
 * - NFC Unicode form
 * - CRLF/CR -> LF
 * - fullwidth ASCII -> ASCII, fullwidth space -> space
 * - trailing spaces/tabs trimmed per line (leading indentation preserved)
 * - 3+ blank lines collapsed to one blank line
 * - leading/trailing blank lines removed, single trailing newline ensured
 * Wording, order, page/chapter markers, CJK, and English are preserved.
 */
export function normalizeOcrText(rawText: string): KbNormalizeResult {
  const rawChecksum = sha256Hex(rawText);
  const crlfConverted = rawText.includes("\r");

  let text = rawText.normalize("NFC").replace(/\r\n?/g, "\n");

  let fullwidthAsciiNormalized = 0;
  text = Array.from(text)
    .map((ch) => {
      const mapped = normalizeFullwidthAsciiChar(ch);
      if (mapped !== null) {
        fullwidthAsciiNormalized += 1;
        return mapped;
      }
      return ch;
    })
    .join("");

  const lines = text.split("\n");
  let trailingWhitespaceTrimmedLines = 0;
  const trimmedLines = lines.map((line) => {
    const trimmed = line.replace(/[ \t]+$/u, "");
    if (trimmed.length !== line.length) trailingWhitespaceTrimmedLines += 1;
    return trimmed;
  });

  let leadingBlankLinesRemoved = 0;
  let start = 0;
  while (start < trimmedLines.length && trimmedLines[start]?.trim() === "") {
    start += 1;
  }
  leadingBlankLinesRemoved = start;

  let end = trimmedLines.length;
  while (end > start && trimmedLines[end - 1]?.trim() === "") {
    end -= 1;
  }
  const trailingBlankLinesRemoved = trimmedLines.length - end;
  const body = trimmedLines.slice(start, end);

  const collapsed: string[] = [];
  let blankRun = 0;
  let blankLinesCollapsed = 0;
  for (const line of body) {
    if (line.trim() === "") {
      blankRun += 1;
      if (blankRun <= 1) collapsed.push("");
      else blankLinesCollapsed += 1;
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }

  const normalizedText = collapsed.length > 0 ? `${collapsed.join("\n")}\n` : "";
  return {
    normalizedText,
    report: {
      rawChecksum,
      normalizedChecksum: sha256Hex(normalizedText),
      rawLength: rawText.length,
      normalizedLength: normalizedText.length,
      crlfConverted,
      trailingWhitespaceTrimmedLines,
      blankLinesCollapsed,
      fullwidthAsciiNormalized,
      leadingBlankLinesRemoved,
      trailingBlankLinesRemoved,
      trailingNewlineEnsured: normalizedText.endsWith("\n"),
    },
  };
}
