import type { ChatListItem } from "@/types/chatListItem";

/** Max student chat bubbles to include when the composer is empty (learning review). */
export const LEARNING_REVIEW_MAX_STUDENT_MESSAGES = 15;

/**
 * Prepended to aggregated chat text for `/api/analyze` (text-only branch).
 * Steers the existing JSON rubric toward conversation review.
 */
export const LEARNING_REVIEW_ANALYZE_PREAMBLE =
  "The following contains up to 15 recent student lines from an English tutoring conversation (chronological). " +
  "Analyze holistically in the required JSON schema. Emphasize: vocabulary level, grammar patterns, fluency, communication ability, critical thinking, and overall tutor-style guidance grounded in these samples. " +
  "Student lines may include image captions or parentheticals; prioritize their English production where possible.\n\n";

/**
 * Returns bodies of the latest `max` student messages (chat order), non-empty trims only.
 * Tutor rows are ignored.
 */
export function getLatestStudentBodiesForLearningReview(
  items: readonly ChatListItem[],
  max: number = LEARNING_REVIEW_MAX_STUDENT_MESSAGES,
): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (item.role !== "student") continue;
    const t = item.body.trim();
    if (t.length > 0) out.push(t);
  }
  if (out.length <= max) return out;
  return out.slice(-max);
}

/** Combined text block for `/api/analyze` when using conversation history (no composer input). */
export function buildLearningReviewAnalyzeText(
  items: readonly ChatListItem[],
): string {
  const parts = getLatestStudentBodiesForLearningReview(items);
  if (parts.length === 0) return "";
  return parts
    .map((body, i) => `【學生第 ${i + 1} 則】\n${body}`)
    .join("\n\n");
}
