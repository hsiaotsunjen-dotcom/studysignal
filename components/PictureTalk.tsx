"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Mic, Send, Volume2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLevelLabel, type SchoolLevel } from "@/lib/practice";
import type { BrowserTimerId } from "@/lib/timer";

type PictureTalkProps = {
  level: SchoolLevel;
  modeTitle: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const MOCK_REPLIES = [
  "Good observation! What colors do you notice?",
  "Nice! Can you describe one more detail in English?",
  "Great vocabulary! What do you think is happening in the picture?",
];

export function PictureTalk({ level, modeTitle }: PictureTalkProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const previewRef = useRef<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listeningRef = useRef(false);
  const micTimerRef = useRef<BrowserTimerId | null>(null);

  const revokePreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file?.type.startsWith("image/")) return;

    revokePreview(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
    setMessages([
      { id: "ai-1", role: "assistant", content: "Tell me what you see." },
    ]);
  };

  useEffect(() => {
    return () => {
      revokePreview(previewRef.current);
      if (micTimerRef.current) window.clearTimeout(micTimerRef.current);
    };
  }, [revokePreview]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = useCallback((text: string) => {
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
      sendMessage("I see people and colors in the picture.");
    }, 1400) as BrowserTimerId;
  };

  const speakLastAssistant = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last || typeof window === "undefined" || !window.speechSynthesis)
      return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(last.content);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        title={modeTitle}
        subtitle={getLevelLabel(level)}
        backHref={`/practice/${level}`}
      />

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-6",
          hasConversation
            ? "pb-[calc(7rem+env(safe-area-inset-bottom))]"
            : "pb-6"
        )}
      >
        <div className="mx-auto max-w-2xl space-y-4">
          <Card className="overflow-hidden border-border/60 bg-card/70 shadow-lg shadow-black/10">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto flex-col gap-2 rounded-xl py-4"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium sm:text-sm">
                    Take photo
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-auto flex-col gap-2 rounded-xl py-4"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <ImagePlus className="h-5 w-5 text-sky-400" />
                  <span className="text-xs font-medium sm:text-sm">
                    Upload image
                  </span>
                </Button>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  handleFile(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  handleFile(e.target.files);
                  e.target.value = "";
                }}
              />

              <div
                className={cn(
                  "flex min-h-[200px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/80 bg-secondary/20",
                  previewUrl && "border-solid border-border/60 bg-black/20"
                )}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Homework preview"
                    className="max-h-64 w-full object-contain sm:max-h-72"
                  />
                ) : (
                  <p className="px-4 text-center text-sm text-muted-foreground">
                    Upload or take a photo — your tutor will ask you to
                    describe it
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {hasConversation && (
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full",
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
                          : "rounded-bl-md border border-border/80 bg-card/90 text-card-foreground"
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasConversation && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-end gap-2 px-4 sm:px-6">
            <Button
              type="button"
              variant={isListening ? "default" : "secondary"}
              size="icon"
              className={cn(
                "h-11 w-11 shrink-0 rounded-xl",
                isListening &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
              onClick={handleMic}
              aria-label={isListening ? "Stop recording" : "Microphone"}
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
                    sendMessage(input);
                  }
                }}
                placeholder="Describe the picture…"
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
              aria-label="Listen"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl shadow-md shadow-primary/25"
              disabled={!input.trim()}
              onClick={() => sendMessage(input)}
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
