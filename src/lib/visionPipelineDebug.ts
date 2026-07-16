/**
 * TEMPORARY investigation instrumentation for the /api/photo-quality image
 * pipeline (Photo 4 losing Q11~Q13 while Photo 2 detects Q1~Q10).
 *
 * Read-only / logging-only:
 * - Does NOT resize, crop, compress, or otherwise transform any image.
 * - Does NOT change the merge algorithm, prompts, or UI.
 *
 * Purpose: prove (or disprove) each step of the pipeline —
 *   upload bytes -> base64 -> Buffer -> Vision request -> Vision response
 * so we can pinpoint exactly where Q11~Q13 are lost for some photos.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export function sha256Hex(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/** OpenAI's documented per-image upload limit (bytes). Images larger than this are rejected, not resized. */
export const OPENAI_IMAGE_MAX_BYTES = 20 * 1024 * 1024;

/**
 * OpenAI's internal "high" detail pipeline (per OpenAI Vision docs):
 * 1. Scale down (if needed) to fit within a 2048x2048 square, preserving aspect ratio.
 * 2. Scale so the shortest side is 768px.
 * 3. Tile the result into 512x512 tiles (tile count drives token cost).
 * This is informational only — we cannot control or observe OpenAI's internal
 * resampling, only compute what it will likely do to the image we send.
 */
export function computeOpenAiHighDetailProjection(
  width: number,
  height: number,
): {
  step1Width: number;
  step1Height: number;
  step2Width: number;
  step2Height: number;
  tilesX: number;
  tilesY: number;
  totalTiles: number;
} {
  const fitScale = Math.min(1, 2048 / width, 2048 / height);
  const step1Width = Math.round(width * fitScale);
  const step1Height = Math.round(height * fitScale);

  const shortSide = Math.min(step1Width, step1Height);
  const shortSideScale = shortSide > 0 ? 768 / shortSide : 1;
  // OpenAI never upscales — only downscales when the short side exceeds 768.
  const finalScale = Math.min(1, shortSideScale);
  const step2Width = Math.round(step1Width * finalScale);
  const step2Height = Math.round(step1Height * finalScale);

  const tilesX = Math.ceil(step2Width / 512);
  const tilesY = Math.ceil(step2Height / 512);

  return {
    step1Width,
    step1Height,
    step2Width,
    step2Height,
    tilesX,
    tilesY,
    totalTiles: tilesX * tilesY,
  };
}

export type SharpImageMetadata = {
  width: number | "unknown";
  height: number | "unknown";
  format: string | "unknown";
  orientationExif: number | "unknown";
};

/** Shared by /api/photo-quality and investigation reproductions — identical code path. */
export async function readImagePipelineMetadata(
  buffer: Buffer,
): Promise<SharpImageMetadata> {
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width ?? "unknown",
      height: meta.height ?? "unknown",
      format: meta.format ?? "unknown",
      orientationExif: meta.orientation ?? "unknown",
    };
  } catch (metaError) {
    console.warn(
      "[vision-pipeline] sharp metadata read failed (non-fatal):",
      metaError instanceof Error ? metaError.message : String(metaError),
    );
    return {
      width: "unknown",
      height: "unknown",
      format: "unknown",
      orientationExif: "unknown",
    };
  }
}

export type ImagePipelineOriginalInfo = {
  photoLabel: string;
  photoId: string;
  mimeType: string;
  uploadedBytes: number;
  base64Length: number;
  sha256: string;
  width: number | "unknown";
  height: number | "unknown";
  format: string | "unknown";
  orientationExif: number | "unknown";
};

