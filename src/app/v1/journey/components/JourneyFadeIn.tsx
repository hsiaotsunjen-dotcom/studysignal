"use client";

import type { ReactNode } from "react";

/** Staggered fade-in wrapper — CSS only (no Framer Motion). */
export function JourneyFadeIn({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={`journey-fade-in ${className}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
