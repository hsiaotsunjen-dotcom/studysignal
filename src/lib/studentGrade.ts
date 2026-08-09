/**
 * Landing student grade selection — client-only for now.
 * Shape is ready to attach to a real student profile later.
 */

export type GradeBand =
  | "elementary"
  | "junior"
  | "senior"
  | "vocational"
  | "junior_college";

export type StudentGrade = {
  band: GradeBand;
  year: number;
};

const STORAGE_KEY = "studysignal.studentGrade.v1";

export const GRADE_SECTIONS: {
  band: GradeBand;
  label: string;
  years: number[];
}[] = [
  {
    band: "elementary",
    label: "國小",
    years: [1, 2, 3, 4, 5, 6],
  },
  {
    band: "junior",
    label: "國中",
    years: [1, 2, 3],
  },
  {
    band: "senior",
    label: "高中",
    years: [1, 2, 3],
  },
  {
    band: "vocational",
    label: "高職",
    years: [1, 2, 3],
  },
  {
    band: "junior_college",
    label: "五專",
    years: [1, 2, 3, 4, 5],
  },
];

const YEAR_LABELS = [
  "一年級",
  "二年級",
  "三年級",
  "四年級",
  "五年級",
  "六年級",
] as const;

export function formatStudentGrade(grade: StudentGrade | null): string {
  if (!grade) return "選擇年級";
  const section = GRADE_SECTIONS.find((s) => s.band === grade.band);
  const yearLabel = YEAR_LABELS[grade.year - 1] ?? `${grade.year}年級`;
  return `${section?.label ?? ""}${yearLabel}`;
}

export function gradesEqual(
  a: StudentGrade | null,
  b: StudentGrade | null,
): boolean {
  if (!a || !b) return a === b;
  return a.band === b.band && a.year === b.year;
}

export function readStudentGrade(): StudentGrade | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudentGrade;
    if (!parsed?.band || !parsed?.year) return null;
    const section = GRADE_SECTIONS.find((s) => s.band === parsed.band);
    if (!section || !section.years.includes(parsed.year)) return null;
    return { band: parsed.band, year: parsed.year };
  } catch {
    return null;
  }
}

export const STUDENT_GRADE_CHANGE_EVENT = "studysignal:studentGrade";

export function writeStudentGrade(grade: StudentGrade | null): void {
  if (typeof window === "undefined") return;
  if (!grade) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(grade));
  }
  window.dispatchEvent(new Event(STUDENT_GRADE_CHANGE_EVENT));
}
