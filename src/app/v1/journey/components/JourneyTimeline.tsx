import { Check } from "lucide-react";

import type { JourneyTask } from "@/design-system/mock/journey";

export function JourneyTimeline({ tasks }: { tasks: JourneyTask[] }) {
  return (
    <section aria-label="今天的旅程" className="mb-9 sm:mb-10">
      <h2 className="mb-5 text-[13px] font-semibold tracking-wide text-[var(--ss-fg-muted)]">
        今天的旅程
      </h2>
      <ol className="relative ms-3.5 border-l border-[var(--ss-border)] ps-8">
        {tasks.map((task, index) => {
          const isLast = index === tasks.length - 1;
          const completed = task.status === "completed";
          const current = task.status === "current";
          const locked = task.status === "locked";

          return (
            <li
              key={task.id}
              className={`relative ${isLast ? "pb-0" : "pb-6"} ${
                locked ? "opacity-45" : ""
              }`}
            >
              <span
                className={`absolute -left-[2.35rem] top-0.5 flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-[1.5px] ${
                  completed
                    ? "border-[var(--ss-success)] bg-[var(--ss-success)] text-[var(--ss-on-primary)]"
                    : current
                      ? "border-[var(--ss-primary)] bg-[var(--ss-primary-soft)] text-[var(--ss-primary)] ring-[3px] ring-[var(--ss-primary-soft)]"
                      : "border-[var(--ss-border)] bg-[var(--ss-bg-elevated)] text-[var(--ss-fg-muted)]"
                }`}
                aria-hidden
              >
                {completed ? (
                  <Check className="h-3 w-3" strokeWidth={2.75} />
                ) : current ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ss-primary)]" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ss-border)]" />
                )}
              </span>
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={`text-[15px] font-semibold leading-snug ${
                    current
                      ? "text-[var(--ss-primary)]"
                      : completed
                        ? "text-[var(--ss-fg)]"
                        : "text-[var(--ss-fg-muted)]"
                  }`}
                >
                  <span className="me-1.5" aria-hidden>
                    {task.emoji}
                  </span>
                  {task.title}
                  {current ? (
                    <span className="ms-2 align-middle text-[11px] font-semibold tracking-wide text-[var(--ss-primary)]">
                      現在
                    </span>
                  ) : null}
                </p>
                <span className="shrink-0 text-[13px] tabular-nums text-[var(--ss-fg-hint)]">
                  {task.durationMin}分鐘
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
