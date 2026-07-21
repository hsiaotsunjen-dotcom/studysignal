import { describe, expect, it } from "vitest";

import {
  buildTutorChatGenericSystemPrompt,
  buildTutorChatOpenAIMessages,
  TUTOR_CHAT_GENERIC_SYSTEM_BASE,
} from "@/lib/tutorChatOpenAiMessages";
import {
  buildTutorReplyLanguageInstruction,
  normalizeTutorReplyLanguage,
  TUTOR_REPLY_LANGUAGE_INSTRUCTIONS,
} from "@/lib/tutorReplyLanguage";

describe("tutorReplyLanguage", () => {
  it("maps known codes to instructions", () => {
    expect(buildTutorReplyLanguageInstruction("en-US")).toBe(
      "Always reply in American English.",
    );
    expect(buildTutorReplyLanguageInstruction("en-GB")).toBe(
      "Always reply in British English.",
    );
    expect(buildTutorReplyLanguageInstruction("zh-TW")).toBe(
      "請使用繁體中文回答。",
    );
  });

  it("defaults unknown / empty to en-US", () => {
    expect(normalizeTutorReplyLanguage(undefined)).toBe("en-US");
    expect(normalizeTutorReplyLanguage("")).toBe("en-US");
    expect(normalizeTutorReplyLanguage("ja-JP")).toBe("en-US");
  });

  it("exposes a single map for future languages", () => {
    expect(TUTOR_REPLY_LANGUAGE_INSTRUCTIONS["en-US"]).toBeTruthy();
  });
});

describe("buildTutorChatOpenAIMessages language", () => {
  it("does not hardcode Traditional Chinese in the base prompt", () => {
    expect(TUTOR_CHAT_GENERIC_SYSTEM_BASE).not.toMatch(/繁體中文/);
    expect(buildTutorChatGenericSystemPrompt("en-US")).toContain(
      "Always reply in American English.",
    );
    expect(buildTutorChatGenericSystemPrompt("en-US")).not.toMatch(/繁體中文/);
  });

  it("embeds the selected language in the system message", () => {
    const msgs = buildTutorChatOpenAIMessages([], "Tell me about Taiwan.", "en-US");
    expect(msgs[0]?.role).toBe("system");
    expect(msgs[0]?.content).toBe(buildTutorChatGenericSystemPrompt("en-US"));
    expect(msgs[msgs.length - 1]?.content).toBe("Tell me about Taiwan.");
  });

  it("uses British English instruction when en-GB is selected", () => {
    const msgs = buildTutorChatOpenAIMessages([], "Hello", "en-GB");
    expect(msgs[0]?.content).toContain("Always reply in British English.");
  });
});
