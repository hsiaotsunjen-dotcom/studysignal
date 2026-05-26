"use client";

import { useEffect, useRef } from "react";
import type { HomeworkMessage } from "@/lib/homework";

type HomeworkResponseAreaProps = {
  messages: HomeworkMessage[];
  isLoading?: boolean;
};

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-zinc-800 px-4 py-3 ring-1 ring-zinc-700/80">
        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: HomeworkMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      data-role={message.role}
    >
      <div
        className={`flex max-w-[92%] flex-col gap-2 sm:max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {!isUser && (
          <span className="px-1 text-xs font-medium text-zinc-500">
            StudySignal Tutor
          </span>
        )}
        {message.imagePreviewUrl && (
          <div
            className={`overflow-hidden rounded-xl ring-1 ring-zinc-700/80 ${
              isUser ? "rounded-br-md" : "rounded-bl-md"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imagePreviewUrl}
              alt="Uploaded homework"
              className="max-h-48 w-full object-cover sm:max-h-56"
            />
          </div>
        )}
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
            isUser
              ? "rounded-br-md bg-emerald-600 text-white"
              : "rounded-bl-md bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700/80"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

export function HomeworkResponseArea({
  messages,
  isLoading = false,
}: HomeworkResponseAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
    </div>
  );
}
