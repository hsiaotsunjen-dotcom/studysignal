"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  DailyReportPreview,
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
} from "@/design-system";
import { mockDailyEmail, mockHeroReport } from "@/design-system/mock/data";
import { readDailySessionResult } from "@/lib/dailySession";
import { readParentSession } from "@/lib/parentSession";

export default function DailyEmailPreviewPage() {
  const email = mockDailyEmail;
  const [studentName, setStudentName] = useState(email.studentName);
  const [parentEmail, setParentEmail] = useState("parent@email.com");

  useEffect(() => {
    const live = readDailySessionResult();
    if (live?.studentName) setStudentName(live.studentName);
    const session = readParentSession();
    if (session?.parentEmail) setParentEmail(session.parentEmail);
  }, []);

  const report = {
    ...mockHeroReport,
    title: "今日學習",
    studentName,
    completed: email.completedLearning,
    observations: email.observations,
    tomorrow: email.tomorrowPlan.map((item) => ({
      subject: item.subject,
      detail: item.detail,
    })),
  };

  return (
    <SsAppShell showTab={false}>
      <SsPageHeader
        title="每日學習報告"
        subtitle="像一則安靜的筆記，每晚送到"
        backHref="/v1/parent"
      />

      <SsCard className="mb-5">
        <p className="text-sm leading-relaxed text-[var(--ss-fg)]">
          Today this report would be sent to:
        </p>
        <p className="mt-1.5 text-[15px] font-medium text-[var(--ss-fg)]">
          {parentEmail}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ss-fg-muted)]">
          V0 示範：尚未連接真實寄信服務。連接後，報告會自動寄到此信箱。
        </p>
      </SsCard>

      <p className="mb-4 text-xs text-[var(--ss-fg-muted)]">
        {email.dateLabel} · 今日學習 · {studentName}
      </p>

      <DailyReportPreview data={report} className="mb-6" />

      <div className="mb-6 space-y-5 px-1">
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            口說
          </h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ss-fg)]">
            {email.speakingPractice}
          </p>
        </section>
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            作業
          </h3>
          <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ss-fg)]">
            {email.homework}
          </p>
        </section>
        <section>
          <h3 className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            今日單字
          </h3>
          <p className="mt-1.5 text-[15px] text-[var(--ss-fg)]">
            {email.vocabularyLearned.join(" · ")}
          </p>
        </section>
        <p
          className="border-t border-[var(--ss-border)] pt-5 text-center text-[15px] font-medium leading-relaxed text-[var(--ss-fg)]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
          }}
        >
          {email.closing}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/v1/parent" className="block">
          <SsButton className="w-full">回到家長中心</SsButton>
        </Link>
        <Link href="/v1/dashboard" className="block">
          <SsButton variant="secondary" className="w-full">
            回到學生今天
          </SsButton>
        </Link>
        <Link href="/" className="block">
          <SsButton variant="ghost" className="w-full">
            結束示範 · 回到首頁
          </SsButton>
        </Link>
      </div>
    </SsAppShell>
  );
}
