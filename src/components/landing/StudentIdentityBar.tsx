"use client";

import { useEffect, useId, useRef, useState } from "react";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import X from "lucide-react/dist/esm/icons/x.js";

import {
  GRADE_SECTIONS,
  formatStudentGrade,
  gradesEqual,
  readStudentGrade,
  writeStudentGrade,
  type StudentGrade,
} from "@/lib/studentGrade";

const YEAR_LABELS = [
  "一年級",
  "二年級",
  "三年級",
  "四年級",
  "五年級",
  "六年級",
] as const;

/**
 * Landing Step 1 — student avatar + grade picker.
 * Client state (+ localStorage) only; ready for a future student profile.
 */
export function StudentIdentityBar() {
  const titleId = useId();
  const [grade, setGrade] = useState<StudentGrade | null>(null);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGrade(readStudentGrade());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function selectGrade(next: StudentGrade) {
    setGrade(next);
    writeStudentGrade(next);
    setOpen(false);
  }

  function clearGrade() {
    setGrade(null);
    writeStudentGrade(null);
    setOpen(false);
  }

  const label = hydrated ? formatStudentGrade(grade) : "選擇年級";

  return (
    <>
      <div className="flex items-center gap-3">
        <div
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--ss-bg-elevated)] ring-1 ring-[var(--ss-border)]/50"
          aria-hidden
        >
          {/* Local asset only — no external image URL */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avatars/student-placeholder.svg"
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-cover"
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[var(--ss-border)]/55 bg-[var(--ss-card)] px-3.5 py-2 text-[14px] font-medium text-[var(--ss-fg)] shadow-[var(--ss-shadow-soft)] transition duration-200 ease-out hover:border-[var(--ss-border)] active:scale-[0.985] touch-manipulation"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`目前年級：${label}。開啟年級選擇`}
        >
          <span>{label}</span>
          <ChevronDown
            className="h-3.5 w-3.5 text-[var(--ss-fg-muted)]"
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(46,42,37,0.28)] px-4 pb-6 pt-10 sm:items-center sm:pb-10"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="flex max-h-[min(85dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.35rem] border border-[var(--ss-border)]/40 bg-[var(--ss-card)] shadow-[var(--ss-shadow-soft)] outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--ss-border)]/35 px-5 py-4">
              <h2
                id={titleId}
                className="text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--ss-fg)]"
                style={{
                  fontFamily:
                    "var(--font-ss-display), var(--font-ss-sans), system-ui",
                }}
              >
                選擇年級
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ss-fg-muted)] transition hover:bg-[var(--ss-bg-elevated)] hover:text-[var(--ss-fg)]"
                aria-label="關閉"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-5">
                {GRADE_SECTIONS.map((section) => (
                  <section key={section.band}>
                    <p className="mb-2 text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
                      {section.label}
                    </p>
                    <ul className="grid grid-cols-3 gap-2">
                      {section.years.map((year) => {
                        const option: StudentGrade = {
                          band: section.band,
                          year,
                        };
                        const selected = gradesEqual(grade, option);
                        return (
                          <li key={`${section.band}-${year}`}>
                            <button
                              type="button"
                              onClick={() => selectGrade(option)}
                              className={`w-full rounded-[0.85rem] px-2 py-2.5 text-[13px] transition duration-150 ease-out touch-manipulation ${
                                selected
                                  ? "bg-[var(--ss-primary-soft)] text-[var(--ss-fg)] ring-1 ring-[var(--ss-primary)]/25"
                                  : "bg-[var(--ss-bg-elevated)] text-[var(--ss-fg-muted)] ring-1 ring-transparent hover:bg-[var(--ss-bg)] hover:text-[var(--ss-fg)]"
                              }`}
                            >
                              {YEAR_LABELS[year - 1] ?? `${year}年級`}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--ss-border)]/35 px-5 py-3.5">
              <button
                type="button"
                onClick={clearGrade}
                className="w-full rounded-full py-2.5 text-[14px] font-medium text-[var(--ss-fg-muted)] transition hover:bg-[var(--ss-bg-elevated)] hover:text-[var(--ss-fg)]"
              >
                暫不設定
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
