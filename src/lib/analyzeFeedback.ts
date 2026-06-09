/** Structured feedback from `/api/analyze` (OpenAI). */

export type ScoreCategoryFeedback = {
  score: number;
  strengths: string[];
  whyNot100: string[];
  improvementExamples: string[];
};

export type PronunciationFocusItem = {
  word: string;
  reasonToPractice: string;
  pronunciationTip: string;
};

export type TutorPersonalizedComment = {
  whatWentWell: string;
  biggestImprovementOpportunity: string;
  whatToTryNextTime: string;
};

export type AnalyzeFeedback = {
  grammar: ScoreCategoryFeedback;
  vocabulary: ScoreCategoryFeedback;
  fluency: ScoreCategoryFeedback;
  pronunciationFocus: [
    PronunciationFocusItem,
    PronunciationFocusItem,
    PronunciationFocusItem,
  ];
  tutorComment: TutorPersonalizedComment;
};

function clampScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeBoundedStrings(
  value: unknown,
  min: number,
  max: number,
  fallback: string
): string[] {
  const arr = Array.isArray(value)
    ? value
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];
  const out = arr.slice(0, max);
  const copy = [...out];
  while (copy.length < min) copy.push(fallback);
  return copy;
}

function normalizeScoreCategory(
  obj: unknown,
  bulletFallback: string,
  exampleFallback: string
): ScoreCategoryFeedback | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  return {
    score: clampScore(o.score),
    strengths: normalizeBoundedStrings(o.strengths, 2, 3, bulletFallback),
    whyNot100: normalizeBoundedStrings(o.whyNot100, 2, 3, bulletFallback),
    improvementExamples: normalizeBoundedStrings(
      o.improvementExamples,
      1,
      3,
      exampleFallback
    ),
  };
}

const PRON_FALLBACK: PronunciationFocusItem = {
  word: "—",
  reasonToPractice: "—",
  pronunciationTip: "—",
};

function normalizePronunciationItem(raw: unknown): PronunciationFocusItem {
  if (!raw || typeof raw !== "object") return { ...PRON_FALLBACK };
  const o = raw as Record<string, unknown>;
  const word = typeof o.word === "string" ? o.word.trim() : "";
  const reasonToPractice =
    typeof o.reasonToPractice === "string" ? o.reasonToPractice.trim() : "";
  const pronunciationTip =
    typeof o.pronunciationTip === "string" ? o.pronunciationTip.trim() : "";
  return {
    word: word || PRON_FALLBACK.word,
    reasonToPractice: reasonToPractice || PRON_FALLBACK.reasonToPractice,
    pronunciationTip: pronunciationTip || PRON_FALLBACK.pronunciationTip,
  };
}

function normalizePronunciationFocus(
  value: unknown
): AnalyzeFeedback["pronunciationFocus"] | null {
  if (!Array.isArray(value)) return null;
  const items = value.slice(0, 3).map(normalizePronunciationItem);
  while (items.length < 3) items.push({ ...PRON_FALLBACK });
  return [items[0]!, items[1]!, items[2]!];
}

function normalizeTutorComment(
  raw: unknown
): TutorPersonalizedComment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const whatWentWell =
    typeof o.whatWentWell === "string" ? o.whatWentWell.trim() : "";
  const biggestImprovementOpportunity =
    typeof o.biggestImprovementOpportunity === "string"
      ? o.biggestImprovementOpportunity.trim()
      : "";
  const whatToTryNextTime =
    typeof o.whatToTryNextTime === "string" ? o.whatToTryNextTime.trim() : "";
  if (!whatWentWell || !biggestImprovementOpportunity || !whatToTryNextTime) {
    return null;
  }
  return {
    whatWentWell,
    biggestImprovementOpportunity,
    whatToTryNextTime,
  };
}

/**
 * Parse successful `/api/analyze` JSON body into `AnalyzeFeedback`.
 * Returns `null` if required fields are missing or invalid.
 */
export function parseAnalyzeApiData(data: unknown): AnalyzeFeedback | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  const grammar = normalizeScoreCategory(
    o.grammar,
    "（可請老師再針對你的句子補充）",
    "（此處暫無範例，建議多閱讀例句）"
  );
  const vocabulary = normalizeScoreCategory(
    o.vocabulary,
    "（可請老師再針對你的句子補充）",
    "（此處暫無範例，建議多閱讀例句）"
  );
  const fluency = normalizeScoreCategory(
    o.fluency,
    "（可請老師再針對你的句子補充）",
    "（此處暫無範例，建議多閱讀例句）"
  );
  if (!grammar || !vocabulary || !fluency) return null;

  const pronunciationFocus = normalizePronunciationFocus(o.pronunciationFocus);
  if (!pronunciationFocus) return null;

  const tutorComment = normalizeTutorComment(o.tutorComment);
  if (!tutorComment) return null;

  return {
    grammar,
    vocabulary,
    fluency,
    pronunciationFocus,
    tutorComment,
  };
}
