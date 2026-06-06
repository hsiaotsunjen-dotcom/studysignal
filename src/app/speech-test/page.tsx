"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface WebSpeechResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface WebSpeechResultList {
  readonly length: number;
  [index: number]: WebSpeechResult;
}

interface WebSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: WebSpeechResultList;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: WebSpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: WebSpeechRecognition, ev: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((this: WebSpeechRecognition, ev: Event & { readonly error?: string }) => void) | null;
  onend: ((this: WebSpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
}

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

function getSpeechRecognitionConstructor(): WebSpeechRecognitionCtor | null {
  // Do not use `typeof window === "undefined"` here: Next's server bundle can
  // treat that as always-true at compile time, fold this helper to `() => null`,
  // DCE the rest of `startListening`, and break the client chunk graph (MODULE_NOT_FOUND).
  if (typeof globalThis === "undefined") return null;
  const g = globalThis as unknown as {
    SpeechRecognition?: WebSpeechRecognitionCtor;
    webkitSpeechRecognition?: WebSpeechRecognitionCtor;
    window?: {
      SpeechRecognition?: WebSpeechRecognitionCtor;
      webkitSpeechRecognition?: WebSpeechRecognitionCtor;
    };
  };
  const w = g.window ?? g;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type UiStatus = "idle" | "listening" | "error";

function formatLogLine(message: string) {
  const t = new Date().toISOString();
  return `[${t}] ${message}`;
}

export default function SpeechTestPage() {
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [apiSupported, setApiSupported] = useState<boolean | null>(null);
  const [recognitionCreated, setRecognitionCreated] = useState<boolean | null>(
    null
  );
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const finalAccumRef = useRef("");

  const pushLog = useCallback((message: string) => {
    setErrorLog((prev) => [...prev, formatLogLine(message)]);
  }, []);

  useEffect(() => {
    const Ctor = getSpeechRecognitionConstructor();
    setApiSupported(Ctor !== null);
    if (!Ctor) {
      pushLog(
        "Neither window.SpeechRecognition nor window.webkitSpeechRecognition is available."
      );
    }
  }, [pushLog]);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = () => {
    pushLog("Start Listening clicked.");

    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setRecognitionCreated(false);
      setUiStatus("error");
      pushLog(
        "Cannot create recognition: no SpeechRecognition / webkitSpeechRecognition constructor."
      );
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        pushLog(`Stopping previous instance failed: ${String(e)}`);
      }
      recognitionRef.current = null;
    }

    setInterimText("");
    finalAccumRef.current = "";
    setFinalText("");
    setUiStatus("idle");

    let rec: WebSpeechRecognition;
    try {
      rec = new Ctor();
      setRecognitionCreated(true);
    } catch (e) {
      setRecognitionCreated(false);
      setUiStatus("error");
      pushLog(`new SpeechRecognition() threw: ${String(e)}`);
      return;
    }

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      pushLog("onstart: recognition session started.");
      setUiStatus("listening");
    };

    rec.onresult = (event: WebSpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) {
          finalAccumRef.current += t;
        } else {
          interim += t;
        }
      }
      setFinalText(finalAccumRef.current);
      setInterimText(interim);
    };

    rec.onerror = (event) => {
      const code =
        "error" in event &&
        typeof (event as { error?: string }).error === "string"
          ? (event as { error: string }).error
          : "unknown";
      pushLog(`onerror: ${code} (${event.type})`);
      if (code === "aborted") {
        pushLog("(aborted is usually normal after stop() or a new start.)");
        return;
      }
      setUiStatus("error");
      setRecognitionCreated((c) => (c === null ? false : c));
      pushLog(
        `Recognition reported error "${code}". See browser docs for meaning.`
      );
    };

    rec.onend = () => {
      pushLog("onend: recognition session ended.");
      recognitionRef.current = null;
      setInterimText("");
      setUiStatus((s) => (s === "listening" ? "idle" : s));
    };

    recognitionRef.current = rec;
    try {
      pushLog("Calling recognition.start()…");
      rec.start();
    } catch (e) {
      setRecognitionCreated(false);
      setUiStatus("error");
      pushLog(`recognition.start() threw: ${String(e)}`);
      recognitionRef.current = null;
    }
  };

  const stopListening = () => {
    pushLog("Stop Listening clicked.");
    const rec = recognitionRef.current;
    if (!rec) {
      pushLog("Stop: no active recognition instance.");
      setUiStatus("idle");
      return;
    }
    try {
      rec.stop();
    } catch (e) {
      pushLog(`recognition.stop() threw: ${String(e)}`);
      recognitionRef.current = null;
      setUiStatus("error");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 bg-zinc-950 px-4 py-10 text-zinc-100">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Speech test</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Uses <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">SpeechRecognition</code>{" "}
          or <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">webkitSpeechRecognition</code>.
        </p>
      </header>

      <dl className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Browser supported</dt>
          <dd className="font-medium tabular-nums text-zinc-100">
            {apiSupported === null ? "…" : apiSupported ? "Yes" : "No"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Recognition object created</dt>
          <dd className="font-medium tabular-nums text-zinc-100">
            {recognitionCreated === null
              ? "—"
              : recognitionCreated
                ? "Yes"
                : "No"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Status</dt>
          <dd
            className={`font-medium capitalize ${
              uiStatus === "listening"
                ? "text-violet-400"
                : uiStatus === "error"
                  ? "text-amber-400"
                  : "text-zinc-300"
            }`}
          >
            {uiStatus === "idle" && "Idle"}
            {uiStatus === "listening" && "Listening"}
            {uiStatus === "error" && "Error"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startListening}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 shadow hover:opacity-90"
        >
          Start Listening
        </button>
        <button
          type="button"
          onClick={stopListening}
          className="rounded-full border border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
        >
          Stop Listening
        </button>
      </div>

      <section aria-label="Event log" className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Log (all errors & events)
        </h2>
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-zinc-800 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
          {errorLog.length === 0
            ? "No log lines yet. Press Start Listening."
            : errorLog.join("\n")}
        </pre>
      </section>

      <section aria-label="Recognized speech" className="flex-1">
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          Recognized text
        </h2>
        <div className="min-h-[120px] rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-[15px] leading-relaxed text-zinc-100">
          {finalText}
          <span className="text-zinc-500">{interimText}</span>
        </div>
      </section>
    </div>
  );
}
