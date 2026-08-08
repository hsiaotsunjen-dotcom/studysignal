"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SsAppShell } from "@/design-system";
import {
  completeStudentSetup,
  readParentSession,
} from "@/lib/parentSession";

/**
 * Legacy parent onboarding redirect.
 * Student Learning OS onboarding lives at `/v1/learn/onboarding` (PRD-101).
 */
export default function OnboardingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const session = readParentSession();
    if (!session?.parentEmail || !session.password) {
      router.replace("/v1/learn/onboarding");
      return;
    }
    if (!session.student) {
      router.replace("/v1/student/new");
      return;
    }
    if (!session.onboardingComplete) {
      completeStudentSetup(
        {
          parentEmail: session.parentEmail,
          parentName: session.parentName,
          password: session.password,
        },
        {
          ...session.student,
          subjects: session.student.subjects.length
            ? session.student.subjects
            : ["英語"],
          goals: session.student.goals || "每天穩定練習，更敢開口",
          dailyMinutes: session.student.dailyMinutes || 20,
        },
      );
    }
    router.replace("/v1/dashboard");
  }, [router]);

  return (
    <SsAppShell showTab={false}>
      <p className="text-sm text-[var(--ss-fg-muted)]">正在進入今日學習…</p>
      <Link
        href="/v1/dashboard"
        className="mt-4 inline-block text-sm text-[var(--ss-primary)]"
      >
        若沒有自動跳轉，點這裡繼續
      </Link>
    </SsAppShell>
  );
}
