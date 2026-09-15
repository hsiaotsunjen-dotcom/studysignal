"use client";

import dynamic from "next/dynamic";

import { SsAppShell } from "@/design-system";

/**
 * Onboarding is localStorage-driven and must mount client-only.
 * SSR + tooling attribute injection (e.g. data-cursor-ref) was producing a
 * Next.js hydration error overlay that intercepted Goal 「繼續」 clicks.
 */
const StudentOnboardingClient = dynamic(
  () => import("./StudentOnboardingClient"),
  {
    ssr: false,
    loading: () => (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">正在接續上次進度…</p>
      </SsAppShell>
    ),
  },
);

export default function StudentOnboardingPage() {
  return <StudentOnboardingClient />;
}
