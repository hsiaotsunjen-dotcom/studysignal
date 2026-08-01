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
  inviteStudent,
  pathForOnboardingStep,
} from "@/lib/authClient";

/**
 * PRD-001 Invite student — POST /api/auth/invite-student.
 * Student name required by backend; grade optional.
 */
export default function InviteStudentPage() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getAuthSession();
        if (cancelled) return;
        if (!session) {
          router.replace("/v1/signup");
          return;
        }
        if (session.onboardingStep !== "invite_student") {
          router.replace(pathForOnboardingStep(session.onboardingStep));
          return;
        }
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
    setSubmitting(true);
    try {
      const next = await inviteStudent({
        studentName,
        grade: grade.trim() ? grade : undefined,
      });
      router.push(pathForOnboardingStep(next.onboardingStep));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "無法邀請孩子，請稍后再試。",
      );
      setSubmitting(false);
    }
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="邀請孩子"
        subtitle="先幫孩子建立一個簡單的名字即可。年級可以之後再補。"
        backHref="/v1/family"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium tracking-wide text-[var(--ss-fg)]">
              孩子姓名
            </span>
            <SsInput
              type="text"
              name="studentName"
              autoComplete="name"
              placeholder="例如：小明"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                setError("");
              }}
              disabled={checking || submitting}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[13px] font-medium tracking-wide text-[var(--ss-fg)]">
              年級（選填）
            </span>
            <SsInput
              type="text"
              name="grade"
              placeholder="例如：小三"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
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
            {submitting ? "邀請中…" : "邀請並完成"}
          </SsButton>
        </form>
      </SsCard>
    </SsAppShell>
  );
}
