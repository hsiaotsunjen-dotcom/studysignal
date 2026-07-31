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
  resendVerification,
  verifyEmail,
  type AuthSession,
} from "@/lib/authClient";

/**
 * PRD-001 Email verification — identical journey for simulated or real mail (AC7).
 * POST /api/auth/verify-email · POST /api/auth/resend-verification
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
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
        if (next.onboardingStep !== "verify_email") {
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || checking) return;
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const next = await verifyEmail(code);
      router.push(pathForOnboardingStep(next.onboardingStep));
    } catch (err) {
      setError(err instanceof Error ? err.message : "驗證失敗，請稍后再試。");
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (resending || submitting || checking) return;
    setError("");
    setInfo("");
    setResending(true);
    try {
      await resendVerification();
      setInfo("已重新傳送驗證碼，請到信箱查看。");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "無法重新傳送驗證碼，請稍后再試。",
      );
    } finally {
      setResending(false);
    }
  }

  const email = session?.parent.email ?? "";

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="確認信箱"
        subtitle={
          email
            ? `我們已把驗證碼送到 ${email}。輸入後即可繼續建立家庭。`
            : "輸入信箱裡的驗證碼，即可繼續建立家庭。"
        }
        backHref="/v1/signup"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              驗證碼
            </span>
            <SsInput
              type="text"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="請輸入驗證碼"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
                setInfo("");
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
          {info ? (
            <p className="text-sm text-[var(--ss-success)]" role="status">
              {info}
            </p>
          ) : null}
          <SsButton
            type="submit"
            className="w-full"
            disabled={checking || submitting}
          >
            {submitting ? "確認中…" : "確認並繼續"}
          </SsButton>
        </form>
      </SsCard>

      <p className="mt-4 text-center text-sm text-[var(--ss-fg-muted)]">
        沒收到驗證碼？{" "}
        <button
          type="button"
          onClick={onResend}
          disabled={checking || resending || submitting}
          className="font-medium text-[var(--ss-primary)] hover:underline disabled:opacity-50"
        >
          {resending ? "傳送中…" : "重新傳送"}
        </button>
      </p>
    </SsAppShell>
  );
}
