export type HomeworkMessageRole = "user" | "assistant";

export type HomeworkMessage = {
  id: string;
  role: HomeworkMessageRole;
  content: string;
  imagePreviewUrl?: string;
};

export const INITIAL_HOMEWORK_MESSAGE: HomeworkMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! Upload a photo of your homework and I'll help you learn — not just give answers. 📚",
};

export function createHomeworkMessage(
  role: HomeworkMessageRole,
  content: string,
  imagePreviewUrl?: string
): HomeworkMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...(imagePreviewUrl ? { imagePreviewUrl } : {}),
  };
}
