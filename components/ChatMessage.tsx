import type { ChatMessage as ChatMessageType } from "@/lib/chat";

type ChatMessageProps = {
  message: ChatMessageType;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
      data-role={message.role}
    >
      <div
        className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {!isUser && (
          <span className="px-1 text-xs font-medium text-zinc-500">
            StudySignal Tutor
          </span>
        )}
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed sm:text-base ${
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
