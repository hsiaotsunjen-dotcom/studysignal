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
        className={`max-w-[85%] rounded-[var(--ss-radius-xl)] px-4 py-3.5 text-[15px] ${
          isAi
            ? "rounded-tl-[var(--ss-radius-sm)] border border-[var(--ss-ai)]/12 bg-[var(--ss-ai-soft)] text-[var(--ss-fg)]"
            : "rounded-tr-[var(--ss-radius-sm)] bg-[var(--ss-primary-soft)] text-[var(--ss-fg)]"
        }`}
        style={{ lineHeight: "var(--ss-leading-body)" }}
      >
        {isAi ? (
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-[var(--ss-ai)]">
            AI 夥伴
          </p>
        ) : null}
        <div className="whitespace-pre-wrap">{children}</div>
      </div>
    </div>
  );
}
