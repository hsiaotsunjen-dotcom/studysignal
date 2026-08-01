"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { DailyReportPreview, SsButton } from "@/design-system";
import {
  getAuthSession,
  resolveOnboardingPath,
} from "@/lib/authClient";

/**
 * PRD-001 Landing — invite Parent into Authentication.
 * One primary CTA; secondary login link. No Tutor / Dashboard / Parent Center.
 */
export default function LandingPage() {
  const router = useRouter();
  const [resuming, setResuming] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await getAuthSession();
        if (cancelled) return;
        const path = resolveOnboardingPath(session);
        // Resume incomplete signup; leave completed parents on Landing.
        if (path && session && session.onboardingStep !== "complete") {
          router.replace(path);
          return;
        }
      } catch {
        // Landing stays usable if session check fails.
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh w-full flex-col px-[1.35rem] pb-20 pt-[3.75rem] sm:px-8">
      <header className="mb-11">
        <p
          className="ss-display text-[1.75rem] font-semibold text-[var(--ss-fg)] sm:text-[2rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-display)",
            lineHeight: "var(--ss-leading-tight)",
          }}
        >
          StudySignal
        </p>
        <p className="mt-2 text-[13px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
          Family Learning Hub
        </p>
      </header>

      <section>
        <h1
          className="text-[1.9rem] font-semibold text-[var(--ss-fg)] sm:text-[2.2rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-display)",
            lineHeight: "var(--ss-leading-tight)",
          }}
        >
          孩子每天學習。
          <br />
          你每天都知道。
        </h1>
        <p
          className="mt-5 max-w-md text-[15px] text-[var(--ss-fg-muted)] sm:text-base"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          AI 已經替孩子準備好今天的學習。家長每晚收到一份溫柔的學習日記。
        </p>

        <div className="mt-9 flex flex-col gap-5">
          <SsButton
            className="w-full"
            disabled={resuming}
            onClick={() => router.push("/v1/signup")}
          >
            開始陪伴孩子
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </SsButton>
          <p className="text-center text-[14px] text-[var(--ss-fg-muted)]">
            已有家長帳號？{" "}
            <Link
              href="/v1/login"
              className="font-semibold text-[var(--ss-primary)] transition hover:opacity-80"
            >
              家長登入
            </Link>
          </p>
        </div>
      </section>

      <section className="mt-12" aria-label="每日學習報告預覽">
        <p className="ss-label mb-4">每晚送到信箱的學習日記</p>
        <DailyReportPreview />
      </section>

      <section className="mt-16 border-t border-[var(--ss-border)]/60 pt-11">
        <p
          className="text-[1.125rem] font-semibold text-[var(--ss-fg)]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-title)",
            lineHeight: "var(--ss-leading-snug)",
          }}
        >
          孩子被溫柔陪伴。家長安心知道。
        </p>
        <p
          className="mt-3.5 text-[14px] text-[var(--ss-fg-muted)]"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          不是儀表板，而是一份每天翻開的學習日記——知道孩子今天真的有學習。
        </p>
      </section>
    </div>
  );
}
