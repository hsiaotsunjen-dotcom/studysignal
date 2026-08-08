import type { LearningGoal } from "@/lib/learning/types";

export type DiagnosticPrompt = {
  id: string;
  prompt: string;
  followUp: string;
  /** Loose keywords that suggest a reasonable attempt — not a score */
  softHints: string[];
};

const BY_SUBJECT: Record<string, DiagnosticPrompt> = {
  英語: {
    id: "en-think-1",
    prompt:
      "想像你要跟一位新朋友打招呼。用你自己的話寫一句英文（錯了也沒關係），並簡單說說你為什麼這樣寫。",
    followUp: "如果對方聽不懂，你會怎麼換一種說法？",
    softHints: ["hello", "hi", "nice", "meet", "你好", "hello"],
  },
  數學: {
    id: "math-think-1",
    prompt:
      "小明有 12 顆糖，分給 3 位朋友，每人一樣多。你覺得每人幾顆？請寫出你的想法（可以算式或文字）。",
    followUp: "如果改成「分給 4 位朋友」，你會怎麼想？",
    softHints: ["4", "四", "12/3", "12÷3", "除"],
  },
  閱讀: {
    id: "read-think-1",
    prompt:
      "讀完一段故事後，你通常會先記得什麼？用一兩句話說說你記得故事的方法。",
    followUp: "如果故事裡有一個你不懂的詞，你會怎麼辦？",
    softHints: ["角色", "結局", "重點", "情節", "問", "查"],
  },
};

const FALLBACK: DiagnosticPrompt = {
  id: "general-think-1",
  prompt:
    "想想一件你最近學過、或想學的事情。用自己的話說明：你已經懂哪一部分？哪一部分還不清楚？",
  followUp: "如果只能問我一個問題來幫助你，你會問什麼？",
  softHints: [],
};

export function diagnosticForGoal(goal: Pick<LearningGoal, "subject">): DiagnosticPrompt {
  const key = goal.subject.trim();
  return BY_SUBJECT[key] ?? FALLBACK;
}
