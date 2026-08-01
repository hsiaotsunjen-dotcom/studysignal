import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "ai";

const variants: Record<Variant, string> = {
  primary:
    "ss-btn-primary shadow-[var(--ss-shadow-soft)] hover:shadow-[var(--ss-shadow-card)]",
  secondary:
    "ss-card text-[var(--ss-fg)] border border-[var(--ss-border)]/70 hover:border-[var(--ss-primary)]/25 hover:bg-[var(--ss-primary-soft)]",
  ghost:
    "bg-transparent text-[var(--ss-fg-muted)] hover:bg-[var(--ss-bg-elevated)] hover:text-[var(--ss-fg)]",
  ai: "bg-[var(--ss-ai-soft)] text-[var(--ss-ai)] border border-[var(--ss-ai)]/15 hover:brightness-[1.02]",
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
      className={`inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-full px-7 py-3 text-[15px] font-semibold leading-none tracking-[-0.01em] transition duration-300 ease-out active:scale-[0.985] disabled:opacity-45 touch-manipulation ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
