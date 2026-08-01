import { SsCard, SsProgressRing } from "@/design-system";

export function JourneyDailyGoal({
  title,
  current,
  target,
}: {
  title: string;
  current: number;
  target: number;
}) {
  const ratio = target > 0 ? current / target : 0;

  return (
    <section aria-label="今天的小目標" className="mb-9 sm:mb-10">
      <SsCard className="ss-card-lift flex items-center gap-6">
        <SsProgressRing value={ratio} size={92} />
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold tracking-wide text-[var(--ss-fg-muted)]">
            {title}
          </h2>
          <p
            className="mt-1.5 text-[1.5rem] font-semibold tabular-nums text-[var(--ss-fg)]"
            style={{
              fontFamily:
                "var(--font-ss-display), var(--font-ss-sans), system-ui",
              letterSpacing: "var(--ss-tracking-title)",
              lineHeight: "var(--ss-leading-tight)",
            }}
          >
            {current}
            <span className="text-[15px] font-medium text-[var(--ss-fg-muted)]">
              {" "}
              / {target} 分鐘
            </span>
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-[var(--ss-fg-muted)]">
            距離今天的小目標很近了
          </p>
        </div>
      </SsCard>
    </section>
  );
}
