import { NextResponse } from "next/server";

import { resolveWhisperLanguageHint } from "@/lib/sttLanguage";

const OPENAI_TRANSCRIPTIONS =
  "https://api.openai.com/v1/audio/transcriptions";

/**
 * POST /api/transcribe
 * Multipart: file (required), language? (optional).
 * Omit language / send "auto" → Whisper automatic language detection
 * (Chinese, English, or mixed). Do not force Tutor TTS locale here.
 */
export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "請傳送 multipart 音訊資料。" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json(
      { error: "缺少有效的音訊檔。" },
      { status: 400 }
    );
  }

  const langRaw = formData.get("language");
  const languageHint = resolveWhisperLanguageHint(langRaw);

  if (process.env.NODE_ENV === "development") {
    console.log("[STT] /api/transcribe inbound", {
      languageFormField: typeof langRaw === "string" ? langRaw : langRaw,
      languageSentToWhisper: languageHint,
      whisperMode: languageHint ? "forced_hint" : "auto_detect",
      fileBytes: file.size,
      fileType: file.type,
    });
  }

  const outbound = new FormData();
  outbound.append("model", "whisper-1");
  outbound.append("file", file, "audio.webm");
  // Only set when explicitly hinted — omitting enables Whisper auto-detect.
  if (languageHint) {
    outbound.append("language", languageHint);
  }

  const openaiRes = await fetch(OPENAI_TRANSCRIPTIONS, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: outbound,
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return NextResponse.json(
      { error: "語音轉文字服務暫時失敗，請稍後再試。", detail },
      { status: 502 }
    );
  }

  const data = (await openaiRes.json()) as { text?: unknown };
  const text = typeof data.text === "string" ? data.text : "";

  return NextResponse.json({ text });
}
