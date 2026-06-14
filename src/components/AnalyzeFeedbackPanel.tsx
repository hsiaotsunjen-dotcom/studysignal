"use client";

import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { AnalyzeFeedbackReadAloudButton } from "@/components/AnalyzeFeedbackReadAloudButton";
import type {
  AnalyzeFeedback,
  ImageInsights,
  LearningSummaryBlock,
  PronunciationScoresBlock,
  ScoreCategoryFeedback,
  TutorModelAnswerBlock,
} from "@/lib/analyzeFeedback";
import { Volume2 } from "@/components/LucideVolume2";
import { speakWithBrowserTTS } from "@/lib/speechSynthesis";

/** Show IPA with slashes; accepts "ɪˈrɑːn" or "/ɪˈrɑːn/". Model may send numbers — never call .trim on non-strings. */
function formatIpaForDisplay(raw: unknown): string {
  const t =
    typeof raw === "string"
      ? raw.trim()
      : raw == null
        ? ""
        : typeof raw === "number" || typeof raw === "boolean"
          ? String(raw).trim()
          : "";
  if (!t) return "";
  if (t.startsWith("/") && t.endsWith("/")) return t;
  return `/${t}/`;
}

class AnalyzeFeedbackRenderBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[AnalyzeFeedbackPanel] render error", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-semibold text-rose-200">分析結果顯示時發生錯誤</p>
          <p className="mt-2 text-rose-100/90">
            請重新整理頁面後再試一次。若持續發生，請回報此訊息：
          </p>
          <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all text-xs text-rose-200/80">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-zinc-200">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600/90 to-sky-500/80 transition-[width]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function safeStringList(xs: string[] | undefined): string[] {
  if (!Array.isArray(xs)) return [];
  return xs.filter((x): x is string => typeof x === "string");
}

