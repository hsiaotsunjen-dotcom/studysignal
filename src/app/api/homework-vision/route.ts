/**
 * POST /api/homework-vision — Eyes API (isolated).
 *
 * Uses VISION_PROVIDER_PRIORITY (default gemini,openai) with transient fallback.
 * Does NOT touch /api/analyze, tutor-chat, photo-quality, or the Talk UI.
 */

import { NextResponse } from "next/server";

import {
  createHomeworkVisionProviderFromEnv,
  HomeworkVisionSchemaError,
  HomeworkVisionService,
  isHomeworkVisionUseMock,
} from "@/lib/vision";
import type { HomeworkVisionImageInput } from "@/lib/vision";

export const runtime = "nodejs";

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Local image parse — keeps this route independent of analyze / photo-quality helpers. */
function parseHomeworkVisionImages(raw: unknown): HomeworkVisionImageInput[] {
  const images: HomeworkVisionImageInput[] = [];
  if (!Array.isArray(raw)) return images;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const im = item as Record<string, unknown>;
    const mimeType =
      typeof im.mimeType === "string" && im.mimeType.startsWith("image/")
        ? im.mimeType
        : "image/jpeg";
    const base64 =
      trimmed(im.base64) ||
      trimmed(im.dataBase64) ||
      trimmed(im.data_base64);
    if (base64.length > 0) {
      images.push({ mimeType, base64 });
    }
  }
  return images;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON。" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "缺少請求內容。" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const images = parseHomeworkVisionImages(o.images);
  if (images.length === 0) {
    return NextResponse.json(
      { error: "請至少上傳一張作業照片（images）。" },
      { status: 400 },
    );
  }

  try {
    const provider = createHomeworkVisionProviderFromEnv();
    const service = new HomeworkVisionService(provider);
    const data = await service.analyze({ images });

    return NextResponse.json({
      ok: true,
      mock: isHomeworkVisionUseMock(),
      data,
    });
  } catch (err) {
    if (err instanceof HomeworkVisionSchemaError) {
      return NextResponse.json(
        { error: "Homework Vision schema 驗證失敗。", detail: err.message },
        { status: 422 },
      );
    }
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "Homework Vision 暫時無法處理。", detail: message },
      { status: 500 },
    );
  }
}
