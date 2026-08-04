"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsInput,
  SsPageHeader,
} from "@/design-system";
import {
  getAuthSession,
  pathForOnboardingStep,
  updateProfile,
} from "@/lib/authClient";
import { useDemoAuthBypass } from "@/lib/useDemoAuthBypass";

/**
 * PRD-001 Parent profile — POST /api/auth/profile.
 * Display name only; prefilled from session (may reuse signup name).
 */
export default function ParentProfilePage() {
  const router = useRouter();
  const demoBypass = useDemoAuthBypass();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (demoBypass) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await getAuthSession();
        if (cancelled) return;
        if (!session) {
          router.replace("/v1/signup");
          return;
        }
        if (session.onboardingStep !== "parent_profile") {
          router.replace(pathForOnboardingStep(session.onboardingStep));
          return;
        }
        setDisplayName(session.parent.displayName ?? "");
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
  }, [router, demoBypass]);

  if (demoBypass) {
    return (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">Demo Mode…</p>
      </SsAppShell>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || checking) return;
    setError("");
    setSubmitting(true);
    try {
      const next = await updateProfile({ displayName });
      router.push(pathForOnboardingStep(next.onboardingStep));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "無法更新資料，請稍后再試。",
      );
      setSubmitting(false);
    }
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="確認你的名字"
        subtitle="這個名字會用在家庭帳號裡，讓孩子和之後的訊息都認得你。"
        backHref="/v1/verify-email"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium tracking-wide text-[var(--ss-fg)]">
              顯示名稱
            </span>
            <SsInput
              type="text"
              name="displayName"
              autoComplete="name"
              placeholder="例如：王媽媽"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError("");
              }}
              disabled={checking || submitting}
              autoFocus
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--ss-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <SsButton
            type="submit"
            className="w-full"
            disabled={checking || submitting}
          >
            {submitting ? "儲存中…" : "確認並繼續"}
          </SsButton>
        </form>
      </SsCard>
    </SsAppShell>
  );
}
