import OpenAI from "openai";
import { NextResponse } from "next/server";
import { type ApiChatMessage, type ChatRole } from "@/lib/chat";
import {
  DEFAULT_ENGLISH_VARIANT,
  DEFAULT_SCHOOL_LEVEL,
  buildSystemPrompt,
  isEnglishVariant,
  isSchoolLevel,
  type EnglishVariant,
  type SchoolLevel,
  type TutorPreferences,
} from "@/lib/tutor-settings";

const MODEL = "gpt-4o-mini";

function isValidRole(role: unknown): role is ChatRole {
  return role === "user" || role === "assistant";
}

function parseMessages(messages: unknown): ApiChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null;
  }

  const parsed: ApiChatMessage[] = [];

  for (const item of messages) {
    if (
      !item ||
      typeof item !== "object" ||
      !("role" in item) ||
      !("content" in item)
    ) {
      return null;
    }

    const { role, content } = item as { role: unknown; content: unknown };
    if (!isValidRole(role) || typeof content !== "string") {
      return null;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return null;
    }

    parsed.push({ role, content: trimmed });
  }

  return parsed;
}

function parsePreferences(body: Record<string, unknown>): TutorPreferences {
  const englishVariant = isEnglishVariant(body.englishVariant)
    ? body.englishVariant
    : DEFAULT_ENGLISH_VARIANT;

  const schoolLevel = isSchoolLevel(body.schoolLevel)
    ? body.schoolLevel
    : DEFAULT_SCHOOL_LEVEL;

  return { englishVariant, schoolLevel };
}

function parseRequestBody(body: unknown): {
  messages: ApiChatMessage[];
  preferences: TutorPreferences;
} | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const messages = parseMessages(record.messages);
  if (!messages) {
    return null;
  }

  return {
    messages,
    preferences: parsePreferences(record),
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfiguration: OPENAI_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseRequestBody(body);
  if (!parsed) {
    return NextResponse.json(
      { error: "Request must include a non-empty messages array." },
      { status: 400 }
    );
  }

  const { messages, preferences } = parsed;
  const systemPrompt = buildSystemPrompt(
    preferences.englishVariant,
    preferences.schoolLevel
  );

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: reply });
  } catch (error) {
    console.error("[api/chat]", error);

    const message =
      error instanceof OpenAI.APIError
        ? error.message
        : "Failed to generate a response.";

    const status =
      error instanceof OpenAI.APIError && error.status ? error.status : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
