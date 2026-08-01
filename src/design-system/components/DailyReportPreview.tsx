import { mockHeroReport } from "@/design-system/mock/data";

type ReportData = typeof mockHeroReport;

/**
 * Notebook-style daily learning report.
 * The visual parents buy for — calm, readable, reassuring.
 */
export function DailyReportPreview({
  data = mockHeroReport,
  className = "",
  compact = false,
}: {
  data?: ReportData;
  className?: string;
  compact?: boolean;
}) {
  return (
    <article
      className={`ss-card overflow-hidden rounded-[var(--ss-radius-xl)] border border-[var(--ss-border)]/50 shadow-[var(--ss-shadow-card)] ${className}`}
      aria-label="每日學習報告預覽"
    >
      <div
        className={`border-b border-[var(--ss-border)]/50 ${compact ? "px-5 py-5" : "px-6 py-6 sm:px-7"}`}
      >
        <p className="ss-label">今日學習日記</p>
        <h3
          className={`mt-2 font-semibold text-[var(--ss-fg)] ${compact ? "text-lg" : "text-xl sm:text-[1.35rem]"}`}
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-title)",
            lineHeight: "var(--ss-leading-tight)",
          }}
        >
          {data.title}
        </h3>
        <p className="mt-2.5 text-[14px] text-[var(--ss-fg-muted)]">
          學生{" "}
          <span className="font-medium text-[var(--ss-fg)]">
            {data.studentName}
          </span>
        </p>
      </div>

      <div
        className={`space-y-6 ${compact ? "px-5 py-5" : "px-6 py-6 sm:px-7"}`}
      >
        <section>
          <p className="ss-label">完成</p>
          <ul className="mt-3 space-y-2.5">
            {data.completed.map((item) => (
              <li
                key={item.label}
                className="flex items-baseline justify-between gap-4 text-[15px]"
                style={{ lineHeight: "var(--ss-leading-snug)" }}
              >
                <span className="text-[var(--ss-fg)]">
                  <span
                    className="mr-2.5 inline-block text-[var(--ss-primary)]"
                    aria-hidden
                  >
                    ✓
                  </span>
                  {item.label}
                </span>
                <span className="shrink-0 text-[13px] text-[var(--ss-fg-muted)]">
                  {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-[var(--ss-border)]/45 pt-5">
          <p className="ss-label">觀察</p>
          <ul className="mt-3 space-y-2">
            {data.observations.map((line) => (
              <li
                key={line}
                className="text-[15px] text-[var(--ss-fg)]"
                style={{ lineHeight: "var(--ss-leading-body)" }}
              >
                {line}
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-[var(--ss-border)]/45 pt-5">
          <p className="ss-label">明天</p>
          <ul className="mt-3 space-y-2.5">
            {data.tomorrow.map((item) => (
              <li
                key={item.subject}
                className="flex items-baseline justify-between gap-4 text-[15px]"
                style={{ lineHeight: "var(--ss-leading-snug)" }}
              >
                <span className="text-[var(--ss-fg)]">{item.subject}</span>
                {item.detail ? (
                  <span className="shrink-0 text-[13px] text-[var(--ss-fg-muted)]">
                    {item.detail}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}
