/**
 * Landing Step 2 — subjects by grade band (client-only for now).
 * Structure is expandable for vocational / junior college curricula later.
 */

import type { GradeBand, StudentGrade } from "@/lib/studentGrade";

const STORAGE_KEY = "studysignal.selectedSubject.v1";

/** Display labels — Traditional Chinese, used as selection value for now. */
export type SubjectLabel = string;

/**
 * Subjects shown for each grade band.
 * Vocational / junior college keep a basic expandable set for Step 2.
 */
export const SUBJECTS_BY_BAND: Record<GradeBand, readonly SubjectLabel[]> = {
  elementary: ["國語", "數學", "英語", "自然", "社會"],
  junior: ["國文", "數學", "英語", "理化", "生物", "歷史", "地理", "公民"],
  senior: [
    "國文",
    "數學",
    "英文",
    "物理",
    "化學",
    "生物",
    "歷史",
    "地理",
    "公民",
  ],
  vocational: ["國文", "數學", "英文", "自然", "社會"],
  junior_college: ["國文", "數學", "英文", "自然", "社會"],
};

/** When grade is unset — still allow picking; tip shown on the subjects page. */
export const SUBJECTS_WHEN_GRADE_UNSET: readonly SubjectLabel[] = [
  "國文",
  "數學",
  "英語",
  "自然",
  "社會",
];

export function subjectsForGrade(
  grade: StudentGrade | null,
): readonly SubjectLabel[] {
  if (!grade) return SUBJECTS_WHEN_GRADE_UNSET;
  return SUBJECTS_BY_BAND[grade.band] ?? SUBJECTS_WHEN_GRADE_UNSET;
}

/** English Tutor entry — labels differ by band (英語 / 英文). */
export function isEnglishSubject(subject: SubjectLabel): boolean {
  return subject === "英文" || subject === "英語";
}

/** Existing live English Tutor route (StudySignalHome talk layout). */
export const ENGLISH_TUTOR_PATH = "/app";

export function readSelectedSubject(): SubjectLabel | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { subject?: string };
    if (!parsed?.subject || typeof parsed.subject !== "string") return null;
    return parsed.subject;
  } catch {
    return null;
  }
}

export function writeSelectedSubject(subject: SubjectLabel | null): void {
  if (typeof window === "undefined") return;
  if (!subject) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ subject }),
  );
}
