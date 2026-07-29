import {
  SsAppShell,
  SsCard,
  SsPageHeader,
} from "@/design-system";
import { mockGrowth } from "@/design-system/mock/data";

export default function GrowthMapPage() {
  return (
    <SsAppShell>
      <SsPageHeader
        title="成長地圖"
        subtitle="你變強的足跡，一點一點累積"
      />

      <SsCard className="mb-6 border-[var(--ss-primary)]/20 bg-[var(--ss-primary-soft)]/50">
        <p className="text-sm font-medium text-[var(--ss-success)]">本週亮點</p>
        <p className="mt-1 text-lg font-semibold text-[var(--ss-fg)]">
          連續練習 4 天
        </p>
        <p className="mt-1 text-sm text-[var(--ss-fg-muted)]">
          保持這個節奏，比一次衝刺更重要。
        </p>
      </SsCard>

      <ol className="relative space-y-0 border-l-2 border-[var(--ss-border)] pl-6">
        {mockGrowth.map((item, i) => (
          <li key={item.id} className="relative pb-8 last:pb-0">
            <span
              className={`absolute -left-[1.9rem] top-1.5 h-3 w-3 rounded-full border-2 border-[var(--ss-bg)] ${
                i === 0
                  ? "bg-[var(--ss-primary)]"
                  : "bg-[var(--ss-border)]"
              }`}
              aria-hidden
            />
            <SsCard>
              <p className="text-xs font-medium text-[var(--ss-fg-muted)]">
                {item.date}
              </p>
              <h2 className="mt-1 font-semibold text-[var(--ss-fg)]">
                {item.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ss-fg-muted)]">
                {item.detail}
              </p>
            </SsCard>
          </li>
        ))}
      </ol>
    </SsAppShell>
  );
}
