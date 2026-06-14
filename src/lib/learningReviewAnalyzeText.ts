/**
 * Minimal transcript shape for learning review (no import from `chatListItem` /
 * `analyzeFeedback` graph — avoids client-bundler circular init edge cases).
 */
export type LearningReviewTranscriptItem = {
  role: string;
  body: string;
};

/** Max student chat bubbles to include when the composer is empty (learning review). */
export const LEARNING_REVIEW_MAX_STUDENT_MESSAGES = 15;

/**
 * Prepended to aggregated chat text for `/api/analyze` (text-only branch).
 * Steers the existing JSON rubric toward conversation review.
 */
export const LEARNING_REVIEW_ANALYZE_PREAMBLE =
  "The following contains up to 15 recent student lines from an English tutoring conversation (chronological). " +
  "Analyze holistically in the required JSON schema. Emphasize: vocabulary level, grammar patterns, fluency, communication ability, critical thinking, and overall tutor-style guidance grounded in these samples. " +
  "Student lines may include image captions or parentheticals; prioritize their English production where possible.\n\n" +
  "LEARNING-REVIEW REQUIREMENTS (in addition to the main JSON schema):\n" +
  "- You MUST include top-level key **expression** (same object shape as **fluency**: score, strengths, whyNot100, improvementExamples). Focus on **tone, clarity, dialogue naturalness, and how ideas are communicated** across turns — not isolated word choice already covered under **vocabulary**.\n" +
  "- For **grammar**, **vocabulary**, **fluency**, and **expression**, every string in **whyNot100** MUST follow this **one-string, three-part teacher correction** pattern (use labels 【學生】【改寫】【說明】 in Traditional Chinese, with English inside quotes for examples): " +
  "(1) 【學生】 quote or tightly paraphrase the learner's **actual** words from the excerpts; " +
  "(2) 【改寫】 your **corrected English**; " +
  "(3) 【說明】 one concise Traditional-Chinese sentence on **why** the correction is clearer, more accurate, or more natural — like a real English teacher correcting spoken/written student English. " +
  "Do not write generic score commentary without all three parts.\n\n";

/**
 * Returns bodies of the latest `max` student messages (chat order), non-empty trims only.
 * Tutor rows are ignored.
 */
export function getLatestStudentBodiesForLearningReview(
  items: readonly LearningReviewTranscriptItem[],
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
  items: readonly LearningReviewTranscriptItem[],
): string {
  const parts = getLatestStudentBodiesForLearningReview(items);
  if (parts.length === 0) return "";
  return parts
    .map((body, i) => `【學生第 ${i + 1} 則】\n${body}`)
    .join("\n\n");
}