/** Step 1/2 — log the exact bytes we received, before any request is built. */
export function logImagePipelineOriginal(info: ImagePipelineOriginalInfo): void {
  console.log("====================================================");
  console.log(`[vision-pipeline] ORIGINAL IMAGE (as received by server) — ${info.photoLabel}`);
  console.log("====================================================");
  console.log("photoId:", info.photoId);
  console.log("mimeType (from upload payload):", info.mimeType);
  console.log("uploaded bytes (decoded from base64):", info.uploadedBytes);
  console.log("base64 string length:", info.base64Length);
  console.log("SHA-256:", info.sha256);
  console.log("width x height (sharp metadata):", info.width, "x", info.height);
  console.log("format (sharp metadata):", info.format);
  console.log("EXIF orientation tag:", info.orientationExif);
  console.log(
    "Transformations applied server-side before Vision request: NONE " +
      "(no resize/crop/compress/rotate call exists in /api/photo-quality).",
  );

  if (info.width !== "unknown" && info.height !== "unknown") {
    const projection = computeOpenAiHighDetailProjection(
      info.width,
      info.height,
    );
    console.log(
      "OpenAI internal 'high' detail projection (their servers, not ours):",
      projection,
    );
    if (projection.step2Height < info.height) {
      const rowsLostPerPixel = info.height / projection.step2Height;
      console.log(
        `NOTE: OpenAI will downscale this image ~${rowsLostPerPixel.toFixed(2)}x before reading it. ` +
          "If the worksheet's later questions (bottom rows) are small text near the crop edge, " +
          "downscaling can push them below legible resolution even though the byte data is intact.",
      );
    }
  }

  if (info.uploadedBytes > OPENAI_IMAGE_MAX_BYTES) {
    console.warn(
      `[vision-pipeline] WARNING: uploaded bytes (${info.uploadedBytes}) exceed OpenAI's ` +
        `documented ${OPENAI_IMAGE_MAX_BYTES} byte per-image limit. OpenAI REJECTS oversized ` +
        "images (400 error) — it does not silently resize them. If this photo is over the " +
        "limit, the Vision call would fail outright, not silently drop rows.",
    );
  } else {
    console.log(
      `Uploaded bytes (${info.uploadedBytes}) are within OpenAI's ${OPENAI_IMAGE_MAX_BYTES} byte limit.`,
    );
  }
  console.log("====================================================");
}

export type ImagePipelineComparisonSide = {
  label: string;
  buffer: Buffer;
  sha256: string;
  width: number | "unknown";
  height: number | "unknown";
  mimeType: string;
  format: string | "unknown";
  orientationExif: number | "unknown";
};

/**
 * Step 3/4/5/6 — byte-by-byte comparison of two checkpoints in the pipeline
 * (e.g. "as received from client" vs "bytes embedded in the Vision request").
 * Prints every field the investigation requires and an explicit A/B conclusion.
 */
export function logImagePipelineByteComparison(input: {
  photoLabel: string;
  before: ImagePipelineComparisonSide;
  after: ImagePipelineComparisonSide;
}): { identical: boolean } {
  const { before, after } = input;
  const sameSize = before.buffer.byteLength === after.buffer.byteLength;
  const sameSha256 = before.sha256 === after.sha256;
  const sameBytes = sameSize && before.buffer.equals(after.buffer);
  const sameWidth = before.width === after.width;
  const sameHeight = before.height === after.height;
  const sameMime = before.mimeType === after.mimeType;
  const sameOrientation = before.orientationExif === after.orientationExif;
  const identical = sameBytes && sameSha256;

  console.log("====================================================");
  console.log(
    `[vision-pipeline] BYTE-BY-BYTE COMPARISON — ${input.photoLabel}: "${before.label}" vs "${after.label}"`,
  );
  console.log("====================================================");
  console.log(
    `size (bytes):        ${before.buffer.byteLength} vs ${after.buffer.byteLength}  -> match=${sameSize}`,
  );
  console.log(`SHA-256:              ${before.sha256} vs ${after.sha256}  -> match=${sameSha256}`);
  console.log(`Buffer.equals():      ${sameBytes}`);
  console.log(`width:                ${before.width} vs ${after.width}  -> match=${sameWidth}`);
  console.log(`height:               ${before.height} vs ${after.height}  -> match=${sameHeight}`);
  console.log(`mimeType:             ${before.mimeType} vs ${after.mimeType}  -> match=${sameMime}`);
  console.log(`format (sharp):       ${before.format} vs ${after.format}`);
  console.log(
    `EXIF orientation:     ${before.orientationExif} vs ${after.orientationExif}  -> match=${sameOrientation}`,
  );
  console.log(`ALL FIELDS IDENTICAL: ${identical}`);

  if (!identical) {
    console.error(
      `[vision-pipeline] CONCLUSION for ${input.photoLabel}: A. Our pipeline changes the image before Vision. ` +
        `The bytes diverge between "${before.label}" and "${after.label}" — inspect any code between these two ` +
        "checkpoints for a resize/crop/recompress/rotate/re-encode call.",
    );
  } else {
    console.log(
      `[vision-pipeline] CONCLUSION for ${input.photoLabel}: B. The image reaching OpenAI is byte-identical ` +
        `to "${before.label}" — no resize/crop/recompress/rotate/Base64 round-trip alters it between these ` +
        "two checkpoints.",
    );
  }
  console.log("====================================================");
  return { identical };
}

