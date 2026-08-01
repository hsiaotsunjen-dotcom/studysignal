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
      className={`inline-flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full bg-[var(--ss-primary)] text-[var(--ss-on-primary)] shadow-[var(--ss-shadow-soft)] transition duration-200 ease-out active:scale-[0.97] touch-manipulation ${className}`}
      {...props}
    >
      <Camera className="h-[22px] w-[22px]" strokeWidth={1.85} />
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
      className={`inline-flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full shadow-[var(--ss-shadow-soft)] transition duration-200 ease-out active:scale-[0.97] touch-manipulation ${
        active
          ? "bg-[var(--ss-ai)] text-[var(--ss-on-primary)] ring-[3px] ring-[var(--ss-ai-soft)]"
          : "ss-bg-elevated text-[var(--ss-fg)] border border-[var(--ss-border)]/80"
      } ${className}`}
      {...props}
    >
      <Mic className="h-[22px] w-[22px]" strokeWidth={1.85} />
    </button>
  );
}
