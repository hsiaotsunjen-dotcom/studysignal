import type { OnboardingSession } from "@/lib/learning/types";

const STORAGE_KEY = "studysignal.onboarding.v1";
const ACTIVE_STUDENT_KEY = "studysignal.activeStudentId";

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ob-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readOnboardingSession(): OnboardingSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingSession;
    if (!parsed?.id || !parsed?.phase || !parsed?.draft) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeOnboardingSession(session: OnboardingSession): void {
  if (typeof window === "undefined") return;
  const next = { ...session, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  if (session.studentModel?.studentId) {
    window.localStorage.setItem(ACTIVE_STUDENT_KEY, session.studentModel.studentId);
  }
}

export function clearOnboardingSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function readActiveStudentId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_STUDENT_KEY);
}

export function isOnboardingComplete(session: OnboardingSession | null): boolean {
  return Boolean(
    session &&
      session.phase === "ONBOARDING_COMPLETE" &&
      session.studentModel &&
      session.mission,
  );
}

/**
 * True when an incomplete session is structurally valid to resume
 * (e.g. mid-flow refresh). Completed sessions are not resumable here —
 * callers should route them to mission instead.
 *
 * Fresh student entry (Landing → 開始學習) must NOT rely on this alone:
 * pass `?entry=new` so init clears any leftover draft before create.
 */
export function isResumableOnboardingSession(
  session: OnboardingSession | null,
): boolean {
  if (!session?.id || !session.phase || !session.draft || !session.uiStep) {
    return false;
  }
  if (isOnboardingComplete(session)) return false;
  return true;
}
