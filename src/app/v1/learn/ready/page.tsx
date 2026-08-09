"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";

import { readSelectedSubject } from "@/lib/studentSubjects";

/**
 * Step 2 navigation placeholder — confirms subject selection.
 * Real AI Learning Flow comes in Step 3.
 */
export default function LearningReadyPage() {
  const [subject, setSubject] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSubject(readSelectedSubject());
    setHydrated(true);
  }, []);

  return (
    <div className="flex min-h-dvh w-full flex-col px-[1.35rem] pb-20 pt-[1.75rem] sm:px-8 sm:pt-8">
      <div className="mb-10">
        <Link
          href="/v1/learn/subjects"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ss-fg-muted)] transition hover:text-[var(--ss-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          返回
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center">
        {hydrated && subject ? (
          <>
            <h1
              className="text-[1.75rem] font-semibold text-[var(--ss-fg)] sm:text-[2rem]"
              style={{
                fontFamily:
                  "var(--font-ss-display), var(--font-ss-sans), system-ui",
                letterSpacing: "var(--ss-tracking-display)",
                lineHeight: "var(--ss-leading-tight)",
              }}
            >
              {subject}
            </h1>
            <p className="mt-3 text-[15px] text-[var(--ss-fg-muted)]">
              準備開始。
            </p>
          </>
        ) : hydrated ? (
          <>
            <p className="text-[15px] text-[var(--ss-fg-muted)]">
              尚未選擇學科。
            </p>
            <Link
              href="/v1/learn/subjects"
              className="mt-4 text-[14px] font-medium text-[var(--ss-fg)] underline-offset-2 hover:underline"
            >
              去選擇學科
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
