import { NextResponse } from "next/server";

import type { HomeworkReport } from "@/lib/analyzeFeedback";
import { parseStudentAnswerObject } from "@/lib/studentAnswerObject";
import type { StudentAnswerObject } from "@/lib/studentAnswerObject";
import {
  buildTutorChatHomeworkSystemPrompt,
  TUTOR_CHAT_GENERIC_SYSTEM,
  TUTOR_CHAT_HOMEWORK_PHOTO_SYSTEM,
} from "@/lib/tutorChatOpenAiMessages";
import {
  buildTutorChatSaoSystemPrompt,
  logTutorSaoDevInput,
  logTutorSaoDevPromptPayloadResponse,
} from "@/lib/tutorSaoContext";

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

function parseHomeworkReportInput(raw: unknown): HomeworkReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const homeworkType =
    typeof o.homeworkType === "string" ? o.homeworkType.trim() : "";
  const answerOverview =
    typeof o.answerOverview === "string" ? o.answerOverview.trim() : "";
  const questionCount = o.questionCount ?? o.question_count;
  if (!homeworkType && !answerOverview && questionCount == null) return null;

  const keyRaw = o.keyExplanations ?? o.key_explanations;
  const keyExplanations = Array.isArray(keyRaw)
    ? keyRaw.filter((x) => x && typeof x === "object")
    : [];

  const learnRaw = o.learningSignal ?? o.learning_signal;
  const learningSignal = Array.isArray(learnRaw)
    ? learnRaw.filter((x): x is string => typeof x === "string")
    : [];

  return {
    homeworkType: homeworkType || "English worksheet",
    questionCount:
      typeof questionCount === "number" || typeof questionCount === "string"
        ? questionCount
        : "—",
    imageQuality:
      typeof o.imageQuality === "string" ? o.imageQuality : "Fair",
    answerOverview: answerOverview || "—",
    keyExplanations: keyExplanations as HomeworkReport["keyExplanations"],
    pronunciationFocus: [],
    learningSignal,
    ...(typeof o.hintsFirst === "string" ? { hintsFirst: o.hintsFirst } : {}),
    ...(typeof o.formattedReport === "string"
      ? { formattedReport: o.formattedReport }
      : {}),
  };
}

