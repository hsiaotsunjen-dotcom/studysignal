"use client";

import { useCallback, useState } from "react";
import X from "lucide-react/dist/esm/icons/x.js";

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

  const openModal = useCallback(() => {
    setEnv(readMicEnvSnapshot());
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

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
  };
}
