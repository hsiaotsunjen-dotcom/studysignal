"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  SsAiChatBubble,
  SsAppShell,
  SsButton,
} from "@/design-system";
import {
  abandonMission,
  advancePhase,
  applyPromptForSession,
  completeReflection,
  continueAfterTutor,
  recordStudentAttempt,
  requestHint,
  sanitizeMissionLoop,
  startMissionLoop,
} from "@/lib/learning/missionLoopEngine";
import {
  isMissionLoopActive,
  readMissionLoop,
  writeMissionLoop,
} from "@/lib/learning/missionLoopStore";
import type { MissionLoopSession } from "@/lib/learning/missionTypes";
import {
  isOnboardingComplete,
  readOnboardingSession,
} from "@/lib/learning/onboardingStore";
import { syncMissionCompletionToOnboarding } from "@/lib/learning/syncLearningStores";

function persist(session: MissionLoopSession) {
  writeMissionLoop(session);
  return session;
}

export default function TodaysMissionPage() {
  const router = useRouter();
  const [loop, setLoop] = useState<MissionLoopSession | null>(null);
  const [draft, setDraft] = useState("");
  const [clearer, setClearer] = useState("");
  const [difficult, setDifficult] = useState("");
  const [differently, setDifferently] = useState("");
  const [confidenceNow, setConfidenceNow] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onboarding = readOnboardingSession();
    if (!onboarding || !isOnboardingComplete(onboarding) || !onboarding.studentModel) {
      router.replace("/v1/learn/onboarding");
      return;
    }

    const existing = sanitizeMissionLoop(readMissionLoop());
    if (existing && existing.studentId === onboarding.studentModel.studentId) {
      setLoop(existing);
      setReady(true);
      return;
    }

    // Fresh loop from current Student Model (not a second model)
    const started = persist(startMissionLoop(onboarding.studentModel));
    setLoop(started);
    setReady(true);
  }, [router]);

  function update(next: MissionLoopSession) {
    setLoop(persist(next));
    if (!next.lastError) setDraft("");
  }

  if (!ready || !loop) {
    return (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">正在接續今天的任務…</p>
      </SsAppShell>
    );
  }

  const name = loop.studentModel.identity.preferredName || "你";
  const phase = loop.phase;
  const latestTutor = loop.tutorTurns[loop.tutorTurns.length - 1];

  return (
    <SsAppShell showTab={false}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-1 pb-10">
        <header>
          <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            今天的任務 · {loop.mission.subject}
          </p>
          <h1
            className="mt-2 text-[1.55rem] font-semibold text-[var(--ss-fg)]"
            style={{
              fontFamily:
                "var(--font-ss-display), var(--font-ss-sans), system-ui",
              letterSpacing: "var(--ss-tracking-display)",
              lineHeight: "1.28",
            }}
          >
            {loop.mission.title}
          </h1>
        </header>

        {loop.lastError ? (
          <p className="text-[14px] text-[var(--ss-fg-muted)]">{loop.lastError}</p>
        ) : null}

        {phase === "mission_start" ? (
          <section className="space-y-6">
            <SsAiChatBubble role="ai">
              {name}，今天我們要學的是：用自己的話打招呼，並說出為什麼。
              {"\n\n"}
              為什麼重要：能解釋自己的選擇，比背一句「正確句子」更靠近獨立學習。
              {"\n\n"}
              第一步：先寫下你的想法——我不會立刻給完整答案。
            </SsAiChatBubble>
            <p
              className="text-[15px] text-[var(--ss-fg-muted)]"
              style={{ lineHeight: "var(--ss-leading-body)" }}
            >
              {loop.mission.purpose}
            </p>
            <SsButton
              className="w-full"
              onClick={() => update(advancePhase(loop, "orient"))}
            >
              開始今天的任務
            </SsButton>
            <button
              type="button"
              className="w-full text-center text-[13px] text-[var(--ss-fg-muted)] underline-offset-2 hover:underline"
              onClick={() => {
                update(abandonMission(loop));
                router.push("/v1/dashboard");
              }}
            >
              先暫停
            </button>
          </section>
        ) : null}

        {phase === "orient" ? (
          <section className="space-y-6">
            <SsAiChatBubble role="ai">
              {loop.mission.prompt}
              {"\n\n"}
              先想 10 秒也可以。準備好了就寫下來。
            </SsAiChatBubble>
            <SsButton
              className="w-full"
              onClick={() => update(advancePhase(loop, "first_attempt"))}
            >
              我準備好了
            </SsButton>
          </section>
        ) : null}

        {phase === "first_attempt" || phase === "second_attempt" ? (
          <section className="space-y-5">
            <SsAiChatBubble role="ai">
              {phase === "first_attempt"
                ? "寫下你的第一個版本。錯了也沒關係——我想看你怎麼想。"
                : latestTutor?.message ||
                  "根據剛才的引導，再試一次或補充你的理由。"}
            </SsAiChatBubble>
            <textarea
              className="ss-card min-h-[8rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-[1.125rem] py-3.5 text-[15px] text-[var(--ss-fg)] outline-none focus:border-[var(--ss-primary)]/45"
              placeholder={
                phase === "first_attempt"
                  ? "英文 1–2 句 + 為什麼這樣寫"
                  : "修改後的版本，或說明你的理由"
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <SsButton
              className="w-full"
              onClick={() =>
                update(
                  recordStudentAttempt(
                    loop,
                    phase === "first_attempt" ? "first_idea" : "revision",
                    draft,
                  ),
                )
              }
            >
              {phase === "first_attempt" ? "這是我的想法" : "這是我再試一次"}
            </SsButton>
            <button
              type="button"
              className="w-full text-center text-[13px] text-[var(--ss-fg-muted)]"
              onClick={() => update(requestHint(loop))}
            >
              我想要一點提示（不是完整答案）
            </button>
          </section>
        ) : null}

        {phase === "tutor_respond" && latestTutor ? (
          <section className="space-y-6">
            {loop.attempts[loop.attempts.length - 1]?.text ? (
              <SsAiChatBubble role="student">
                {loop.attempts[loop.attempts.length - 1]!.text}
              </SsAiChatBubble>
            ) : null}
            <SsAiChatBubble role="ai">{latestTutor.message}</SsAiChatBubble>
            <SsButton
              className="w-full"
              onClick={() => update(continueAfterTutor(loop))}
            >
              繼續思考
            </SsButton>
          </section>
        ) : null}

        {phase === "apply" ? (
          <section className="space-y-5">
            <SsAiChatBubble role="ai">{applyPromptForSession(loop)}</SsAiChatBubble>
            <textarea
              className="ss-card min-h-[6.5rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-[1.125rem] py-3.5 text-[15px] text-[var(--ss-fg)] outline-none focus:border-[var(--ss-primary)]/45"
              placeholder="一句就好"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <SsButton
              className="w-full"
              onClick={() =>
                update(recordStudentAttempt(loop, "apply", draft))
              }
            >
              完成這一步
            </SsButton>
            <button
              type="button"
              className="w-full text-center text-[13px] text-[var(--ss-fg-muted)]"
              onClick={() => update(advancePhase(loop, "reflection"))}
            >
              今天先跳過應用，直接反思
            </button>
          </section>
        ) : null}

        {phase === "reflection" ? (
          <section className="space-y-5">
            <SsAiChatBubble role="ai">
              快完成了。用很短的話回頭看一下自己——這比「做得好」更有用。
            </SsAiChatBubble>
            <label className="block space-y-2">
              <span className="text-[13px] text-[var(--ss-fg-muted)]">
                什麼變得比較清楚？
              </span>
              <textarea
                className="ss-card min-h-[4rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-4 py-3 text-[15px]"
                value={clearer}
                onChange={(e) => setClearer(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-[13px] text-[var(--ss-fg-muted)]">
                哪裡仍然困難？
              </span>
              <textarea
                className="ss-card min-h-[4rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-4 py-3 text-[15px]"
                value={difficult}
                onChange={(e) => setDifficult(e.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-[13px] text-[var(--ss-fg-muted)]">
                下次你想試什麼不同做法？
              </span>
              <textarea
                className="ss-card min-h-[4rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-4 py-3 text-[15px]"
                value={differently}
                onChange={(e) => setDifferently(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["low", "還不太有把握"],
                  ["medium", "還好"],
                  ["high", "比較有把握"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`rounded-full px-3.5 py-2 text-[13px] ${
                    confidenceNow === id
                      ? "bg-[var(--ss-primary-soft)] ring-1 ring-[var(--ss-primary)]/30"
                      : "bg-[var(--ss-bg-elevated)] text-[var(--ss-fg-muted)]"
                  }`}
                  onClick={() => setConfidenceNow(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <SsButton
              className="w-full"
              onClick={() => {
                const done = completeReflection(loop, {
                  clearer,
                  difficult,
                  differently,
                  confidenceNow,
                });
                if (done.phase === "complete") {
                  syncMissionCompletionToOnboarding(done);
                }
                update(done);
              }}
            >
              完成今天的任務
            </SsButton>
          </section>
        ) : null}

        {phase === "complete" && loop.tomorrowSeed ? (
          <section className="space-y-6">
            <SsAiChatBubble role="ai">
              {name}，今天你完成了一個真實的學習迴路：嘗試 → 思考 → 再試 → 反思。
              {"\n\n"}
              這比拿到標準答案更重要。
            </SsAiChatBubble>
            <div className="space-y-3 border-t border-[var(--ss-border)]/40 pt-6">
              <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
                明天可以這樣開始
              </p>
              <p
                className="text-[16px] text-[var(--ss-fg)]"
                style={{ lineHeight: "1.65" }}
              >
                {loop.tomorrowSeed.focus}
              </p>
              {loop.tomorrowSeed.successfulStrategy ? (
                <p className="text-[14px] text-[var(--ss-fg-muted)]">
                  今天有效的策略：{loop.tomorrowSeed.successfulStrategy}
                </p>
              ) : null}
              {loop.tomorrowSeed.unresolvedDifficulty ? (
                <p className="text-[14px] text-[var(--ss-fg-muted)]">
                  還想照顧的困難：{loop.tomorrowSeed.unresolvedDifficulty}
                </p>
              ) : null}
            </div>
            <Link href="/v1/parent/insight" className="block">
              <SsButton variant="secondary" className="w-full">
                查看家長可見的學習洞察
              </SsButton>
            </Link>
            <Link href="/v1/dashboard" className="block">
              <SsButton className="w-full">回學生首頁</SsButton>
            </Link>
            <Link
              href="/app"
              className="block text-center text-[13px] text-[var(--ss-fg-muted)] underline-offset-2 hover:underline"
            >
              想再自由練習，開啟 AI 夥伴
            </Link>
          </section>
        ) : null}

        {phase === "abandoned" ? (
          <section className="space-y-5">
            <SsAiChatBubble role="ai">
              沒關係，學習可以暫停。你的進度都還在——想回來時，我們從停下來的地方繼續。
            </SsAiChatBubble>
            <SsButton
              className="w-full"
              onClick={() => update(advancePhase(loop, "mission_start"))}
            >
              重新開始今天的任務
            </SsButton>
          </section>
        ) : null}

        {isMissionLoopActive(loop) &&
        phase !== "mission_start" &&
        phase !== "complete" ? (
          <p className="text-center text-[12px] text-[var(--ss-fg-hint)]">
            重新整理也會接續進度 · 狀態會影響下一步引導
          </p>
        ) : null}
      </div>
    </SsAppShell>
  );
}
