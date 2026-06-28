"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

/** Dev-only Secure Context diagnostic overlay. */
export const SECURE_CONTEXT_MIC_DIAG_ENABLED =
  process.env.NODE_ENV === "development";

const POSITION_STORAGE_KEY = "studysignal:sec-ctx-diag-pos";
const COLLAPSED_STORAGE_KEY = "studysignal:sec-ctx-diag-collapsed";
const PANEL_MARGIN_PX = 12;
const PANEL_EST_WIDTH_PX = 320;
const PANEL_EST_HEIGHT_PX = 240;

export type SecureContextMicDiagHandle = {
  probeOnTalkPress: () => void;
};

export type SecureContextMicEnv = {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  locationHref: string;
};

export type TalkMicProbeState =
  | { status: "idle"; message: string }
  | { status: "pending"; message: string }
  | { status: "skipped"; message: string; reason: string }
  | { status: "ok"; message: string }
  | { status: "error"; message: string; errorName: string; errorMessage: string };

type PanelPosition = { x: number; y: number };

const EMPTY_ENV: SecureContextMicEnv = {
  isSecureContext: false,
  hasMediaDevices: false,
  hasGetUserMedia: false,
  locationHref: "",
};

function readSecureContextMicEnv(): SecureContextMicEnv {
  return {
    isSecureContext:
      typeof window !== "undefined" ? window.isSecureContext : false,
    hasMediaDevices:
      typeof navigator !== "undefined" && navigator.mediaDevices != null,
    hasGetUserMedia:
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function",
    locationHref: typeof location !== "undefined" ? location.href : "",
  };
}

function describeSkipReason(env: SecureContextMicEnv): string {
  if (!env.hasMediaDevices) {
    return env.isSecureContext
      ? "navigator.mediaDevices 不存在（非 Secure Context 以外的原因）"
      : "navigator.mediaDevices 不存在（常見於非 Secure Context）";
  }
  if (!env.hasGetUserMedia) {
    return "getUserMedia 不是 function";
  }
  return "unknown";
}

function readErrorFields(err: unknown): { errorName: string; errorMessage: string } {
  if (err && typeof err === "object") {
    const rec = err as { name?: unknown; message?: unknown };
    return {
      errorName:
        typeof rec.name === "string" && rec.name.length > 0 ? rec.name : "unknown",
      errorMessage:
        typeof rec.message === "string" && rec.message.length > 0
          ? rec.message
          : String(err),
    };
  }
  return { errorName: "unknown", errorMessage: String(err) };
}

function logSecureContextMicDiag(
  phase: string,
  payload: Record<string, unknown>,
): void {
  console.warn("[SEC_CTX_MIC_DIAG]", phase, payload);
}

function yesNo(value: boolean): string {
  return value ? "是" : "否";
}

