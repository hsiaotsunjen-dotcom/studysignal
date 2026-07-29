import Link from "next/link";
import { Mail } from "lucide-react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
} from "@/design-system";
import { mockParent, mockStudent } from "@/design-system/mock/data";

export default function ParentCenterPage() {
  return (
    <SsAppShell>
      <SsPageHeader
        title="家長中心"
        subtitle={`${mockStudent.name} · 本週學習概況`}
      />

      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          { label: "活躍天數", value: `${mockParent.weekDaysActive}` },
          { label: "完成目標", value: `${mockParent.goalsCompleted}` },
          { label: "專注", value: "口說" },
        ].map((stat) => (
          <SsCard key={stat.label} className="px-2 py-4 text-center">
            <p className="text-xl font-semibold text-[var(--ss-fg)]">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-[var(--ss-fg-muted)]">
              {stat.label}
            </p>
          </SsCard>
        ))}
      </div>

      <SsCard className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--ss-fg)]">本週亮點</h2>
        <ul className="mt-3 space-y-2">
          {mockParent.highlights.map((h) => (
            <li
              key={h}
              className="text-sm leading-relaxed text-[var(--ss-fg-muted)] before:mr-2 before:text-[var(--ss-primary)] before:content-['•']"
            >
              {h}
            </li>
          ))}
        </ul>
      </SsCard>

      <SsCard className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--ss-fg)]">需關注</h2>
        <ul className="mt-3 space-y-2">
          {mockParent.watchouts.map((w) => (
            <li
              key={w}
              className="text-sm leading-relaxed text-[var(--ss-fg-muted)] before:mr-2 before:text-[var(--ss-warning)] before:content-['•']"
            >
              {w}
            </li>
          ))}
        </ul>
      </SsCard>

      <SsCard className="mb-4">
        <p className="text-sm text-[var(--ss-fg-muted)]">專注科目</p>
        <p className="mt-1 font-medium text-[var(--ss-fg)]">{mockParent.focus}</p>
      </SsCard>

      <SsCard className="mb-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ss-ai-soft)] text-[var(--ss-ai)]">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-[var(--ss-fg)]">Email 摘要</h2>
            <p className="mt-1 text-sm text-[var(--ss-fg-muted)]">
              {mockParent.emailOn ? "已開啟" : "已關閉"} ·{" "}
              {mockParent.emailFrequency}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ss-fg-muted)]">
              只寄學習亮點與需關注摘要，不寄聊天全文。
            </p>
          </div>
        </div>
        <SsButton variant="secondary" className="mt-4 w-full" disabled>
          調整設定（原型）
        </SsButton>
      </SsCard>

      <Link href="/v1/dashboard" className="block">
        <SsButton variant="ghost" className="w-full">
          切回學生視圖
        </SsButton>
      </Link>
    </SsAppShell>
  );
}
