"use client";

import Link from "next/link";
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
  signUp,
} from "@/lib/authClient";

/**
 * PRD-001 Signup — POST /api/auth/signup only.
 * Validation messages come from the backend; no client-side rule duplicates.
 */
export default function ParentSignupPage() {
  const router = useRouter();
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getAuthSession();
        if (cancelled) return;
        if (session) {
          router.replace(pathForOnboardingStep(session.onboardingStep));
          return;
        }
      } catch {
        // Stay on signup if session check fails.
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
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const session = await signUp({
        parentName,
        email,
        password,
        confirmPassword,
      });
      router.push(pathForOnboardingStep(session.onboardingStep));
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法建立帳號，請稍后再試。");
      setSubmitting(false);
    }
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="建立家長帳號"
        subtitle="家長帳號是家庭的主要帳號。建立後我們會請你確認信箱，再一起邀請孩子。"
        backHref="/"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              家長姓名
            </span>
            <SsInput
              type="text"
              name="parentName"
              autoComplete="name"
              placeholder="例如：王媽媽"
              value={parentName}
              onChange={(e) => {
                setParentName(e.target.value);
                setError("");
              }}
              disabled={checking || submitting}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              家長 Email
            </span>
            <SsInput
              type="email"
              name="email"
              autoComplete="email"
              placeholder="parent@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              disabled={checking || submitting}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              密碼
            </span>
            <SsInput
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="設定一組密碼"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              disabled={checking || submitting}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              確認密碼
            </span>
            <SsInput
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="再輸入一次密碼"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              disabled={checking || submitting}
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
            {submitting ? "建立中…" : "建立帳號並繼續"}
          </SsButton>
        </form>
      </SsCard>

      <p className="mt-4 text-center text-sm text-[var(--ss-fg-muted)]">
        已有帳號？{" "}
        <Link
          href="/v1/login"
          className="font-medium text-[var(--ss-primary)] hover:underline"
        >
          家長登入
        </Link>
      </p>
    </SsAppShell>
  );
}
