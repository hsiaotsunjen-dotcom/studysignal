"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left.js";

/**
 * Thin entry chrome only — shown when arriving from subject selection.
 * Sits above StudySignalHome; does not alter Tutor internals.
 */
export function AppTalkBackLink() {
  const searchParams = useSearchParams();
  if (searchParams.get("from") !== "subjects") return null;

  return (
    <div className="relative z-20 border-b border-white/10 bg-zinc-950/95 px-4 py-2.5">
      <Link
        href="/v1/learn/subjects"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-300 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        返回學科
      </Link>
    </div>
  );
}
