import { SsProgressBar } from "@/design-system";

export function JourneyHeader({
  greeting,
  studentName,
  journeyTitle,
  heroSupport,
  progressToday,
}: {
  greeting: string;
  studentName: string;
  journeyTitle: string;
  heroSupport?: string;
  progressToday: number;
}) {
  return (
    <header className="mb-9 sm:mb-10">
      <h1
        className="ss-display text-[1.75rem] font-semibold text-[var(--ss-fg)] sm:text-[2rem]"
        style={{
          fontFamily:
            "var(--font-ss-display), var(--font-ss-sans), system-ui",
          letterSpacing: "var(--ss-tracking-display)",
          lineHeight: "1.28",
        }}
      >
        {greeting}，{studentName}。
      </h1>
      <p
        className="mt-4 text-[16px] font-medium text-[var(--ss-fg)]"
        style={{ lineHeight: "var(--ss-leading-snug)" }}
      >
        {journeyTitle}
      </p>
      {heroSupport ? (
        <p
          className="mt-3 text-[14px] text-[var(--ss-fg-muted)]"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          {heroSupport}
        </p>
      ) : null}
      <div className="mt-6">
        <SsProgressBar value={progressToday} label="今天完成了" />
      </div>
    </header>
  );
}
