"use client";

import { useEffect, useRef, type RefObject } from "react";

import { AnalyzeFeedbackPanel } from "@/components/AnalyzeFeedbackPanel";
import { Volume2 } from "@/components/LucideVolume2";
import type { ChatListItem } from "@/types/chatListItem";
import {
  cancelBrowserTTS,
  speakWithBrowserTTS,
} from "@/lib/speechSynthesis";

export type { ChatListItem };

function tutorUtteranceText(item: Extract<ChatListItem, { role: "tutor" }>) {
  return (item.speechText ?? item.body).trim();
}

/** Text suitable for TTS replay of a student bubble (skip image-only placeholder). */
function studentReplayableTextForTts(body: string): string | null {
  const t = body.trim();
  if (!t || t === "（已附加圖片，請分析）") return null;
  return t;
}

export function StudySignalChatThread({
  items,
  scrollParentRef,
  className = "",
  dictationVoiceLang = "en-US",
}: {
  items: ChatListItem[];
  scrollParentRef: RefObject<HTMLDivElement | null>;
  className?: string;
  /** Matches StudySignal dictation language for SpeechSynthesis (en-US / en-GB). */
  dictationVoiceLang?: "en-US" | "en-GB";
}) {
  const welcomeAutoSpokenRef = useRef(false);
  const inlineReplayAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [items, scrollParentRef]);

  useEffect(() => {
    return () => {
      cancelBrowserTTS();
      inlineReplayAudioRef.current?.pause();
      inlineReplayAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const hasWelcome = items.some(
      (i) => i.role === "tutor" && i.id === "welcome",
    );
    if (!hasWelcome) {
      welcomeAutoSpokenRef.current = false;
      return;
    }
    if (welcomeAutoSpokenRef.current) return;
    const welcome = items.find(
      (i): i is Extract<ChatListItem, { role: "tutor" }> =>
        i.role === "tutor" && i.id === "welcome",
    );
    if (!welcome) return;
    welcomeAutoSpokenRef.current = true;
    speakWithBrowserTTS(tutorUtteranceText(welcome), dictationVoiceLang);
  }, [items, dictationVoiceLang]);

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {items.map((item) =>
        item.role === "tutor" ? (
          <div
            key={item.id}
            className="flex max-w-[min(100%,22rem)] flex-col items-start gap-1.5"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Tutor
            </span>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-zinc-900/75 px-3.5 py-2.5 text-[15px] leading-snug text-zinc-100 shadow-inner ring-1 ring-white/[0.04]">
                <p className="whitespace-pre-wrap">{item.body}</p>
              </div>
              <button
                type="button"
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900/80 text-zinc-200 shadow-inner ring-1 ring-white/[0.04] hover:bg-zinc-800/90"
                aria-label="Replay tutor message"
                onClick={() => {
                  inlineReplayAudioRef.current?.pause();
                  inlineReplayAudioRef.current = null;
                  cancelBrowserTTS();
                  speakWithBrowserTTS(
                    tutorUtteranceText(item),
                    dictationVoiceLang,
                  );
                }}
              >
                <Volume2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <div key={item.id} className="flex w-full flex-col gap-2">
            <div className="flex w-full justify-end">
              <div className="flex max-w-[min(100%,22rem)] flex-col items-end gap-1">
                <div className="flex w-full flex-row items-start justify-end gap-2">
                  <div className="min-w-0 flex-1 rounded-2xl border border-violet-500/30 bg-violet-500/15 px-3.5 py-2.5 text-[15px] leading-snug text-zinc-100 shadow-inner ring-1 ring-violet-500/10">
                    <p className="whitespace-pre-wrap text-right">{item.body}</p>
                  </div>
                  <button
                    type="button"
                    className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900/80 text-zinc-200 shadow-inner ring-1 ring-white/[0.04] hover:bg-zinc-800/90"
                    aria-label={
                      item.voiceRecordingObjectUrl
                        ? "Replay student recording"
                        : "Read student message aloud"
                    }
                    onClick={() => {
                      inlineReplayAudioRef.current?.pause();
                      inlineReplayAudioRef.current = null;
                      cancelBrowserTTS();
                      const url = item.voiceRecordingObjectUrl?.trim();
                      if (url) {
                        const audio = new Audio(url);
                        inlineReplayAudioRef.current = audio;
                        audio.addEventListener("ended", () => {
                          if (inlineReplayAudioRef.current === audio) {
                            inlineReplayAudioRef.current = null;
                          }
                        });
                        void audio.play().catch(() => {
                          if (inlineReplayAudioRef.current === audio) {
                            inlineReplayAudioRef.current = null;
                          }
                        });
                      } else {
                        const ttsText = studentReplayableTextForTts(item.body);
                        if (ttsText) {
                          speakWithBrowserTTS(ttsText, dictationVoiceLang);
                        }
                      }
                    }}
                  >
                    <Volume2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <span className="text-right text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Student
                </span>
              </div>
            </div>
            {item.analyzeLoading ? (
              <p className="text-right text-sm text-zinc-400" aria-live="polite">
                分析中…
              </p>
            ) : null}
            {item.analyzeError ? (
              <p
                className="text-right text-sm text-amber-400/95"
                role="alert"
              >
                {item.analyzeError}
              </p>
            ) : null}
            {item.analysis ? (
              <div className="w-full min-w-0">
                <AnalyzeFeedbackPanel
                  result={item.analysis}
                  className="max-h-[min(55vh,480px)]"
                  dictationVoiceLang={dictationVoiceLang}
                />
              </div>
            ) : null}
          </div>
        )
      )}
    </div>
  );
}
