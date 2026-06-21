"use client";

import { computeOverallScore } from "@/components/AnalyzeFeedbackSummaryCard";
import type { AnalyzeHistoryEntry } from "@/types/analyzeHistory";

function formatHistoryTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function historyLabel(entry: AnalyzeHistoryEntry): string {
  const t = entry.label.trim();
  if (!t) return "分析紀錄";
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

export function AnalyzeHistoryList({
  entries,
  selectedId,
  onSelect,
}: {
  entries: AnalyzeHistoryEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="mb-4 shrink-0" aria-label="Analysis history">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Analysis History
      </h3>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const selected = entry.id === selectedId;
          const overall = computeOverallScore(entry.result);
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                aria-current={selected ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors touch-manipulation ${
                  selected
                    ? "border-violet-500/35 bg-violet-500/15 ring-1 ring-violet-500/25"
                    : "border-white/[0.08] bg-black/25 hover:border-white/[0.12] hover:bg-black/35"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tabular-nums ${
                    selected
                      ? "bg-violet-500/25 text-violet-100"
                      : "bg-zinc-800/80 text-zinc-300"
                  }`}
                >
                  {overall}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-100">
                    {historyLabel(entry)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">
                    {formatHistoryTime(entry.createdAt)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
