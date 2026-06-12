"use client";

import { useState } from "react";

/** Phase 1: Chinese → English helper UI (no API). Composer-only; separate chunk from StudySignalHome. */
export default function ChineseIntentComposerCard() {
  const [description, setDescription] = useState("");
  const [ack, setAck] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] p-3 text-[15px] leading-relaxed text-zinc-200 ring-1 ring-teal-500/10 sm:p-3.5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-200/95">
        想不到英文？
      </h3>
      <label className="mb-1 block text-[11px] font-medium text-zinc-500">
        請用中文描述你想表達的意思
      </label>
      <textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value);
          setAck(null);
        }}
        rows={3}
        placeholder={`例如：
我想說的是企業家
我想說的是兆元富翁
我想說的是供應鏈管理`}
        className="mb-3 w-full resize-y rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-0 focus-visible:ring-2 focus-visible:ring-teal-500/30"
        aria-label="Chinese description for English word lookup"
      />
      <button
        type="button"
        onClick={() => {
          const t = description.trim();
          setAck(t.length > 0 ? `You entered: ${t}` : "You entered: ");
        }}
        className="w-full rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 py-2.5 text-sm font-semibold text-teal-100 transition-colors hover:bg-teal-500/25"
      >
        幫我找英文
      </button>
      {ack ? (
        <p
          className="mt-3 whitespace-pre-wrap text-sm text-zinc-300"
          aria-live="polite"
        >
          {ack}
        </p>
      ) : null}
    </div>
  );
}
