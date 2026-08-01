"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { SsAppShell, SsButton, SsCard, SsInput } from "@/design-system";
import {
  mockDailySession,
  mockStudent,
  type SessionPhase,
} from "@/design-system/mock/data";
import { writeDailySessionResult } from "@/lib/dailySession";
import { readParentSession } from "@/lib/parentSession";

/** Quiet teacher voice — not a chat thread */
function TeacherVoice({ children }: { children: ReactNode }) {
  return (
    <div className="text-[17px] leading-[1.65] text-[var(--ss-fg)]">{children}</div>
  );
}

function SoftProgress({
  phase,
  stepIndex,
  stepCount,
}: {
  phase: SessionPhase;
  stepIndex: number;
  stepCount: number;
}) {
  const labels = ["開始", "練習", "完成"] as const;
  let active = 0;
  if (
    phase === "goal" ||
    phase === "step" ||
    phase === "encourage" ||
    phase === "struggle"
  ) {
    active = 1;
  }
  if (phase === "celebrate" || phase === "signals" || phase === "parent") {
    active = 2;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={`h-1 w-full rounded-full transition-colors ${
                i <= active
                  ? "bg-[var(--ss-primary)]/70"
                  : "bg-[var(--ss-border)]"
              }`}
            />
            <span className="text-[10px] text-[var(--ss-fg-muted)]">{label}</span>
          </div>
        ))}
      </div>
      {phase === "step" || phase === "encourage" || phase === "struggle" ? (
        <p className="mt-3 text-center text-xs text-[var(--ss-fg-muted)]">
          這一步 · {stepIndex + 1} / {stepCount}
        </p>
      ) : null}
    </div>
  );
}

