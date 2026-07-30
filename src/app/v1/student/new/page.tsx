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
  completeStudentSetup,
  readParentSession,
} from "@/lib/parentSession";

const GRADES = [
  "國小一年級",
  "國小二年級",
  "國小三年級",
  "國小四年級",
  "國小五年級",
  "國小六年級",
  "國中一年級",
  "國中二年級",
  "國中三年級",
];

export default function CreateStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(GRADES[4]);
  const [parentEmail, setParentEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readParentSession();
    if (!session?.parentEmail || !session.password) {
      router.replace("/v1/signup");
      return;
    }
    if (session.onboardingComplete && session.student) {
      router.replace("/v1/dashboard");
      return;
    }
    setParentEmail(session.parentEmail);
    setReady(true);
  }, [router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const session = readParentSession();
    if (!session?.parentEmail) {
      router.replace("/v1/signup");
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return;

    completeStudentSetup(
      {
        parentEmail: session.parentEmail,
        parentName: session.parentName,
        password: session.password,
      },
      {
        name: trimmed,
        grade,
        subjects: ["英語"],
        goals: "每天穩定練習，更敢開口",
        dailyMinutes: 20,
      },
    );
    router.push("/v1/dashboard");
  }

  if (!ready) {
    return (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">載入中…</p>
      </SsAppShell>
    );
  }

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="建立學生檔案"
        subtitle={`家長帳號：${parentEmail}。建立後，今天的學習就會準備好。`}
        backHref="/v1/signup"
      />

      <SsCard>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              學生暱稱
            </span>
            <SsInput
              placeholder="例如：小宇"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--ss-fg)]">
              年級
            </span>
            <select
              className="ss-bg-elevated min-h-11 w-full rounded-[var(--ss-radius-md)] border border-[var(--ss-border)] px-4 py-2.5 text-base text-[var(--ss-fg)] outline-none focus:border-[var(--ss-primary)] focus:ring-2 focus:ring-[var(--ss-primary)]/20"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <SsButton type="submit" className="w-full" disabled={!name.trim()}>
            進入今日學習
          </SsButton>
        </form>
      </SsCard>
    </SsAppShell>
  );
}
