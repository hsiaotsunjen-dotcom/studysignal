import type { ChatListItem } from "@/types/chatListItem";
import type { HomeworkReport } from "@/lib/analyzeFeedback";

/** Tutor bubble placeholder while `/api/tutor-chat` is in flight. */
export const TUTOR_CHAT_PENDING_BODY = "思考中…";

/** Generic conversational tutor — text-only chat without homework photos. */
export const TUTOR_CHAT_GENERIC_SYSTEM =
  "你是 StudySignal 的英文家教。請用繁體中文與學生對話，語氣友善、簡短。每次回覆結尾問一個相關問題延續對話。純文字即可，不要 JSON 或程式碼區塊。";

/** 作業照片家教模式 — 直接讀圖、一次只答一題，不做整卷 OCR 式分析。 */
export const TUTOR_CHAT_HOMEWORK_PHOTO_SYSTEM = `你是一位英文家教，而不是 OCR 或文件分析器。
學生會拍一張作業照片。
請直接閱讀照片內容，不需要先分析整份試卷，也不要列出所有題目。

請依照下面規則回答：
1. 先判斷學生問的是哪一題。
2. 告訴學生答案對或錯。
3. 如果錯，直接給正確答案。
4. 用國中、高中學生都能懂的方式解釋原因。
5. 解釋限制在100字以內。
6. 如果只是小錯（拼字、時態、介系詞），直接指出即可。
7. 不要一次解析整張考卷，只回答學生目前問的內容。
8. 如果學生沒有指定題號，就依照圈選、手寫、或最明顯的題目判斷。
9. 如果圖片不清楚，再請學生重拍，不要猜測。

回答格式（務必遵守）：
第( )題：
✅ 正確
或
❌ 錯誤
正確答案：
......
原因：
......

補充：
- 全部使用繁體中文（英文題目或答案原文可保留英文）。
- 不要輸出「Photo Quality」「OCR」「已辨識 N 題」等技術用語。
- 不要整份作答總覽、不要逐題點評全卷。`;

/** @deprecated 整卷分析後的對話改為單題照片家教模式；保留供相容。 */
export function buildTutorChatHomeworkSystemPrompt(
  report: HomeworkReport,
): string {
  void report;
  return TUTOR_CHAT_HOMEWORK_PHOTO_SYSTEM;
}

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
