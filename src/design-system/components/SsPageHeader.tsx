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
    <header className="mb-[var(--ss-space-6)] flex items-start justify-between gap-3">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-block text-sm font-medium text-[var(--ss-fg-muted)] hover:text-[var(--ss-primary)]"
          >
            ← 返回
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--ss-fg)] sm:text-[1.65rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm leading-relaxed text-[var(--ss-fg-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
