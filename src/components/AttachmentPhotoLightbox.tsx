"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left.js";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right.js";
import X from "lucide-react/dist/esm/icons/x.js";
import ZoomIn from "lucide-react/dist/esm/icons/zoom-in.js";
import ZoomOut from "lucide-react/dist/esm/icons/zoom-out.js";

export type LightboxPhoto = {
  id: string;
  url: string;
  name: string;
};

type AttachmentPhotoLightboxProps = {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;
const TAP_MOVE_THRESHOLD_PX = 12;
const SWIPE_DISTANCE_PX = 56;

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

type PointerGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  maxDelta: number;
};

export function AttachmentPhotoLightbox({
  photos,
  index,
  onClose,
  onIndexChange,
}: AttachmentPhotoLightboxProps) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const gestureRef = useRef<PointerGesture | null>(null);
  const pinchRef = useRef<{
    startDistance: number;
    startScale: number;
  } | null>(null);
  const pinchGestureActiveRef = useRef(false);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetTransform();
  }, [index, resetTransform]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const goPrev = useCallback(() => {
    if (hasPrev) onIndexChange(index - 1);
  }, [hasPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasNext) onIndexChange(index + 1);
  }, [hasNext, index, onIndexChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") {
        goPrev();
        return;
      }
      if (event.key === "ArrowRight") {
        goNext();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        setScale((current) => clampScale(current + SCALE_STEP));
        return;
      }
      if (event.key === "-") {
        setScale((current) => {
          const next = clampScale(current - SCALE_STEP);
          if (next <= 1) setOffset({ x: 0, y: 0 });
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, onClose]);

  if (!photo) return null;

  const zoomBy = (delta: number) => {
    setScale((current) => {
      const next = clampScale(current + delta);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
  };

  const pointerDistance = (
    a: { clientX: number; clientY: number },
    b: { clientX: number; clientY: number },
  ) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchGestureActiveRef.current) return;

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      maxDelta: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    gesture.maxDelta = Math.max(gesture.maxDelta, Math.hypot(dx, dy));

    if (scale > 1 && gesture.maxDelta > TAP_MOVE_THRESHOLD_PX) {
      setOffset({
        x: gesture.originX + dx,
        y: gesture.originY + dy,
      });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    gestureRef.current = null;

    if (pinchGestureActiveRef.current) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const totalMove = Math.max(gesture.maxDelta, Math.hypot(dx, dy));

    if (totalMove < TAP_MOVE_THRESHOLD_PX) {
      onClose();
      return;
    }

    if (
      scale === MIN_SCALE &&
      photos.length > 1 &&
      Math.abs(dx) > SWIPE_DISTANCE_PX &&
      Math.abs(dx) > Math.abs(dy) * 1.2
    ) {
      if (dx > 0) goPrev();
      else goNext();
    }
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchGestureActiveRef.current = true;
      pinchRef.current = {
        startDistance: pointerDistance(event.touches[0]!, event.touches[1]!),
        startScale: scale,
      };
      gestureRef.current = null;
    }
  };

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    event.preventDefault();
    pinchGestureActiveRef.current = true;
    const distance = pointerDistance(event.touches[0]!, event.touches[1]!);
    const ratio = distance / pinchRef.current.startDistance;
    setScale(clampScale(pinchRef.current.startScale * ratio));
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
    window.setTimeout(() => {
      pinchGestureActiveRef.current = false;
    }, 80);
    setScale((current) => {
      if (current <= 1) setOffset({ x: 0, y: 0 });
      return current;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[65] flex flex-col bg-black/92 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="照片預覽"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <p className="min-w-0 truncate text-sm text-zinc-300">
          {photo.name}
          {photos.length > 1 ? ` (${index + 1}/${photos.length})` : ""}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => zoomBy(-SCALE_STEP)}
            disabled={scale <= MIN_SCALE}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-40"
            aria-label="縮小"
          >
            <ZoomOut className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(SCALE_STEP)}
            disabled={scale >= MAX_SCALE}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-40"
            aria-label="放大"
          >
            <ZoomIn className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/10"
            aria-label="關閉預覽"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 touch-none select-none"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {photos.length > 1 && hasPrev ? (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 sm:left-4"
            aria-label="上一張"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
        ) : null}

        {photos.length > 1 && hasNext ? (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-black/70 sm:right-4"
            aria-label="下一張"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        ) : null}

        <div className="flex h-full w-full items-center justify-center overflow-hidden p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL full-resolution preview */}
          <img
            src={photo.url}
            aria-label={`${photo.name}，點一下關閉預覽`}
            draggable={false}
            className="max-h-full max-w-full cursor-pointer object-contain will-change-transform"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
              transformOrigin: "center center",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>
    </div>
  );
}
