export type StudentProfile = {
  name: string;
  grade: string;
  subjects: string[];
  goals: string;
  dailyMinutes: number;
};

/** V0 local parent account — no backend auth */
export type ParentSession = {
  parentName: string;
  parentEmail: string;
  /** Demo-only credential stored in localStorage */
  password: string;
  student?: StudentProfile;
  onboardingComplete: boolean;
  firstPlan?: string[];
};

const STORAGE_KEY = "studysignal.parentSession";

export function readParentSession(): ParentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ParentSession> & {
      parentEmail?: string;
    };
    if (!parsed.parentEmail) return null;
    return {
      parentName: parsed.parentName ?? "",
      parentEmail: parsed.parentEmail,
      password: parsed.password ?? "",
      student: parsed.student,
      onboardingComplete: Boolean(parsed.onboardingComplete),
      firstPlan: parsed.firstPlan,
    };
  } catch {
    return null;
  }
}

export function writeParentSession(session: ParentSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearParentSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Create / update parent account fields after signup */
export function saveParentAccount(input: {
  parentName: string;
  parentEmail: string;
  password: string;
}): ParentSession {
  const existing = readParentSession();
  const session: ParentSession = {
    parentName: input.parentName.trim(),
    parentEmail: input.parentEmail.trim().toLowerCase(),
    password: input.password,
    student: existing?.student,
    onboardingComplete: existing?.onboardingComplete ?? false,
    firstPlan: existing?.firstPlan,
  };
  writeParentSession(session);
  return session;
}

/** V0 demo: complete account ready for Student Home */
export function completeStudentSetup(
  parent: Pick<ParentSession, "parentEmail" | "parentName" | "password">,
  student: StudentProfile,
): ParentSession {
  const existing = readParentSession();
  const session: ParentSession = {
    parentName: parent.parentName || existing?.parentName || "",
    parentEmail: parent.parentEmail,
    password: parent.password || existing?.password || "",
    student,
    onboardingComplete: true,
    firstPlan: buildFirstPlan(student),
  };
  writeParentSession(session);
  return session;
}

export function buildFirstPlan(student: StudentProfile): string[] {
  const subject = student.subjects[0] ?? "英語";
  const mins = student.dailyMinutes;
  return [
    `暖身口說（約 ${Math.max(5, Math.round(mins * 0.25))} 分鐘）— 用簡單句子聊聊今天`,
    `${subject} 引導練習（約 ${Math.max(8, Math.round(mins * 0.45))} 分鐘）— 依學習目標循序前進`,
    `作業檢查或錯題回顧（約 ${Math.max(5, Math.round(mins * 0.2))} 分鐘）`,
    `今日小結 — AI 整理亮點，並準備家長日報`,
  ];
}
