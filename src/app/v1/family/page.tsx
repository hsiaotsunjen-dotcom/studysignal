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
  createFamily,
  getAuthSession,
  pathForOnboardingStep,
} from "@/lib/authClient";
import { useDemoAuthBypass } from "@/lib/useDemoAuthBypass";

function defaultFamilyName(displayName: string): string {
  const name = displayName.trim();
  return name ? `${name} 的家庭` : "";
}

/**
 * PRD-001 Create family — POST /api/auth/family.
 * Prefills default name from session displayName; editable.
 */
export default function CreateFamilyPage() {
  const router = useRouter();
  const demoBypass = useDemoAuthBypass();
  const [familyName, setFamilyName] = useState("");
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
        if (session.onboardingStep !== "create_family") {
          router.replace(pathForOnboardingStep(session.onboardingStep));
          return;
        }
        setFamilyName(defaultFamilyName(session.parent.displayName));
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
      const next = await createFamily({ familyName });
      router.push(pathForOnboardingStep(next.onboardingStep));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "無法建立家庭，請稍后再試。",
      );
      setSubmitting(false);
    }
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="建立家庭"
        subtitle="家庭帳號由你擁有。可以沿用建議名稱，也可以改成你們家習慣的叫法。"
        backHref="/v1/profile"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium tracking-wide text-[var(--ss-fg)]">
              家庭名稱
            </span>
            <SsInput
              type="text"
              name="familyName"
              autoComplete="organization"
              placeholder="例如：王媽媽 的家庭"
              value={familyName}
              onChange={(e) => {
                setFamilyName(e.target.value);
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
            {submitting ? "建立中…" : "建立家庭並繼續"}
          </SsButton>
        </form>
      </SsCard>
    </SsAppShell>
  );
}
