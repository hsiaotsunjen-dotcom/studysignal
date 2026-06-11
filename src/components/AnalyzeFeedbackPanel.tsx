"use client";

import type {
  AnalyzeFeedback,
  PronunciationScoresBlock,
  ScoreCategoryFeedback,
} from "@/lib/analyzeFeedback";
import { Volume2 } from "@/components/LucideVolume2";
import { speakWithBrowserTTS } from "@/lib/speechSynthesis";

/** Show IPA with slashes; accepts "ɪˈrɑːn" or "/ɪˈrɑːn/". */
function formatIpaForDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("/") && t.endsWith("/")) return t;
  return `/${t}/`;
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

function ScoreCategoryBlock({
  title,
  subtitle,
  cat,
}: {
  title: string;
  subtitle: string;
  cat: ScoreCategoryFeedback;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">
          {title}
        </h4>
        <p className="text-[11px] text-zinc-500">{subtitle}</p>
      </div>
      <ScoreBar label="分數" value={cat.score} />
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          亮點
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-100/95">
          {cat.strengths.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          為什麼不是 100 分
        </p>
        <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-100/95">
          {cat.whyNot100.map((s, i) => (
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
          {cat.improvementExamples.map((s, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {s}
            </li>
          ))}
        </ul>
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
          依文字內容推估（無音檔時為參考指標）
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
  return (
    <div
      className={`max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-white/[0.08] bg-black/30 p-3 text-[15px] leading-relaxed text-zinc-200 ring-1 ring-white/[0.04] sm:p-4 ${className}`}
    >
      <h3 className="mb-3 text-xs font-medium tracking-wide text-zinc-500">
        家教老師的分析
      </h3>

      {result.pronunciationScores ? (
        <PronunciationScoresSection ps={result.pronunciationScores} />
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
      </div>

      <div className="mb-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
          發音練習重點（3 個字詞）
        </h4>
        <ul className="space-y-3">
          {result.pronunciationFocus.map((item, i) => (
            <li
              key={i}
              className="rounded-xl border border-white/10 bg-zinc-900/50 p-3 text-sm"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-white">{item.word}</p>
                  {item.ipaUs || item.ipaUk ? (
                    <div className="mt-0.5 space-y-0.5 font-mono text-[11px] leading-snug text-zinc-500">
                      {item.ipaUs ? (
                        <p>
                          US: {formatIpaForDisplay(item.ipaUs)}
                        </p>
                      ) : null}
                      {item.ipaUk ? (
                        <p>
                          UK: {formatIpaForDisplay(item.ipaUk)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800/90"
                  aria-label={`Speak practice word: ${item.word}`}
                  onClick={() => {
                    speakWithBrowserTTS(item.word, dictationVoiceLang);
                  }}
                >
                  <Volume2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Reason
              </p>
              <p className="mt-0.5 text-zinc-200/95">{item.reasonToPractice}</p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Tip
              </p>
              <p className="mt-0.5 text-zinc-200/95">{item.pronunciationTip}</p>
            </li>
          ))}
        </ul>
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
    </div>
  );
}
