"use client";

import { useCallback, useRef, useState } from "react";

type ChatInputProps = {
  placeholder?: string;
  disabled?: boolean;
  onSubmit?: (text: string) => void;
  onAttach?: () => void;
  onMicrophone?: () => void;
  onVoice?: () => void;
};

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
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
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function IconVoice({ className }: { className?: string }) {
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
      <path d="M4 10v4" />
      <path d="M8 8v8" />
      <path d="M12 6v12" />
      <path d="M16 8v8" />
      <path d="M20 10v4" />
    </svg>
  );
}

export function ChatInput({
  placeholder = "Message StudySignal…",
  disabled = false,
  onSubmit,
  onAttach,
  onMicrophone,
  onVoice,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    resizeTextarea();
  };

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const actionButtonClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-700/60 hover:text-zinc-100 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 disabled:pointer-events-none disabled:opacity-40 sm:h-10 sm:w-10";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50"
      role="region"
      aria-label="Chat input"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
        <div className="flex items-end gap-1.5 rounded-[1.75rem] border border-zinc-700/70 bg-zinc-800/95 px-2 py-2 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md sm:gap-2 sm:rounded-[1.85rem] sm:px-3 sm:py-2.5">
          <button
            type="button"
            onClick={onAttach}
            disabled={disabled}
            className={actionButtonClass}
            aria-label="Add attachment"
          >
            <IconPlus className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="max-h-[120px] min-h-[36px] flex-1 resize-none self-center border-0 bg-transparent py-2 text-[15px] leading-snug text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-0 disabled:opacity-50 sm:min-h-[40px] sm:text-base"
            aria-label="Message input"
          />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={onMicrophone}
              disabled={disabled}
              className={actionButtonClass}
              aria-label="Voice input"
            >
              <IconMic className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
            </button>
            <button
              type="button"
              onClick={onVoice}
              disabled={disabled}
              className={`${actionButtonClass} bg-zinc-100 text-zinc-900 hover:bg-white hover:text-zinc-900 disabled:bg-zinc-700 disabled:text-zinc-500`}
              aria-label="Voice mode"
            >
              <IconVoice className="h-5 w-5 sm:h-[22px] sm:w-[22px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
