import Link from "next/link";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
  SsProgressBar,
  SsProgressRing,
} from "@/design-system";
import { mockAbilities } from "@/design-system/mock/data";

export default function AbilityMapPage() {
  const highlight = mockAbilities[0];

  return (
    <SsAppShell>
      <SsPageHeader
        title="能力地圖"
        subtitle="看看你現在會什麼、哪裡可以再練一練"
      />

      <SsCard className="mb-6 flex flex-col items-center py-8">
        <SsProgressRing value={highlight.value} label={highlight.label} size={112} />
        <p className="mt-4 max-w-xs text-center text-sm leading-relaxed text-[var(--ss-fg-muted)]">
          這是你目前最穩定的面向。保持練習，其他能力也會一起成長。
        </p>
        <Link href="/v1/flow" className="mt-5">
          <SsButton variant="secondary">建議練習</SsButton>
        </Link>
      </SsCard>

      <h2 className="mb-3 text-lg font-semibold text-[var(--ss-fg)]">各項能力</h2>
      <ul className="flex flex-col gap-3">
        {mockAbilities.map((ability) => (
          <li key={ability.id}>
            <SsCard>
              <SsProgressBar value={ability.value} label={ability.label} />
              <p className="mt-2 text-xs text-[var(--ss-fg-muted)]">
                {ability.value >= 0.7
                  ? "穩定"
                  : ability.value >= 0.55
                    ? "持續進步中"
                    : "可以多練習一點"}
              </p>
            </SsCard>
          </li>
        ))}
      </ul>

      <Link href="/v1/dashboard" className="mt-8 block">
        <SsButton variant="ghost" className="w-full">
          回到今天
        </SsButton>
      </Link>
    </SsAppShell>
  );
}
