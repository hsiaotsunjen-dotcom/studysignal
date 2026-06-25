"use client";

import { useCallback, useEffect, useState } from "react";
import X from "lucide-react/dist/esm/icons/x.js";

type SpeechVoiceRow = {
  name: string;
  lang: string;
  default: boolean;
};

export type SpeechSynthesisDiagSnapshot = {
  hasSpeechSynthesis: boolean;
  hasSpeechSynthesisUtterance: boolean;
  userAgent: string;
  visibilityState: string;
  immediateVoiceCount: number;
  voicesChangedReceived: boolean;
  voicesLengthAfterVoicesChanged: number | null;
  autoplayDiag: string;
  speakProbeBeforeCount: number;
  speakProbeOnStartCount: number | null;
  speakProbeAfterEndCount: number | null;
  voicesLoadedAfterSpeak: boolean;
  speakProbeNote: string;
};

function readAutoplayDiag(): string {
  if (typeof navigator === "undefined") return "N/A";
  const parts: string[] = [];
  const activation = navigator.userActivation;
  if (activation) {
    parts.push(`userActivation.isActive=${activation.isActive}`);
    if ("hasBeenActive" in activation) {
      parts.push(
        `hasBeenActive=${String((activation as { hasBeenActive?: boolean }).hasBeenActive)}`,
      );
    }
  } else {
    parts.push("userActivation=unsupported");
  }
  if (
    "getAutoplayPolicy" in navigator &&
    typeof navigator.getAutoplayPolicy === "function"
  ) {
    try {
      parts.push(
        `media-element=${navigator.getAutoplayPolicy("media-element")}`,
      );
      parts.push(
        `audiocontext=${navigator.getAutoplayPolicy("audiocontext")}`,
      );
      parts.push(`document=${navigator.getAutoplayPolicy("document")}`);
    } catch (err) {
      parts.push(`getAutoplayPolicy error: ${String(err)}`);
    }
  } else {
    parts.push("getAutoplayPolicy=unsupported");
  }
  return parts.join("; ");
}

function waitForVoicesChangedEvent(
  syn: SpeechSynthesis,
  timeoutMs: number,
): Promise<{ received: boolean; length: number | null }> {
  if (syn.getVoices().length > 0) {
    return Promise.resolve({ received: false, length: syn.getVoices().length });
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (received: boolean) => {
      if (settled) return;
      settled = true;
      syn.removeEventListener("voiceschanged", onChanged);
      resolve({
        received,
        length: received ? syn.getVoices().length : null,
      });
    };
    const onChanged = () => finish(true);
    syn.addEventListener("voiceschanged", onChanged);
    window.setTimeout(() => finish(false), timeoutMs);
  });
}

async function probeVoicesAfterSpeak(): Promise<{
  speakProbeBeforeCount: number;
  speakProbeOnStartCount: number | null;
  speakProbeAfterEndCount: number | null;
  voicesLoadedAfterSpeak: boolean;
  speakProbeNote: string;
}> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return {
      speakProbeBeforeCount: 0,
      speakProbeOnStartCount: null,
      speakProbeAfterEndCount: null,
      voicesLoadedAfterSpeak: false,
      speakProbeNote: "speechSynthesis 不可用",
    };
  }
  if (typeof SpeechSynthesisUtterance === "undefined") {
    return {
      speakProbeBeforeCount: window.speechSynthesis.getVoices().length,
      speakProbeOnStartCount: null,
      speakProbeAfterEndCount: null,
      voicesLoadedAfterSpeak: false,
      speakProbeNote: "SpeechSynthesisUtterance 不可用",
    };
  }

  const syn = window.speechSynthesis;
  syn.cancel();
  const speakProbeBeforeCount = syn.getVoices().length;

  return new Promise((resolve) => {
    let settled = false;
    let speakProbeOnStartCount: number | null = null;

    const finish = (note: string) => {
      if (settled) return;
      settled = true;
      const speakProbeAfterEndCount = syn.getVoices().length;
      resolve({
        speakProbeBeforeCount,
        speakProbeOnStartCount,
        speakProbeAfterEndCount,
        voicesLoadedAfterSpeak:
          speakProbeAfterEndCount > speakProbeBeforeCount ||
          (speakProbeOnStartCount != null &&
            speakProbeOnStartCount > speakProbeBeforeCount),
        speakProbeNote: note,
      });
    };

    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0.01;
    utterance.rate = 10;

    utterance.onstart = () => {
      speakProbeOnStartCount = syn.getVoices().length;
    };
    utterance.onend = () => {
      finish("speak onend");
    };
    utterance.onerror = (ev) => {
      finish(`speak onerror: ${ev.error ?? "unknown"}`);
    };

    window.setTimeout(() => {
      syn.cancel();
      finish("speak probe timeout (2s)");
    }, 2000);

    syn.speak(utterance);
  });
}

