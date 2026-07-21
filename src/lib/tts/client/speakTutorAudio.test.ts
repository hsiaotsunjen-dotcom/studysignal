import { afterEach, describe, expect, it, vi } from "vitest";

import { teacherVoiceProfileIdForLanguage } from "@/lib/tts/client/teacherVoiceProfileForLanguage";

describe("teacherVoiceProfileIdForLanguage", () => {
  it("maps locales to stable Teacher Voice Catalog ids", () => {
    expect(teacherVoiceProfileIdForLanguage("en-US")).toBe("teacher_female_us");
    expect(teacherVoiceProfileIdForLanguage("en-GB")).toBe("teacher_female_uk");
    expect(teacherVoiceProfileIdForLanguage("zh-TW")).toBe("teacher_female_tw");
    expect(teacherVoiceProfileIdForLanguage(null)).toBe("teacher_female_tw");
  });
});

describe("speakTutorAudio", () => {
  afterEach(async () => {
    try {
      const mod = await import("@/lib/tts/client/speakTutorAudio");
      mod.cancelTutorAudio();
    } catch {
      /* ignore */
    }
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.restoreAllMocks();
  });

  function stubCloudAudioEnv(opts?: {
    fetchImpl?: typeof fetch;
  }) {
    const audioListeners: Record<string, Array<() => void>> = {};
    const playMock = vi.fn().mockResolvedValue(undefined);

    class FakeAudio {
      paused = true;
      onplaying: ((ev?: Event) => void) | null = null;
      onerror: ((ev?: Event) => void) | null = null;
      addEventListener(type: string, fn: () => void) {
        (audioListeners[type] ??= []).push(fn);
      }
      removeEventListener(type: string, fn: () => void) {
        audioListeners[type] = (audioListeners[type] ?? []).filter(
          (x) => x !== fn,
        );
      }
      play() {
        this.paused = false;
        queueMicrotask(() => {
          this.onplaying?.(new Event("playing"));
        });
        return playMock();
      }
      pause = vi.fn();
      removeAttribute = vi.fn();
      load = vi.fn();
    }

    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:tutor-test"),
      revokeObjectURL: vi.fn(),
    });

    if (opts?.fetchImpl) {
      vi.stubGlobal("fetch", opts.fetchImpl);
    }

    return { audioListeners, playMock };
  }

  it("plays cloud MP3 via HTMLAudioElement and logs playback meta", async () => {
    const headers = new Headers({
      "Content-Type": "audio/mpeg",
      "X-TTS-Provider": "openai",
      "X-TTS-Model": "tts-1",
      "X-TTS-Voice-Profile": "teacher_female_us",
      "X-TTS-Latency-Ms": "42",
      "X-TTS-Retry-Count": "0",
      "X-TTS-Fallback-Used": "0",
    });
    const audioBytes = new Uint8Array([1, 2, 3, 4]).buffer;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers,
      arrayBuffer: async () => audioBytes,
    });
    const { audioListeners } = stubCloudAudioEnv({ fetchImpl: fetchMock });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { speakTutorAudio } = await import("@/lib/tts/client/speakTutorAudio");

    const handle = speakTutorAudio({
      text: "Hello from Tutor",
      language: "en-US",
      purpose: "test",
    });

    await expect(handle.started).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tts",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.voiceProfile).toBe("teacher_female_us");
    expect(body.voiceProfile).not.toMatch(/nova|onyx|fable/i);

    expect(logSpy).toHaveBeenCalledWith(
      "[speakTutorAudio] Tutor speaking",
      expect.objectContaining({
        Provider: "openai",
        Model: "tts-1",
        VoiceProfile: "teacher_female_us",
        Latency: 42,
        RetryCount: 0,
        FallbackUsed: false,
        CacheHit: false,
        Source: "cloud",
      }),
    );

    for (const fn of audioListeners.ended ?? []) fn();
    const meta = await handle.done;
    expect(meta.source).toBe("cloud");
  });

  it("falls back to SpeechSynthesis when /api/tts fails", async () => {
    stubCloudAudioEnv({
      fetchImpl: vi.fn().mockRejectedValue(new Error("network down")),
    });

    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal("speechSynthesis", {
      speaking: false,
      paused: false,
      pending: false,
      cancel,
      speak,
      resume: vi.fn(),
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    class FakeUtterance {
      text: string;
      lang = "";
      onstart: ((ev?: Event) => void) | null = null;
      onend: ((ev?: Event) => void) | null = null;
      onerror: ((ev?: Event) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);

    speak.mockImplementation((u: FakeUtterance) => {
      queueMicrotask(() => {
        u.onstart?.(new Event("start"));
        queueMicrotask(() => u.onend?.(new Event("end")));
      });
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { speakTutorAudio } = await import("@/lib/tts/client/speakTutorAudio");

    const handle = speakTutorAudio("Fallback please", "en-US");
    await expect(handle.started).resolves.toBe(true);
    const meta = await handle.done;
    expect(meta.source).toBe("offline_fallback");
    expect(meta.fallbackUsed).toBe(true);
    expect(meta.provider).toBe("browser_speech_synthesis");
    expect(logSpy).toHaveBeenCalledWith(
      "[speakTutorAudio] Tutor speaking",
      expect.objectContaining({
        FallbackUsed: true,
        CacheHit: false,
        Source: "offline_fallback",
      }),
    );
  });

  it("abort stops in-flight request when student barges in", async () => {
    let rejectFetch!: (err: Error) => void;
    const fetchPromise = new Promise<Response>((_resolve, reject) => {
      rejectFetch = reject;
    });
    stubCloudAudioEnv({
      fetchImpl: vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            rejectFetch(new DOMException("Aborted", "AbortError"));
          });
        }
        return fetchPromise;
      }),
    });

    const { speakTutorAudio, cancelTutorAudio } = await import(
      "@/lib/tts/client/speakTutorAudio"
    );

    const handle = speakTutorAudio("Will be aborted", "en-US");
    // Allow fetch to attach abort listener, then barge-in.
    await Promise.resolve();
    cancelTutorAudio();
    await expect(handle.started).resolves.toBe(false);
    const meta = await handle.done;
    expect(meta.source).toBe("aborted");
  });
});
