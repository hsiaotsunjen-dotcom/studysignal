"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";

import { StudentIdentityBar } from "@/components/landing/StudentIdentityBar";
import {
  STUDENT_GRADE_CHANGE_EVENT,
  formatStudentGrade,
  readStudentGrade,
  type StudentGrade,
} from "@/lib/studentGrade";
import {
  ENGLISH_TUTOR_PATH,
  isEnglishSubject,
  subjectsForGrade,
  writeSelectedSubject,
  type SubjectLabel,
} from "@/lib/studentSubjects";

/**
 * Landing Step 2 — choose a subject for today's learning.
 * English opens the existing Tutor at /app; other subjects are not ready yet.
 */
export default function ChooseSubjectPage() {
  const router = useRouter();
  const [grade, setGrade] = useState<StudentGrade | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [preparingNotice, setPreparingNotice] = useState<string | null>(null);

  useEffect(() => {
    setGrade(readStudentGrade());
    setHydrated(true);
  }, []);

  // Keep subject list in sync when grade is changed via identity bar.
  useEffect(() => {
    if (!hydrated) return;
    const sync = () => setGrade(readStudentGrade());
    window.addEventListener(STUDENT_GRADE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(STUDENT_GRADE_CHANGE_EVENT, sync);
  }, [hydrated]);

  const subjects = subjectsForGrade(grade);

  function selectSubject(subject: SubjectLabel) {
    writeSelectedSubject(subject);
    setPreparingNotice(null);

    if (isEnglishSubject(subject)) {
      // Keep grade (studysignal.studentGrade.v1) + subject in localStorage;
      // open the existing English Tutor without rebuilding it.
      router.push(`${ENGLISH_TUTOR_PATH}?from=subjects`);
      return;
    }

    setPreparingNotice("這個學科正在準備中。");
  }

  return (
    <div className="flex min-h-dvh w-full flex-col px-[1.35rem] pb-20 pt-[1.75rem] sm:px-8 sm:pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <StudentIdentityBar />
      </div>

      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--ss-fg-muted)] transition hover:text-[var(--ss-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          返回
        </Link>
      </div>

      <header className="mb-8 max-w-lg">
        <h1
          className="text-[1.65rem] font-semibold text-[var(--ss-fg)] sm:text-[1.85rem]"
          style={{
            fontFamily:
              "var(--font-ss-display), var(--font-ss-sans), system-ui",
            letterSpacing: "var(--ss-tracking-display)",
            lineHeight: "var(--ss-leading-tight)",
          }}
        >
          今天想學什麼？
        </h1>
        <p className="mt-2.5 text-[14px] text-[var(--ss-fg-hint)]">
          選一個學科，我們一起開始。
        </p>
        {hydrated && !grade ? (
          <p className="mt-4 text-[13px] leading-relaxed text-[var(--ss-fg-muted)]">
            先選擇年級，可以幫你安排更適合的學習內容。
          </p>
        ) : null}
        {hydrated && grade ? (
          <p className="mt-3 text-[12px] text-[var(--ss-fg-hint)]">
            {formatStudentGrade(grade)}
          </p>
        ) : null}
      </header>

      <ul
        className="grid max-w-lg grid-cols-2 gap-3 sm:grid-cols-3"
        role="list"
      >
        {subjects.map((subject) => (
          <li key={subject}>
            <button
              type="button"
              onClick={() => selectSubject(subject)}
              className="flex min-h-[3.25rem] w-full items-center justify-center rounded-2xl border border-[var(--ss-border)]/55 bg-[var(--ss-bg-elevated)] px-3 py-3 text-[15px] font-medium text-[var(--ss-fg)] transition duration-200 ease-out hover:border-[var(--ss-border)] hover:bg-white active:scale-[0.985] touch-manipulation"
            >
              {subject}
            </button>
          </li>
        ))}
      </ul>

      {preparingNotice ? (
        <p
          className="mt-6 max-w-lg rounded-2xl border border-[var(--ss-border)]/50 bg-[var(--ss-bg-elevated)] px-4 py-3 text-[14px] text-[var(--ss-fg-muted)]"
          role="status"
        >
          {preparingNotice}
        </p>
      ) : null}
    </div>
  );
}
