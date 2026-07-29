import Link from "next/link";
import { Sparkles } from "lucide-react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
} from "@/design-system";
import { mockAiHome, mockStudent } from "@/design-system/mock/data";

export default function AiAgentHomePage() {
  return (
    <SsAppShell showTab={false}>
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col justify-between gap-10 pt-4">
        <div>
          <p className="mb-6 text-sm font-medium text-[var(--ss-fg-muted)]">
            StudySignal
          </p>
          <SsPageHeader
            title={`嗨，${mockStudent.name}`}
            subtitle={mockStudent.greeting}
          />

          <SsCard className="mt-2 border-[var(--ss-ai)]/20 bg-gradient-to-br from-[var(--ss-bg-elevated)] to-[var(--ss-ai-soft)]/60">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ss-ai-soft)] text-[var(--ss-ai)]">
              <Sparkles className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-[var(--ss-fg)]">
              {mockAiHome.headline}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--ss-fg-muted)]">
              {mockAiHome.subcopy}
            </p>
            <p className="mt-4 rounded-[var(--ss-radius-md)] bg-[var(--ss-bg-elevated)]/80 px-3 py-2.5 text-sm leading-relaxed text-[var(--ss-fg)]">
              {mockAiHome.suggestion}
            </p>
          </SsCard>
        </div>

        <div className="flex flex-col gap-3 pb-4">
          <Link href="/v1/dashboard" className="block">
            <SsButton className="w-full">進入今日學習</SsButton>
          </Link>
          <Link href="/v1/flow" className="block">
            <SsButton variant="ai" className="w-full">
              直接開始建議練習
            </SsButton>
          </Link>
        </div>
      </div>
    </SsAppShell>
  );
}