/** @deprecated Use logImagePipelineByteComparison for full SHA-256 + metadata proof. */
export function logImagePipelineIntegrityCheck(input: {
  photoLabel: string;
  originalBuffer: Buffer;
  bufferSentToVision: Buffer;
}): void {
  const sameLength =
    input.originalBuffer.byteLength === input.bufferSentToVision.byteLength;
  const identical =
    sameLength && input.originalBuffer.equals(input.bufferSentToVision);
  console.log(
    `[vision-pipeline] INTEGRITY CHECK — ${input.photoLabel}: bytes sent to Vision are ` +
      `byte-identical to the originally uploaded/decoded bytes: ${identical} ` +
      `(original=${input.originalBuffer.byteLength}B, sent=${input.bufferSentToVision.byteLength}B).`,
  );
  if (!identical) {
    console.error(
      "[vision-pipeline] MISMATCH — the image was altered between upload and the Vision request. " +
        "This should never happen given the current code path; investigate any intermediate re-encoding.",
    );
  }
}

/** Step 3 — confirm request-level Vision config (detail, model) is what we expect. */
export function logVisionRequestConfig(input: {
  photoLabel: string;
  model: string;
  detail: string;
}): void {
  console.log(
    `[vision-pipeline] VISION REQUEST CONFIG — ${input.photoLabel}: model=${input.model}, ` +
      `image_url.detail="${input.detail}" (expected "high": ${input.detail === "high"})`,
  );
}

const DEBUG_SAVE_ENABLED = process.env.NODE_ENV !== "production";

