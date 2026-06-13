import type { ChatListItem } from "@/types/chatListItem";

/** Tutor bubble placeholder while `/api/tutor-chat` is in flight. */
export const TUTOR_CHAT_PENDING_BODY = "思考中…";

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

/**
 * Build OpenAI chat messages: system + prior thread (tutor=assistant, student=user) + latest user text.
 * Caller may replace the last message with multimodal `content` before POSTing.
 */
export function buildTutorChatOpenAIMessages(
  items: ChatListItem[],
  newUserText: string,
): TutorChatApiMessage[] {
  const system =
    "You are StudySignal, a friendly AI English tutor in **tutor conversation mode**. Reply in **English only**. Do not use Chinese, Japanese, or other languages unless the student clearly asks you to use them (e.g. they ask for a Chinese explanation or translation). Keep each reply **short and conversational** (roughly a few sentences, not an essay). End every reply with **exactly one** genuine follow-up question to keep the dialogue going. When the student attaches **images** (homework, worksheets, diagrams, or photos), read them carefully, answer their question or walk through the problem in English, and continue the conversation normally - this is general tutoring, not a separate 'analysis' workflow. Plain text only - no JSON, no markdown code fences.";
  const out: TutorChatApiMessage[] = [{ role: "system", content: system }];
  const cleaned = stripPendingTutorPlaceholders(items);
  for (const item of cleaned) {
    if (item.role === "tutor") {
      const c = item.body.trim();
      if (c) out.push({ role: "assistant", content: c });
    } else {
      const c = item.body.trim();
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
