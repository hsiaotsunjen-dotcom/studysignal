"use client";

import Link from "next/link";

import { SsButton, SsCard, SsProgressBar } from "@/design-system";
import type { JourneyTask } from "@/design-system/mock/journey";

export function JourneyTaskCard({ task }: { task: JourneyTask }) {
  return (
    <section aria-label="接下來" className="mb-9 sm:mb-10">
      <SsCard className="ss-card-lift relative overflow-hidden !px-6 !py-8 sm:!px-8">
        <div
          className="ss-illustration pointer-events-none absolute -right-5 -top-5 flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-full bg-[var(--ss-primary-soft)] opacity-70"
          aria-hidden
        >
          <span className="text-4xl leading-none">{task.emoji}</span>
        </div>

        <p className="ss-label">接下來</p>
        <h2
          className="mt-2.5 text-[1.65rem] font-semibold text-[var(--ss-fg)] sm:text-[1.75rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-title)",
            lineHeight: "var(--ss-leading-tight)",
          }}
        >
          {task.title}
        </h2>
        <p className="mt-2.5 text-[13px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
          大約 {task.durationMin} 分鐘 · {task.level}
        </p>

        <div className="mt-6">
          <SsProgressBar value={task.progress} label="今天完成了" />
        </div>

        <Link href="/v1/flow" className="mt-7 block">
          <SsButton type="button" className="w-full">
            開始今天的旅程
          </SsButton>
        </Link>
      </SsCard>
    </section>
  );
}
