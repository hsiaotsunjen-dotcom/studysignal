import type { ChatListItem } from "@/types/chatListItem";
import type { HomeworkReport } from "@/lib/analyzeFeedback";
import {
  buildTutorReplyLanguageInstruction,
  normalizeTutorReplyLanguage,
} from "@/lib/tutorReplyLanguage";

/** Tutor bubble placeholder while `/api/tutor-chat` is in flight. */
export const TUTOR_CHAT_PENDING_BODY = "思考中…";

/**
 * Generic conversational tutor — spoken conversation (not a document generator).
 * Language is NOT hardcoded; append via buildTutorChatGenericSystemPrompt(language).
 */
export const TUTOR_CHAT_GENERIC_SYSTEM_BASE =
  "你是 StudySignal 的英文家教，正在進行口語對話（不是寫文章）。語氣自然、友善。回覆必須 40–80 個字（words），最多 3–5 句短句，不要長段落或條列長文。除非學生明確要求詳細說明，否則禁止寫成 essay。每次回覆結尾必須恰好問一個後續問題。純文字即可，不要 JSON 或程式碼區塊。";

/** max_tokens for normal (non-SAO / non-vision) Tutor chat — sized for 40–80 spoken words. */
export const TUTOR_CHAT_GENERIC_MAX_TOKENS = 180;
/**
 * Full generic system prompt: base role/style + dynamic reply-language rule.
 */
export function buildTutorChatGenericSystemPrompt(language: unknown): string {
  const lang = normalizeTutorReplyLanguage(language);
  return `${TUTOR_CHAT_GENERIC_SYSTEM_BASE}\n${buildTutorReplyLanguageInstruction(lang)}`;
}

/**
 * @deprecated Phase 3 — Tutor homework mode must use SAO via
 * `buildTutorChatSaoSystemPrompt`. Kept only as a non-vision fallback stub.
 */
export const TUTOR_CHAT_HOMEWORK_PHOTO_SYSTEM = `你是 StudySignal 的英文家教。作業作答必須來自已提供的 Student Answer Object（SAO），禁止從照片重新辨識學生答案。`;

/** @deprecated Prefer buildTutorChatSaoSystemPrompt(sao). */
export function buildTutorChatHomeworkSystemPrompt(
  report: HomeworkReport,
): string {
  void report;
  return TUTOR_CHAT_HOMEWORK_PHOTO_SYSTEM;
}

/** Default user text when photos are attached but the student typed nothing. */
export const TUTOR_CHAT_SAO_DEFAULT_USER_TEXT =
  "請根據已提供的學生作答資料（SAO）幫我看看已作答的題目。";

/** Drop in-flight tutor placeholders so they are never sent to the model. */
export function stripPendingTutorPlaceholders(
  items: ChatListItem[],
): ChatListItem[] {
  return items.filter(
    (i) =>
      !(
        i.role === "tutor" &&
        (i.body === TUTOR_CHAT_PENDING_BODY || i.body === "思考中…")
      ),
  );
}

const MAX_TRANSCRIPT_MESSAGES = 40;

/** OpenAI chat message shape for `/api/tutor-chat` (text-only or vision last user turn from client). */
export type TutorChatApiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TutorChatPromptMode = "homework" | "fallback" | "photo";

/**
 * Build OpenAI chat messages: system + prior thread (tutor=assistant, student=user) + latest user text.
 * `language` selects the reply-language instruction (e.g. en-US, en-GB, zh-TW).
 * Caller may replace the last message with multimodal `content` before POSTing.
 * Server re-applies language via the same builder when composing the final system prompt.
 */
export function buildTutorChatOpenAIMessages(
  items: ChatListItem[],
  newUserText: string,
  language: unknown,
): TutorChatApiMessage[] {
  const out: TutorChatApiMessage[] = [
    { role: "system", content: buildTutorChatGenericSystemPrompt(language) },
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
