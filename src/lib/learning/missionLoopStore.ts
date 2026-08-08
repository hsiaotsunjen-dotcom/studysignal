import type { MissionLoopSession, TomorrowSeed } from "@/lib/learning/missionTypes";

const LOOP_KEY = "studysignal.missionLoop.v1";
const TOMORROW_KEY = "studysignal.tomorrowSeed.v1";

export function readMissionLoop(): MissionLoopSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOOP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MissionLoopSession;
    if (!parsed?.id || !parsed?.mission || !parsed?.studentModel) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeMissionLoop(session: MissionLoopSession): void {
  if (typeof window === "undefined") return;
  const next = { ...session, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(LOOP_KEY, JSON.stringify(next));
  if (next.tomorrowSeed) {
    window.localStorage.setItem(TOMORROW_KEY, JSON.stringify(next.tomorrowSeed));
  }
}

export function clearMissionLoop(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOOP_KEY);
}

export function readTomorrowSeed(): TomorrowSeed | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOMORROW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TomorrowSeed;
  } catch {
    return null;
  }
}

export function isMissionLoopActive(session: MissionLoopSession | null): boolean {
  return Boolean(
    session &&
      session.phase !== "complete" &&
      session.phase !== "abandoned",
  );
}

export function isMissionLoopComplete(session: MissionLoopSession | null): boolean {
  return Boolean(session && session.phase === "complete" && session.tomorrowSeed);
}
