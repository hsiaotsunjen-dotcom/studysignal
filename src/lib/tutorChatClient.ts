/**
 * Browser transport for /api/tutor-chat.
 * Streaming only when NEXT_PUBLIC_CHAT_STREAMING=true (server must also enable).
 * On stream failure before `done`, automatically retries buffered JSON.
 */

import {
  TUTOR_CHAT_TRANSPORT_BUFFERED,
  TUTOR_CHAT_TRANSPORT_HEADER,
} from "@/lib/tutorChatTransport";

export function isClientChatStreamingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CHAT_STREAMING === "true";
}

export type TutorChatClientSuccess = {
  ok: true;
  reply: string;
  transport: "stream" | "buffered" | "buffered_fallback";
};

export type TutorChatClientFailure = {
  ok: false;
  error: string;
  status: number;
};

export type TutorChatClientResult =
  | TutorChatClientSuccess
  | TutorChatClientFailure;

export type FetchTutorChatOptions = {
  /** Called for each token while streaming (not used on buffered path). */
  onDelta?: (delta: string, accumulated: string) => void;
};

type BufferedParse = {
  status: number;
  reply: string;
  error: string | null;
};

async function postTutorChat(
  body: unknown,
  transport?: "buffered",
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (transport === "buffered") {
    headers[TUTOR_CHAT_TRANSPORT_HEADER] = TUTOR_CHAT_TRANSPORT_BUFFERED;
  }
  return fetch("/api/tutor-chat", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function parseBufferedResponse(res: Response): Promise<BufferedParse> {
  const data: unknown = await res.json().catch(() => ({}));
  const error =
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
      ? (data as { error: string }).error
      : null;
  const reply =
    typeof data === "object" &&
    data !== null &&
    "reply" in data &&
    typeof (data as { reply: unknown }).reply === "string"
      ? (data as { reply: string }).reply.trim()
      : "";
  return { status: res.status, reply, error };
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

async function consumeAppSse(
  res: Response,
  onDelta?: (delta: string, accumulated: string) => void,
): Promise<TutorChatClientResult> {
  if (!res.body) {
    return {
      ok: false,
      error: "對話服務暫時失敗，請稍後再試。",
      status: res.status || 502,
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let doneReply: string | null = null;
  let streamError: string | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseSseBlock(block);
        if (!parsed) continue;

        let data: unknown = {};
        try {
          data = JSON.parse(parsed.data);
        } catch {
          continue;
        }

        if (parsed.event === "token") {
          const delta =
            typeof data === "object" &&
            data !== null &&
            "delta" in data &&
            typeof (data as { delta: unknown }).delta === "string"
              ? (data as { delta: string }).delta
              : "";
          if (delta) {
            accumulated += delta;
            onDelta?.(delta, accumulated);
          }
        } else if (parsed.event === "done") {
          const reply =
            typeof data === "object" &&
            data !== null &&
            "reply" in data &&
            typeof (data as { reply: unknown }).reply === "string"
              ? (data as { reply: string }).reply.trim()
              : accumulated.trim();
          doneReply = reply;
        } else if (parsed.event === "error") {
          streamError =
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
              ? (data as { error: string }).error
              : "對話服務暫時失敗，請稍後再試。";
        }
      }
    }
  } catch {
    return {
      ok: false,
      error: "對話服務暫時失敗，請稍後再試。",
      status: 502,
    };
  }

  if (doneReply) {
    return { ok: true, reply: doneReply, transport: "stream" };
  }
  if (streamError) {
    return { ok: false, error: streamError, status: 502 };
  }
  return {
    ok: false,
    error: "沒有收到模型回覆，請再試一次。",
    status: 502,
  };
}

async function fetchBuffered(
  body: unknown,
  transport: "buffered" | "buffered_fallback",
): Promise<TutorChatClientResult> {
  try {
    const res = await postTutorChat(
      body,
      transport === "buffered_fallback" || transport === "buffered"
        ? "buffered"
        : undefined,
    );
    // When flags are off, post without transport header (true buffered default).
    const parsed = await parseBufferedResponse(res);
    if (!res.ok) {
      return {
        ok: false,
        error: parsed.error ?? `對話服務暫時不可用（${res.status}）。`,
        status: res.status,
      };
    }
    if (!parsed.reply) {
      return {
        ok: false,
        error: parsed.error ?? "沒有收到模型回覆，請再試一次。",
        status: res.status || 502,
      };
    }
    return { ok: true, reply: parsed.reply, transport };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "網路連線異常，請稍後再試。",
      status: 0,
    };
  }
}

/**
 * POST /api/tutor-chat with optional streaming.
 * Streaming attempt only when NEXT_PUBLIC_CHAT_STREAMING=true.
 * If streaming fails before `done`, retries buffered JSON automatically.
 */
export async function fetchTutorChat(
  body: unknown,
  options: FetchTutorChatOptions = {},
): Promise<TutorChatClientResult> {
  if (!isClientChatStreamingEnabled()) {
    try {
      const res = await postTutorChat(body);
      const parsed = await parseBufferedResponse(res);
      if (!res.ok) {
        return {
          ok: false,
          error: parsed.error ?? `對話服務暫時不可用（${res.status}）。`,
          status: res.status,
        };
      }
      if (!parsed.reply) {
        return {
          ok: false,
          error: parsed.error ?? "沒有收到模型回覆，請再試一次。",
          status: res.status || 502,
        };
      }
      return { ok: true, reply: parsed.reply, transport: "buffered" };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "網路連線異常，請稍後再試。",
        status: 0,
      };
    }
  }

  // Client streaming flag on — try SSE; server may still return JSON if its flag is off.
  try {
    const res = await postTutorChat(body);
    const contentType = res.headers.get("content-type") ?? "";

    if (!res.ok) {
      const parsed = await parseBufferedResponse(res);
      return {
        ok: false,
        error: parsed.error ?? `對話服務暫時不可用（${res.status}）。`,
        status: res.status,
      };
    }

    if (contentType.includes("application/json")) {
      const parsed = await parseBufferedResponse(res);
      if (!parsed.reply) {
        return {
          ok: false,
          error: parsed.error ?? "沒有收到模型回覆，請再試一次。",
          status: res.status || 502,
        };
      }
      return { ok: true, reply: parsed.reply, transport: "buffered" };
    }

    if (contentType.includes("text/event-stream")) {
      const streamed = await consumeAppSse(res, options.onDelta);
      if (streamed.ok) return streamed;
      // Automatic fallback to buffered JSON (force server buffered path).
      return fetchBuffered(body, "buffered_fallback");
    }

    // Unexpected content type — treat as failure then fallback.
    return fetchBuffered(body, "buffered_fallback");
  } catch {
    return fetchBuffered(body, "buffered_fallback");
  }
}
