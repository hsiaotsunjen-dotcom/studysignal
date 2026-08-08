import type { OnboardingSession } from "@/lib/learning/types";

export const TUTOR_MISSION_SEED_KEY = "studysignal.tutorMissionSeed";

export type TutorMissionSeed = {
  studentName: string;
  learningState: string;
  goal: string;
  subject: string;
  missionPrompt: string;
  purpose: string;
  successCondition: string;
  preference: string;
};

export function writeTutorMissionSeed(session: OnboardingSession): void {
  if (typeof window === "undefined" || !session.mission || !session.studentModel)
    return;
  const seed: TutorMissionSeed = {
    studentName: session.studentModel.identity.preferredName,
    learningState: session.studentModel.learningState,
    goal: session.studentModel.goals.statement,
    subject: session.mission.subject,
    missionPrompt: session.mission.prompt,
    purpose: session.mission.purpose,
    successCondition: session.mission.successCondition,
    preference: session.studentModel.learningDna.preferredMode,
  };
  window.sessionStorage.setItem(TUTOR_MISSION_SEED_KEY, JSON.stringify(seed));
}

export function readTutorMissionSeed(): TutorMissionSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TUTOR_MISSION_SEED_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TutorMissionSeed;
  } catch {
    return null;
  }
}

export function welcomeFromMissionSeed(seed: TutorMissionSeed): {
  body: string;
  speechText: string;
} {
  const name = seed.studentName || "你";
  const body = [
    `${name}，我們從你今天的任務開始。`,
    "",
    seed.missionPrompt,
    "",
    `目標：${seed.goal}`,
    `我會先聽你怎麼想，再一起決定下一步——不會急著給完整答案。`,
  ].join("\n");
  return {
    body,
    speechText: body,
  };
}