async function collectSpeechSynthesisDiagnostics(): Promise<SpeechSynthesisDiagSnapshot> {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "";
  const visibilityState =
    typeof document !== "undefined" ? document.visibilityState : "N/A";
  const hasSpeechSynthesis =
    typeof window !== "undefined" && window.speechSynthesis != null;
  const hasSpeechSynthesisUtterance =
    typeof SpeechSynthesisUtterance !== "undefined";
  const autoplayDiag = readAutoplayDiag();

  if (!hasSpeechSynthesis) {
    return {
      hasSpeechSynthesis: false,
      hasSpeechSynthesisUtterance,
      userAgent,
      visibilityState,
      immediateVoiceCount: 0,
      voicesChangedReceived: false,
      voicesLengthAfterVoicesChanged: null,
      autoplayDiag,
      speakProbeBeforeCount: 0,
      speakProbeOnStartCount: null,
      speakProbeAfterEndCount: null,
      voicesLoadedAfterSpeak: false,
      speakProbeNote: "略過（無 speechSynthesis）",
    };
  }

  const syn = window.speechSynthesis;
  const immediateVoiceCount = syn.getVoices().length;

  const [voicesChanged, speakProbe] = await Promise.all([
    waitForVoicesChangedEvent(syn, 5000),
    probeVoicesAfterSpeak(),
  ]);

  return {
    hasSpeechSynthesis: true,
    hasSpeechSynthesisUtterance,
    userAgent,
    visibilityState,
    immediateVoiceCount,
    voicesChangedReceived: voicesChanged.received,
    voicesLengthAfterVoicesChanged: voicesChanged.length,
    autoplayDiag,
    ...speakProbe,
  };
}

function whenSpeechVoicesReady(timeoutMs = 1500): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const syn = window.speechSynthesis;
  if (!syn) return Promise.resolve();
  if (syn.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      syn.removeEventListener("voiceschanged", done);
      resolve();
    };
    syn.addEventListener("voiceschanged", done);
    window.setTimeout(() => {
      syn.removeEventListener("voiceschanged", done);
      resolve();
    }, timeoutMs);
  });
}

async function readAllSpeechVoices(): Promise<{
  available: boolean;
  userAgent: string;
  voices: SpeechVoiceRow[];
  voiceCount: number;
}> {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { available: false, userAgent, voices: [], voiceCount: 0 };
  }
  await whenSpeechVoicesReady();
  const all = window.speechSynthesis.getVoices();
  const voices = all.map((v) => ({
    name: v.name,
    lang: v.lang,
    default: v.default,
  }));
  return { available: true, userAgent, voices, voiceCount: all.length };
}

type MicEnvSnapshot = {
  isSecureContext: boolean;
  userAgent: string;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  locationHref: string;
};

type MicProbeResult =
  | null
  | { state: "pending" }
  | { state: "ok" }
  | { state: "error"; name: string; message: string };

function readMicEnvSnapshot(): MicEnvSnapshot {
  return {
    isSecureContext:
      typeof window !== "undefined" ? window.isSecureContext : false,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    hasMediaDevices:
      typeof navigator !== "undefined" && navigator.mediaDevices != null,
    hasGetUserMedia:
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function",
    locationHref: typeof location !== "undefined" ? location.href : "",
  };
}

async function runMicProbe(): Promise<MicProbeResult> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return {
      state: "error",
      name: "APIUnavailable",
      message: "navigator.mediaDevices.getUserMedia 不存在",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { state: "ok" };
  } catch (err) {
    const domErr = err as DOMException;
    return {
      state: "error",
      name: domErr?.name ?? "Error",
      message: domErr?.message ?? String(err),
    };
  }
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-sm text-zinc-100">{value}</p>
    </div>
  );
}

export function StudySignalMicDebugDiagnosticsButton({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen()}
      className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 active:scale-[0.98] touch-manipulation"
      aria-label="開啟麥克風診斷"
    >
      診斷
    </button>
  );
}

export function StudySignalSpeechVoicesDebugButton({
  onOpen,
}: {
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen()}
      className="shrink-0 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/20 active:scale-[0.98] touch-manipulation"
      aria-label="列出 speechSynthesis voices"
    >
      Voices
    </button>
  );
}

