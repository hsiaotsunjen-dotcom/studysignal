/**
 * Server helpers for /api/tutor-chat app-level SSE (OpenAI Chat Completions stream).
 * Does not expose raw OpenAI SSE to the browser.
 */

import {
  TUTOR_CHAT_TRANSPORT_BUFFERED,
  TUTOR_CHAT_TRANSPORT_HEADER,
} from "@/lib/tutorChatTransport";

export {
  TUTOR_CHAT_TRANSPORT_BUFFERED,
  TUTOR_CHAT_TRANSPORT_HEADER,
} from "@/lib/tutorChatTransport";

export function isTutorChatStreamingEnvEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.ENABLE_STREAMING_CHAT === "true";
}

/** Streaming only when ENABLE_STREAMING_CHAT=true and client did not force buffered. */
export function shouldUseTutorChatStreaming(
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const forceBuffered =
    request.headers.get(TUTOR_CHAT_TRANSPORT_HEADER)?.trim().toLowerCase() ===
    TUTOR_CHAT_TRANSPORT_BUFFERED;
  return isTutorChatStreamingEnvEnabled(env) && !forceBuffered;
}

export function encodeTutorChatSse(
  event: "token" | "done" | "error",
  data: unknown,
): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Extract text delta from one OpenAI chat.completion.chunk JSON object. */
export function deltaFromOpenAiChatChunk(parsed: unknown): string {
  if (!parsed || typeof parsed !== "object") return "";
  const choices = (parsed as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const delta = (choices[0] as { delta?: { content?: unknown } })?.delta;
  const content = delta?.content;
  return typeof content === "string" ? content : "";
}

/**
 * Parse OpenAI SSE byte stream → app-level SSE (token / done / error).
 * Calls onComplete once with the trimmed full reply before emitting `done`.
 */
export function createTutorChatAppSseResponse(options: {
  openaiRes: Response;
  onComplete: (reply: string) => void;
}): Response {
  const encoder = new TextEncoder();
  const openaiBody = options.openaiRes.body;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (event: "token" | "done" | "error", data: unknown) => {
        controller.enqueue(encoder.encode(encodeTutorChatSse(event, data)));
      };

      if (!openaiBody) {
        enqueue("error", {
          error: "對話服務暫時失敗，請稍後再試。",
          detail: "OpenAI response body missing",
        });
        controller.close();
        return;
      }

      const reader = openaiBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let sawDone = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf("\n")) >= 0) {
            let line = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trimStart();
            if (!payload) continue;
            if (payload === "[DONE]") {
              sawDone = true;
              continue;
            }
            let parsed: unknown;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue;
            }
            const delta = deltaFromOpenAiChatChunk(parsed);
            if (delta) {
              full += delta;
              enqueue("token", { delta });
            }
          }
        }

        const reply = full.trim();
        if (!reply) {
          enqueue("error", {
            error: "沒有收到模型回覆，請再試一次。",
            detail: sawDone ? "empty_completion" : "stream_ended_without_content",
          });
        } else {
          options.onComplete(reply);
          enqueue("done", { reply });
        }
      } catch (error) {
        console.error("[tutor-chat] OpenAI stream failed", error);
        enqueue("error", {
          error: "對話服務暫時失敗，請稍後再試。",
          detail: error instanceof Error ? error.message : String(error),
        });
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
