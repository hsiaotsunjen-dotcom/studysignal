"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SsAppShell, SsButton, SsCard } from "@/design-system";
import { mockStudent, mockStudentHome } from "@/design-system/mock/data";
import { readParentSession } from "@/lib/parentSession";

function timeGreetingFallback() {
  const h = new Date().getHours();
  if (h < 12) return "早安";
  if (h < 18) return "午安";
  return "晚安";
}

export default function StudentDashboardPage() {
  const home = mockStudentHome;
  const [name, setName] = useState(mockStudent.name);

  useEffect(() => {
    const session = readParentSession();
    if (session?.student?.name) setName(session.student.name);
  }, []);

  const greeting = useMemo(
    () => home.greeting || timeGreetingFallback(),
    [home.greeting],
  );

  const allDone = home.tasks.every((t) => t.status === "done");

  return (
    <SsAppShell>
      {/* 1. Warm greeting */}
      <header className="mb-10 pt-2">
        <p className="text-sm text-[var(--ss-fg-muted)]">{greeting}</p>
        <h1
          className="mt-1.5 text-[2rem] font-semibold leading-tight tracking-tight text-[var(--ss-fg)]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
          }}
        >
          {name}
        </h1>
        <p className="mt-3 text-sm text-[var(--ss-fg-muted)]">
          連續 {home.streakDays} 天 · 今天大約 {home.todayMinutesPlanned}{" "}
          分鐘
        </p>
      </header>

      {/* 2–4. One dominant surface: prepared today + path + begin + encouragement */}
      <SsCard className="mb-12 px-6 py-8 sm:px-7 sm:py-9">
        <p className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
          今天
        </p>
        <h2
          className="mt-2 text-xl font-semibold leading-snug tracking-tight text-[var(--ss-fg)] sm:text-[1.35rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
          }}
        >
          {home.planReadyCopy}
        </h2>

        <p className="mt-6 text-[15px] leading-[1.7] text-[var(--ss-fg-muted)]">
          {home.todayPath.map((item, i) => (
            <span key={item.title}>
              {i > 0 ? (
                <span className="text-[var(--ss-border)]"> · </span>
              ) : null}
              <span className="text-[var(--ss-fg)]">{item.title}</span>
              <span className="text-[var(--ss-fg-muted)]">
                {" "}
                {item.detail}
              </span>
            </span>
          ))}
        </p>

        {/* 3. Only one obvious next action */}
        <Link href="/v1/flow" className="mt-8 block">
          <SsButton className="w-full" disabled={allDone}>
            {allDone ? "今天已經完成了" : "開始今天"}
          </SsButton>
        </Link>

        {/* 4–5. Encouragement + finish line */}
        <p className="mt-6 text-center text-sm leading-relaxed text-[var(--ss-fg-muted)]">
          {home.companionLine}
        </p>
      </SsCard>

      {/* Supporting whisper — no equal-weight cards */}
      <footer className="space-y-5 border-t border-[var(--ss-border)]/60 pt-8 pb-2">
        <p className="text-sm leading-relaxed text-[var(--ss-fg-muted)]">
          <span className="text-[var(--ss-fg)]">{home.todaySignal}</span>
        </p>
        <p className="text-xs leading-relaxed text-[var(--ss-fg-muted)]">
          昨天 · {home.yesterday.subjects.join("、")} ·{" "}
          {home.yesterday.minutes} 分鐘
          <br />
          {home.yesterday.encouragement}
        </p>
        <p className="text-xs leading-relaxed text-[var(--ss-fg-muted)]">
          明天 · {home.tomorrowPreview.join("、")}
        </p>
      </footer>
    </SsAppShell>
  );
}
