"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DailyReportPreview, SsButton } from "@/design-system";
import { clearDailySessionResult } from "@/lib/dailySession";
import { clearParentSession } from "@/lib/parentSession";

function restartDemo() {
  clearParentSession();
  clearDailySessionResult();
}

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-16 pt-10 sm:px-8">
      <header className="mb-10">
        <p
          className="text-[1.65rem] font-semibold tracking-tight text-[var(--ss-fg)] sm:text-3xl"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
          }}
        >
          StudySignal
        </p>
        <p className="mt-1.5 text-sm text-[var(--ss-fg-muted)]">
          Family Learning Hub
        </p>
      </header>

      <section>
        <h1
          className="text-[1.85rem] font-semibold leading-[1.25] tracking-tight text-[var(--ss-fg)] sm:text-[2.15rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
          }}
        >
          孩子每天學習。
          <br />
          你每天都知道。
        </h1>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--ss-fg-muted)] sm:text-base">
          StudySignal
          自動規劃學習、引導每一次練習、評估進度，並寄送精美的每日學習報告給家長。
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/v1/signup" className="block sm:flex-1" onClick={restartDemo}>
            <SsButton className="w-full">
              開始免費使用
              <ArrowRight className="h-4 w-4" aria-hidden />
            </SsButton>
          </Link>
          <Link href="/v1/login" className="block sm:flex-1">
            <SsButton variant="secondary" className="w-full">
              家長登入
            </SsButton>
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <p className="mb-3 text-xs font-medium tracking-wide text-[var(--ss-fg-muted)]">
          每晚送到信箱的報告
        </p>
        <DailyReportPreview />
        <Link href="/v1/parent/email" className="mt-4 block">
          <SsButton variant="ghost" className="w-full">
            預覽完整每日報告
          </SsButton>
        </Link>
      </section>

      <section className="mt-14 border-t border-[var(--ss-border)] pt-10">
        <p
          className="text-lg font-semibold leading-snug text-[var(--ss-fg)]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
          }}
        >
          學生學習。家長掌握。兩者相連。
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--ss-fg-muted)]">
          我們賣的不是科技感，而是安心——知道孩子今天真的有學習。
        </p>
      </section>

      <footer className="mt-14 text-center text-xs text-[var(--ss-fg-muted)]">
        <Link
          href="/v1/signup"
          onClick={restartDemo}
          className="hover:text-[var(--ss-fg)] hover:underline"
        >
          重新開始示範
        </Link>
      </footer>
    </div>
  );
}
