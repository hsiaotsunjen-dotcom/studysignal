"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AnalyzeFeedbackPanel } from "@/components/AnalyzeFeedbackPanel";
import type { AnalyzeFeedback } from "@/lib/analyzeFeedback";
import { parseAnalyzeApiData } from "@/lib/analyzeFeedback";

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

const SPEECH_LANG_OPTIONS = [
  { value: "en-US" as const, label: "American English", flag: "🇺🇸" },
  { value: "en-GB" as const, label: "British English", flag: "🇬🇧" },
] as const;

type SpeechRecognitionLang = (typeof SPEECH_LANG_OPTIONS)[number]["value"];

function formatLogLine(message: string) {
  const t = new Date().toISOString();
  return `[${t}] ${message}`;
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export function SpeechTestClient() {
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [uiStatus, setUiStatus] = useState<UiStatus>("idle");
  const [apiSupported, setApiSupported] = useState<boolean | null>(null);
  const [recognitionCreated, setRecognitionCreated] = useState<boolean | null>(
    null
  );
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] =
    useState<SpeechRecognitionLang>("en-US");
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const finalAccumRef = useRef("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeFeedback | null>(
    null
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  type RecordUiStatus = "idle" | "recording" | "done";
  const [recordStatus, setRecordStatus] = useState<RecordUiStatus>("idle");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordDurationSec, setRecordDurationSec] = useState<number | null>(
    null
  );

  const mediaSessionGenRef = useRef(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordStartMsRef = useRef<number | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

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
      mediaSessionGenRef.current += 1;
      const mr = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
      const stream = audioStreamRef.current;
      audioStreamRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      recordedChunksRef.current = [];
      playbackAudioRef.current?.pause();
      playbackAudioRef.current = null;
    };
  }, []);

  const stopMediaHard = useCallback(() => {
    mediaSessionGenRef.current += 1;
    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    const stream = audioStreamRef.current;
    audioStreamRef.current = null;
    stream?.getTracks().forEach((t) => t.stop());
    recordedChunksRef.current = [];
    recordStartMsRef.current = null;
  }, []);

  const startListening = async () => {
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

    stopMediaHard();
    setRecordedBlob(null);
    setRecordDurationSec(null);
    setRecordStatus("idle");

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
    rec.lang = selectedLanguage;

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

    const stopMediaRecorderOnly = () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        try {
          mr.stop();
        } catch {
          /* ignore */
        }
      }
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
      stopMediaRecorderOnly();
      setUiStatus("error");
      setRecognitionCreated((c) => (c === null ? false : c));
      pushLog(
        `Recognition reported error "${code}". See browser docs for meaning.`
      );
    };

    rec.onend = () => {
      if (recognitionRef.current !== rec) {
        return;
      }
      pushLog("onend: recognition session ended.");
      recognitionRef.current = null;
      setInterimText("");
      setUiStatus((s) => (s === "listening" ? "idle" : s));
      stopMediaRecorderOnly();
    };

    let stream: MediaStream | null = null;
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        pushLog(`getUserMedia（錄音）失敗：${String(e)}`);
        stream = null;
      }
    } else {
      pushLog("此瀏覽器不支援 getUserMedia，略過錄音。");
    }

    const sessionGen = mediaSessionGenRef.current;

    if (stream) {
      audioStreamRef.current = stream;
      recordedChunksRef.current = [];
      const mime = pickRecorderMimeType();
      let mr: MediaRecorder;
      try {
        mr = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
      } catch (e) {
        pushLog(`MediaRecorder 建立失敗：${String(e)}`);
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        recognitionRef.current = rec;
        try {
          pushLog("Calling recognition.start()…");
          rec.start();
        } catch (err) {
          setRecognitionCreated(false);
          setUiStatus("error");
          pushLog(`recognition.start() threw: ${String(err)}`);
          recognitionRef.current = null;
        }
        return;
      }

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      mr.onstop = () => {
        if (sessionGen !== mediaSessionGenRef.current) {
          return;
        }
        const chunks = recordedChunksRef.current.slice();
        recordedChunksRef.current = [];
        const s = audioStreamRef.current;
        audioStreamRef.current = null;
        s?.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current = null;
        const blob = new Blob(chunks, {
          type: mr.mimeType && mr.mimeType !== "" ? mr.mimeType : "audio/webm",
        });
        setRecordedBlob(blob);
        const startMs = recordStartMsRef.current;
        recordStartMsRef.current = null;
        if (startMs != null) {
          setRecordDurationSec(
            Math.round((Math.max(0, Date.now() - startMs) / 1000) * 10) / 10
          );
        } else {
          setRecordDurationSec(0);
        }
        setRecordStatus("done");
      };

      mediaRecorderRef.current = mr;
      try {
        mr.start();
        recordStartMsRef.current = Date.now();
        setRecordStatus("recording");
        pushLog("MediaRecorder started.");
      } catch (e) {
        pushLog(`MediaRecorder.start() 失敗：${String(e)}`);
        mediaSessionGenRef.current += 1;
        mediaRecorderRef.current = null;
        stream.getTracks().forEach((t) => t.stop());
        audioStreamRef.current = null;
        recordedChunksRef.current = [];
        setRecordStatus("idle");
      }
    }

    recognitionRef.current = rec;
    try {
      pushLog("Calling recognition.start()…");
      rec.start();
    } catch (e) {
      setRecognitionCreated(false);
      setUiStatus("error");
      pushLog(`recognition.start() threw: ${String(e)}`);
      recognitionRef.current = null;
      stopMediaRecorderOnly();
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
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch (e) {
        pushLog(`MediaRecorder.stop() threw: ${String(e)}`);
      }
    }
  };

  const playRecording = () => {
    if (!recordedBlob) {
      pushLog("播放錄音：沒有可播放的錄音檔。");
      return;
    }
    playbackAudioRef.current?.pause();
    const url = URL.createObjectURL(recordedBlob);
    const audio = new Audio(url);
    playbackAudioRef.current = audio;
    audio.addEventListener("ended", () => {
      URL.revokeObjectURL(url);
      if (playbackAudioRef.current === audio) {
        playbackAudioRef.current = null;
      }
    });
    void audio.play().catch((e) => {
      pushLog(`播放錄音失敗：${String(e)}`);
      URL.revokeObjectURL(url);
    });
    pushLog("播放錄音。");
  };

  const deleteRecording = () => {
    playbackAudioRef.current?.pause();
    playbackAudioRef.current = null;
    mediaSessionGenRef.current += 1;
    const mr = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch {
        /* ignore */
      }
    }
    const stream = audioStreamRef.current;
    audioStreamRef.current = null;
    stream?.getTracks().forEach((t) => t.stop());
    recordedChunksRef.current = [];
    setRecordedBlob(null);
    setRecordDurationSec(null);
    setRecordStatus("idle");
    pushLog("刪除錄音（已清除目前錄音資料）。");
  };

  const runAnalyze = async () => {
    setAnalyzeError(null);
    setAnalyzeResult(null);
    if (!finalText.trim()) {
      setAnalyzeError("還沒有可分析的英文，請先按「開始聆聽」說幾句話。");
      return;
    }
    setAnalyzeLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: finalText }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      const errMsg =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : null;
      if (!res.ok) {
        setAnalyzeError(errMsg ?? `分析失敗（錯誤代碼 ${res.status}）。`);
        return;
      }
      const parsed = parseAnalyzeApiData(data);
      if (!parsed) {
        setAnalyzeError("分析結果不完整，請再試一次。");
        return;
      }
      setAnalyzeResult(parsed);
    } catch (e) {
      setAnalyzeError(
        e instanceof Error ? e.message : "網路連線異常，請稍後再試。"
      );
    } finally {
      setAnalyzeLoading(false);
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
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Selected language</dt>
          <dd className="text-right font-medium text-zinc-100">
            {SPEECH_LANG_OPTIONS.find((o) => o.value === selectedLanguage)
              ?.flag}{" "}
            {
              SPEECH_LANG_OPTIONS.find((o) => o.value === selectedLanguage)
                ?.label
            }{" "}
            <span className="tabular-nums text-zinc-400">
              ({selectedLanguage})
            </span>
          </dd>
        </div>
      </dl>

      <div
        className="flex flex-col gap-2"
        role="radiogroup"
        aria-label="Recognition language"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Language
        </span>
        <div className="flex flex-wrap gap-2">
          {SPEECH_LANG_OPTIONS.map((opt) => {
            const selected = selectedLanguage === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedLanguage(opt.value)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors touch-manipulation ${
                  selected
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/30"
                    : "border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                {opt.flag} {opt.label}{" "}
                <span className="tabular-nums text-zinc-500">({opt.value})</span>
              </button>
            );
          })}
        </div>
      </div>

      <section
        aria-label="錄音測試"
        className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm"
      >
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
          錄音測試（MediaRecorder）
        </h2>
        <dl className="grid gap-2">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">【錄音狀態】</dt>
            <dd className="font-medium text-zinc-100">
              {recordStatus === "idle" && "未錄音"}
              {recordStatus === "recording" && "錄音中"}
              {recordStatus === "done" && "錄音完成"}
            </dd>
          </div>
          {recordStatus === "done" && recordDurationSec != null ? (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">錄音長度</dt>
              <dd className="tabular-nums font-medium text-zinc-100">
                {recordDurationSec} 秒
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={playRecording}
            disabled={recordStatus !== "done" || !recordedBlob}
            className="rounded-full border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-medium text-sky-100 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            播放錄音
          </button>
          <button
            type="button"
            onClick={deleteRecording}
            disabled={recordStatus === "idle" && !recordedBlob}
            className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            刪除錄音
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void startListening()}
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
        <button
          type="button"
          onClick={() => void runAnalyze()}
          disabled={analyzeLoading}
          className="mt-3 w-full rounded-2xl border border-violet-500/40 bg-violet-500/15 px-4 py-3 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          分析
        </button>
        {analyzeLoading ? (
          <p className="mt-3 text-sm text-zinc-400" aria-live="polite">
            分析中…
          </p>
        ) : null}
        {analyzeError ? (
          <p className="mt-3 text-sm text-amber-400" role="alert">
            {analyzeError}
          </p>
        ) : null}
        {analyzeResult !== null && !analyzeLoading ? (
          <AnalyzeFeedbackPanel
            result={analyzeResult}
            className="mt-3"
            dictationVoiceLang={selectedLanguage}
          />
        ) : null}
      </section>
    </div>
  );
}
