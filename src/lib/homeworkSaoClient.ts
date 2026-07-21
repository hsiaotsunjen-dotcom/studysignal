/**
 * Phase 1 client helpers: produce SAO once after capture quality settles.
 * Does not modify Tutor or Signals consumers.
 */

import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import {
  buildStudentAnswerObject,
  studentAnswerObjectMatchesPhotos,
  summarizeStudentAnswerObjectForLog,
  type StudentAnswerObject,
} from "@/lib/studentAnswerObject";
import type { HomeworkVisionResult } from "@/lib/vision/types";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

export type ProduceStudentAnswerObjectInput = {
  session: WorksheetCaptureSession;
  images: AnalyzeImagePayload[];
};

async function fetchEyesHomeworkVision(
  images: AnalyzeImagePayload[],
): Promise<HomeworkVisionResult | null> {
  if (images.length === 0) return null;
  try {
    const res = await fetch("/api/homework-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: images.map((im) => ({
          mimeType: im.mimeType,
          dataBase64: im.dataBase64,
        })),
      }),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[SAO] Eyes /api/homework-vision failed", {
        status: res.status,
        error:
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : null,
      });
      return null;
    }
    if (
      data &&
      typeof data === "object" &&
      "ok" in data &&
      (data as { ok: unknown }).ok === true &&
      "data" in data &&
      (data as { data: unknown }).data &&
      typeof (data as { data: unknown }).data === "object"
    ) {
      return (data as { data: HomeworkVisionResult }).data;
    }
    return null;
  } catch (error) {
    console.warn("[SAO] Eyes fetch exception", error);
    return null;
  }
}

/**
 * Produce SAO from capture session OCR + one Eyes answer-extraction call.
 * OCR is never discarded even if Eyes fails.
 */
export async function produceStudentAnswerObject(
  input: ProduceStudentAnswerObjectInput,
): Promise<StudentAnswerObject> {
  const { session, images } = input;
  const ocrRawTextByPhotoId: Record<string, string> = {};
  for (const photo of session.photos) {
    ocrRawTextByPhotoId[photo.id] =
      typeof photo.quality?.ocrRawText === "string"
        ? photo.quality.ocrRawText
        : "";
  }

  const eyes = await fetchEyesHomeworkVision(images);
  const sao = buildStudentAnswerObject({
    session,
    ocrRawTextByPhotoId,
    eyes,
  });

  console.log(
    "[SAO] Phase 1 produced Student Answer Object",
    summarizeStudentAnswerObjectForLog(sao),
  );
  return sao;
}

/**
 * Return existing SAO when it matches photo ids; otherwise produce a fresh one.
 * Shared by Signals (Phase 2) and Tutor (Phase 3).
 */
export async function ensureStudentAnswerObject(input: {
  session: WorksheetCaptureSession;
  images: AnalyzeImagePayload[];
  photoIds: string[];
  existing: StudentAnswerObject | null | undefined;
}): Promise<StudentAnswerObject> {
  const { session, images, photoIds, existing } = input;
  if (studentAnswerObjectMatchesPhotos(existing, photoIds) && existing) {
    return existing;
  }
  return produceStudentAnswerObject({ session, images });
}
