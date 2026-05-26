import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import {
  HOMEWORK_MODEL,
  HOMEWORK_SYSTEM_PROMPT,
  type HomeworkHistoryItem,
} from "@/lib/homework-prompt";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function parseHistory(raw: FormDataEntryValue | null): HomeworkHistoryItem[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const history: HomeworkHistoryItem[] = [];
    for (const item of parsed) {
      if (
        !item ||
        typeof item !== "object" ||
        !("role" in item) ||
        !("content" in item)
      ) {
        continue;
      }
      const { role, content } = item as { role: unknown; content: unknown };
      if (
        (role !== "user" && role !== "assistant") ||
        typeof content !== "string" ||
        !content.trim()
      ) {
        continue;
      }
      history.push({ role, content: content.trim() });
    }
    return history;
  } catch {
    return [];
  }
}

function toGeminiHistory(history: HomeworkHistoryItem[]) {
  return history.map((item) => ({
    role: item.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: item.content }],
  }));
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: GEMINI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const messageRaw = formData.get("message");
  const message =
    typeof messageRaw === "string" ? messageRaw.trim() : "";

  if (!message) {
    return NextResponse.json(
      { error: "A message is required." },
      { status: 400 }
    );
  }

  const imageEntry = formData.get("image");
  const history = parseHistory(formData.get("history"));

  let imagePart: { inlineData: { mimeType: string; data: string } } | null =
    null;

  if (imageEntry instanceof File && imageEntry.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(imageEntry.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }
    if (imageEntry.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await imageEntry.arrayBuffer());
    imagePart = {
      inlineData: {
        mimeType: imageEntry.type,
        data: buffer.toString("base64"),
      },
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: HOMEWORK_MODEL,
    systemInstruction: HOMEWORK_SYSTEM_PROMPT,
  });

  try {
    let reply: string;

    if (history.length > 0) {
      const chat = model.startChat({
        history: toGeminiHistory(history),
      });

      const parts: Array<
        string | { inlineData: { mimeType: string; data: string } }
      > = [message];
      if (imagePart) parts.push(imagePart);

      const result = await chat.sendMessage(parts);
      reply = result.response.text().trim();
    } else {
      const parts: Array<
        string | { inlineData: { mimeType: string; data: string } }
      > = [message];
      if (imagePart) parts.push(imagePart);

      const result = await model.generateContent(parts);
      reply = result.response.text().trim();
    }

    if (!reply) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("[api/homework]", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to analyze homework.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
