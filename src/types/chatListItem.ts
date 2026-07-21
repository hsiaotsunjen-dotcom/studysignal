import type { AnalyzeFeedback } from "@/lib/analyzeFeedback";

/** One row in the StudySignal tutor chat transcript (shared by UI + tutor-chat builder). */
export type ChatListItem =
  | {
      id: string;
      role: "tutor";
      body: string;
      /** If set, speech uses this instead of `body` (e.g. English TTS for Chinese UI). */
      speechText?: string;
      /** Cloud TTS exceeded budget / failed — show Tap to play (no robotic autoplay). */
      awaitingTtsTap?: boolean;
    }
  | {
      id: string;
      role: "student";
      body: string;
      analyzeLoading?: boolean;
      analysis?: AnalyzeFeedback | null;
      analyzeError?: string | null;
      /** `blob:` URL for mic capture tied to this message; StudySignalHome revokes on clear. */
      voiceRecordingObjectUrl?: string | null;
    };
