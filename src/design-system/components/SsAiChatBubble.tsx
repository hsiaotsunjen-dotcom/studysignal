import type { ReactNode } from "react";

export function SsAiChatBubble({
  role,
  children,
}: {
  role: "ai" | "student";
  children: ReactNode;
}) {
  const isAi = role === "ai";
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-[var(--ss-radius-lg)] px-4 py-3 text-[15px] leading-relaxed ${
          isAi
            ? "rounded-tl-md border border-[var(--ss-ai)]/15 bg-[var(--ss-ai-soft)] text-[var(--ss-fg)]"
            : "rounded-tr-md bg-[var(--ss-primary-soft)] text-[var(--ss-fg)]"
        }`}
      >
        {isAi ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ss-ai)]">
            AI 夥伴
          </p>
        ) : null}
        <div className="whitespace-pre-wrap">{children}</div>
      </div>
    </div>
  );
}
