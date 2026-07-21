/**
 * Phase 3: Tutor consumes StudentAnswerObject (SAO) as the only answer inventory.
 * Shared formatting must stay aligned with Signals (same overview / counts).
 */

import {
  buildAnswerOverviewFromStudentAnswerObject,
  summarizeStudentAnswerObjectForLog,
  type StudentAnswerObject,
} from "@/lib/studentAnswerObject";

export type TutorSaoInventoryView = {
  version: string;
  photoCount: number;
  questionIds: number[];
  answered: Array<{
    id: number;
    studentAnswer: string;
    confidence: number;
    sourcePhoto: string;
    answerStatus: string;
  }>;
  blank: Array<{ id: number; sourcePhoto: string; answerStatus: string }>;
  overview: string;
  answeredCount: number;
  blankCount: number;
  totalQuestions: number;
};

/** Same answered overview string Signals uses (`1. end\\n9. picture`). */
export function tutorOverviewFromSao(sao: StudentAnswerObject): string {
  return buildAnswerOverviewFromStudentAnswerObject(sao);
}

export function buildTutorSaoInventoryView(
  sao: StudentAnswerObject,
): TutorSaoInventoryView {
  const answered = sao.questions
    .filter(
      (q) =>
        q.answerStatus === "answered" &&
        typeof q.studentAnswer === "string" &&
        q.studentAnswer.trim().length > 0,
    )
    .map((q) => ({
      id: q.id,
      studentAnswer: q.studentAnswer.trim(),
      confidence: q.confidence,
      sourcePhoto: q.sourcePhoto,
      answerStatus: q.answerStatus,
    }));
  const blank = sao.questions
    .filter((q) => q.answerStatus !== "answered" || !q.studentAnswer.trim())
    .map((q) => ({
      id: q.id,
      sourcePhoto: q.sourcePhoto,
      answerStatus: q.answerStatus,
    }));
  return {
    version: sao.version,
    photoCount: sao.photos.length,
    questionIds: sao.questions.map((q) => q.id),
    answered,
    blank,
    overview: tutorOverviewFromSao(sao),
    answeredCount: sao.summary.answered,
    blankCount: sao.summary.blank,
    totalQuestions: sao.summary.totalQuestions,
  };
}

/** Plain-text inventory block embedded in the Tutor system prompt. */
export function formatTutorSaoInventoryForPrompt(
  sao: StudentAnswerObject,
): string {
  const view = buildTutorSaoInventoryView(sao);
  const qRange =
    view.questionIds.length > 0
      ? `${view.questionIds[0]}…${view.questionIds[view.questionIds.length - 1]}`
      : "(none)";
  const answeredLines =
    view.answered.length > 0
      ? view.answered
          .map(
            (q) =>
              `Q${q.id} = ${q.studentAnswer} (confidence=${q.confidence}, sourcePhoto=${q.sourcePhoto || "—"})`,
          )
          .join("\n")
      : "(none)";
  const blankIds = view.blank.map((q) => `Q${q.id}`).join(", ") || "(none)";
  return [
    `SAO version: ${view.version}`,
    `Photo count: ${view.photoCount}`,
    `Question inventory: ${qRange} (${view.totalQuestions} questions)`,
    `Status: ${view.answeredCount} / ${view.totalQuestions} answered`,
    `Blank / not answered count: ${view.blankCount}`,
    `Blank question ids: ${blankIds}`,
    `Answered:`,
    answeredLines,
    `Overview:`,
    view.overview,
  ].join("\n");
}

/**
 * Tutor system prompt — SAO is the only answer inventory.
 * Images (if any) are visual references only.
 */
