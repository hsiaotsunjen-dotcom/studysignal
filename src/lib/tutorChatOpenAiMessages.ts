import type { ChatListItem } from "@/types/chatListItem";
import type { HomeworkReport } from "@/lib/analyzeFeedback";

/** Tutor bubble placeholder while `/api/tutor-chat` is in flight. */
export const TUTOR_CHAT_PENDING_BODY = "思考中…";

/** Generic conversational tutor — NOT for homework image follow-up. */
export const TUTOR_CHAT_GENERIC_SYSTEM =
  "You are StudySignal, a friendly AI English tutor in **tutor conversation mode**. Reply in **English only**. Do not use Chinese, Japanese, or other languages unless the student clearly asks you to use them (e.g. they ask for a Chinese explanation or translation). Keep each reply **short and conversational** (roughly a few sentences, not an essay). End every reply with **exactly one** genuine follow-up question to keep the dialogue going. When the student attaches **images** (homework, worksheets, diagrams, or photos), read them carefully, answer their question or walk through the problem in English, and continue the conversation normally - this is general tutoring, not a separate 'analysis' workflow. Plain text only - no JSON, no markdown code fences.";

/** Drop in-flight tutor placeholders so they are never sent to the model. */
export function stripPendingTutorPlaceholders(
  items: ChatListItem[],
): ChatListItem[] {
  return items.filter(
    (i) =>
      !(
        i.role === "tutor" &&
        (i.body === TUTOR_CHAT_PENDING_BODY || i.body === "思考中...")
      ),
  );
}

const MAX_TRANSCRIPT_MESSAGES = 40;

/** OpenAI chat message shape for `/api/tutor-chat` (text-only or vision last user turn from client). */
export type TutorChatApiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TutorChatPromptMode = "homework" | "fallback";

/** System prompt grounded in analyzed homework — forbids unrelated generic examples. */
export function buildTutorChatHomeworkSystemPrompt(
  report: HomeworkReport,
): string {
  const keyLines = report.keyExplanations
    .slice(0, 5)
    .map(
      (k) =>
        `- ${k.questionLabel}: ${k.correctAnswer}${k.why ? ` (${k.why})` : ""}`,
    )
    .join("\n");
  const learningLines = report.learningSignal.slice(0, 4).join("\n");

  return `You are StudySignal, an English homework tutor in **homework conversation mode**.

The student's worksheet was already analyzed. You MUST stay on THIS homework only.

STRICT RULES:
- Use ONLY the homework context below. Do NOT invent unrelated practice sentences or examples (e.g. "I very like this movie", "The book is interesting", "I have a big dog") unless they literally appear on the student's worksheet.
- Reply in **English only**, short and conversational (a few sentences).
- End with **exactly one** follow-up question about THIS homework.
- Plain text only — no JSON, no markdown code fences.

Homework type: ${report.homeworkType}
Question count: ${report.questionCount}
Image quality: ${report.imageQuality}

Answer overview (from OCR + analysis):
${report.answerOverview}
${report.hintsFirst ? `\nHints for the student:\n${report.hintsFirst}` : ""}
${keyLines ? `\nKey explanations:\n${keyLines}` : ""}
${learningLines ? `\nToday's learning signal:\n${learningLines}` : ""}`;
}

/**
 * Build OpenAI chat messages: system + prior thread (tutor=assistant, student=user) + latest user text.
 * Caller may replace the last message with multimodal `content` before POSTing.
 * Server replaces the system message when homeworkReport is provided.
 */
export function buildTutorChatOpenAIMessages(
  items: ChatListItem[],
  newUserText: string,
): TutorChatApiMessage[] {
  const out: TutorChatApiMessage[] = [
    { role: "system", content: TUTOR_CHAT_GENERIC_SYSTEM },
  ];
  const cleaned = stripPendingTutorPlaceholders(items);
  for (const item of cleaned) {
    if (item.role === "tutor") {
      const c = typeof item.body === "string" ? item.body.trim() : "";
      if (c) out.push({ role: "assistant", content: c });
    } else {
      const c = typeof item.body === "string" ? item.body.trim() : "";
      if (c) out.push({ role: "user", content: c });
    }
  }
  out.push({ role: "user", content: newUserText.trim() });

  const rest = out.slice(1);
  const trimmed =
    rest.length > MAX_TRANSCRIPT_MESSAGES
      ? rest.slice(-MAX_TRANSCRIPT_MESSAGES)
      : rest;
  return [out[0]!, ...trimmed];
}
