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
      className={`ss-card ss-card-lift rounded-[var(--ss-radius-xl)] border border-[var(--ss-border)]/45 shadow-[var(--ss-shadow-card)] ${
        padding ? "px-6 py-7 sm:px-8 sm:py-8" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