/** Step 1/2/3 — persist a checkpoint's exact bytes to disk, for visual/hash inspection. */
export async function saveVisionDebugImage(input: {
  photoLabel: string;
  photoId: string;
  mimeType: string;
  buffer: Buffer;
  /** e.g. "original-upload" or "sent-to-vision" — distinguishes the two checkpoints on disk. */
  checkpoint?: string;
}): Promise<string | null> {
  if (!DEBUG_SAVE_ENABLED) return null;
  try {
    const debugDir = path.join(process.cwd(), "debug", "vision-images");
    await fs.mkdir(debugDir, { recursive: true });
    const ext = input.mimeType.includes("png")
      ? "png"
      : input.mimeType.includes("webp")
        ? "webp"
        : "jpg";
    const safeId = input.photoId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const checkpoint = input.checkpoint ?? "sent-to-vision";
    const filePath = path.join(
      debugDir,
      `${input.photoLabel.replace(/\s+/g, "-")}-${safeId}-${checkpoint}.${ext}`,
    );
    await fs.writeFile(filePath, input.buffer);
    console.log(
      `[vision-pipeline] Saved "${checkpoint}" bytes -> ${filePath} (${input.buffer.byteLength}B, ` +
        `sha256=${sha256Hex(input.buffer)})`,
    );
    return filePath;
  } catch (error) {
    console.warn(
      "[vision-pipeline] Failed to save debug image (non-fatal, dev-only):",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

export type OcrTimingInfo = {
  photoLabel: string;
  attempt: number;
  startedAtIso: string;
  endedAtIso: string;
  durationMs: number;
  timedOut: boolean;
  error?: string;
  rawTextLength: number;
  questionNumbersFound: number[];
};

export function logOcrAttempt(info: OcrTimingInfo): void {
  console.log(
    `[vision-pipeline] OCR attempt ${info.attempt} — ${info.photoLabel}`,
  );
  console.log("  started:", info.startedAtIso);
  console.log("  ended:", info.endedAtIso);
  console.log("  duration (ms):", info.durationMs);
  console.log("  timedOut:", info.timedOut);
  if (info.timedOut) {
    console.log(
      "  timeout reason: Tesseract worker did not resolve within the configured timeout " +
        "(likely large image pixel count -> slow OCR pass, or worker init contention).",
    );
  }
  if (info.error) {
    console.log("  error:", info.error);
  }
  console.log("  OCR response size (rawText chars):", info.rawTextLength);
  console.log("  question numbers found:", info.questionNumbersFound);
}

/** In-memory, per-process record of every photo checked — for cross-photo comparison logging only. */
export type PhotoPipelineSnapshot = {
  photoLabel: string;
  photoId: string;
  photoIndex: number;
  width: number | "unknown";
  height: number | "unknown";
  uploadedBytes: number;
  mimeType: string;
  ocrQuestionNumbers: number[];
  ocrTimedOut: boolean;
  visionQuestionNumbers: number[];
  visionEstimatedTotal: number;
  detectedQuestionNumbers: number[];
  recordedAtIso: string;
};

const photoSnapshots = new Map<string, PhotoPipelineSnapshot>();

export function recordPhotoPipelineSnapshot(snapshot: PhotoPipelineSnapshot): void {
  photoSnapshots.set(snapshot.photoId, snapshot);
}

/** Step 8 — print every previously recorded photo vs the current one (same process only). */
export function logPhotoComparisonTable(currentPhotoId: string): void {
  const rows = [...photoSnapshots.values()].sort(
    (a, b) => a.photoIndex - b.photoIndex,
  );
  if (rows.length < 2) return;

  console.log("====================================================");
  console.log("[vision-pipeline] PHOTO COMPARISON (this server process)");
  console.log("====================================================");
  for (const row of rows) {
    const marker = row.photoId === currentPhotoId ? " <== current" : "";
    console.log(
      `${row.photoLabel}${marker}: ${row.width}x${row.height}, ${row.uploadedBytes}B, ` +
        `mime=${row.mimeType}, OCR timedOut=${row.ocrTimedOut}, ` +
        `OCR nums=[${row.ocrQuestionNumbers.join(",")}], ` +
        `Vision nums=[${row.visionQuestionNumbers.join(",")}], ` +
        `Vision estimatedTotal=${row.visionEstimatedTotal}, ` +
        `merged detected=[${row.detectedQuestionNumbers.join(",")}]`,
    );
  }

  const maxDetected = Math.max(
    ...rows.map((r) => Math.max(0, ...r.detectedQuestionNumbers)),
  );
  for (const row of rows) {
    const rowMax = Math.max(0, ...row.detectedQuestionNumbers);
    if (rowMax < maxDetected) {
      const other = rows.find(
        (r) => r.photoId !== row.photoId && Math.max(0, ...r.detectedQuestionNumbers) === maxDetected,
      );
      if (!other) continue;
      const pixelCountRow = row.width !== "unknown" && row.height !== "unknown"
        ? row.width * row.height
        : null;
      const pixelCountOther = other.width !== "unknown" && other.height !== "unknown"
        ? other.width * other.height
        : null;
      console.log(
        `[vision-pipeline] ${row.photoLabel} tops out at Q${rowMax} while ${other.photoLabel} reached Q${maxDetected}.`,
      );
      if (pixelCountRow != null && pixelCountOther != null) {
        console.log(
          `  Resolution: ${row.photoLabel}=${row.width}x${row.height} (${pixelCountRow.toLocaleString()}px) vs ` +
            `${other.photoLabel}=${other.width}x${other.height} (${pixelCountOther.toLocaleString()}px).`,
        );
        if (pixelCountRow !== pixelCountOther) {
          console.log(
            "  Resolutions differ — different source cameras/crops, not a resize applied by this pipeline " +
              "(no resize call exists in /api/photo-quality).",
          );
        }
      }
      if (row.ocrTimedOut && !other.ocrTimedOut) {
        console.log(
          `  ${row.photoLabel} OCR timed out while ${other.photoLabel} did not — Vision result is the ` +
            "only signal for the timed-out photo. If Vision itself only saw up to " +
            `Q${rowMax}, the missing questions were not visible/legible to Vision in that photo's bytes.`,
        );
      }
    }
  }
  console.log("====================================================");
}
