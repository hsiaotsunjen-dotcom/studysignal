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
          建立家庭帳號後，孩子每天學習，你每天都能安心掌握進度。
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <SsButton
            className="w-full"
            disabled={resuming}
            onClick={() => router.push("/v1/signup")}
          >
            開始免費使用
            <ArrowRight className="h-4 w-4" aria-hidden />
          </SsButton>
          <p className="text-center text-sm text-[var(--ss-fg-muted)]">
            已有家長帳號？{" "}
            <Link
              href="/v1/login"
              className="font-medium text-[var(--ss-primary)] hover:underline"
            >
              家長登入
            </Link>
          </p>
        </div>
      </section>

      <section className="mt-10" aria-label="每日學習報告預覽">
        <p className="mb-3 text-xs font-medium tracking-wide text-[var(--ss-fg-muted)]">
          每晚送到信箱的報告
        </p>
        <DailyReportPreview />
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
    </div>
  );
}
