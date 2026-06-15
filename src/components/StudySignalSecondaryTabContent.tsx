"use client";

/** Placeholder tab body for Tools — mock cards only (no backend). */

function MockCard({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4 shadow-inner ring-1 ring-white/[0.04]">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
        {subtitle}
      </p>
      <div className="mt-3 h-16 rounded-xl border border-dashed border-white/10 bg-zinc-900/40" />
    </div>
  );
}

export function ToolsTabContent() {
  return (
    <div className="flex min-h-0 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
      <div className="mx-auto w-full max-w-lg">
        <p className="text-xs font-medium uppercase tracking-wider text-sky-400/90">
          Tools
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
          Independent tools
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Mock layout — advanced flows stay off the Talk tab.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <MockCard
            title="OCR"
            subtitle="Photo and worksheet text — coming here from Talk."
          />
          <MockCard
            title="Vocabulary analyzer"
            subtitle="Deep dive on words and usage."
          />
          <MockCard
            title="Sentence analyzer"
            subtitle="Grammar and style for a sentence or paragraph."
          />
          <MockCard
            title="Reading assistant"
            subtitle="Guided reading support."
          />
          <MockCard
            title="Writing assistant"
            subtitle="Outlines, tone, and revision help."
          />
        </div>
      </div>
    </div>
  );
}
