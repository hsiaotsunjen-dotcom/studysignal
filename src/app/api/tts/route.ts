/**
 * POST /api/tts — Server TTS via TtsService + PriorityTtsProvider + Teacher Voice Catalog.
 *
 * Body JSON:
 *   text: string (required)
 *   language?: string (BCP-47; defaults to teacher profile locale)
 *   voiceProfile?: string (stable Teacher Voice Catalog id; alias: voice)
 *   speed?: number (defaults to teacher profile defaultSpeed)
 *   format?: "mp3" | "opus"
 *
 * Clients must send voiceProfileId only — never provider voice names.
 */

import { NextResponse } from "next/server";

import {
  DEFAULT_TEACHER_VOICE_PROFILE_ID,
  TTS_MAX_CHARS,
  TtsService,
  createHomeworkTtsProviderFromEnv,
  getTeacherVoiceProfile,
  normalizeTeacherVoiceProfileId,
  type TtsAudioFormat,
} from "@/lib/tts";
import { isTutorTtsPurpose } from "@/lib/tts/ttsFallbackErrors";

type TtsRequestBody = {
  text?: unknown;
  language?: unknown;
  voiceProfile?: unknown;
  voice?: unknown;
  speed?: unknown;
  format?: unknown;
  purpose?: unknown;
};

function resolveFormat(raw: unknown): TtsAudioFormat {
  if (raw === "opus") return "opus";
  if (raw == null || raw === "mp3") return "mp3";
  throw new Error('format 僅支援 "mp3" 或 "opus"。');
}

function resolveLanguage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$/.test(t)) return null;
  return t;
}

export async function POST(request: Request) {
  let body: TtsRequestBody;
  try {
    body = (await request.json()) as TtsRequestBody;
  } catch {
    return NextResponse.json(
      { error: "請傳送 JSON（text, language?, voiceProfile?, speed?, format?）。" },
      { status: 400 },
    );
  }

  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "text 必須為字串。" }, { status: 400 });
  }
  const text = body.text.trim();
  if (!text) {
    return NextResponse.json({ error: "text 不可為空。" }, { status: 400 });
  }
  if (text.length > TTS_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `text 過長（最多 ${TTS_MAX_CHARS} 字元）。`,
        maxChars: TTS_MAX_CHARS,
      },
      { status: 413 },
    );
  }

  let format: TtsAudioFormat;
  try {
    format = resolveFormat(body.format);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "format 無效。" },
      { status: 400 },
    );
  }

  const voiceRaw =
    body.voiceProfile !== undefined ? body.voiceProfile : body.voice;
  const voiceProfileId = normalizeTeacherVoiceProfileId(
    typeof voiceRaw === "string" ? voiceRaw : undefined,
  );
  if (!voiceProfileId) {
    return NextResponse.json(
      {
        error: "未知的 voiceProfile。請使用 Teacher Voice Catalog 穩定 ID。",
        example: DEFAULT_TEACHER_VOICE_PROFILE_ID,
      },
      { status: 400 },
    );
  }

  const profile = getTeacherVoiceProfile(voiceProfileId);
  if (!profile) {
    return NextResponse.json(
      { error: "voiceProfile 目錄缺少對應項目。" },
      { status: 400 },
    );
  }

  const language =
    resolveLanguage(body.language) ?? profile.locale;
  const speed =
    typeof body.speed === "number" && Number.isFinite(body.speed)
      ? Math.min(4, Math.max(0.25, body.speed))
      : profile.defaultSpeed;

  try {
    const purpose =
      typeof body.purpose === "string" ? body.purpose.trim() : "";
    const retryPolicy = isTutorTtsPurpose(purpose) ? "tutor" : "default";
    const service = new TtsService(createHomeworkTtsProviderFromEnv(retryPolicy));
    const result = await service.synthesize({
      text,
      language,
      voiceProfileId,
      speed,
      format,
    });

    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
        "X-TTS-Voice-Profile": result.voiceProfileId,
        "X-TTS-Provider": result.meta.provider,
        "X-TTS-Provider-Id": result.meta.providerId,
        "X-TTS-Model": result.meta.model,
        "X-TTS-Format": result.format,
        "X-TTS-Latency-Ms": String(result.meta.latencyMs),
        "X-TTS-Fallback-Used": result.meta.fallbackUsed ? "1" : "0",
        "X-TTS-Retry-Count": String(result.meta.retryCount),
        "X-TTS-Provider-Retry-Count": String(result.meta.providerRetryCount),
        "X-TTS-Characters": String(result.meta.characters),
        ...(result.meta.estimatedCostUsd != null
          ? {
              "X-TTS-Cost-Usd-Estimate":
                result.meta.estimatedCostUsd.toFixed(6),
            }
          : {}),
        ...(result.language ? { "X-TTS-Language": result.language } : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const missingKey = /OPENAI_API_KEY|API_KEY is not set/i.test(message);
    if (missingKey) {
      return NextResponse.json(
        { error: "尚未設定 TTS 所需的 API 金鑰。" },
        { status: 500 },
      );
    }
    const unknownProfile = /unknown voiceProfileId|no .* voice mapping/i.test(
      message,
    );
    if (unknownProfile) {
      return NextResponse.json(
        { error: "voiceProfile 無效或尚未支援此供應商對應。", detail: message.slice(0, 300) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "語音合成服務暫時失敗，請稍後再試。",
        detail: message.slice(0, 500),
      },
      { status: 502 },
    );
  }
}
