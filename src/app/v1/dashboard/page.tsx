import Link from "next/link";
import { Camera, Mic, Play } from "lucide-react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
  SsProgressBar,
} from "@/design-system";
import {
  mockDashboard,
  mockGoals,
  mockStudent,
} from "@/design-system/mock/data";

export default function StudentDashboardPage() {
  const nextGoal = mockGoals.find((g) => g.status !== "done");

  return (
    <SsAppShell>
      <SsPageHeader
        title={`今天好嗎，${mockStudent.name}`}
        subtitle={`${mockStudent.grade} · ${mockDashboard.focusSubject}`}
        action={
          <Link
            href="/v1"
            className="text-xs font-medium text-[var(--ss-ai)] hover:underline"
          >
            AI 夥伴
          </Link>
        }
      />

      <SsCard className="mb-4">
        <SsProgressBar
          value={mockDashboard.todayProgress}
          label="今日進度"
        />
        <p className="mt-3 text-sm text-[var(--ss-fg-muted)]">
          已完成 {mockDashboard.completedGoals} / {mockDashboard.totalGoals}{" "}
          個目標
        </p>
      </SsCard>

      <SsCard className="mb-4 border-[var(--ss-ai)]/15 bg-[var(--ss-ai-soft)]/40">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-ai)]">
          AI 建議
        </p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ss-fg)]">
          {mockDashboard.aiTip}
        </p>
      </SsCard>

      <SsCard className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--ss-fg)]">
            今日目標
          </h2>
          <Link
            href="/v1/goals"
            className="text-sm font-medium text-[var(--ss-primary)] hover:underline"
          >
            查看全部
          </Link>
        </div>
        {nextGoal ? (
          <div>
            <p className="font-medium text-[var(--ss-fg)]">{nextGoal.title}</p>
            <p className="mt-1 text-sm text-[var(--ss-fg-muted)]">
              {nextGoal.detail} · 約 {nextGoal.minutes} 分鐘
            </p>
            <Link href="/v1/flow" className="mt-4 block">
              <SsButton className="w-full">
                <Play className="h-4 w-4" aria-hidden />
                繼續學習
              </SsButton>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-[var(--ss-fg-muted)]">今天的目標都完成了</p>
        )}
      </SsCard>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/v1/flow" className="block">
          <SsCard className="flex flex-col items-center gap-2 py-5 text-center transition active:scale-[0.98]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ss-primary-soft)] text-[var(--ss-primary)]">
              <Camera className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-medium">拍作業</span>
          </SsCard>
        </Link>
        <Link href="/v1/flow" className="block">
          <SsCard className="flex flex-col items-center gap-2 py-5 text-center transition active:scale-[0.98]">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ss-ai-soft)] text-[var(--ss-ai)]">
              <Mic className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-medium">開口說</span>
          </SsCard>
        </Link>
      </div>
    </SsAppShell>
  );
}
