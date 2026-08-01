import { BookOpen, Crosshair, Mic, ScanEye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SsCard } from "@/design-system";
import type { mockLearningJourney } from "@/design-system/mock/journey";
import { progressJourneyShort } from "@/design-system/voice/progressVoice";

const iconMap: Record<
  (typeof mockLearningJourney.stats)[number]["icon"],
  LucideIcon
> = {
  target: Crosshair,
  focus: ScanEye,
  mic: Mic,
  book: BookOpen,
};

export function JourneyQuickStats({
  stats,
}: {
  stats: typeof mockLearningJourney.stats;
}) {
  return (
    <section aria-label="今天的成果" className="mb-9 sm:mb-10">
      <h2 className="mb-4 text-[13px] font-semibold tracking-wide text-[var(--ss-fg-muted)]">
        今天的成果
      </h2>
      <ul className="grid grid-cols-2 gap-3.5">
        {stats.map((stat) => {
          const Icon = iconMap[stat.icon];
          const voice = progressJourneyShort(stat.value);
          return (
            <li key={stat.id}>
              <SsCard className="ss-card-lift h-full !px-4 !py-5 sm:!px-5 sm:!py-5">
                <div className="flex items-center gap-2 text-[var(--ss-fg-muted)]">
                  <Icon
                    className="h-[15px] w-[15px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="text-[12px] font-medium tracking-wide">
                    {stat.label}
                  </span>
                </div>
                <p
                  className="mt-3 text-[1.25rem] font-semibold tracking-tight text-[var(--ss-fg)]"
                  style={{
                    fontFamily:
                      "var(--font-ss-display), var(--font-ss-sans), system-ui",
                    letterSpacing: "var(--ss-tracking-title)",
                  }}
                >
                  {voice}
                </p>
              </SsCard>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
