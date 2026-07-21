"use client";

import { Volume2 } from "@/components/LucideVolume2";
import { speakWithBrowserTTS } from "@/lib/speechSynthesis";
import { cancelTutorAudio } from "@/lib/tts/client";

/**
 * Read-aloud for analyze feedback — same icon as chat replay buttons.
 * Not Tutor speech (browser TTS). Cancels Tutor cloud audio to avoid overlap.
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
        cancelTutorAudio();
        const t = text.trim();
        if (t) speakWithBrowserTTS(t, dictationVoiceLang);
      }}
    >
      <Volume2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
