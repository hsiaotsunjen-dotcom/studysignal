"use client";

import { useCallback, useRef, useState } from "react";

type HomeworkInputBarProps = {
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: (text: string) => void;
};

export function HomeworkInputBar({
  placeholder = "Ask about your homework…",
  disabled = false,
  onSubmit,
}: HomeworkInputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleSubmit = () => {
    if (disabled) return;
    const text = value.trim();
    if (!text) return;
    onSubmit?.(text);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50"
      role="region"
      aria-label="Homework message input"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
        <div className="flex items-end gap-2 rounded-[1.75rem] border border-zinc-700/70 bg-zinc-800/95 px-3 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-[1.85rem] sm:px-4 sm:py-2.5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              setValue(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            className="max-h-[120px] min-h-[40px] flex-1 resize-none border-0 bg-transparent py-2 text-[15px] leading-snug text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 disabled:opacity-50 sm:text-base"
            aria-label="Message input"
          />
          <button
            type="button"
            disabled={disabled || !value.trim()}
            onClick={handleSubmit}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m5 12 14-7-7 7 7 7-7 7z" />
      <path d="M5 12h14" />
    </svg>
  );
}
