import type { HomeworkMessage } from "@/lib/homework";
import type { HomeworkHistoryItem } from "@/lib/homework-prompt";

export type { HomeworkHistoryItem };

export function toHomeworkHistory(
  messages: HomeworkMessage[]
): HomeworkHistoryItem[] {
  return messages
    .filter((m) => m.id !== "welcome")
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

export async function fetchHomeworkTutor(params: {
  message: string;
  image?: File | null;
  history: HomeworkHistoryItem[];
}): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("message", params.message);
  formData.append("history", JSON.stringify(params.history));
  if (params.image) {
    formData.append("image", params.image);
  }

  const response = await fetch("/api/homework", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to get a tutor response.");
  }

  if (!data.message) {
    throw new Error("No reply received from the tutor.");
  }

  return { message: data.message };
}
