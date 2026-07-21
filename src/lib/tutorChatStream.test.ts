import { describe, expect, it } from "vitest";

import {
  deltaFromOpenAiChatChunk,
  encodeTutorChatSse,
  isTutorChatStreamingEnvEnabled,
  shouldUseTutorChatStreaming,
} from "@/lib/tutorChatStream";
import {
  TUTOR_CHAT_TRANSPORT_BUFFERED,
  TUTOR_CHAT_TRANSPORT_HEADER,
} from "@/lib/tutorChatTransport";

describe("tutorChatStream helpers", () => {
  it("encodes app-level SSE events", () => {
    expect(encodeTutorChatSse("token", { delta: "Hi" })).toBe(
      'event: token\ndata: {"delta":"Hi"}\n\n',
    );
    expect(encodeTutorChatSse("done", { reply: "Hello" })).toBe(
      'event: done\ndata: {"reply":"Hello"}\n\n',
    );
  });

  it("extracts OpenAI chat chunk deltas", () => {
    expect(
      deltaFromOpenAiChatChunk({
        choices: [{ delta: { content: "Hel" } }],
      }),
    ).toBe("Hel");
    expect(deltaFromOpenAiChatChunk({ choices: [{ delta: {} }] })).toBe("");
    expect(deltaFromOpenAiChatChunk(null)).toBe("");
  });

  it("enables streaming only when ENABLE_STREAMING_CHAT=true", () => {
    expect(isTutorChatStreamingEnvEnabled({} as NodeJS.ProcessEnv)).toBe(false);
    expect(
      isTutorChatStreamingEnvEnabled({
        ENABLE_STREAMING_CHAT: "true",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isTutorChatStreamingEnvEnabled({
        ENABLE_STREAMING_CHAT: "false",
      } as unknown as NodeJS.ProcessEnv),
    ).toBe(false);
  });

  it("disables streaming when client forces buffered transport", () => {
    const env = {
      ENABLE_STREAMING_CHAT: "true",
    } as unknown as NodeJS.ProcessEnv;
    const streamReq = new Request("https://example.test/api/tutor-chat", {
      method: "POST",
    });
    expect(shouldUseTutorChatStreaming(streamReq, env)).toBe(true);

    const bufferedReq = new Request("https://example.test/api/tutor-chat", {
      method: "POST",
      headers: {
        [TUTOR_CHAT_TRANSPORT_HEADER]: TUTOR_CHAT_TRANSPORT_BUFFERED,
      },
    });
    expect(shouldUseTutorChatStreaming(bufferedReq, env)).toBe(false);
  });
});