export default function DailyLearningSessionPage() {
  const session = mockDailySession;
  const [name, setName] = useState(mockStudent.name);
  const [phase, setPhase] = useState<SessionPhase>("welcome");
  const [stepIndex, setStepIndex] = useState(0);
  const [simplified, setSimplified] = useState(false);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const parent = readParentSession();
    if (parent?.student?.name) setName(parent.student.name);
  }, []);

  const step = session.steps[stepIndex];
  const stepCount = session.steps.length;

  const teacherText = useMemo(() => {
    if (phase === "welcome") {
      return `${name}，${session.welcomeLine}`;
    }
    if (phase === "goal") {
      return session.goalSentence;
    }
    if (phase === "step" && step) {
      return simplified
        ? step.simplifyPrompt
        : `${step.prompt}\n\n${step.guide}`;
    }
    if (phase === "encourage" && step) {
      return step.successEncourage;
    }
    if (phase === "struggle") {
      return "很好的嘗試。我們換個方式試試——不會直接給答案，我們一起慢慢來。你快到了。";
    }
    if (phase === "celebrate") {
      return session.celebrateLine;
    }
    if (phase === "signals") {
      return "我想跟你說說，今天你做得很好的地方。";
    }
    if (phase === "parent") {
      return "爸媽今晚會收到今天的學習日記。他們會知道，你今天真的有好好學習。";
    }
    return "";
  }, [phase, name, session, step, simplified]);

  function goGoal() {
    setPhase("goal");
  }

  function startSteps() {
    setPhase("step");
    setStepIndex(0);
    setSimplified(false);
    setAnswer("");
  }

  function onStruggle() {
    setPhase("struggle");
  }

  function onSimplify() {
    setSimplified(true);
    setPhase("step");
    setAnswer("");
  }

  function onSuccess() {
    setPhase("encourage");
  }

  function followSimplified() {
    if (step) setAnswer(step.sampleResponse);
    setPhase("encourage");
  }

  function afterEncourage() {
    if (stepIndex < stepCount - 1) {
      setStepIndex((i) => i + 1);
      setSimplified(false);
      setAnswer("");
      setPhase("step");
      return;
    }
    setPhase("celebrate");
  }

  function goSignals() {
    setPhase("signals");
  }

  function sendToParent() {
    writeDailySessionResult({
      completedAt: new Date().toISOString(),
      studentName: name,
      focus: session.focus,
      goalSentence: session.goalSentence,
      signals: session.signals,
      parentSummary: session.parentSummary,
    });
    setSaved(true);
    setPhase("parent");
  }

  return (
    <SsAppShell showTab={false}>
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--ss-fg-muted)]">{session.fromPlan}</p>
          <Link
            href="/v1/dashboard"
            className="text-xs font-medium text-[var(--ss-fg-muted)] hover:text-[var(--ss-fg)]"
          >
            稍後繼續
          </Link>
        </div>

        <SoftProgress
          phase={phase}
          stepIndex={stepIndex}
          stepCount={stepCount}
        />

        <div className="flex flex-1 flex-col">
          {phase === "celebrate" ? (
            <p className="mb-5 text-center text-3xl" aria-hidden>
              🎉
            </p>
          ) : null}

          <TeacherVoice>
            {teacherText.split("\n").map((line, i) => (
              <p
                key={`${phase}-${i}`}
                className={`${i > 0 ? "mt-3" : ""} ${phase === "celebrate" ? "text-center" : ""}`}
              >
                {line}
              </p>
            ))}
          </TeacherVoice>

          {(phase === "step" || phase === "encourage") && stepIndex === 0 ? (
            <div
              className="mt-8 flex h-36 items-center justify-center rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 bg-[var(--ss-bg-elevated)]/60 text-sm text-[var(--ss-fg-muted)]"
              aria-hidden
            >
              公園 · 放風箏
            </div>
          ) : null}

          {phase === "step" && step ? (
            <div className="mt-8 space-y-4">
              {!simplified ? (
                <p className="text-sm text-[var(--ss-fg-muted)]">{step.hint}</p>
              ) : null}
              <SsInput
                placeholder="說出來，或慢慢打字…"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                autoFocus
              />
            </div>
          ) : null}

          {phase === "signals" ? (
            <ul className="mt-8 space-y-3">
              {session.signals.map((s) => (
                <li
                  key={s}
                  className="text-[15px] leading-relaxed text-[var(--ss-fg-muted)]"
                >
                  {s}
                </li>
              ))}
            </ul>
          ) : null}

          {phase === "parent" ? (
            <SsCard className="mt-8">
              <p className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
                送給家長的今日日記
              </p>
              <dl className="mt-4 space-y-3 text-sm leading-relaxed">
                <div>
                  <dt className="text-[var(--ss-fg-muted)]">今天發生什麼</dt>
                  <dd className="mt-0.5 text-[var(--ss-fg)]">
                    {session.parentSummary.happened}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ss-fg-muted)]">哪裡進步了</dt>
                  <dd className="mt-0.5 text-[var(--ss-fg)]">
                    {session.parentSummary.improved}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ss-fg-muted)]">需要關注</dt>
                  <dd className="mt-0.5 text-[var(--ss-fg)]">
                    {session.parentSummary.attention}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--ss-fg-muted)]">下一步</dt>
                  <dd className="mt-0.5 text-[var(--ss-fg)]">
                    {session.parentSummary.next}
                  </dd>
                </div>
              </dl>
              {saved ? (
                <p className="mt-4 text-xs text-[var(--ss-primary)]">
                  已寫入家長中心
                </p>
              ) : null}
            </SsCard>
          ) : null}
        </div>

        <div className="mt-10 flex flex-col gap-2 pb-2">
          {phase === "welcome" ? (
            <SsButton className="w-full" onClick={goGoal}>
              我準備好了
            </SsButton>
          ) : null}

          {phase === "goal" ? (
            <SsButton className="w-full" onClick={startSteps}>
              開始第一步
            </SsButton>
          ) : null}

          {phase === "step" && !simplified ? (
            <>
              <SsButton
                className="w-full"
                onClick={onSuccess}
                disabled={!answer.trim()}
              >
                完成這一步
              </SsButton>
              <SsButton
                variant="secondary"
                className="w-full"
                onClick={followSimplified}
              >
                用示範句子繼續
              </SsButton>
              <SsButton variant="ghost" className="w-full" onClick={onStruggle}>
                有一點難
              </SsButton>
            </>
          ) : null}

          {phase === "step" && simplified ? (
            <>
              <SsButton
                className="w-full"
                onClick={onSuccess}
                disabled={!answer.trim()}
              >
                完成這一步
              </SsButton>
              <SsButton
                variant="secondary"
                className="w-full"
                onClick={followSimplified}
              >
                跟著一起說
              </SsButton>
            </>
          ) : null}

          {phase === "struggle" ? (
            <SsButton className="w-full" onClick={onSimplify}>
              換簡單一點的方式
            </SsButton>
          ) : null}

          {phase === "encourage" ? (
            <SsButton className="w-full" onClick={afterEncourage}>
              {stepIndex < stepCount - 1 ? "下一步" : "看看今天的收穫"}
            </SsButton>
          ) : null}

          {phase === "celebrate" ? (
            <SsButton className="w-full" onClick={goSignals}>
              看看今天的收穫
            </SsButton>
          ) : null}

          {phase === "signals" ? (
            <SsButton className="w-full" onClick={sendToParent}>
              送給家長今天的日記
            </SsButton>
          ) : null}

          {phase === "parent" ? (
            <>
              <Link href="/v1/parent" className="block">
                <SsButton className="w-full">打開家長中心</SsButton>
              </Link>
              <Link href="/v1/parent/email" className="block">
                <SsButton variant="secondary" className="w-full">
                  預覽今晚的每日報告
                </SsButton>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </SsAppShell>
  );
}
