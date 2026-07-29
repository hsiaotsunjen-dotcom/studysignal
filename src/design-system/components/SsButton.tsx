import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "ai";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ss-primary)] text-[var(--ss-on-primary)] hover:bg-[var(--ss-primary-hover)] shadow-[var(--ss-shadow-soft)]",
  secondary:
    "ss-bg-elevated text-[var(--ss-fg)] border border-[var(--ss-border)] hover:bg-[var(--ss-primary-soft)]",
  ghost:
    "bg-transparent text-[var(--ss-fg-muted)] hover:bg-[var(--ss-primary-soft)] hover:text-[var(--ss-fg)]",
  ai: "bg-[var(--ss-ai-soft)] text-[var(--ss-ai)] border border-[var(--ss-ai)]/20 hover:brightness-[0.98]",
};

export function SsButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--ss-radius-xl)] px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 touch-manipulation ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
