"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SsAppShell, SsButton } from "@/design-system";
import {
  isOnboardingComplete,
  readOnboardingSession,
} from "@/lib/learning/onboardingStore";
import { writeTutorMissionSeed } from "@/lib/learning/tutorMissionSeed";
import type { OnboardingSession } from "@/lib/learning/types";

export default function FirstMissionPage() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSession | null>(null);

  useEffect(() => {
    const existing = readOnboardingSession();
    if (!existing || !isOnboardingComplete(existing)) {
      router.replace("/v1/learn/onboarding");
      return;
    }
    setSession(existing);
  }, [router]);

  if (!session?.mission || !session.studentModel) {
    return (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">載入任務…</p>
      </SsAppShell>
    );
  }

  const { mission, studentModel } = session;
  const name = studentModel.identity.preferredName;

  return (
    <SsAppShell showTab={false}>
      <div className="mx-auto flex max-w-md flex-col gap-8 pt-2">
        <header>
          <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            今天的任務 · {mission.subject}
          </p>
          <h1
            className="mt-3 text-[1.75rem] font-semibold text-[var(--ss-fg)]"
            style={{
              fontFamily:
                "var(--font-ss-display), var(--font-ss-sans), system-ui",
              letterSpacing: "var(--ss-tracking-display)",
              lineHeight: "1.28",
            }}
          >
            {name}，這是你今天的第一步
          </h1>
          <p
            className="mt-4 text-[15px] text-[var(--ss-fg-muted)]"
            style={{ lineHeight: "var(--ss-leading-body)" }}
          >
            {mission.purpose}
          </p>
        </header>

        <div className="space-y-4 border-t border-[var(--ss-border)]/40 pt-6">
          <p
            className="text-[17px] text-[var(--ss-fg)]"
            style={{ lineHeight: "1.65" }}
          >
            {mission.prompt}
          </p>
          <p className="text-[13px] text-[var(--ss-fg-muted)]">
            完成條件：{mission.successCondition}
          </p>
          <p className="text-[13px] text-[var(--ss-fg-hint)]">
            下一步決策：{mission.nextStepDecision}
          </p>
        </div>

        <SsButton
          className="w-full"
          onClick={() => {
            writeTutorMissionSeed(session);
            router.push("/app");
          }}
        >
          進入 AI 夥伴
        </SsButton>

        <button
          type="button"
          className="text-center text-[13px] text-[var(--ss-fg-muted)] underline-offset-2 hover:underline"
          onClick={() => router.push("/v1/dashboard")}
        >
          稍後再開始，回學生首頁
        </button>
      </div>
    </SsAppShell>
  );
}
