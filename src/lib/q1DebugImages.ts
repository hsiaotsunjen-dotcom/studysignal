/**
 * Debug-only: save Q1 answer crop and OCR overlay when possible.
 * Production handwriting detection does NOT use these files.
 * Falls back to saving the source image when sharp/tesseract are unavailable.
 */

import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import fs from "node:fs/promises";
import path from "node:path";

export type Q1DebugImageResult = {
  cropSaved: boolean;
  overlaySaved: boolean;
  answerBoxCoordinates?: string;
  targetWordConfidence?: number;
  tesseractWords?: Array<{
    text: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  error?: string;
};

type TesseractWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

async function loadSharp(): Promise<typeof import("sharp") | null> {
  try {
    return await import("sharp");
  } catch {
    return null;
  }
}

async function loadTesseract(): Promise<typeof import("tesseract.js") | null> {
  try {
    return await import("tesseract.js");
  } catch {
    return null;
  }
}

function extForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

async function saveBufferFallback(
  buffer: Buffer,
  mimeType: string,
  debugDir: string,
): Promise<Q1DebugImageResult> {
  const ext = extForMime(mimeType);
  const cropPath = path.join(debugDir, `q1-answer-crop.${ext}`);
  await fs.writeFile(cropPath, buffer);
  const notePath = path.join(debugDir, "q1-ocr-overlay.txt");
  await fs.writeFile(
    notePath,
    [
      "q1-ocr-overlay.png not generated.",
      "Install optional debug deps: npm install sharp tesseract.js",
      "Production detector does not use image coordinates or Tesseract.",
    ].join("\n"),
    "utf8",
  );
  return {
    cropSaved: true,
    overlaySaved: false,
    answerBoxCoordinates:
      "(unavailable — sharp/tesseract not installed; saved full source image as debug/q1-answer-crop.* for visual inspection)",
  };
}

export async function saveQ1DebugImages(
  image: AnalyzeImagePayload,
): Promise<Q1DebugImageResult> {
  const debugDir = path.join(process.cwd(), "debug");
  await fs.mkdir(debugDir, { recursive: true });

  const buffer = Buffer.from(image.dataBase64, "base64");
  const sharpMod = await loadSharp();
  const tesseractMod = await loadTesseract();

  if (!sharpMod || !tesseractMod) {
    return saveBufferFallback(buffer, image.mimeType, debugDir);
  }

  const sharp = sharpMod.default;
  const { createWorker } = tesseractMod;

  const meta = await sharp(buffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const worker = await createWorker("eng");
  let words: TesseractWord[];
  try {
    const { data } = await worker.recognize(buffer);
    words = (data.blocks ?? []).flatMap((block) =>
      (block.paragraphs ?? []).flatMap((para) =>
        (para.lines ?? []).flatMap((line) =>
          (line.words ?? []).map((word) => word as TesseractWord),
        ),
      ),
    );
  } finally {
    await worker.terminate();
  }

  const normalizedWords = words
    .map((w) => ({
      text: w.text.trim(),
      confidence: w.confidence,
      bbox: [w.bbox.x0, w.bbox.y0, w.bbox.x1, w.bbox.y1] as [
        number,
        number,
        number,
        number,
      ],
    }))
    .filter((w) => w.text.length > 0);

  const q1Marker = normalizedWords.find(
    (w) => /^\(1\)$/.test(w.text) || w.text === "1",
  );
  const inWord = normalizedWords.find((w) => /^in$/i.test(w.text));

  let cropSaved = false;
  let overlaySaved = false;
  let answerBoxCoordinates: string | undefined;
  let targetWordConfidence: number | undefined;

  const pad = 12;
  if (inWord) {
    targetWordConfidence = inWord.confidence;
    const [x0, y0, x1, y1] = inWord.bbox;
    answerBoxCoordinates = `x0=${x0}, y0=${y0}, x1=${x1}, y1=${y1} (Tesseract bbox for token "in")`;
    const left = Math.max(0, x0 - pad);
    const top = Math.max(0, y0 - pad);
    const w = Math.min(width - left, x1 - x0 + pad * 2);
    const h = Math.min(height - top, y1 - y0 + pad * 2);
    await sharp(buffer)
      .extract({ left, top, width: w, height: h })
      .png()
      .toFile(path.join(debugDir, "q1-answer-crop.png"));
    cropSaved = true;
  } else if (q1Marker) {
    const [x0, y0] = q1Marker.bbox;
    const regionW = Math.min(width - x0, Math.round(width * 0.35));
    const regionH = Math.min(height - y0, Math.round(height * 0.12));
    answerBoxCoordinates = `x0=${x0}, y0=${y0}, width=${regionW}, height=${regionH} (heuristic region after Tesseract "(1)" — token "in" not found)`;
    await sharp(buffer)
      .extract({ left: x0, top: y0, width: regionW, height: regionH })
      .png()
      .toFile(path.join(debugDir, "q1-answer-crop.png"));
    cropSaved = true;
  } else {
    const regionH = Math.round(height * 0.2);
    answerBoxCoordinates = `(unavailable — Tesseract did not find "(1)" or "in"; saved top 20% heuristic crop x0=0,y0=0,width=${width},height=${regionH})`;
    await sharp(buffer)
      .extract({ left: 0, top: 0, width, height: regionH })
      .png()
      .toFile(path.join(debugDir, "q1-answer-crop.png"));
    cropSaved = true;
  }

  const rects = normalizedWords
    .slice(0, 120)
    .map((w) => {
      const [x0, y0, x1, y1] = w.bbox;
      const stroke = /^in$/i.test(w.text)
        ? "#00ff00"
        : /^\(1\)$/.test(w.text)
          ? "#ffff00"
          : "#ff0000";
      return `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="${stroke}" stroke-width="2"/>`;
    })
    .join("");

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
  await sharp(buffer)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(path.join(debugDir, "q1-ocr-overlay.png"));
  overlaySaved = true;

  const nearQ1 = normalizedWords.filter((w) => {
    if (!q1Marker) return /^in$/i.test(w.text) || /^\(1\)$/.test(w.text);
    const [, y0] = w.bbox;
    const [, qy0] = q1Marker.bbox;
    return Math.abs(y0 - qy0) < 80 || /^in$/i.test(w.text);
  });

  return {
    cropSaved,
    overlaySaved,
    answerBoxCoordinates,
    targetWordConfidence,
    tesseractWords: nearQ1.slice(0, 20),
  };
}
