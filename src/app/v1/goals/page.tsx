import Link from "next/link";
import { Check, Circle, Loader } from "lucide-react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
} from "@/design-system";
import { mockGoals, type GoalStatus } from "@/design-system/mock/data";

const statusMeta: Record<
  GoalStatus,
  { label: string; icon: typeof Check; tone: string }
> = {
  done: {
    label: "已完成",
    icon: Check,
    tone: "text-[var(--ss-success)] bg-[var(--ss-primary-soft)]",
  },
  doing: {
    label: "進行中",
    icon: Loader,
    tone: "text-[var(--ss-ai)] bg-[var(--ss-ai-soft)]",
  },
  todo: {
    label: "未開始",
    icon: Circle,
    tone: "text-[var(--ss-fg-muted)] bg-[var(--ss-border)]/50",
  },
};

export default function TodaysGoalsPage() {
  return (
    <SsAppShell>
      <SsPageHeader
        title="今日目標"
        subtitle="把今天的練習一件一件完成就好"
        backHref="/v1/dashboard"
      />

      <ul className="flex flex-col gap-3">
        {mockGoals.map((goal) => {
          const meta = statusMeta[goal.status];
          const Icon = meta.icon;
          return (
            <li key={goal.id}>
              <SsCard>
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[var(--ss-fg)]">
                        {goal.title}
                      </h2>
                      <span className="text-xs text-[var(--ss-fg-muted)]">
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--ss-fg-muted)]">
                      {goal.detail}
                    </p>
                    <p className="mt-2 text-xs text-[var(--ss-fg-muted)]">
                      約 {goal.minutes} 分鐘
                    </p>
                    {goal.status !== "done" ? (
                      <Link href="/v1/flow" className="mt-4 block">
                        <SsButton
                          variant={goal.status === "doing" ? "primary" : "secondary"}
                          className="w-full"
                        >
                          {goal.status === "doing" ? "繼續" : "開始"}
                        </SsButton>
                      </Link>
                    ) : null}
                  </div>
                </div>
              </SsCard>
            </li>
          );
        })}
      </ul>
    </SsAppShell>
  );
}
