import type { InputHTMLAttributes } from "react";

export function SsInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`ss-bg-elevated min-h-11 w-full rounded-[var(--ss-radius-md)] border border-[var(--ss-border)] px-4 py-2.5 text-base text-[var(--ss-fg)] outline-none transition placeholder:text-[var(--ss-fg-muted)] focus:border-[var(--ss-primary)] focus:ring-2 focus:ring-[var(--ss-primary)]/20 ${className}`}
      {...props}
    />
  );
}
