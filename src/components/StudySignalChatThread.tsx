"use client";

import { useEffect, type RefObject } from "react";

import { AnalyzeFeedbackPanel } from "@/components/AnalyzeFeedbackPanel";
import type { AnalyzeFeedback } from "@/lib/analyzeFeedback";

export type ChatListItem =
  | { id: string; role: "tutor"; body: string }
  | {
      id: string;
      role: "student";
      body: string;
      analyzeLoading?: boolean;
      analysis?: AnalyzeFeedback | null;
      analyzeError?: string | null;
    };

export function StudySignalChatThread({
  items,
  scrollParentRef,
  className = "",
}: {
  items: ChatListItem[];
  scrollParentRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  useEffect(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, scrollParentRef]);

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {items.map((item) =>
        item.role === "tutor" ? (
          <div
            key={item.id}
            className="flex max-w-[min(100%,22rem)] flex-col items-start gap-1.5"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Tutor
            </span>
            <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/75 px-3.5 py-2.5 text-[15px] leading-snug text-zinc-100 shadow-inner ring-1 ring-white/[0.04]">
              <p className="whitespace-pre-wrap">{item.body}</p>
            </div>
          </div>
        ) : (
          <div key={item.id} className="flex w-full flex-col gap-2">
            <div className="flex w-full justify-end">
              <div className="inline-flex max-w-[min(100%,20rem)] flex-col items-stretch gap-1">
                <div className="rounded-2xl border border-violet-500/30 bg-violet-500/15 px-3.5 py-2.5 text-[15px] leading-snug text-zinc-100 shadow-inner ring-1 ring-violet-500/10">
                  <p className="whitespace-pre-wrap text-right">{item.body}</p>
                </div>
                <span className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Student
                </span>
              </div>
            </div>
            {item.analyzeLoading ? (
              <p className="text-right text-sm text-zinc-400" aria-live="polite">
                分析中…
              </p>
            ) : null}
            {item.analyzeError ? (
              <p
                className="text-right text-sm text-amber-400/95"
                role="alert"
              >
                {item.analyzeError}
              </p>
            ) : null}
            {item.analysis ? (
              <div className="w-full min-w-0">
                <AnalyzeFeedbackPanel
                  result={item.analysis}
                  className="max-h-[min(55vh,480px)]"
                />
              </div>
            ) : null}
          </div>
        )
      )}
    </div>
  );
}