function parseBody(body: unknown): {
  messages: ApiMessage[];
  homeworkReport: HomeworkReport | null;
  homeworkContextExpected: boolean;
  studentAnswerObject: StudentAnswerObject | null;
} | null {
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
  return {
    messages,
    homeworkReport: parseHomeworkReportInput(o.homeworkReport),
    homeworkContextExpected: o.homeworkContextExpected === true,
    studentAnswerObject: parseStudentAnswerObject(
      o.studentAnswerObject ?? o.student_answer_object,
    ),
  };
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
  if (process.env.NODE_ENV !== "development") return;
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
  try {
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

  const {
    messages,
    homeworkReport,
    homeworkContextExpected,
    studentAnswerObject,
  } = parsed;
  if (messages.length < 2) {
    return NextResponse.json(
      { error: "messages 數量不足。" },
      { status: 400 },
    );
  }

  const lastIncoming = messages[messages.length - 1];
  const hasVision =
    lastIncoming?.role === "user" &&
    typeof lastIncoming.content !== "string" &&
    lastIncoming.content.some((p) => p.type === "image_url");

  // Phase 3: homework photos require SAO — never invent inventory from pixels.
  if (hasVision && !studentAnswerObject) {
    return NextResponse.json(
      {
        error:
          "作業家教需要 Student Answer Object（SAO）。請等待照片辨識完成後再試。",
      },
      { status: 400 },
    );
  }

  if (studentAnswerObject) {
    logTutorSaoDevInput(studentAnswerObject);
  }

  const answerOverviewPresent = Boolean(
    homeworkReport?.answerOverview &&
      homeworkReport.answerOverview.trim() !== "" &&
      homeworkReport.answerOverview !== "—",
  );

  let promptMode:
    | "sao"
    | "homework"
    | "fallback"
    | "missing_homework_debug";
  if (studentAnswerObject) {
    promptMode = "sao";
  } else if (homeworkContextExpected && !homeworkReport) {
    promptMode = "missing_homework_debug";
  } else if (homeworkReport) {
    promptMode = "homework";
  } else {
    promptMode = "fallback";
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[tutor-chat] prompt_trace", {
      studentAnswerObjectPresent: Boolean(studentAnswerObject),
      homeworkReportPresent: Boolean(homeworkReport),
      answerOverviewPresent,
      homeworkContextExpected,
      promptMode,
      hasVision,
      saoAnswered: studentAnswerObject?.summary.answered ?? null,
      declaredQuestionCount: homeworkReport?.questionCount ?? null,
      systemPromptKind: promptMode,
    });
  }

  if (promptMode === "missing_homework_debug") {
    return NextResponse.json({
      reply:
        "[DEBUG] Tutor homework context missing. homeworkContextExpected=true but homeworkReport was not provided to /api/tutor-chat.",
    });
  }

  let systemContent: string;
  if (promptMode === "sao" && studentAnswerObject) {
    systemContent = buildTutorChatSaoSystemPrompt(studentAnswerObject);
  } else if (promptMode === "homework" && homeworkReport) {
    systemContent = buildTutorChatHomeworkSystemPrompt(homeworkReport);
  } else if (hasVision) {
    // Unreachable when SAO required for vision; keep stub for safety.
    systemContent = TUTOR_CHAT_HOMEWORK_PHOTO_SYSTEM;
  } else if (messages[0]?.role === "system" && typeof messages[0].content === "string") {
    systemContent = messages[0].content;
  } else {
    systemContent = TUTOR_CHAT_GENERIC_SYSTEM;
  }

  const openaiMessages: ApiMessage[] = [
    { role: "system", content: systemContent },
    ...messages.slice(1),
  ];

  // Temporary experiment.
  // Current 280000 limit is an app-local payload estimate,
  // not an OpenAI documented request limit.
  const MAX_TUTOR_CHAT_PAYLOAD_CHARS = 2000000;
  const est = totalPayloadEstimate(openaiMessages);
  if (est > MAX_TUTOR_CHAT_PAYLOAD_CHARS) {
    return NextResponse.json(
      { error: "對話或圖片內容過長，請減少圖片數量或清除部分訊息後再試。" },
      { status: 400 },
    );
  }

  const last = openaiMessages[openaiMessages.length - 1];
  if (!last || last.role !== "user") {
    return NextResponse.json(
      { error: "最後一則訊息必須為 user。" },
      { status: 400 },
    );
  }

  if (
    process.env.NODE_ENV === "development" &&
    hasVision &&
    typeof last.content !== "string"
  ) {
    const imageParts = last.content.filter((p) => p.type === "image_url");
    console.log("[image upload debug] api /api/tutor-chat vision images in messages", {
      imagePartCount: imageParts.length,
      note: "Images are visual references only; answer inventory is SAO",
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

  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        temperature: 0.65,
        max_tokens: hasVision ? 500 : 900,
      }),
    });
  } catch (error) {
    console.error("[tutor-chat] OpenAI fetch failed", error);
    return NextResponse.json(
      {
        error: "對話服務暫時失敗，請稍後再試。",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return NextResponse.json(
      { error: "對話服務暫時失敗，請稍後再試。", detail },
      { status: 502 },
    );
  }

  let data: {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  try {
    data = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
  } catch (error) {
    console.error("[tutor-chat] OpenAI JSON parse failed", error);
    return NextResponse.json(
      {
        error: "對話服務暫時失敗，請稍後再試。",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
  const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!rawContent) {
    return NextResponse.json(
      { error: "沒有收到模型回覆，請再試一次。" },
      { status: 502 },
    );
  }

  logTutorSaoDevPromptPayloadResponse({
    systemPrompt: systemContent,
    messages: openaiMessages,
    reply: rawContent,
  });

  return NextResponse.json({ reply: rawContent });
  } catch (error) {
    console.error("[tutor-chat] unhandled exception", error);
    return NextResponse.json(
      {
        error: "對話服務暫時失敗，請稍後再試。",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
