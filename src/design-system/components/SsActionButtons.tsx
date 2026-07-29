import type { ButtonHTMLAttributes } from "react";
import { Camera, Mic } from "lucide-react";

export function SsCameraButton({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="拍作業"
      className={`inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ss-primary)] text-[var(--ss-on-primary)] shadow-[var(--ss-shadow-soft)] transition active:scale-95 touch-manipulation ${className}`}
      {...props}
    >
      <Camera className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}

export function SsMicButton({
  active = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={active ? "停止錄音" : "開始說話"}
      className={`inline-flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--ss-shadow-soft)] transition active:scale-95 touch-manipulation ${
        active
          ? "bg-[var(--ss-ai)] text-[var(--ss-on-primary)] ring-4 ring-[var(--ss-ai-soft)]"
          : "ss-bg-elevated text-[var(--ss-fg)] border border-[var(--ss-border)]"
      } ${className}`}
      {...props}
    >
      <Mic className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}
