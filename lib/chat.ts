export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export const INITIAL_ASSISTANT_MESSAGE =
  "Hi! I'm StudySignal English Tutor 👋\nLet's practice English together.";

export function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

export function createInitialMessages(): ChatMessage[] {
  return [createMessage("assistant", INITIAL_ASSISTANT_MESSAGE)];
}

export type ApiChatMessage = {
  role: ChatRole;
  content: string;
};

export function toApiMessages(messages: ChatMessage[]): ApiChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}