function ScoreCategoryBlock({
  title,
  subtitle,
  cat,
}: {
  title: string;
  subtitle: string;
  cat: ScoreCategoryFeedback;
}) {
  const strengths = safeStringList(cat.strengths);
  const whyNot100 = safeStringList(cat.whyNot100);
  const improvementExamples = safeStringList(cat.improvementExamples);
  const score =
    typeof cat.score === "number" && Number.isFinite(cat.score)
      ? cat.score
      : 0;

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">
          {title}
        </h4>
        <p className="text-[11px] text-zinc-500">{subtitle}</p>
      </div>
      <ScoreBar label="分數" value={score} />
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          亮點
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-100/95">
          {strengths.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          具體改進（像老師改句子）
        </p>
        <p className="mb-1.5 text-[10px] leading-snug text-zinc-600">
          每點盡量包含：①學生實際用語（引用原文）②改好的英文
          ③一句繁體說明為何更好
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-100/95">
          {whyNot100.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          改進範例
        </p>
        <ul className="list-decimal space-y-1.5 pl-4 text-sm text-zinc-100/95">
          {improvementExamples.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LearningSummarySection({
  summary,
}: {
  summary: LearningSummaryBlock;
}) {
  const strengths = safeStringList(summary.strengths);
  const weaknesses = safeStringList(summary.weaknesses);
  const whatToPracticeNext = safeStringList(summary.whatToPracticeNext);

  return (
    <div className="mb-4 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.07] p-3 ring-1 ring-violet-500/10">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-200/95">
          學習摘要 Learning summary
        </h4>
        <p className="text-[11px] text-zinc-500">
          優勢、待加強與下一步練習方向
        </p>
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-400/90">
          優勢 Strengths
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-zinc-100/95">
          {strengths.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400/90">
          待加強 Weaknesses
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-zinc-100/95">
          {weaknesses.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-sky-400/90">
          下一步練習 What to practice next
        </p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-zinc-100/95">
          {whatToPracticeNext.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TutorModelAnswerSection({
  block,
  dictationVoiceLang,
}: {
  block: TutorModelAnswerBlock;
  dictationVoiceLang: "en-US" | "en-GB";
}) {
  const rows: { label: string; body: string; showTts: boolean }[] = [
    { label: "學生版本 Student", body: block.studentVersion, showTts: true },
    { label: "更好版本 Better", body: block.betterVersion, showTts: true },
    {
      label: "母語感版本 Native-like",
      body: block.nativeLikeVersion,
      showTts: false,
    },
  ];
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3 ring-1 ring-sky-500/10">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-200/95">
          家教示範句 Tutor model answer
        </h4>
        <p className="text-[11px] text-zinc-500">
          同一個意思，三種表達深度
        </p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-white/[0.06] bg-black/25 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {row.label}
              </p>
              {row.showTts ? (
                <AnalyzeFeedbackReadAloudButton
                  text={row.body}
                  dictationVoiceLang={dictationVoiceLang}
                  ariaLabel={`Read aloud: ${row.label}`}
                  className="-mt-0.5 -mr-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900/80 text-zinc-200 shadow-inner ring-1 ring-white/[0.04] hover:bg-zinc-800/90"
                />
              ) : null}
            </div>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/95">
              {row.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageInsightsSection({ insights }: { insights: ImageInsights }) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3 ring-1 ring-amber-500/10">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-200/95">
          圖片分析 Image
        </h4>
        <p className="text-[11px] text-zinc-500">OCR 與畫面重點（繁體中文）</p>
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          圖中文字／OCR
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/95">
          {insights.ocrText}
        </p>
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          畫面說明
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/95">
          {insights.visualSummaryZh}
        </p>
      </div>
    </div>
  );
}

function PronunciationScoresSection({ ps }: { ps: PronunciationScoresBlock }) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 ring-1 ring-sky-500/10">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-200/95">
          發音評分 Pronunciation
        </h4>
        <p className="text-[11px] text-zinc-500">
          依本次錄音與轉寫內容評估（非純文字推測）
        </p>
      </div>
      <div className="flex items-end justify-between gap-3 border-b border-white/[0.06] pb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          總分 Overall
        </span>
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-white">
          {ps.overallScore}
        </span>
      </div>
      <div className="space-y-2.5">
        <ScoreBar label="準確度 Accuracy" value={ps.accuracy} />
        <ScoreBar label="流利度 Fluency（發音）" value={ps.fluency} />
        <ScoreBar label="清晰度 Clarity" value={ps.clarity} />
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          發音回饋
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/95">
          {ps.feedback}
        </p>
      </div>
    </div>
  );
}

export function AnalyzeFeedbackPanel({
  result,
  className = "",
  dictationVoiceLang = "en-US",
}: {
  result: AnalyzeFeedback;
  className?: string;
  /** Matches StudySignal dictation language for SpeechSynthesis (en-US / en-GB). */
  dictationVoiceLang?: "en-US" | "en-GB";
}) {
  const pronunciationFocus = Array.isArray(result.pronunciationFocus)
    ? result.pronunciationFocus
    : [];

  return (
    <div
      className={`max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/30 p-3 text-[15px] leading-relaxed text-zinc-200 ring-1 ring-white/[0.04] sm:p-4 ${className}`}
    >
      <h3 className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        家教老師的分析
      </h3>

      <AnalyzeFeedbackRenderBoundary>
      {result.imageInsights ? (
        <ImageInsightsSection insights={result.imageInsights} />
      ) : null}

      {result.pronunciationScores ? (
        <PronunciationScoresSection ps={result.pronunciationScores} />
      ) : null}

      {result.learningSummary ? (
        <LearningSummarySection summary={result.learningSummary} />
      ) : null}

      {result.tutorModelAnswer ? (
        <TutorModelAnswerSection
          block={result.tutorModelAnswer}
          dictationVoiceLang={dictationVoiceLang}
        />
      ) : null}

      <div className="mb-4 space-y-4">
        <ScoreCategoryBlock
          title="語法 Grammar"
          subtitle="文法結構與正確性"
          cat={result.grammar}
        />
        <ScoreCategoryBlock
          title="單字 Vocabulary"
          subtitle="用字與詞彙廣度"
          cat={result.vocabulary}
        />
        <ScoreCategoryBlock
          title="流利度 Fluency"
          subtitle="句子是否自然、銜接是否順"
          cat={result.fluency}
        />
        {result.expression ? (
          <ScoreCategoryBlock
            title="表達 Expression"
            subtitle="口吻、清楚度、對話感與整體溝通"
            cat={result.expression}
          />
        ) : null}
      </div>

      <div className="mb-4">
        {result.pronunciationScores || pronunciationFocus.length > 0 ? (
          <>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              {result.pronunciationScores
                ? "發音練習重點"
                : "發音練習重點（依你的英文用字）"}
              {pronunciationFocus.length > 0
                ? `（${pronunciationFocus.filter((x) => x.word !== "—").length || pronunciationFocus.length} 個字詞）`
                : null}
            </h4>
            <p className="mb-3 text-[11px] leading-snug text-zinc-500">
              {result.pronunciationScores
                ? "依本次錄音與轉寫：IPA（US／UK）與練習建議。"
                : "從你的英文句子挑出較難的字詞：General American 與 RP 的 IPA（僅供朗讀參考，非錄音診斷）。"}
            </p>
            <ul className="space-y-3">
              {pronunciationFocus.map((item, i) => {
                if (item.word === "—" && !item.ipaUs && !item.ipaUk) {
                  return null;
                }
                const speakWord =
                  typeof item.word === "string" ? item.word : String(item.word ?? "");
                return (
                  <li
                    key={i}
                    className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-sm"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-white">
                          {speakWord}
                        </p>
                        {item.ipaUs || item.ipaUk ? (
                          <div className="mt-0.5 space-y-0.5 font-mono text-[11px] leading-snug text-zinc-500">
                            {item.ipaUs ? (
                              <p>US: {formatIpaForDisplay(item.ipaUs)}</p>
                            ) : null}
                            {item.ipaUk ? (
                              <p>UK: {formatIpaForDisplay(item.ipaUk)}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800/90"
                        aria-label={`Speak practice word: ${speakWord}`}
                        onClick={() => {
                          speakWithBrowserTTS(speakWord, dictationVoiceLang);
                        }}
                      >
                        <Volume2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Reason
                    </p>
                    <p className="mt-0.5 text-zinc-200/95">
                      {typeof item.reasonToPractice === "string"
                        ? item.reasonToPractice
                        : String(item.reasonToPractice ?? "")}
                    </p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                      Tip
                    </p>
                    <p className="mt-0.5 text-zinc-200/95">
                      {typeof item.pronunciationTip === "string"
                        ? item.pronunciationTip
                        : String(item.pronunciationTip ?? "")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/35 px-3 py-4 text-center text-sm text-zinc-400">
            本次未列出發音練習字詞（純圖片分析、未附錄音、或模型未產出字詞表）。
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-100/95">
        <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400/90">
          老師的話（依你的內容量身）
        </p>
        <div className="space-y-3 text-zinc-100/95">
          <div>
            <p className="text-xs font-semibold text-emerald-200/90">
              哪裡做得好
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">
              {result.tutorComment.whatWentWell}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-200/90">
              最大的進步空間
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">
              {result.tutorComment.biggestImprovementOpportunity}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-200/90">
              下次可以試試
            </p>
            <p className="mt-1 whitespace-pre-wrap leading-relaxed">
              {result.tutorComment.whatToTryNextTime}
            </p>
          </div>
        </div>
      </div>
      </AnalyzeFeedbackRenderBoundary>
    </div>
  );
}