function readCollapsedState(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function storeCollapsedState(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function readStoredPosition(): PanelPosition | null {
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

function storePosition(pos: PanelPosition): void {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore quota / private mode */
  }
}

function clampPosition(
  pos: PanelPosition,
  panelWidth: number,
  panelHeight: number,
): PanelPosition {
  const maxX = Math.max(
    PANEL_MARGIN_PX,
    window.innerWidth - panelWidth - PANEL_MARGIN_PX,
  );
  const maxY = Math.max(
    PANEL_MARGIN_PX,
    window.innerHeight - panelHeight - PANEL_MARGIN_PX,
  );
  return {
    x: Math.round(Math.min(maxX, Math.max(PANEL_MARGIN_PX, pos.x))),
    y: Math.round(Math.min(maxY, Math.max(PANEL_MARGIN_PX, pos.y))),
  };
}

function defaultTopRightPosition(
  panelWidth: number,
  panelHeight: number,
): PanelPosition {
  return clampPosition(
    {
      x: window.innerWidth - panelWidth - PANEL_MARGIN_PX,
      y: PANEL_MARGIN_PX,
    },
    panelWidth,
    panelHeight,
  );
}

function isPositionWithinViewport(
  pos: PanelPosition,
  panelWidth: number,
  panelHeight: number,
): boolean {
  const maxX = window.innerWidth - panelWidth - PANEL_MARGIN_PX;
  const maxY = window.innerHeight - panelHeight - PANEL_MARGIN_PX;
  if (maxX < PANEL_MARGIN_PX || maxY < PANEL_MARGIN_PX) {
    return pos.x === PANEL_MARGIN_PX && pos.y === PANEL_MARGIN_PX;
  }
  return (
    pos.x >= PANEL_MARGIN_PX &&
    pos.y >= PANEL_MARGIN_PX &&
    pos.x <= maxX &&
    pos.y <= maxY
  );
}

function resolvePanelPosition(
  candidate: PanelPosition | null,
  panelWidth: number,
  panelHeight: number,
): PanelPosition {
  const width = panelWidth > 0 ? panelWidth : PANEL_EST_WIDTH_PX;
  const height = panelHeight > 0 ? panelHeight : PANEL_EST_HEIGHT_PX;
  if (!candidate || !isPositionWithinViewport(candidate, width, height)) {
    const resolved = defaultTopRightPosition(width, height);
    storePosition(resolved);
    return resolved;
  }
  return clampPosition(candidate, width, height);
}

function useDraggablePanelPosition(panelRef: RefObject<HTMLDivElement | null>) {
  const [position, setPosition] = useState<PanelPosition>(() => {
    if (typeof window === "undefined") {
      return { x: PANEL_MARGIN_PX, y: PANEL_MARGIN_PX };
    }
    return resolvePanelPosition(
      readStoredPosition(),
      PANEL_EST_WIDTH_PX,
      PANEL_EST_HEIGHT_PX,
    );
  });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  const measurePanelSize = useCallback(() => {
    const el = panelRef.current;
    const width =
      el && el.offsetWidth > 0
        ? el.offsetWidth
        : Math.min(window.innerWidth - 24, PANEL_EST_WIDTH_PX);
    const height =
      el && el.offsetHeight > 0 ? el.offsetHeight : PANEL_EST_HEIGHT_PX;
    return { width, height };
  }, [panelRef]);

  const measureAndPlace = useCallback(() => {
    if (isDraggingRef.current) return;
    const { width, height } = measurePanelSize();
    setPosition((prev) => resolvePanelPosition(prev, width, height));
  }, [measurePanelSize]);

  useEffect(() => {
    measureAndPlace();
    const onResize = () => measureAndPlace();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureAndPlace]);

  useLayoutEffect(() => {
    measureAndPlace();
  }, [measureAndPlace]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const { width, height } = measurePanelSize();
      if (width <= 0 || height <= 0) return;
      setPosition(
        clampPosition(
          {
            x: drag.originX + (e.clientX - drag.startX),
            y: drag.originY + (e.clientY - drag.startY),
          },
          width,
          height,
        ),
      );
    };

    const finishDrag = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      dragRef.current = null;
      isDraggingRef.current = false;
      setPosition((prev) => {
        if (prev) storePosition(prev);
        return prev;
      });
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [measurePanelSize]);

  const onDragHandlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || !position) return;
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: position.x,
        originY: position.y,
      };
    },
    [position],
  );

  return { position, onDragHandlePointerDown };
}

