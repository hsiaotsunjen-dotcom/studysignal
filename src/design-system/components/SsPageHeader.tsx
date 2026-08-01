import Link from "next/link";
import type { ReactNode } from "react";

export function SsPageHeader({
  title,
  subtitle,
  backHref,
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-9 flex items-start justify-between gap-5 sm:mb-10">
      <div className="min-w-0 flex-1">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3.5 inline-flex items-center text-[13px] font-medium tracking-wide text-[var(--ss-fg-hint)] transition hover:text-[var(--ss-primary)]"
          >
            ← 返回
          </Link>
        ) : null}
        <h1
          className="ss-display text-[1.85rem] font-semibold text-[var(--ss-fg)] sm:text-[2.125rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-display)",
            lineHeight: "var(--ss-leading-tight)",
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className="mt-3 max-w-[22rem] text-[15px] text-[var(--ss-fg-muted)]"
            style={{ lineHeight: "var(--ss-leading-body)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-start pt-1">{action}</div>
      ) : null}
    </header>
  );
}
