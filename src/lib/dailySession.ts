export type DailySessionResult = {
  completedAt: string;
  studentName: string;
  focus: string;
  goalSentence: string;
  signals: string[];
  parentSummary: {
    happened: string;
    improved: string;
    attention: string;
    next: string;
  };
};

const STORAGE_KEY = "studysignal.dailySessionResult";

export function readDailySessionResult(): DailySessionResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailySessionResult;
  } catch {
    return null;
  }
}

export function writeDailySessionResult(result: DailySessionResult): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function clearDailySessionResult(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
