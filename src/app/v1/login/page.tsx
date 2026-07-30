"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsInput,
  SsPageHeader,
} from "@/design-system";
import {
  completeStudentSetup,
  readParentSession,
} from "@/lib/parentSession";

export default function ParentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("請輸入有效的家長 Email");
      return;
    }
    if (!password) {
      setError("請輸入密碼");
      return;
    }

    const existing = readParentSession();
    if (!existing?.parentEmail) {
      setError("找不到此帳號，請先建立家長帳號");
      return;
    }
    if (existing.parentEmail !== trimmed) {
      setError("Email 或密碼不正確");
      return;
    }
    if (existing.password && existing.password !== password) {
      setError("Email 或密碼不正確");
      return;
    }

    if (existing.onboardingComplete && existing.student) {
      router.push("/v1/parent");
      return;
    }
    if (existing.student) {
      completeStudentSetup(
        {
          parentEmail: existing.parentEmail,
          parentName: existing.parentName,
          password: existing.password,
        },
        {
          ...existing.student,
          subjects: existing.student.subjects.length
            ? existing.student.subjects
            : ["英語"],
          goals: existing.student.goals || "每天穩定練習，更敢開口",
          dailyMinutes: existing.student.dailyMinutes || 20,
        },
      );
      router.push("/v1/dashboard");
      return;
    }

    router.push("/v1/student/new");
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="家長登入"
        subtitle="使用註冊的家長 Email 與密碼登入。"
        backHref="/"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              家長 Email
            </span>
            <SsInput
              type="email"
              autoComplete="email"
              placeholder="parent@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              密碼
            </span>
            <SsInput
              type="password"
              autoComplete="current-password"
              placeholder="輸入密碼"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--ss-danger)]">{error}</p>
          ) : null}
          <SsButton type="submit" className="w-full">
            登入
          </SsButton>
        </form>
      </SsCard>

      <p className="mt-6 text-center text-sm text-[var(--ss-fg-muted)]">
        還沒有帳號？{" "}
        <Link
          href="/v1/signup"
          className="font-medium text-[var(--ss-primary)] hover:underline"
        >
          開始免費使用
        </Link>
      </p>
    </SsAppShell>
  );
}
