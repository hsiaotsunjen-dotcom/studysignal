/** Structured feedback from `/api/analyze` (OpenAI). */

export type ScoreCategoryFeedback = {
  score: number;
  strengths: string[];
  whyNot100: string[];
  improvementExamples: string[];
};

export type PronunciationFocusItem = {
  word: string;
  /** General American–style IPA with slashes, e.g. "/ɪˈrɑːn/". Omit when unknown. */
  ipaUs?: string;
  /** British (RP-style) IPA with slashes, e.g. "/ɪˈræn/". Omit when unknown. */
  ipaUk?: string;
  reasonToPractice: string;
  pronunciationTip: string;
};

export type TutorPersonalizedComment = {
  whatWentWell: string;
  biggestImprovementOpportunity: string;
  whatToTryNextTime: string;
};

/** Pronunciation rubric from GPT (only when speech audio was analyzed). */
export type PronunciationScoresBlock = {
  overallScore: number;
  accuracy: number;
  fluency: number;
  clarity: number;
  feedback: string;
};

/** OCR + visual explanation (Traditional Chinese) when analysis used attached images. */
export type ImageInsights = {
  ocrText: string;
  visualSummaryZh: string;
};

export type AnalyzeFeedback = {
  /** Present only when speech audio was used for pronunciation analysis. */
  pronunciationScores?: PronunciationScoresBlock;
  grammar: ScoreCategoryFeedback;
  vocabulary: ScoreCategoryFeedback;
  fluency: ScoreCategoryFeedback;
  /** Empty when no speech-based pronunciation analysis was performed. */
  pronunciationFocus: PronunciationFocusItem[];
  tutorComment: TutorPersonalizedComment;
  /** Present when request included images; prioritize this over pronunciation. */
  imageInsights?: ImageInsights;
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
  const ipaUsRaw = typeof o.ipaUs === "string" ? o.ipaUs.trim() : "";
  const ipaUkRaw = typeof o.ipaUk === "string" ? o.ipaUk.trim() : "";
  /** Older API shape: single `ipa` — treat as US-only so one row still shows. */
  const ipaLegacy = typeof o.ipa === "string" ? o.ipa.trim() : "";
  const out: PronunciationFocusItem = {
    word: word || PRON_FALLBACK.word,
    reasonToPractice: reasonToPractice || PRON_FALLBACK.reasonToPractice,
    pronunciationTip: pronunciationTip || PRON_FALLBACK.pronunciationTip,
  };
  if (ipaUsRaw) out.ipaUs = ipaUsRaw;
  if (ipaUkRaw) out.ipaUk = ipaUkRaw;
  if (!out.ipaUs && !out.ipaUk && ipaLegacy) out.ipaUs = ipaLegacy;
  return out;
}

/** Exactly three practice items (speech mode). */
function normalizePronunciationFocusStrict(
  value: unknown
): PronunciationFocusItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const items = value.slice(0, 3).map(normalizePronunciationItem);
  while (items.length < 3) items.push({ ...PRON_FALLBACK });
  return items;
}

const TUTOR_COMMENT_FALLBACK_ZH = "（此欄位模型未回傳內容。）";

function pickTutorStringField(
  o: Record<string, unknown>,
  keys: string[]
): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

/**
 * Normalize `tutorComment` from various model shapes into `TutorPersonalizedComment`.
 * Never returns null — missing or alien shapes use zh fallbacks so a valid image
 * analysis is not discarded.
 */
function normalizeTutorComment(raw: unknown): TutorPersonalizedComment {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      whatWentWell: TUTOR_COMMENT_FALLBACK_ZH,
      biggestImprovementOpportunity: TUTOR_COMMENT_FALLBACK_ZH,
      whatToTryNextTime: TUTOR_COMMENT_FALLBACK_ZH,
    };
  }
  const o = raw as Record<string, unknown>;
  const whatWentWell = pickTutorStringField(o, [
    "whatWentWell",
    "what_went_well",
    "positive",
    "wentWell",
  ]);
  const biggestImprovementOpportunity = pickTutorStringField(o, [
    "biggestImprovementOpportunity",
    "biggest_improvement_opportunity",
    "improvement",
    "improvementOpportunity",
    "biggestImprovement",
  ]);
  const whatToTryNextTime = pickTutorStringField(o, [
    "whatToTryNextTime",
    "what_to_try_next_time",
    "nextSteps",
    "next_steps",
    "tryNext",
    "nextStep",
  ]);
  return {
    whatWentWell: whatWentWell || TUTOR_COMMENT_FALLBACK_ZH,
    biggestImprovementOpportunity:
      biggestImprovementOpportunity || TUTOR_COMMENT_FALLBACK_ZH,
    whatToTryNextTime: whatToTryNextTime || TUTOR_COMMENT_FALLBACK_ZH,
  };
}

function normalizePronunciationScores(
  raw: unknown
): PronunciationScoresBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feedback =
    typeof o.feedback === "string" ? o.feedback.trim() : "";
  if (!feedback) return null;
  const overallScore = clampScore(o.overallScore);
  const accuracy = clampScore(o.accuracy);
  const fluency = clampScore(o.fluency);
  const clarity = clampScore(o.clarity);
  if (
    typeof o.overallScore !== "number" ||
    typeof o.accuracy !== "number" ||
    typeof o.fluency !== "number" ||
    typeof o.clarity !== "number" ||
    !Number.isFinite(o.overallScore) ||
    !Number.isFinite(o.accuracy) ||
    !Number.isFinite(o.fluency) ||
    !Number.isFinite(o.clarity)
  ) {
    return null;
  }
  return { overallScore, accuracy, fluency, clarity, feedback };
}

