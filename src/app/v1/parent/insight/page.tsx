"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { SsAppShell, SsButton } from "@/design-system";
import {
  isOnboardingComplete,
  readOnboardingSession,
} from "@/lib/learning/onboardingStore";
import {
  emptyParentInsight,
  parentInsightFromOnboardingSession,
  type ParentInsight,
} from "@/lib/learning/parentInsight";
import { readParentEntryPlaceholder } from "@/lib/learning/parentEntry";

function InsightBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2 border-t border-[var(--ss-border)]/40 pt-6">
      <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
        {label}
      </p>
      <div
        className="text-[16px] text-[var(--ss-fg)]"
        style={{ lineHeight: "1.65" }}
      >
        {children}
      </div>
    </section>
  );
}

export default function ParentInsightPage() {
  const [insight, setInsight] = useState<ParentInsight | null>(null);
  const [parentLabel, setParentLabel] = useState("家長");

  useEffect(() => {
    const entry = readParentEntryPlaceholder();
    if (entry?.displayName) setParentLabel(entry.displayName);

    const session = readOnboardingSession();
    if (!session || !isOnboardingComplete(session)) {
      // Incomplete onboarding → empty (do not invent insight)
      if (session?.studentModel) {
        setInsight(parentInsightFromOnboardingSession(session));
      } else {
        setInsight(emptyParentInsight());
      }
      return;
    }
    setInsight(parentInsightFromOnboardingSession(session));
  }, []);

  if (!insight) {
    return (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">載入中…</p>
      </SsAppShell>
    );
  }

  const name = insight.studentDisplayName || "孩子";

  return (
    <SsAppShell showTab={false}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 pb-8 pt-1">
        <header className="mb-6">
          <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            {parentLabel} · 學習洞察
          </p>
          <h1
            className="mt-3 text-[1.75rem] font-semibold text-[var(--ss-fg)]"
            style={{
              fontFamily:
                "var(--font-ss-display), var(--font-ss-sans), system-ui",
              letterSpacing: "var(--ss-tracking-display)",
              lineHeight: "1.28",
            }}
          >
            {insight.status === "empty"
              ? "孩子最近學得怎麼樣？"
              : `${name}最近學得怎麼樣？`}
          </h1>
          <p
            className="mt-3 text-[14px] text-[var(--ss-fg-muted)]"
            style={{ lineHeight: "var(--ss-leading-body)" }}
          >
            學習由孩子主導。這裡只分享能幫助你支持的觀察。
          </p>
        </header>

        {insight.status === "empty" ? (
          <div className="space-y-6">
            <p
              className="text-[16px] text-[var(--ss-fg)]"
              style={{ lineHeight: "1.65" }}
            >
              目前還沒有足夠的學習觀察。
              {"\n\n"}
              當孩子完成開始學習、留下第一次任務後，這裡會出現溫柔、可行動的摘要——不會出現對話紀錄或分數排名。
            </p>
            <Link href="/v1/learn/onboarding" className="block">
              <SsButton className="w-full">請孩子開始學習</SsButton>
            </Link>
            <Link
              href="/"
              className="block text-center text-[13px] text-[var(--ss-fg-muted)] underline-offset-2 hover:underline"
            >
              回首頁
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {insight.progress ? (
              <InsightBlock label="進展">{insight.progress}</InsightBlock>
            ) : null}

            {insight.strengths.length > 0 ? (
              <InsightBlock label="優勢">
                <ul className="list-disc space-y-1.5 pl-5">
                  {insight.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </InsightBlock>
            ) : null}

            {insight.currentChallenge ? (
              <InsightBlock label="目前挑戰">
                {insight.currentChallenge}
              </InsightBlock>
            ) : null}

            {insight.learningStateSummary ? (
              <InsightBlock label="學習狀態">
                {insight.learningStateSummary}
              </InsightBlock>
            ) : null}

            {insight.growthNote ? (
              <InsightBlock label="成長提醒">{insight.growthNote}</InsightBlock>
            ) : null}

            {insight.supportNeeded ? (
              <InsightBlock label="需要的支持">
                {insight.supportNeeded}
              </InsightBlock>
            ) : null}

            {insight.suggestedParentAction ? (
              <InsightBlock label="你可以這樣做">
                {insight.suggestedParentAction}
              </InsightBlock>
            ) : null}

            <p className="mt-8 text-[12px] text-[var(--ss-fg-hint)]">
              不會顯示完整對話或 AI 內部推理。學習主導權在孩子。
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <Link href="/v1/parent" className="block">
                <SsButton variant="secondary" className="w-full">
                  家長中心（更多）
                </SsButton>
              </Link>
              <Link
                href="/"
                className="block text-center text-[13px] text-[var(--ss-fg-muted)] underline-offset-2 hover:underline"
              >
                回首頁
              </Link>
            </div>
          </div>
        )}
      </div>
    </SsAppShell>
  );
}
