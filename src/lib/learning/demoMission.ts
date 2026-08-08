import { createSessionId } from "@/lib/learning/onboardingStore";
import type { LearningStateId, Mission, StudentModel } from "@/lib/learning/types";

/**
 * One deterministic demonstration mission (English self-intro).
 * Proves the full loop — not a content library.
 */
export function buildDemoMission(
  model: StudentModel,
  learningState: LearningStateId,
): Mission {
  const name = model.identity.preferredName || "你";
  let difficulty: Mission["difficulty"] = "gentle";
  if (learningState === "Ready" || learningState === "Independent") {
    difficulty = "stretch";
  }
  if (
    learningState === "Orienting" ||
    learningState === "Recovering" ||
    learningState === "Overloaded"
  ) {
    difficulty = "recover";
  }

  return {
    id: `mission-demo-${createSessionId()}`,
    title: "用自己的話打招呼",
    purpose: `幫${name}練習：用英文自我介紹時，說出「為什麼這樣寫」——不是背稿，而是能解釋自己的選擇。`,
    difficulty,
    prompt:
      "想像你要跟一位新同學用英文打招呼並介紹自己。先寫 1–2 句英文，再用中文或英文簡單說明：你為什麼這樣寫？",
    successCondition:
      "提出至少一次自己的嘗試，並能說明理由；必要時能根據引導再改一次。",
    evidenceTargets: [
      "attempted",
      "explained_reasoning",
      "explanation_quality",
      "persistence",
      "answer_seeking",
      "reflected",
    ],
    nextStepDecision:
      "依嘗試品質與狀態，決定加深練習、降低負載，或給明天一個遷移小任務。",
    subject: model.goals.subject || "英語",
    createdAt: new Date().toISOString(),
  };
}

export const DEMO_APPLY_PROMPT =
  "換一個情境：如果對方是老師而不是同學，你會怎麼改你的介紹？（一句就好）";
