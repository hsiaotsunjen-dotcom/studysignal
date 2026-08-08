"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  SsAiChatBubble,
  SsAppShell,
  SsButton,
  SsInput,
} from "@/design-system";
import { diagnosticForGoal } from "@/lib/learning/diagnostic";
import { getOnboardingAnalyzer } from "@/lib/learning/ai/OnboardingAnalyzer";
import {
  advanceUi,
  createOnboardingSession,
  markOnboardingComplete,
  patchDraft,
} from "@/lib/learning/onboardingEngine";
import {
  isOnboardingComplete,
  readOnboardingSession,
  writeOnboardingSession,
} from "@/lib/learning/onboardingStore";
import type {
  OnboardingSession,
  OnboardingUiStep,
} from "@/lib/learning/types";

const SUBJECTS = ["英語", "數學", "閱讀", "其他"] as const;

const CONTEXTS = [
  { id: "school", label: "學校課業剛開始 / 跟不上" },
  { id: "exam", label: "考試或作業壓力" },
  { id: "interest", label: "自己想學，沒有急迫期限" },
  { id: "review", label: "複習舊的，想補穩" },
] as const;

const DIFFICULTIES = [
  { id: "easy" as const, label: "還算輕鬆" },
  { id: "ok" as const, label: "普通，有時卡住" },
  { id: "hard" as const, label: "常常覺得很難" },
  { id: "unsure" as const, label: "我不太確定" },
];

const PREFERENCES = [
  { id: "guide" as const, label: "先陪我理清思路" },
  { id: "practice" as const, label: "我想先自己試" },
  { id: "explain" as const, label: "先聽清楚再動手" },
];

