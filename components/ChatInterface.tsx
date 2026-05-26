"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Send, Volume2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLevelLabel, type ModeConfig, type SchoolLevel } from "@/lib/practice";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatInterfaceProps = {
  level: SchoolLevel;
  mode: ModeConfig;
  showScoreLink?: boolean;
};

const MOCK_REPLIES = [
  "That's a great start! Can you tell me a little more?",
  "Nice try! Remember to use full sentences.",
  "Good thinking. What is your main reason?",
  "I like your idea. Can you give one example?",
];

export function ChatInterface({ level, mode, showScoreLink }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: "starter", role: "assistant", content: mode.starterMessage },
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listeningRef = useRef(false);
  const micTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isListening]);

  useEffect(() => {
    return () => {
      if (micTimerRef.current) window.clearTimeout(micTimerRef.current);
    };
  }, []);

  const sendUserMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const reply =
      MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      { id: crypto.randomUUID(), role: "assistant", content: reply },
    ]);
    setInput("");
  }, []);

  const handleMic = () => {
    if (listeningRef.current) {
      listeningRef.current = false;
      if (micTimerRef.current) {
        window.clearTimeout(micTimerRef.current);
        micTimerRef.current = null;
      }
      setIsListening(false);
      return;
    }

    listeningRef.current = true;
    setIsListening(true);
    micTimerRef.current = window.setTimeout(() => {
      listeningRef.current = false;
      setIsListening(false);
      micTimerRef.current = null;
      sendUserMessage("I practiced speaking my answer out loud.");
    }, 1400);
  };

  const speakLastAssistant = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || typeof window === "undefined" || !window.speechSynthesis)
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(last.content);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        title={mode.title}
        subtitle={getLevelLabel(level)}
        backHref={`/practice/${level}`}
      />

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-6",
          showScoreLink
            ? "pb-[calc(12rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(7rem+env(safe-area-inset-bottom))]"
        )}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full duration-200",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className="flex max-w-[90%] flex-col gap-1 sm:max-w-[78%]">
                {message.role === "assistant" && (
                  <span className="px-1 text-xs font-medium text-muted-foreground">
                    StudySignal
                  </span>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm sm:text-base",
                    message.role === "user"
                      ? "rounded-br-md bg-primary text-primary-foreground shadow-primary/20"
                      : "rounded-bl-md border border-border/80 bg-card/90 text-card-foreground backdrop-blur-sm"
                  )}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showScoreLink && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href={`/practice/${level}/${mode.slug}/score`}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "flex h-11 w-full items-center justify-center rounded-xl border border-border/80 bg-card/95 text-sm font-semibold shadow-lg backdrop-blur-md"
              )}
            >
              Finish
            </Link>
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 sm:px-6">
          <Button
            type="button"
            variant={isListening ? "default" : "secondary"}
            size="icon"
            className={cn(
              "h-11 w-11 shrink-0 rounded-xl",
              isListening && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            onClick={handleMic}
            aria-label={isListening ? "Stop recording" : "Start microphone"}
          >
            <Mic className={cn("h-5 w-5", isListening && "animate-pulse")} />
          </Button>

          <div className="flex min-h-11 flex-1 items-center rounded-2xl border border-border/80 bg-card/80 px-3 py-2 shadow-inner">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendUserMessage(input);
                }
              }}
              placeholder="Type your response…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:text-base"
              aria-label="Message input"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            onClick={speakLastAssistant}
            aria-label="Listen to tutor"
          >
            <Volume2 className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl shadow-md shadow-primary/25"
            onClick={() => sendUserMessage(input)}
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
