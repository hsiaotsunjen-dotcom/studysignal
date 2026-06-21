import type { AnalyzeFeedback } from "@/lib/analyzeFeedback";

export type AnalyzeHistoryEntry = {
  id: string;
  createdAt: number;
  /** Short label from the analyzed turn (student bubble text). */
  label: string;
  result: AnalyzeFeedback;
};
