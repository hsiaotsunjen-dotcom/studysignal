import { NextResponse } from "next/server";

const OPENAI_TRANSCRIPTIONS =
  "https://api.openai.com/v1/audio/transcriptions";

/** Minimum bytes — shorter clips are usually invalid/corrupt WebM from MediaRecorder. */
const MIN_AUDIO_BYTES = 64;

function isAudioBlob(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as Blob).size === "number"
  );
}

function whisperUploadFilename(mime: string): string {
  const t = mime.toLowerCase();
  if (t.includes("webm")) return "audio.webm";
  if (t.includes("mp4") || t.includes("m4a")) return "audio.m4a";
  if (t.includes("mpeg") || t.includes("mp3")) return "audio.mp3";
  if (t.includes("wav")) return "audio.wav";
  if (t.includes("ogg")) return "audio.ogg";
  return "audio.webm";
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      console.error("[transcribe api] OPENAI_API_KEY is missing or empty");
      return NextResponse.json(
        { error: "尚未設定 OPENAI_API_KEY。" },
        { status: 500 },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseFormErr) {
      console.error("[transcribe api] request.formData() failed", parseFormErr);
      return NextResponse.json(
        { error: "請傳送 multipart 音訊資料。" },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (!isAudioBlob(file) || file.size === 0) {
      console.error("[transcribe api] invalid or empty audio file", {
        hasFile: file != null,
        size: isAudioBlob(file) ? file.size : null,
        type: isAudioBlob(file) ? file.type : typeof file,
      });
      return NextResponse.json(
        { error: "缺少有效的音訊檔。" },
        { status: 400 },
      );
    }

    if (file.size < MIN_AUDIO_BYTES) {
      console.error("[transcribe api] audio too small", {
        size: file.size,
        type: file.type,
      });
      return NextResponse.json(
        { error: "錄音太短或無效，請再試一次。" },
        { status: 400 },
      );
    }

    const langRaw = formData.get("language");
    const languageHint =
      typeof langRaw === "string" && /^[a-z]{2}(-[A-Za-z]+)?$/.test(langRaw)
        ? langRaw.slice(0, 2)
        : null;

    const mimeType =
      typeof file.type === "string" && file.type.trim()
        ? file.type.trim()
        : "audio/webm";
    const uploadName = whisperUploadFilename(mimeType);

    const outbound = new FormData();
    outbound.append("model", "whisper-1");
    outbound.append("file", file, uploadName);
    if (languageHint) {
      outbound.append("language", languageHint);
    }

    console.info("[transcribe api] calling Whisper", {
      bytes: file.size,
      mimeType,
      uploadName,
      languageHint,
    });

    let openaiRes: Response;
    try {
      openaiRes = await fetch(OPENAI_TRANSCRIPTIONS, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: outbound,
      });
    } catch (fetchErr) {
      console.error("[transcribe api] fetch to OpenAI failed", fetchErr);
      return NextResponse.json(
        { error: "語音轉文字服務連線失敗，請稍後再試。" },
        { status: 502 },
      );
    }

    const responseText = await openaiRes.text();

    if (!openaiRes.ok) {
      console.error("[transcribe api] Whisper HTTP not OK", {
        status: openaiRes.status,
        statusText: openaiRes.statusText,
        body: responseText.slice(0, 4000),
      });
      return NextResponse.json(
        {
          error: "語音轉文字服務暫時失敗，請稍後再試。",
          detail: responseText.slice(0, 4000),
        },
        { status: 502 },
      );
    }

    let data: { text?: unknown };
    try {
      data = responseText
        ? (JSON.parse(responseText) as { text?: unknown })
        : {};
    } catch (jsonErr) {
      console.error("[transcribe api] Whisper OK but JSON parse failed", {
        jsonErr,
        bodyPreview: responseText.slice(0, 500),
      });
      return NextResponse.json(
        { error: "語音轉文字回應格式異常，請稍後再試。" },
        { status: 502 },
      );
    }

    const text = typeof data.text === "string" ? data.text : "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("[transcribe api] unhandled error", err);
    return NextResponse.json(
      { error: "語音轉文字服務發生未預期錯誤，請稍後再試。" },
      { status: 500 },
    );
  }
}
