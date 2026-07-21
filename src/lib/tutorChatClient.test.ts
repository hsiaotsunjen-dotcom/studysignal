import { afterEach, describe, expect, it, vi } from "vitest";

describe("fetchTutorChat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("uses buffered JSON when NEXT_PUBLIC_CHAT_STREAMING is off (default)", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAT_STREAMING", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reply: "Hello" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchTutorChat } = await import("@/lib/tutorChatClient");
    const result = await fetchTutorChat({
      messages: [
        { role: "system", content: "x" },
        { role: "user", content: "Say hello" },
      ],
    });

    expect(result).toEqual({
      ok: true,
      reply: "Hello",
      transport: "buffered",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("x-tutor-chat-transport")).toBeNull();
  });

  it("consumes app SSE tokens and returns done reply", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAT_STREAMING", "true");
    const sse =
      'event: token\ndata: {"delta":"Hel"}\n\n' +
      'event: token\ndata: {"delta":"lo"}\n\n' +
      'event: done\ndata: {"reply":"Hello"}\n\n';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sse, {
        status: 200,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const deltas: string[] = [];
    const { fetchTutorChat } = await import("@/lib/tutorChatClient");
    const result = await fetchTutorChat(
      { messages: [{ role: "system", content: "x" }, { role: "user", content: "hi" }] },
      {
        onDelta: (_d, acc) => {
          deltas.push(acc);
        },
      },
    );

    expect(result).toEqual({
      ok: true,
      reply: "Hello",
      transport: "stream",
    });
    expect(deltas).toEqual(["Hel", "Hello"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to buffered JSON when stream errors before done", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAT_STREAMING", "true");
    const sse =
      'event: token\ndata: {"delta":"partial"}\n\n' +
      'event: error\ndata: {"error":"stream broke"}\n\n';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(sse, {
          status: 200,
          headers: { "Content-Type": "text/event-stream; charset=utf-8" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ reply: "Full buffered reply" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchTutorChat } = await import("@/lib/tutorChatClient");
    const result = await fetchTutorChat({
      messages: [
        { role: "system", content: "x" },
        { role: "user", content: "hi" },
      ],
    });

    expect(result).toEqual({
      ok: true,
      reply: "Full buffered reply",
      transport: "buffered_fallback",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const fallbackInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const headers = new Headers(fallbackInit.headers);
    expect(headers.get("x-tutor-chat-transport")).toBe("buffered");
  });

  it("treats JSON response as buffered when server streaming is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAT_STREAMING", "true");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reply: "Server buffered" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { fetchTutorChat } = await import("@/lib/tutorChatClient");
    const result = await fetchTutorChat({
      messages: [
        { role: "system", content: "x" },
        { role: "user", content: "hi" },
      ],
    });

    expect(result).toEqual({
      ok: true,
      reply: "Server buffered",
      transport: "buffered",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