function persist(session: OnboardingSession) {
  writeOnboardingSession(session);
  return session;
}

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [diagTurn, setDiagTurn] = useState<"attempt" | "followup" | "confidence">(
    "attempt",
  );
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    const existing = readOnboardingSession();
    if (existing && isOnboardingComplete(existing)) {
      router.replace("/v1/learn/mission");
      return;
    }
    if (existing) {
      setSession(existing);
      if (
        existing.uiStep === "diagnostic" &&
        existing.draft.diagnosticAttempt.trim()
      ) {
        setDiagTurn(
          existing.draft.diagnosticFollowUp.trim() ? "confidence" : "followup",
        );
      }
      return;
    }
    setSession(persist(createOnboardingSession()));
  }, [router]);

  const diagnostic = useMemo(() => {
    if (!session) return null;
    return diagnosticForGoal({
      subject: session.draft.subject || "一般",
    });
  }, [session]);

  function update(next: OnboardingSession) {
    setSession(persist(next));
  }

  function go(step: OnboardingUiStep) {
    if (!session) return;
    update(advanceUi(session, step));
  }

  async function onBuildModel() {
    if (!session) return;
    setBuilding(true);
    // Preserve draft on failure — never invent a Student Model
    try {
      const analysis = await getOnboardingAnalyzer().analyze(session.draft);
      const finalized = {
        ...session,
        diagnostic: analysis.diagnostic,
        signals: analysis.signals,
        studentModel: analysis.studentModel,
        mission: analysis.mission,
        phase: "MODEL_INITIALIZED" as const,
        lastError: null,
      };
      window.setTimeout(() => {
        update(advanceUi(finalized, "mission", "MISSION_CREATED"));
        setBuilding(false);
      }, 700);
    } catch {
      update({
        ...session,
        lastError: "分析暫時失敗。你的回答都還在，可以再試一次。",
        uiStep: "reflect",
      });
      setBuilding(false);
    }
  }

  function enterMission() {
    if (!session) return;
    const complete = markOnboardingComplete(session);
    update(complete);
    router.push("/v1/learn/mission");
  }

  if (!session) {
    return (
      <SsAppShell showTab={false}>
        <p className="text-sm text-[var(--ss-fg-muted)]">正在接續上次進度…</p>
      </SsAppShell>
    );
  }

  const { draft, uiStep } = session;
  const name = draft.preferredName.trim() || "你";

  return (
    <SsAppShell showTab={false}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        {uiStep === "welcome" ? (
          <section className="ss-page-enter space-y-8 pt-4">
            <p
              className="text-[1.65rem] font-semibold text-[var(--ss-fg)]"
              style={{
                fontFamily:
                  "var(--font-ss-display), var(--font-ss-sans), system-ui",
                letterSpacing: "var(--ss-tracking-display)",
                lineHeight: "1.3",
              }}
            >
              StudySignal
            </p>
            <div className="space-y-4">
              <SsAiChatBubble role="ai">
                嗨。我是你的學習夥伴。
                {"\n\n"}
                我不會先考你，也不急著給答案。我想先聽你說：你現在在學什麼、卡在哪裡。
              </SsAiChatBubble>
            </div>
            <SsButton className="w-full" onClick={() => go("identity")}>
              開始認識彼此
            </SsButton>
          </section>
        ) : null}

        {uiStep === "identity" ? (
          <section className="space-y-6 pt-2">
            <SsAiChatBubble role="ai">
              我可以怎麼稱呼你？用暱稱就好。
            </SsAiChatBubble>
            <label className="block space-y-2">
              <span className="text-[13px] text-[var(--ss-fg-muted)]">
                怎麼叫你
              </span>
              <SsInput
                autoFocus
                placeholder="例如：小宇"
                value={draft.preferredName}
                onChange={(e) =>
                  update(patchDraft(session, { preferredName: e.target.value }))
                }
              />
            </label>
            <SsButton
              className="w-full"
              disabled={!draft.preferredName.trim()}
              onClick={() => go("goal")}
            >
              繼續
            </SsButton>
          </section>
        ) : null}

        {uiStep === "goal" ? (
          <section className="space-y-6 pt-2">
            <SsAiChatBubble role="ai">
              {name}，你這陣子最想在哪一塊變強一點？用自己的話說就好。
            </SsAiChatBubble>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => {
                const known = s === "英語" || s === "數學" || s === "閱讀";
                const selected = known
                  ? draft.subject === s
                  : Boolean(
                      draft.subject &&
                        draft.subject !== "英語" &&
                        draft.subject !== "數學" &&
                        draft.subject !== "閱讀",
                    );
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      update(
                        patchDraft(session, {
                          subject: known ? s : draft.subject || "其他",
                        }),
                      )
                    }
                    className={`rounded-full px-4 py-2 text-[14px] transition ${
                      selected
                        ? "bg-[var(--ss-primary-soft)] text-[var(--ss-fg)] ring-1 ring-[var(--ss-primary)]/30"
                        : "bg-[var(--ss-bg-elevated)] text-[var(--ss-fg-muted)]"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {draft.subject &&
            draft.subject !== "英語" &&
            draft.subject !== "數學" &&
            draft.subject !== "閱讀" ? (
              <SsInput
                placeholder="科目或領域"
                value={draft.subject === "其他" ? "" : draft.subject}
                onChange={(e) =>
                  update(
                    patchDraft(session, {
                      subject: e.target.value.trim() || "其他",
                    }),
                  )
                }
              />
            ) : null}
            <label className="block space-y-2">
              <span className="text-[13px] text-[var(--ss-fg-muted)]">
                你想達成什麼
              </span>
              <textarea
                className="ss-card min-h-[6.5rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-[1.125rem] py-3.5 text-[15px] text-[var(--ss-fg)] outline-none focus:border-[var(--ss-primary)]/45 focus:ring-[3px] focus:ring-[var(--ss-primary)]/12"
                placeholder="例如：考試前把分數加減搞懂；或是更敢用英文打招呼"
                value={draft.goalStatement}
                onChange={(e) =>
                  update(patchDraft(session, { goalStatement: e.target.value }))
                }
              />
            </label>
            <SsButton
              className="w-full"
              disabled={
                !draft.subject.trim() ||
                draft.subject === "其他" ||
                !draft.goalStatement.trim()
              }
              onClick={() => go("context")}
            >
              繼續
            </SsButton>
          </section>
        ) : null}

        {uiStep === "context" ? (
          <section className="space-y-6 pt-2">
            <SsAiChatBubble role="ai">
              了解。現在的學習狀況比較接近哪一種？這會影響我怎麼陪你開始。
            </SsAiChatBubble>
            <ul className="space-y-2">
              {CONTEXTS.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`w-full rounded-[var(--ss-radius-lg)] px-4 py-3.5 text-left text-[15px] transition ${
                      draft.learningContext === c.label
                        ? "bg-[var(--ss-primary-soft)] ring-1 ring-[var(--ss-primary)]/30"
                        : "bg-[var(--ss-bg-elevated)] text-[var(--ss-fg)]"
                    }`}
                    onClick={() =>
                      update(patchDraft(session, { learningContext: c.label }))
                    }
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-[var(--ss-fg-muted)]">
              對你來說，這件事目前難度如何？
            </p>
            <div className="flex flex-wrap gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`rounded-full px-3.5 py-2 text-[13px] ${
                    draft.selfPerceivedDifficulty === d.id
                      ? "bg-[var(--ss-primary-soft)] ring-1 ring-[var(--ss-primary)]/30"
                      : "bg-[var(--ss-bg-elevated)] text-[var(--ss-fg-muted)]"
                  }`}
                  onClick={() =>
                    update(
                      patchDraft(session, { selfPerceivedDifficulty: d.id }),
                    )
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-[var(--ss-fg-muted)]">
              剛開始時，你比較喜歡哪種方式？（可之後再改）
            </p>
            <div className="flex flex-col gap-2">
              {PREFERENCES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`rounded-[var(--ss-radius-lg)] px-4 py-3 text-left text-[14px] ${
                    draft.preference === p.id
                      ? "bg-[var(--ss-ai-soft)] ring-1 ring-[var(--ss-ai)]/25"
                      : "bg-[var(--ss-bg-elevated)]"
                  }`}
                  onClick={() =>
                    update(patchDraft(session, { preference: p.id }))
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
            <SsButton
              className="w-full"
              disabled={
                !draft.learningContext || !draft.selfPerceivedDifficulty
              }
              onClick={() => {
                update(advanceUi(session, "diagnostic", "DIAGNOSTIC_STARTED"));
                setDiagTurn("attempt");
              }}
            >
              來一小段練習，讓我更懂你
            </SsButton>
          </section>
        ) : null}

        {uiStep === "diagnostic" && diagnostic ? (
          <section className="space-y-6 pt-2">
            <SsAiChatBubble role="ai">
              這不是考試。我想看看你怎麼想。
              {"\n\n"}
              {diagTurn === "attempt"
                ? diagnostic.prompt
                : diagTurn === "followup"
                  ? diagnostic.followUp
                  : "剛才那一步，你覺得自己把握有多少？"}
            </SsAiChatBubble>

            {diagTurn === "attempt" || diagTurn === "followup" ? (
              <>
                <textarea
                  autoFocus
                  className="ss-card min-h-[7rem] w-full resize-none rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-[1.125rem] py-3.5 text-[15px] text-[var(--ss-fg)] outline-none focus:border-[var(--ss-primary)]/45"
                  placeholder="用自己的話寫就好"
                  value={
                    diagTurn === "attempt"
                      ? draft.diagnosticAttempt
                      : draft.diagnosticFollowUp
                  }
                  onChange={(e) =>
                    update(
                      patchDraft(
                        session,
                        diagTurn === "attempt"
                          ? { diagnosticAttempt: e.target.value }
                          : { diagnosticFollowUp: e.target.value },
                      ),
                    )
                  }
                />
                <SsButton
                  className="w-full"
                  disabled={
                    diagTurn === "attempt"
                      ? draft.diagnosticAttempt.trim().length < 2
                      : draft.diagnosticFollowUp.trim().length < 1
                  }
                  onClick={() => {
                    if (diagTurn === "attempt") setDiagTurn("followup");
                    else setDiagTurn("confidence");
                  }}
                >
                  {diagTurn === "attempt" ? "我想好了" : "繼續"}
                </SsButton>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["low", "不太有把握"],
                      ["medium", "還好"],
                      ["high", "蠻有把握"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`rounded-full px-4 py-2 text-[14px] ${
                        draft.diagnosticConfidence === id
                          ? "bg-[var(--ss-primary-soft)] ring-1 ring-[var(--ss-primary)]/30"
                          : "bg-[var(--ss-bg-elevated)] text-[var(--ss-fg-muted)]"
                      }`}
                      onClick={() =>
                        update(
                          patchDraft(session, { diagnosticConfidence: id }),
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <SsButton
                  className="w-full"
                  disabled={!draft.diagnosticConfidence}
                  onClick={() =>
                    update(
                      advanceUi(session, "reflect", "DIAGNOSTIC_OBSERVED"),
                    )
                  }
                >
                  看看我目前對你的理解
                </SsButton>
              </>
            )}
          </section>
        ) : null}

        {uiStep === "reflect" ? (
          <section className="space-y-6 pt-2">
            <SsAiChatBubble role="ai">
              謝謝你願意說。我不會假裝已經很了解你——有些事還需要一起學。
              {"\n\n"}
              接下來我會整理一份初步理解，並給你今天的第一個任務。
            </SsAiChatBubble>
            {session.lastError ? (
              <p className="text-[14px] text-[var(--ss-fg-muted)]">
                {session.lastError}
              </p>
            ) : null}
            <SsButton
              className="w-full"
              disabled={building}
              onClick={onBuildModel}
            >
              {building ? "正在整理…" : "建立初步理解"}
            </SsButton>
          </section>
        ) : null}

        {uiStep === "mission" && session.studentModel && session.mission ? (
          <section className="space-y-6 pt-2">
            <SsAiChatBubble role="ai">
              {name}，我目前這樣理解你：
              {"\n\n"}
              你想做的事：{session.studentModel.goals.statement}
              {"\n"}
              我們會從「{session.studentModel.subjectContext.subject}
              」開始，一步一步來。
              {"\n\n"}
              還有很多我還沒觀察到——這沒關係，我們邊學邊補。
            </SsAiChatBubble>
            <div className="space-y-3 border-t border-[var(--ss-border)]/40 pt-6">
              <p className="text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
                今天的第一個任務
              </p>
              <h2
                className="text-[1.35rem] font-semibold text-[var(--ss-fg)]"
                style={{
                  fontFamily:
                    "var(--font-ss-display), var(--font-ss-sans), system-ui",
                }}
              >
                {session.mission.title}
              </h2>
              <p
                className="text-[15px] text-[var(--ss-fg-muted)]"
                style={{ lineHeight: "var(--ss-leading-body)" }}
              >
                {session.mission.purpose}
              </p>
              <p
                className="text-[16px] text-[var(--ss-fg)]"
                style={{ lineHeight: "var(--ss-leading-body)" }}
              >
                {session.mission.prompt}
              </p>
            </div>
            <SsButton className="w-full" onClick={enterMission}>
              進入 AI 夥伴，開始任務
            </SsButton>
          </section>
        ) : null}
      </div>
    </SsAppShell>
  );
}