function firstNonEmptyString(
  obj: Record<string, unknown>,
  keys: string[]
): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return "";
}

/** Accept camelCase / snake_case from model JSON. */
function extractImageInsightsContainer(
  root: Record<string, unknown>
): unknown {
  const nested = root.imageInsights ?? root.image_insights;
  if (nested !== undefined && nested !== null) return nested;
  if (
    typeof root.ocrText === "string" ||
    typeof root.ocr_text === "string" ||
    typeof root.visualSummaryZh === "string" ||
    typeof root.visual_summary_zh === "string"
  ) {
    return {
      ocrText: root.ocrText ?? root.ocr_text,
      visualSummaryZh: root.visualSummaryZh ?? root.visual_summary_zh,
    };
  }
  return undefined;
}

function normalizeImageInsights(raw: unknown): ImageInsights | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ocrText = firstNonEmptyString(o, [
    "ocrText",
    "ocr_text",
    "ocr",
    "textInImage",
    "text_in_image",
  ]);
  const visualSummaryZh = firstNonEmptyString(o, [
    "visualSummaryZh",
    "visual_summary_zh",
    "visualSummary",
    "visual_summary",
    "summaryZh",
    "summary_zh",
    "descriptionZh",
    "description_zh",
  ]);
  if (!ocrText && !visualSummaryZh) return null;
  return {
    ocrText: ocrText || "（未偵測到可讀文字）",
    visualSummaryZh: visualSummaryZh || "—",
  };
}

/** Optional logger for temporary analyze debugging (server or browser console). */
export type AnalyzeParseLog = (label: string, payload?: unknown) => void;

/**
 * Parse successful `/api/analyze` JSON body into `AnalyzeFeedback`.
 * Returns `null` if required fields are missing or invalid.
 *
 * @param requireSpeechPronunciation — when true, `pronunciationScores` and three
 *   `pronunciationFocus` items are required (speech-test path). When false, any
 *   pronunciation keys in the payload are ignored (typed text / images only).
 * @param log — when set, each parse failure logs a concrete reason (temporary diagnostics).
 */
export function parseAnalyzeApiData(
  data: unknown,
  requireSpeechPronunciation: boolean,
  log?: AnalyzeParseLog
): AnalyzeFeedback | null {
  if (!data || typeof data !== "object") {
    log?.("parse_fail_root_not_object", { typeofData: typeof data });
    return null;
  }
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
  if (!grammar || !vocabulary || !fluency) {
    log?.("parse_fail_score_category", {
      grammarOk: Boolean(grammar),
      vocabularyOk: Boolean(vocabulary),
      fluencyOk: Boolean(fluency),
      rawGrammar: o.grammar,
      rawVocabulary: o.vocabulary,
      rawFluency: o.fluency,
    });
    return null;
  }

  const tutorComment = normalizeTutorComment(o.tutorComment);
  log?.("parse_tutor_comment_normalized", {
    rawTutorComment: o.tutorComment,
    mapped: tutorComment,
  });

  const imageInsightsRaw = extractImageInsightsContainer(o);
  const imageInsights = normalizeImageInsights(imageInsightsRaw);
  log?.("parse_image_insights_step", {
    extractedContainer: imageInsightsRaw,
    normalized: imageInsights,
    ocrText: imageInsights?.ocrText,
    visualSummaryZh: imageInsights?.visualSummaryZh,
    topLevelKeys: Object.keys(o),
  });

  if (requireSpeechPronunciation) {
    const pronunciationScores = normalizePronunciationScores(
      o.pronunciationScores
    );
    const pronunciationFocusStrict = normalizePronunciationFocusStrict(
      o.pronunciationFocus
    );
    if (!pronunciationScores || !pronunciationFocusStrict) {
      log?.("parse_fail_speech_pronunciation", {
        pronunciationScoresRaw: o.pronunciationScores,
        pronunciationFocusRaw: o.pronunciationFocus,
        normalizedScoresOk: Boolean(pronunciationScores),
        normalizedFocusOk: Boolean(pronunciationFocusStrict),
      });
      return null;
    }
    log?.("parse_ok_speech_mode", {
      hasImageInsights: Boolean(imageInsights),
      imageInsights,
    });
    return {
      pronunciationScores,
      grammar,
      vocabulary,
      fluency,
      pronunciationFocus: pronunciationFocusStrict,
      tutorComment,
      ...(imageInsights ? { imageInsights } : {}),
    };
  }

  /**
   * Typed text and/or images: never trust model-supplied pronunciation (it
   * hallucinates scores from text). Ignore stray keys / empty arrays so vision
   * JSON still parses.
   */
  log?.("parse_ok_non_speech_mode", {
    hasImageInsights: Boolean(imageInsights),
    imageInsights,
    ocrText: imageInsights?.ocrText,
    visualSummaryZh: imageInsights?.visualSummaryZh,
  });
  return {
    grammar,
    vocabulary,
    fluency,
    pronunciationFocus: [],
    tutorComment,
    ...(imageInsights ? { imageInsights } : {}),
  };
}
