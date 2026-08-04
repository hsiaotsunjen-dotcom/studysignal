"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";

import {
  SsAppShell,
  SsButton,
  SsCard,
  SsPageHeader,
  SsProgressBar,
} from "@/design-system";
import { mockParent as mockParentReport, mockStudent } from "@/design-system/mock/data";
import {
  enterDemoMode,
  isDemoAuthEnabled,
  mockParent as demoParent,
} from "@/lib/demoAuth";
import {
  readDailySessionResult,
  type DailySessionResult,
} from "@/lib/dailySession";
import { readParentSession } from "@/lib/parentSession";

export default function ParentCenterPage() {
  const [liveSession, setLiveSession] = useState<DailySessionResult | null>(
    null,
  );
  const [parentEmail, setParentEmail] = useState(demoParent.email);
  const [parentName, setParentName] = useState(demoParent.name);

  useEffect(() => {
    if (isDemoAuthEnabled()) {
      enterDemoMode();
      setParentEmail(demoParent.email);
      setParentName(demoParent.name);
    } else {
      const session = readParentSession();
      if (session?.parentEmail) setParentEmail(session.parentEmail);
      if (session?.parentName) setParentName(session.parentName);
    }
    setLiveSession(readDailySessionResult());
  }, []);

  const studentName = liveSession?.studentName ?? mockStudent.name;
  const displayEmail = parentEmail || demoParent.email;
  const mockParent = mockParentReport;

  return (
    <SsAppShell>
      <SsPageHeader
        title="家長中心"
        subtitle={`${studentName} · 今天也被溫柔陪伴著`}
        action={
          <Link
            href="/v1/parent/email"
            className="text-xs font-medium text-[var(--ss-primary)] hover:underline"
          >
            今日日記
          </Link>
        }
      />

      <SsCard className="mb-4">
        <p className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
          家長帳號
        </p>
        {parentName ? (
          <p className="mt-2 text-sm font-medium text-[var(--ss-fg)]">
            {parentName}
          </p>
        ) : null}
        <p className={`text-sm text-[var(--ss-fg)] ${parentName ? "mt-0.5" : "mt-2"}`}>
          {displayEmail}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ss-fg-muted)]">
          每日學習報告會寄送到此 Email。
        </p>
      </SsCard>

      {liveSession ? (
        <SsCard className="mb-4">
          <p className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            今天的學習日記
          </p>
          <h2 className="mt-2 text-sm font-semibold text-[var(--ss-fg)]">
            {liveSession.focus}
          </h2>
          <dl className="mt-4 space-y-3 text-sm leading-relaxed">
            <div>
              <dt className="text-[var(--ss-fg-muted)]">今天發生什麼</dt>
              <dd className="mt-0.5 text-[var(--ss-fg)]">
                {liveSession.parentSummary.happened}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ss-fg-muted)]">哪裡進步了</dt>
              <dd className="mt-0.5 text-[var(--ss-fg)]">
                {liveSession.parentSummary.improved}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ss-fg-muted)]">需要關注</dt>
              <dd className="mt-0.5 text-[var(--ss-fg)]">
                {liveSession.parentSummary.attention}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--ss-fg-muted)]">下一步</dt>
              <dd className="mt-0.5 text-[var(--ss-fg)]">
                {liveSession.parentSummary.next}
              </dd>
            </div>
          </dl>
          {liveSession.signals.length ? (
            <ul className="mt-4 space-y-1.5 border-t border-[var(--ss-border)]/70 pt-4">
              {liveSession.signals.map((s) => (
                <li
                  key={s}
                  className="text-sm leading-relaxed text-[var(--ss-fg-muted)]"
                >
                  {s}
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/v1/parent/email" className="mt-5 block">
            <SsButton className="w-full">預覽今晚的每日報告</SsButton>
          </Link>
        </SsCard>
      ) : null}

      {/* Today's Learning */}
      <SsCard className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--ss-fg)]">今天完成了</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-semibold text-[var(--ss-fg)]">
              {mockParent.todayStudyMinutes}
              <span className="text-sm font-medium">分</span>
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ss-fg-muted)]">時長</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-[var(--ss-fg)]">
              {mockParent.subjectsCompleted.length}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ss-fg-muted)]">科目</p>
          </div>
          <div>
            <p className="text-xl font-semibold text-[var(--ss-fg)]">
              {mockParent.streakDays}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--ss-fg-muted)]">連續</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 border-t border-[var(--ss-border)]/70 pt-4">
          {mockParent.subjectsCompleted.map((s) => (
            <li
              key={s}
              className="text-sm text-[var(--ss-fg-muted)] before:mr-2 before:text-[var(--ss-primary)] before:content-['✓']"
            >
              {s}
            </li>
          ))}
        </ul>
      </SsCard>

      {/* Weekly Progress + Streak */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <SsCard>
          <h2 className="text-sm font-semibold text-[var(--ss-fg)]">本週的成果</h2>
          <p className="mt-3 text-2xl font-semibold text-[var(--ss-fg)]">
            {mockParent.weekMinutes}
            <span className="text-sm font-medium"> 分</span>
          </p>
          <p className="mt-1 text-xs text-[var(--ss-fg-muted)]">
            {mockParent.weekSessionsCompleted} 次完成 ·{" "}
            {mockParent.weekDaysActive} 天活躍
          </p>
        </SsCard>
        <SsCard>
          <h2 className="text-sm font-semibold text-[var(--ss-fg)]">學習連續</h2>
          <p className="mt-3 text-2xl font-semibold text-[var(--ss-fg)]">
            {mockParent.streakDays}
            <span className="text-sm font-medium"> 天</span>
          </p>
          <p className="mt-1 text-xs text-[var(--ss-fg-muted)]">
            穩定比完美更重要
          </p>
        </SsCard>
      </div>

      {/* Subject Progress */}
      <SsCard className="mb-4">
        <h2 className="mb-4 text-sm font-semibold text-[var(--ss-fg)]">
          各科成長
        </h2>
        <div className="space-y-4">
          {mockParent.subjectProgress.map((s) => (
            <div key={s.subject}>
              <SsProgressBar value={s.progress} label={s.subject} />
              <p className="mt-1 text-xs text-[var(--ss-fg-muted)]">{s.note}</p>
            </div>
          ))}
        </div>
      </SsCard>

      {/* Strengths / Weaknesses */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SsCard>
          <h2 className="text-sm font-semibold text-[var(--ss-fg)]">優勢</h2>
          <ul className="mt-3 space-y-2">
            {mockParent.strengths.map((item) => (
              <li
                key={item}
                className="text-sm leading-relaxed text-[var(--ss-fg-muted)] before:mr-2 before:text-[var(--ss-primary)] before:content-['•']"
              >
                {item}
              </li>
            ))}
          </ul>
        </SsCard>
        <SsCard>
          <h2 className="text-sm font-semibold text-[var(--ss-fg)]">
            還可以一起練習
          </h2>
          <ul className="mt-3 space-y-2">
            {mockParent.weaknesses.map((item) => (
              <li
                key={item}
                className="text-sm leading-relaxed text-[var(--ss-fg-muted)] before:mr-2 before:text-[var(--ss-warning)] before:content-['•']"
              >
                {item}
              </li>
            ))}
          </ul>
        </SsCard>
      </div>

      {/* Observations — calm, not tech-forward */}
      <SsCard className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--ss-fg)]">今日觀察</h2>
        <ul className="mt-3 space-y-2">
          {mockParent.aiObservations.map((item) => (
            <li
              key={item}
              className="text-sm leading-relaxed text-[var(--ss-fg-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </SsCard>

      {/* Recommended Next Step */}
      <SsCard className="mb-4">
        <h2 className="text-sm font-semibold text-[var(--ss-fg)]">AI 建議</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--ss-fg)]">
          {mockParent.recommendedNextStep}
        </p>
      </SsCard>

      {/* Recent Daily Emails */}
      <SsCard className="mb-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--ss-fg)]">
            近期每日報告
          </h2>
          <Link
            href="/v1/parent/email"
            className="text-xs font-medium text-[var(--ss-primary)] hover:underline"
          >
            查看今日
          </Link>
        </div>
        <ul className="divide-y divide-[var(--ss-border)]/70">
          {mockParent.recentEmails.map((email) => (
            <li key={email.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Mail
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ss-fg-muted)]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--ss-fg)]">
                  {email.date}
                </p>
                <p className="mt-0.5 text-xs text-[var(--ss-fg-muted)]">
                  {email.preview}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </SsCard>

      {/* Monthly Growth */}
      <SsCard className="mb-6">
        <h2 className="mb-4 text-sm font-semibold text-[var(--ss-fg)]">
          本月成長
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {mockParent.monthlyGrowth.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-sm text-[var(--ss-fg-muted)]">
                {item.label}
              </span>
              <span className="text-sm font-medium text-[var(--ss-fg)]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </SsCard>

      <SsCard className="mb-6">
        <p className="text-sm leading-relaxed text-[var(--ss-fg-muted)]">
          每日 Email · {mockParent.emailOn ? "已開啟" : "已關閉"} ·{" "}
          {mockParent.emailFrequency}
        </p>
        <p className="mt-2 text-sm text-[var(--ss-fg)]">{displayEmail}</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ss-fg-muted)]">
          今晚這份報告會寄到上面的信箱（V0 尚未連接真實寄信服務）。
        </p>
        <Link href="/v1/parent/email" className="mt-4 block">
          <SsButton
            variant={liveSession ? "primary" : "secondary"}
            className="w-full"
          >
            打開今日報告
          </SsButton>
        </Link>
      </SsCard>

      <Link href="/v1/dashboard" className="block">
        <SsButton variant="ghost" className="w-full">
          切回學生視圖
        </SsButton>
      </Link>
    </SsAppShell>
  );
}
