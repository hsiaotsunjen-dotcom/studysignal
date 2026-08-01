"use client";

import { Sparkles } from "lucide-react";

import { useAtmosphere } from "@/design-system/atmosphere/AtmosphereProvider";
import { SsCard } from "@/design-system";

export function JourneyAiCoach({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const { meta } = useAtmosphere();

  return (
    <section aria-label="AI 建議" className="mb-9 sm:mb-10">
      <SsCard className="ss-card-lift border-[var(--ss-primary)]/12 bg-[var(--ss-ai-soft)]/40">
        <div className="flex items-start gap-3.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ss-radius-md)] bg-[var(--ss-primary-soft)] text-[var(--ss-primary)]"
            aria-hidden
          >
            <Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ss-fg)]">
              {title}
            </h2>
            <p
              className="mt-2 whitespace-pre-line text-[14px] text-[var(--ss-fg-muted)]"
              style={{ lineHeight: "var(--ss-leading-body)" }}
            >
              {message}
            </p>
            <p
              className="mt-3 text-[13px] text-[var(--ss-fg-hint)]"
              style={{ lineHeight: "var(--ss-leading-snug)" }}
            >
              {meta.voiceLine}
            </p>
          </div>
        </div>
      </SsCard>
    </section>
  );
}
