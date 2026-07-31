"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
} from "@/design-system";
import {
  getAuthSession,
  pathForOnboardingStep,
  type AuthSession,
} from "@/lib/authClient";

/**
 * PRD-001 First success screen — no Tutor / Homework / Dashboard.
 * One primary CTA: return to Landing.
 */
export default function SignupSuccessPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getAuthSession();
        if (cancelled) return;
        if (!next) {
          router.replace("/v1/signup");
          return;
        }
        if (next.onboardingStep !== "complete") {
          router.replace(pathForOnboardingStep(next.onboardingStep));
          return;
        }
        setSession(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "無法讀取登入狀態。",
          );
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="家庭準備好了"
        subtitle="帳號已建立、家庭已就緒、孩子已邀請。你可以安心地往下一步前進。"
      />

      <SsCard>
        {error ? (
          <p className="text-sm text-[var(--ss-danger)]" role="alert">
            {error}
          </p>
        ) : (
          <ul className="space-y-3 text-sm leading-relaxed text-[var(--ss-fg)]">
            <li>
              <span className="text-[var(--ss-fg-muted)]">家長帳號</span>
              <p className="mt-0.5 font-medium">
                {checking
                  ? "讀取中…"
                  : session?.parent.displayName || session?.parent.email}
              </p>
            </li>
            <li>
              <span className="text-[var(--ss-fg-muted)]">家庭</span>
              <p className="mt-0.5 font-medium">
                {checking ? "讀取中…" : session?.family?.name ?? "—"}
              </p>
            </li>
            <li>
              <span className="text-[var(--ss-fg-muted)]">已邀請的孩子</span>
              <p className="mt-0.5 font-medium">
                {checking
                  ? "讀取中…"
                  : session?.student
                    ? session.student.grade
                      ? `${session.student.name} · ${session.student.grade}`
                      : session.student.name
                    : "—"}
              </p>
            </li>
          </ul>
        )}

        <SsButton
          className="mt-6 w-full"
          disabled={checking}
          onClick={() => router.push("/")}
        >
          回到首頁
        </SsButton>
      </SsCard>
    </SsAppShell>
  );
}
