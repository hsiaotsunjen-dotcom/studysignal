import type { HTMLAttributes, ReactNode } from "react";

export function SsCard({
  children,
  className = "",
  padding = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: boolean;
}) {
  return (
    <div
      className={`ss-bg-elevated rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)] shadow-[var(--ss-shadow-card)] ${
        padding ? "p-[var(--ss-space-5)] sm:p-[var(--ss-space-6)]" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