export function buildTutorChatSaoSystemPrompt(sao: StudentAnswerObject): string {
  const inventory = formatTutorSaoInventoryForPrompt(sao);
  return `你是 StudySignal 的英文家教。Student Answer Object（SAO）是學生作答的唯一真相來源（Single Source of Truth）。

===== SAO（已解析的作業資料 — 唯一依據）=====
${inventory}
===== END SAO =====

嚴格規則：
1. 只能依據上方 SAO 討論題號、學生作答、作答狀態、信心與來源照片。禁止從照片重新辨識、猜測、發現或覆寫任何學生答案。
2. 若訊息中附有作業照片，照片僅供討論筆跡外觀、版面、位置或視覺說明；絕不可用來抽取答案或建立新的作答清單。
3. 禁止「找出最明顯的題」「偵測手寫」「掃描有沒有作答」——這些已由 SAO 完成。
4. 學生未指定題號時，從 SAO 的已作答清單協助（例如 Q1、Q9），不要從影像判斷要先談哪一題。
5. 告訴學生對錯時，以 SAO 的 studentAnswer 為學生實際作答；正確答案可依題意教學，但不可假裝從圖上又讀到不同作答。
6. 一次專注學生目前問的內容；可用繁體中文（英文題目／答案原文可保留英文）。
7. 不要輸出 OCR、Photo Quality、技術除錯用語。

回答格式（學生問特定題時盡量遵守）：
第( )題：
✅ 正確
或
❌ 錯誤
正確答案：
......
原因：
......`;
}

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Development-only Tutor Input dump (never in production). */
export function logTutorSaoDevInput(sao: StudentAnswerObject): void {
  if (!isDev()) return;
  const view = buildTutorSaoInventoryView(sao);
  console.log("==================================================");
  console.log("===== Tutor Input =====");
  console.log("SAO Version:", view.version);
  console.log("Photo Count:", view.photoCount);
  console.log(
    "Question Inventory:",
    view.questionIds.length
      ? `${view.questionIds[0]}…${view.questionIds[view.questionIds.length - 1]}`
      : "(none)",
  );
  console.log("Answered Questions:");
  if (view.answered.length === 0) {
    console.log("  (none)");
  } else {
    for (const q of view.answered) {
      console.log(
        `  Q${q.id} = ${q.studentAnswer} (confidence=${q.confidence}, sourcePhoto=${q.sourcePhoto || "—"})`,
      );
    }
  }
  console.log("Blank Questions:", view.blankCount, "ids:", view.blank.map((q) => `Q${q.id}`).join(", "));
  console.log("Overview:");
  console.log(view.overview);
  console.log(
    "Status:",
    `${view.answeredCount} / ${view.totalQuestions} answered`,
  );
  console.log(
    "Confidence / Source Photos:",
    view.answered.map((q) => `Q${q.id}:${q.confidence}@${q.sourcePhoto || "—"}`).join(", ") ||
      "(none)",
  );
  console.log("saoSummary:", summarizeStudentAnswerObjectForLog(sao));
  console.log("==================================================");
}

/** Strip image base64 from payload logs. */
export function redactTutorMessagesForLog(messages: unknown[]): unknown[] {
  return messages.map((m) => {
    if (!m || typeof m !== "object") return m;
    const msg = m as Record<string, unknown>;
    const content = msg.content;
    if (typeof content === "string") {
      return { role: msg.role, content: content.slice(0, 2000) };
    }
    if (Array.isArray(content)) {
      return {
        role: msg.role,
        content: content.map((part) => {
          if (!part || typeof part !== "object") return part;
          const p = part as Record<string, unknown>;
          if (p.type === "image_url") {
            const url =
              p.image_url &&
              typeof p.image_url === "object" &&
              typeof (p.image_url as { url?: unknown }).url === "string"
                ? (p.image_url as { url: string }).url
                : "";
            return {
              type: "image_url",
              image_url: {
                url: `[redacted data URL length=${url.length}]`,
              },
            };
          }
          if (p.type === "text" && typeof p.text === "string") {
            return { type: "text", text: p.text.slice(0, 2000) };
          }
          return part;
        }),
      };
    }
    return { role: msg.role, content: "(unparsed)" };
  });
}

export function logTutorSaoDevPromptPayloadResponse(input: {
  systemPrompt: string;
  messages: unknown[];
  reply?: string;
}): void {
  if (!isDev()) return;
  console.log("==================================================");
  console.log("===== Tutor Prompt =====");
  console.log(input.systemPrompt);
  console.log("===== Tutor Payload =====");
  console.log(JSON.stringify(redactTutorMessagesForLog(input.messages), null, 2));
  if (typeof input.reply === "string") {
    console.log("===== Tutor Response =====");
    console.log(input.reply);
  }
  console.log("==================================================");
}
