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
      {allDone ? (
        <SsCard className="ss-card-lift mb-12 !px-7 !py-10 sm:!px-9 sm:!py-12">
          <p className="text-center text-3xl" aria-hidden>
            🎉
          </p>
          <h1
            className="mt-5 text-center text-[1.85rem] font-semibold text-[var(--ss-fg)]"
            style={{
              fontFamily:
                "var(--font-ss-display), var(--font-ss-sans), system-ui",
              letterSpacing: "var(--ss-tracking-display)",
              lineHeight: "var(--ss-leading-tight)",
            }}
          >
            {home.successMoment.title}
          </h1>
          <p
            className="mx-auto mt-5 max-w-[16rem] whitespace-pre-line text-center text-[16px] text-[var(--ss-fg-muted)]"
            style={{ lineHeight: "var(--ss-leading-body)" }}
          >
            {home.successMoment.body}
          </p>
          <Link href="/v1/journey" className="mt-9 block">
            <SsButton variant="secondary" className="w-full">
              看看今天的旅程
            </SsButton>
          </Link>
        </SsCard>
      ) : (
        <>
          <header className="mb-9 pt-1">
            <h1
              className="whitespace-pre-line text-[1.85rem] font-semibold text-[var(--ss-fg)] sm:text-[2.05rem]"
              style={{
                fontFamily:
                  "var(--font-ss-display), var(--font-ss-sans), system-ui",
                letterSpacing: "var(--ss-tracking-display)",
                lineHeight: "1.28",
              }}
            >
              {greeting}，{name}。
              {"\n"}
              {home.planReadyCopy}
            </h1>
            <p
              className="mt-5 whitespace-pre-line text-[15px] text-[var(--ss-fg-muted)]"
              style={{ lineHeight: "var(--ss-leading-body)" }}
            >
              {home.heroSupport}
            </p>
          </header>

          <SsCard className="ss-card-lift mb-10 !px-6 !py-8 sm:!px-8 sm:!py-9">
            <p className="ss-label">今天的旅程</p>
            <ul className="mt-5 space-y-4" aria-label="今天的學習行程">
              {home.todayPath.map((item) => (
                <li
                  key={item.title}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="flex items-center gap-3 text-[16px] font-medium text-[var(--ss-fg)]">
                    <span className="text-[1.15rem] leading-none" aria-hidden>
                      {item.emoji}
                    </span>
                    {item.title}
                  </span>
                  <span className="shrink-0 text-[14px] tabular-nums text-[var(--ss-fg-muted)]">
                    {item.detail}
                  </span>
                </li>
              ))}
            </ul>

            <Link href="/v1/flow" className="mt-9 block">
              <SsButton className="w-full">開始今天的旅程</SsButton>
            </Link>

            <p
              className="mt-6 text-center text-[14px] text-[var(--ss-fg-muted)]"
              style={{ lineHeight: "var(--ss-leading-body)" }}
            >
              {home.companionLine}
            </p>
          </SsCard>
        </>
      )}

      <footer className="space-y-4 border-t border-[var(--ss-border)]/45 pt-9 pb-2">
        <p
          className="text-[14px] text-[var(--ss-fg)]"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          {home.todaySignal}
        </p>
        <p
          className="text-[12px] text-[var(--ss-fg-muted)]"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          昨天 · {home.yesterday.subjects.join("、")} ·{" "}
          {home.yesterday.minutes} 分鐘
        </p>
      </footer>
    </SsAppShell>
  );
}
