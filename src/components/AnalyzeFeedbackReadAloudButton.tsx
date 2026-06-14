"use client";

import { Volume2 } from "@/components/LucideVolume2";
import {
  cancelBrowserTTS,
  speakWithBrowserTTS,
} from "@/lib/speechSynthesis";

/**
 * Read-aloud for analyze feedback — same TTS + icon imports as
 * `StudySignalChatThread` tutor/student replay buttons.
 */
export function AnalyzeFeedbackReadAloudButton({
  text,
  dictationVoiceLang,
  ariaLabel,
  className,
}: {
  text: string;
  dictationVoiceLang: "en-US" | "en-GB";
  ariaLabel: string;
  className: string;
}) {
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        cancelBrowserTTS();
        const t = text.trim();
        if (t) speakWithBrowserTTS(t, dictationVoiceLang);
      }}
    >
      <Volume2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
