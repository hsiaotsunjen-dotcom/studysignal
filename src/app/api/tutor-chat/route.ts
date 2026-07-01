import { NextResponse } from "next/server";

type ChatRole = "system" | "user" | "assistant";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ApiMessage = {
  role: ChatRole;
  content: string | ContentPart[];
};

function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

function parseContentPart(p: unknown): ContentPart | null {
  if (!p || typeof p !== "object") return null;
  const o = p as Record<string, unknown>;
  if (o.type === "text" && typeof o.text === "string" && o.text.trim()) {
    return { type: "text", text: o.text };
  }
  if (
    o.type === "image_url" &&
    o.image_url &&
    typeof o.image_url === "object"
  ) {
    const iu = o.image_url as Record<string, unknown>;
    const url = typeof iu.url === "string" ? iu.url.trim() : "";
    if (url.startsWith("data:image/") && url.includes("base64,")) {
      return { type: "image_url", image_url: { url } };
    }
  }
  return null;
}

function parseMessageItem(item: unknown): ApiMessage | null {
  if (!item || typeof item !== "object") return null;
  const m = item as Record<string, unknown>;
  const role = m.role;
  if (role !== "system" && role !== "user" && role !== "assistant") {
    return null;
  }
  const c = m.content;
  if (isNonEmptyString(c)) {
    return { role, content: c.trim() };
  }
  if (Array.isArray(c) && role === "user") {
    const parts: ContentPart[] = [];
    for (const x of c) {
      const p = parseContentPart(x);
      if (p) parts.push(p);
    }
    if (parts.length === 0) return null;
    return { role: "user", content: parts };
  }
  return null;
}

function parseBody(body: unknown): { messages: ApiMessage[] } | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const raw = o.messages;
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const messages: ApiMessage[] = [];
  for (const item of raw) {
    const msg = parseMessageItem(item);
    if (!msg) return null;
    messages.push(msg);
  }
  if (messages[0]!.role !== "system") return null;
  if (messages[messages.length - 1]!.role !== "user") return null;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role === "system" || m.role === "assistant") {
      if (typeof m.content !== "string") return null;
    }
  }
  return { messages };
}

function totalPayloadEstimate(messages: ApiMessage[]): number {
  let n = 0;
  for (const m of messages) {
    if (typeof m.content === "string") {
      n += m.content.length;
    } else {
      for (const p of m.content) {
        if (p.type === "text") n += p.text.length;
        else n += p.image_url.url.length;
      }
    }
  }
  return n;
}

async function logTutorChatIncomingImageDebug(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  console.log("[image upload debug] api /api/tutor-chat transport", {
    contentType,
    multipart: contentType.includes("multipart/form-data"),
    note:
      "StudySignal sends vision images in JSON messages[].content image_url, NOT FormData",
  });

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.clone().formData();
      const keys = [...formData.keys()];
      const image =
        formData.get("image") ?? formData.get("file") ?? formData.get("images");
      console.log("[image upload debug] api /api/tutor-chat formData", {
        keys,
        "image exists": image != null,
        "image.name": image instanceof File ? image.name : null,
        "image.type": image instanceof Blob ? image.type : null,
        "image.size": image instanceof Blob ? image.size : null,
      });
    } catch (e) {
      console.log("[image upload debug] api /api/tutor-chat formData error", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }

  console.log("[image upload debug] api /api/tutor-chat formData skipped", {
    reason: "JSON transport — check vision images in messages log next",
  });
}

export async function POST(request: Request) {
  await logTutorChatIncomingImageDebug(request);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請傳送有效的 JSON。" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "請提供有效的 messages（需以 system 開頭、至少一則 user，且最後一則為 user；system/assistant 僅限純文字）。",
      },
      { status: 400 },
    );
  }

  const { messages } = parsed;
  const est = totalPayloadEstimate(messages);
  if (est > 280000) {
    return NextResponse.json(
      { error: "對話或圖片內容過長，請減少圖片數量或清除部分訊息後再試。" },
      { status: 400 },
    );
  }

  const last = messages[messages.length - 1]!;
  const hasVision =
    typeof last.content !== "string" &&
    last.content.some((p) => p.type === "image_url");

  if (hasVision && typeof last.content !== "string") {
    const imageParts = last.content.filter((p) => p.type === "image_url");
    console.log("[image upload debug] api /api/tutor-chat vision images in messages", {
      imagePartCount: imageParts.length,
      images: imageParts.map((p, i) => {
        const url =
          p.type === "image_url" ? p.image_url.url : "";
        const mimeMatch = /^data:(image\/[^;]+);base64,/.exec(url);
        return {
          index: i,
          "image MIME type": mimeMatch?.[1] ?? "unknown",
          "image.size (base64 chars)": url.length,
          dataUrlPrefix: url.slice(0, 48),
        };
      }),
    });
  }

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.65,
      max_tokens: hasVision ? 1400 : 900,
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return NextResponse.json(
      { error: "對話服務暫時失敗，請稍後再試。", detail },
      { status: 502 },
    );
  }

  const data = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!rawContent) {
    return NextResponse.json(
      { error: "沒有收到模型回覆，請再試一次。" },
      { status: 502 },
    );
  }

  return NextResponse.json({ reply: rawContent });
}
