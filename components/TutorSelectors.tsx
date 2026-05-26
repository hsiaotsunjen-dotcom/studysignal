"use client";

import {
  ENGLISH_VARIANT_OPTIONS,
  SCHOOL_LEVEL_OPTIONS,
  type EnglishVariant,
  type SchoolLevel,
} from "@/lib/tutor-settings";

type TutorSelectorsProps = {
  englishVariant: EnglishVariant;
  schoolLevel: SchoolLevel;
  onEnglishVariantChange: (value: EnglishVariant) => void;
  onSchoolLevelChange: (value: SchoolLevel) => void;
  disabled?: boolean;
};

const selectClassName =
  "w-full appearance-none rounded-xl border border-zinc-700/80 bg-zinc-800/90 py-2.5 pl-3 pr-9 text-sm text-zinc-100 shadow-sm transition-colors focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/40 disabled:cursor-not-allowed disabled:opacity-50";

export function TutorSelectors({
  englishVariant,
  schoolLevel,
  onEnglishVariantChange,
  onSchoolLevelChange,
  disabled = false,
}: TutorSelectorsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          English variant
        </span>
        <div className="relative">
          <select
            value={englishVariant}
            onChange={(e) =>
              onEnglishVariantChange(e.target.value as EnglishVariant)
            }
            disabled={disabled}
            className={selectClassName}
            aria-label="English variant"
          >
            {ENGLISH_VARIANT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} {option.flag}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden
          >
            ▾
          </span>
        </div>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          School level
        </span>
        <div className="relative">
          <select
            value={schoolLevel}
            onChange={(e) =>
              onSchoolLevelChange(e.target.value as SchoolLevel)
            }
            disabled={disabled}
            className={selectClassName}
            aria-label="School level"
          >
            {SCHOOL_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden
          >
            ▾
          </span>
        </div>
      </label>
    </div>
  );
}
