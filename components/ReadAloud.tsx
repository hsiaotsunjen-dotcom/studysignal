"use client";

import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLevelLabel, READ_ALOUD_PASSAGE, type SchoolLevel } from "@/lib/practice";
import type { BrowserTimerId } from "@/lib/timer";

type ReadAloudProps = {
  level: SchoolLevel;
  modeTitle: string;
};

export function ReadAloud({ level, modeTitle }: ReadAloudProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const recordTimerRef = useRef<BrowserTimerId | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearTimeout(recordTimerRef.current);
    };
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    setFeedback(null);
  };

  const handleMic = () => {
    if (!hasStarted) return;
    if (isRecording) {
      if (recordTimerRef.current) {
        window.clearTimeout(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    recordTimerRef.current = window.setTimeout(() => {
      setIsRecording(false);
      recordTimerRef.current = null;
      setFeedback(
        "Nice effort! Try slowing down on \"Sunday\" and stress the first syllable of \"friends.\" Keep your vowels clear on \"went\" and \"park.\""
      );
    }, 1600) as BrowserTimerId;
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        title={modeTitle}
        subtitle={getLevelLabel(level)}
        backHref={`/practice/${level}`}
      />

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-4 sm:px-6">
        <Card className="border-border/60 bg-card/70 shadow-lg shadow-black/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold sm:text-lg">
              Read this passage aloud
            </CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-5 text-lg font-medium leading-relaxed tracking-tight text-foreground sm:text-xl">
              &ldquo;{READ_ALOUD_PASSAGE}&rdquo;
            </blockquote>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            className="h-12 flex-1 rounded-xl text-base font-semibold"
            size="lg"
            onClick={handleStart}
            disabled={hasStarted}
          >
            {hasStarted ? "Ready to read" : "Start Reading"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className={cn(
              "h-12 flex-1 gap-2 rounded-xl text-base font-semibold",
              isRecording &&
                "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/30"
            )}
            onClick={handleMic}
            disabled={!hasStarted}
            aria-label="Microphone for pronunciation check"
          >
            <Mic className={cn("h-5 w-5", isRecording && "animate-pulse")} />
            {isRecording ? "Listening…" : "Check pronunciation"}
          </Button>
        </div>

        {feedback && (
          <Card className="border-primary/25 bg-gradient-to-b from-primary/10 to-card/80 shadow-md">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">
                Pronunciation feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5 pt-0 text-sm leading-relaxed text-foreground sm:text-base">
              {feedback}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