export function StudySignalSpeechVoicesDebugModal({
  open,
  loading,
  available,
  userAgent,
  voiceCount,
  voices,
  speechDiag,
  speechDiagLoading,
  onClose,
  onRefresh,
}: {
  open: boolean;
  loading: boolean;
  available: boolean;
  userAgent: string;
  voiceCount: number;
  voices: SpeechVoiceRow[];
  speechDiag: SpeechSynthesisDiagSnapshot | null;
  speechDiagLoading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={() => onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="speech-voices-debug-title"
        className="flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-overlay shadow-dock ring-1 ring-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-4 py-3">
          <h2
            id="speech-voices-debug-title"
            className="text-base font-semibold text-white"
          >
            speechSynthesis Voices
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={loading}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/5 disabled:opacity-50 touch-manipulation"
            >
              重新整理
            </button>
            <button
              type="button"
              onClick={() => onClose()}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="關閉"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-sky-300/90">
              Android Chrome 診斷（getVoices）
            </p>
            {speechDiagLoading && !speechDiag ? (
              <p className="mt-2 text-sm text-zinc-400">診斷中…</p>
            ) : speechDiag ? (
              <div className="mt-2 flex flex-col gap-2">
                <EnvRow
                  label="1. window.speechSynthesis 是否存在"
                  value={speechDiag.hasSpeechSynthesis ? "是" : "否"}
                />
                <EnvRow
                  label="2. SpeechSynthesisUtterance 是否存在"
                  value={speechDiag.hasSpeechSynthesisUtterance ? "是" : "否"}
                />
                <EnvRow
                  label="3. navigator.userAgent"
                  value={speechDiag.userAgent || "—"}
                />
                <EnvRow
                  label="4. document.visibilityState"
                  value={speechDiag.visibilityState}
                />
                <EnvRow
                  label="5. getVoices().length（立即，不等待）"
                  value={String(speechDiag.immediateVoiceCount)}
                />
                <EnvRow
                  label="6. 是否收到 voiceschanged 事件（5s 內）"
                  value={speechDiag.voicesChangedReceived ? "是" : "否"}
                />
                <EnvRow
                  label="7. voiceschanged 後 getVoices().length"
                  value={
                    speechDiag.voicesLengthAfterVoicesChanged == null
                      ? "—（未觸發）"
                      : String(speechDiag.voicesLengthAfterVoicesChanged)
                  }
                />
                <EnvRow
                  label="8. Chrome autoplay 政策"
                  value={speechDiag.autoplayDiag}
                />
                <EnvRow
                  label="9. speak() 探測：speak 前 length"
                  value={String(speechDiag.speakProbeBeforeCount)}
                />
                <EnvRow
                  label="9. speak() 探測：onstart 時 length"
                  value={
                    speechDiag.speakProbeOnStartCount == null
                      ? "—"
                      : String(speechDiag.speakProbeOnStartCount)
                  }
                />
                <EnvRow
                  label="9. speak() 探測：結束後 length"
                  value={
                    speechDiag.speakProbeAfterEndCount == null
                      ? "—"
                      : String(speechDiag.speakProbeAfterEndCount)
                  }
                />
                <EnvRow
                  label="9. speak() 後才載入 voice？"
                  value={speechDiag.voicesLoadedAfterSpeak ? "是" : "否"}
                />
                <EnvRow
                  label="9. speak() 探測備註"
                  value={speechDiag.speakProbeNote}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">尚無診斷資料</p>
            )}
            {speechDiagLoading ? (
              <p className="mt-2 text-xs text-zinc-500">
                等待 voiceschanged / speak 探測…
              </p>
            ) : null}
          </div>

          <EnvRow label="navigator.userAgent" value={userAgent || "—"} />
          {!available ? (
            <p className="text-sm text-red-300">
              window.speechSynthesis 不可用（此裝置或來源可能不支援 TTS）。
            </p>
          ) : loading ? (
            <p className="text-sm text-zinc-400">載入 voices…</p>
          ) : (
            <>
              <EnvRow
                label="speechSynthesis.getVoices().length"
                value={String(voiceCount)}
              />
              {voiceCount === 0 ? (
                <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  getVoices() 回傳空陣列 []（length = 0）。請按「重新整理」或稍候
                  voiceschanged。
                </p>
              ) : null}
              <ul className="flex flex-col gap-2">
                {voices.map((voice, index) => (
                  <li
                    key={`${index}|${voice.name}|${voice.lang}|${voice.default}`}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-zinc-100"
                  >
                    <p>
                      <span className="text-zinc-500">name: </span>
                      {voice.name}
                    </p>
                    <p className="mt-1">
                      <span className="text-zinc-500">lang: </span>
                      {voice.lang}
                    </p>
                    <p className="mt-1">
                      <span className="text-zinc-500">default: </span>
                      {String(voice.default)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudySignalMicDebugModal({
  open,
  env,
  micProbe,
  onClose,
}: {
  open: boolean;
  env: MicEnvSnapshot | null;
  micProbe: MicProbeResult;
  onClose: () => void;
}) {
  if (!open || !env) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:items-center sm:p-6"
      role="presentation"
      onClick={() => onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mic-debug-title"
        className="flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-overlay shadow-dock ring-1 ring-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <h2
            id="mic-debug-title"
            className="text-base font-semibold text-white"
          >
            麥克風診斷
          </h2>
          <button
            type="button"
            onClick={() => onClose()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="關閉"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto px-4 py-4">
          <EnvRow
            label="window.isSecureContext"
            value={String(env.isSecureContext)}
          />
          <EnvRow label="navigator.userAgent" value={env.userAgent} />
          <EnvRow
            label="navigator.mediaDevices 是否存在"
            value={env.hasMediaDevices ? "是" : "否"}
          />
          <EnvRow
            label="navigator.mediaDevices.getUserMedia 是否存在"
            value={env.hasGetUserMedia ? "是" : "否"}
          />
          <EnvRow label="location.href" value={env.locationHref} />

          <div className="mt-2 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-violet-300/90">
              錄音按鈕探測結果
            </p>
            {micProbe == null ? (
              <p className="mt-2 text-sm text-zinc-400">尚未按下錄音按鈕</p>
            ) : micProbe.state === "pending" ? (
              <p className="mt-2 text-sm text-zinc-300">探測中…</p>
            ) : micProbe.state === "ok" ? (
              <p className="mt-2 font-mono text-lg font-semibold text-emerald-300">
                MIC_OK
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="font-mono text-base font-semibold text-red-300">
                  {micProbe.name}
                </p>
                <p className="break-all font-mono text-sm text-red-200/90">
                  {micProbe.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useStudySignalMicDebug() {
  const [open, setOpen] = useState(false);
  const [env, setEnv] = useState<MicEnvSnapshot | null>(null);
  const [micProbe, setMicProbe] = useState<MicProbeResult>(null);
  const [voicesOpen, setVoicesOpen] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [speechVoicesAvailable, setSpeechVoicesAvailable] = useState(true);
  const [voicesUserAgent, setVoicesUserAgent] = useState("");
  const [allVoices, setAllVoices] = useState<SpeechVoiceRow[]>([]);
  const [voiceCount, setVoiceCount] = useState(0);
  const [speechDiag, setSpeechDiag] = useState<SpeechSynthesisDiagSnapshot | null>(
    null,
  );
  const [speechDiagLoading, setSpeechDiagLoading] = useState(false);

  const runSpeechDiagnostics = useCallback(() => {
    setSpeechDiagLoading(true);
    void collectSpeechSynthesisDiagnostics()
      .then((snapshot) => {
        setSpeechDiag(snapshot);
      })
      .finally(() => {
        setSpeechDiagLoading(false);
      });
  }, []);

  const refreshSpeechVoices = useCallback(() => {
    setVoicesLoading(true);
    void readAllSpeechVoices()
      .then(({ available, userAgent, voices, voiceCount: count }) => {
        setSpeechVoicesAvailable(available);
        setVoicesUserAgent(userAgent);
        setAllVoices(voices);
        setVoiceCount(count);
      })
      .finally(() => {
        setVoicesLoading(false);
      });
  }, []);

  const openModal = useCallback(() => {
    setEnv(readMicEnvSnapshot());
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const openVoicesModal = useCallback(() => {
    setVoicesUserAgent(
      typeof navigator !== "undefined" ? navigator.userAgent : "",
    );
    setVoicesOpen(true);
    runSpeechDiagnostics();
    refreshSpeechVoices();
  }, [refreshSpeechVoices, runSpeechDiagnostics]);

  const refreshVoicesAndDiagnostics = useCallback(() => {
    runSpeechDiagnostics();
    refreshSpeechVoices();
  }, [runSpeechDiagnostics, refreshSpeechVoices]);

  const closeVoicesModal = useCallback(() => {
    setVoicesOpen(false);
  }, []);

  useEffect(() => {
    if (!voicesOpen || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    const syn = window.speechSynthesis;
    const onVoicesChanged = () => {
      refreshSpeechVoices();
    };
    syn.addEventListener("voiceschanged", onVoicesChanged);
    return () => {
      syn.removeEventListener("voiceschanged", onVoicesChanged);
    };
  }, [voicesOpen, refreshSpeechVoices]);

  const onRecordButtonPressed = useCallback(() => {
    setMicProbe({ state: "pending" });
    void runMicProbe()
      .then((result) => {
        setMicProbe(result);
      })
      .catch((err: unknown) => {
        setMicProbe({
          state: "error",
          name: "ProbeFailed",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }, []);

  return {
    open,
    env,
    micProbe,
    openModal,
    closeModal,
    onRecordButtonPressed,
    voicesOpen,
    voicesLoading,
    speechVoicesAvailable,
    voicesUserAgent,
    allVoices,
    voiceCount,
    speechDiag,
    speechDiagLoading,
    openVoicesModal,
    closeVoicesModal,
    refreshSpeechVoices: refreshVoicesAndDiagnostics,
  };
}
