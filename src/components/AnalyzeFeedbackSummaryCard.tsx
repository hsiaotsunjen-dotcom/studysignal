"use client";

import type { AnalyzeFeedback } from "@/lib/analyzeFeedback";

function clampDisplayScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function computeOverallScore(result: AnalyzeFeedback): number {
  const parts = [result.grammar.score, result.fluency.score];
  if (result.pronunciationScores != null) {
    parts.push(result.pronunciationScores.overallScore);
  }
  if (parts.length === 0) return 0;
  const sum = parts.reduce((a, b) => a + b, 0);
  return clampDisplayScore(sum / parts.length);
}

function ScoreCell({
  label,
  score,
  unavailable,
}: {
  label: string;
  score: number | null;
  unavailable?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-zinc-900/40 px-2.5 py-2 text-center ring-1 ring-white/[0.04]">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          unavailable ? "text-zinc-600" : "text-violet-100"
        }`}
      >
        {unavailable || score == null ? "—" : score}
      </p>
    </div>
  );
}

export function AnalyzeFeedbackSummaryCard({
  result,
  className = "",
  onViewFullAnalysis,
}: {
  result: AnalyzeFeedback;
  className?: string;
  onViewFullAnalysis?: () => void;
}) {
  const overall = computeOverallScore(result);
  const grammar = clampDisplayScore(result.grammar.score);
  const fluency = clampDisplayScore(result.fluency.score);
  const pronunciation =
    result.pronunciationScores != null
      ? clampDisplayScore(result.pronunciationScores.overallScore)
      : null;

  return (
    <div
      className={`rounded-2xl border border-violet-500/25 bg-violet-500/[0.06] p-3 ring-1 ring-violet-500/10 sm:p-3.5 ${className}`}
    >
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wider text-violet-200/90">
        分析摘要
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ScoreCell label="Overall" score={overall} />
        <ScoreCell label="Grammar" score={grammar} />
        <ScoreCell
          label="Pronunciation"
          score={pronunciation}
          unavailable={pronunciation == null}
        />
        <ScoreCell label="Fluency" score={fluency} />
      </div>

      {onViewFullAnalysis ? (
        <button
          type="button"
          onClick={onViewFullAnalysis}
          className="mt-3 w-full rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-violet-500/18 touch-manipulation"
        >
          查看完整分析 →
        </button>
      ) : null}
    </div>
  );
}
