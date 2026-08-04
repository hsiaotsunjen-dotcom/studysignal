"use client";

import { isDemoAuthEnabled } from "@/lib/demoAuth";

/**
 * Small corner chip — Development Mode only.
 * Top-right inside the phone frame (above the atmosphere control).
 */
export function SsDemoModeBadge() {
  if (!isDemoAuthEnabled()) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[61]"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
      }}
    >
      <div className="flex justify-end px-[1.35rem] sm:px-8">
        <span className="inline-flex items-center rounded-full border border-[var(--ss-border)]/70 bg-[var(--ss-card)]/90 px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-[var(--ss-fg-muted)] shadow-[var(--ss-shadow-soft)] backdrop-blur-md">
          DEMO MODE
        </span>
      </div>
    </div>
  );
}
