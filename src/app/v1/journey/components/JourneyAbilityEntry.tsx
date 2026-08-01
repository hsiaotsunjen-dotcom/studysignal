import Link from "next/link";
import { ChevronRight, Map } from "lucide-react";

import { SsCard } from "@/design-system";

export function JourneyAbilityEntry({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <section aria-label="Ability map" className="mb-1">
      <Link
        href={href}
        className="block rounded-[var(--ss-radius-xl)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--ss-primary)]/25"
      >
        <SsCard className="ss-card-lift flex items-center gap-3.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--ss-radius-md)] bg-[var(--ss-primary-soft)] text-[var(--ss-primary)]"
            aria-hidden
          >
            <Map className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-[var(--ss-fg)]">
              {title}
            </h2>
            <p
              className="mt-1 text-[13px] text-[var(--ss-fg-muted)]"
              style={{ lineHeight: "var(--ss-leading-snug)" }}
            >
              {subtitle}
            </p>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-[var(--ss-fg-hint)]"
            strokeWidth={1.75}
            aria-hidden
          />
        </SsCard>
      </Link>
    </section>
  );
}