function StudySignalSecureContextMicDiagPanel({
  env,
  talkProbe,
}: {
  env: SecureContextMicEnv;
  talkProbe: TalkMicProbeState;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { position, onDragHandlePointerDown } =
    useDraggablePanelPosition(panelRef);

  useEffect(() => {
    setPortalReady(true);
    setCollapsed(readCollapsedState());
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      storeCollapsedState(next);
      return next;
    });
  }, []);

  if (!portalReady) {
    return null;
  }

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[60] w-[min(calc(100vw-24px),20rem)] touch-manipulation"
      style={{ left: position.x, top: position.y }}
      aria-live="polite"
      aria-label="Secure Context 麥克風診斷"
    >
      {collapsed ? (
        <div
          className="flex cursor-grab touch-none items-center gap-2 overflow-hidden rounded-full border border-amber-500/40 bg-zinc-950/95 px-3 py-2 font-mono text-[11px] text-amber-100 shadow-lg backdrop-blur-sm active:cursor-grabbing"
          onPointerDown={onDragHandlePointerDown}
        >
          <span className="select-none text-xs" aria-hidden>
            ⠿
          </span>
          <span className="select-none font-semibold text-amber-300/90">
            🟢 Secure Context
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className="ml-1 rounded px-1.5 py-0.5 text-amber-200 hover:bg-amber-500/20"
            aria-label="展開 Secure Context 診斷"
          >
            +
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-amber-500/40 bg-zinc-950/95 font-mono text-[11px] leading-relaxed text-amber-100 shadow-lg backdrop-blur-sm">
          <div
            className="flex cursor-grab touch-none items-center gap-2 border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 active:cursor-grabbing"
            onPointerDown={onDragHandlePointerDown}
            role="toolbar"
            aria-label="拖曳 Secure Context 診斷視窗"
          >
            <span className="select-none text-xs" aria-hidden>
              ⠿
            </span>
            <p className="flex-1 select-none text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
              🟢 Secure Context
            </p>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed();
              }}
              className="rounded px-1.5 py-0.5 text-amber-200 hover:bg-amber-500/20"
              aria-label="縮小 Secure Context 診斷"
            >
              −
            </button>
          </div>

          <div className="px-3 py-2.5">
          <p>
            <span className="text-zinc-500">1. isSecureContext: </span>
            <span className={env.isSecureContext ? "text-emerald-300" : "text-red-300"}>
              {String(env.isSecureContext)}
            </span>
          </p>
          <p>
            <span className="text-zinc-500">2. mediaDevices 存在: </span>
            {yesNo(env.hasMediaDevices)}
          </p>
          <p>
            <span className="text-zinc-500">3. getUserMedia 存在: </span>
            {yesNo(env.hasGetUserMedia)}
          </p>
          <p className="mt-1.5 break-all text-zinc-400">{env.locationHref}</p>
          <div className="mt-2 border-t border-amber-500/20 pt-2">
            <p className="text-zinc-500">4. Talk 探測:</p>
            {talkProbe.status === "idle" || talkProbe.status === "pending" ? (
              <p className="text-zinc-300">{talkProbe.message}</p>
            ) : talkProbe.status === "skipped" ? (
              <>
                <p className="text-orange-300">{talkProbe.message}</p>
                <p className="text-orange-200/90">{talkProbe.reason}</p>
              </>
            ) : talkProbe.status === "ok" ? (
              <p className="text-emerald-300">{talkProbe.message}</p>
            ) : (
              <>
                <p className="text-red-300">{talkProbe.message}</p>
                <p className="text-red-200">errorName: {talkProbe.errorName}</p>
                <p className="break-all text-red-200/90">
                  errorMessage: {talkProbe.errorMessage}
                </p>
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

export const StudySignalSecureContextMicDiagHost = forwardRef<
  SecureContextMicDiagHandle,
  object
>(function StudySignalSecureContextMicDiagHost(_props, ref) {
  const [clientReady, setClientReady] = useState(false);
  const [env, setEnv] = useState<SecureContextMicEnv>(EMPTY_ENV);
  const [talkProbe, setTalkProbe] = useState<TalkMicProbeState>({
    status: "idle",
    message: "尚未按 Talk",
  });

  useEffect(() => {
    setEnv(readSecureContextMicEnv());
    setClientReady(true);
    logSecureContextMicDiag("client mounted env", readSecureContextMicEnv());
  }, []);

  const probeOnTalkPress = useCallback(async () => {
    const snap = readSecureContextMicEnv();
    setEnv(snap);
    logSecureContextMicDiag("Talk press env", { ...snap });

    setTalkProbe({ status: "pending", message: "探測中…" });

    if (!snap.hasGetUserMedia) {
      const reason = describeSkipReason(snap);
      const result: TalkMicProbeState = {
        status: "skipped",
        message: "getUserMedia 未被呼叫",
        reason,
      };
      setTalkProbe(result);
      logSecureContextMicDiag("getUserMedia NOT called", { ...snap, reason });
      return;
    }

    logSecureContextMicDiag("calling getUserMedia({ audio: true })", { ...snap });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      const result: TalkMicProbeState = {
        status: "ok",
        message: "getUserMedia 成功",
      };
      setTalkProbe(result);
      logSecureContextMicDiag("getUserMedia resolved", {
        trackCount: stream.getTracks().length,
      });
    } catch (err) {
      const { errorName, errorMessage } = readErrorFields(err);
      const result: TalkMicProbeState = {
        status: "error",
        message: "getUserMedia 拋出例外",
        errorName,
        errorMessage,
      };
      setTalkProbe(result);
      logSecureContextMicDiag("getUserMedia rejected", {
        errorName,
        errorMessage,
        error: err,
      });
    }
  }, []);

  useImperativeHandle(ref, () => ({ probeOnTalkPress }), [probeOnTalkPress]);

  if (!SECURE_CONTEXT_MIC_DIAG_ENABLED || !clientReady) {
    return null;
  }

  return (
    <StudySignalSecureContextMicDiagPanel env={env} talkProbe={talkProbe} />
  );
});

let secureContextMicTalkProbeHandler: (() => void) | null = null;

export function triggerSecureContextMicTalkProbe(): void {
  secureContextMicTalkProbeHandler?.();
}

export function StudySignalSecureContextMicDiagLoader() {
  const handleRef = useRef<SecureContextMicDiagHandle>(null);

  useEffect(() => {
    secureContextMicTalkProbeHandler = () => {
      handleRef.current?.probeOnTalkPress();
    };
    return () => {
      secureContextMicTalkProbeHandler = null;
    };
  }, []);

  if (!SECURE_CONTEXT_MIC_DIAG_ENABLED) {
    return null;
  }

  return <StudySignalSecureContextMicDiagHost ref={handleRef} />;
}
