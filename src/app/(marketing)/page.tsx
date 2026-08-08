"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { SsButton } from "@/design-system";
import {
  getAuthSession,
  resolveOnboardingPath,
} from "@/lib/authClient";
import { isDemoAuthEnabled } from "@/lib/demoAuth";

/**
 * Landing — dual audience entry.
 * Student path is visually primary; parent is secondary supporter entry.
 */
export default function LandingPage() {
  const router = useRouter();
  const [resuming, setResuming] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isDemoAuthEnabled()) {
        if (!cancelled) setResuming(false);
        return;
      }
      try {
        const session = await getAuthSession();
        if (cancelled) return;
        const path = resolveOnboardingPath(session);
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
          AI Learning Companion
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
          先理解你怎麼學，
          <br />
          再一起往前。
        </h1>
        <p
          className="mt-5 max-w-md text-[15px] text-[var(--ss-fg-muted)] sm:text-base"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          學生擁有學習；家長支持成長。不是監看平台，而是學習夥伴。
        </p>

        <div className="mt-10 flex flex-col gap-6">
          {/* Primary — student */}
          <div className="space-y-3">
            <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
              我是學生
            </p>
            <SsButton
              className="w-full"
              disabled={resuming}
              onClick={() => router.push("/v1/learn/onboarding")}
            >
              開始學習
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </SsButton>
          </div>

          {/* Secondary — parent */}
          <div className="space-y-3 border-t border-[var(--ss-border)]/45 pt-6">
            <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-hint)]">
              我是家長
            </p>
            <SsButton
              variant="secondary"
              className="w-full"
              disabled={resuming}
              onClick={() => router.push("/v1/parent/entry")}
            >
              了解孩子的學習
            </SsButton>
            <p className="text-center text-[13px] text-[var(--ss-fg-hint)]">
              已有帳號？{" "}
              <Link
                href="/v1/login"
                className="font-medium text-[var(--ss-fg-muted)] underline-offset-2 hover:underline"
              >
                家長登入
              </Link>
            </p>
          </div>
        </div>
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
          學習由孩子主導。家長被溫柔告知。
        </p>
        <p
          className="mt-3.5 text-[14px] text-[var(--ss-fg-muted)]"
          style={{ lineHeight: "var(--ss-leading-body)" }}
        >
          家長看到的是進展、挑戰與可支持的方式——不是對話逐字稿，也不是分數排行。
        </p>
      </section>
    </div>
  );
}
