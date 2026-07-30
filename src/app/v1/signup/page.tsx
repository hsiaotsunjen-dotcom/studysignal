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
import { saveParentAccount } from "@/lib/parentSession";

export default function ParentSignupPage() {
  const router = useRouter();
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const name = parentName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!name) {
      setError("請輸入家長姓名");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("請輸入有效的家長 Email");
      return;
    }
    if (password.length < 6) {
      setError("密碼至少需要 6 個字元");
      return;
    }
    if (password !== confirmPassword) {
      setError("兩次輸入的密碼不一致");
      return;
    }

    saveParentAccount({
      parentName: name,
      parentEmail: trimmedEmail,
      password,
    });
    router.push("/v1/student/new");
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="建立家長帳號"
        subtitle="家長帳號是主要帳號。建立後再為孩子建立學生檔案——您每天都會知道孩子學了什麼。"
        backHref="/"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              家長姓名
            </span>
            <SsInput
              type="text"
              autoComplete="name"
              placeholder="例如：王媽媽"
              value={parentName}
              onChange={(e) => {
                setParentName(e.target.value);
                setError("");
              }}
              required
              autoFocus
            />
          </label>
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
              autoComplete="new-password"
              placeholder="至少 6 個字元"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              required
              minLength={6}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              確認密碼
            </span>
            <SsInput
              type="password"
              autoComplete="new-password"
              placeholder="再輸入一次密碼"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              required
              minLength={6}
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--ss-danger)]">{error}</p>
          ) : null}
          <SsButton type="submit" className="w-full">
            建立帳號並繼續
          </SsButton>
        </form>
      </SsCard>

      <p className="mt-4 text-center text-xs leading-relaxed text-[var(--ss-fg-muted)]">
        V0 示範：帳號僅保存在此裝置的 localStorage，尚未連接真實登入服務。
      </p>

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
