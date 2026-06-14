/** Structured feedback from `/api/analyze` (OpenAI). */

export type ScoreCategoryFeedback = {
  score: number;
  strengths: string[];
  /** Concrete score-gap notes (should quote learner wording + fix); UI label avoids generic “why not 100”. */
  whyNot100: string[];
  improvementExamples: string[];
};

/** Model rewrite ladder for the same communicative intent (English + brief 繁中 optional). */
export type TutorModelAnswerBlock = {
  studentVersion: string;
  betterVersion: string;
  nativeLikeVersion: string;
};

/** High-level recap for learning review style reports. */
export type LearningSummaryBlock = {
  strengths: string[];
  weaknesses: string[];
  whatToPracticeNext: string[];
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
  /** Communication / tone / dialogue naturalness (optional; learning review & richer analyses). */
  expression?: ScoreCategoryFeedback;
  /** Speech rubric items, or text-derived read-aloud targets (words from student writing). */
  pronunciationFocus: PronunciationFocusItem[];
  tutorComment: TutorPersonalizedComment;
  /** Present when request included images; prioritize this over pronunciation. */
  imageInsights?: ImageInsights;
  /** Optional: same idea expressed as student / improved / native-like English. */
  tutorModelAnswer?: TutorModelAnswerBlock;
  /** Optional: strengths / gaps / next practice. */
  learningSummary?: LearningSummaryBlock;
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

/** Coerce model JSON (string | number | boolean) to trimmed display string. */
function toTrimmedDisplayString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function normalizePronunciationItem(raw: unknown): PronunciationFocusItem {
  if (!raw || typeof raw !== "object") return { ...PRON_FALLBACK };
  const o = raw as Record<string, unknown>;
  const word = toTrimmedDisplayString(o.word);
  const reasonToPractice = toTrimmedDisplayString(o.reasonToPractice);
  const pronunciationTip = toTrimmedDisplayString(o.pronunciationTip);
  const ipaUsRaw = toTrimmedDisplayString(o.ipaUs);
  const ipaUkRaw = toTrimmedDisplayString(o.ipaUk);
  /** Older API shape: single `ipa` — treat as US-only so one row still shows. */
  const ipaLegacy = toTrimmedDisplayString(o.ipa);
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

function normalizeTutorModelAnswer(raw: unknown): TutorModelAnswerBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const studentVersion = pickTutorStringField(o, [
    "studentVersion",
    "student_version",
  ]);
  const betterVersion = pickTutorStringField(o, [
    "betterVersion",
    "better_version",
  ]);
  const nativeLikeVersion = pickTutorStringField(o, [
    "nativeLikeVersion",
    "native_like_version",
  ]);
  if (!studentVersion && !betterVersion && !nativeLikeVersion) return null;
  return {
    studentVersion: studentVersion || "—",
    betterVersion: betterVersion || "—",
    nativeLikeVersion: nativeLikeVersion || "—",
  };
}

function normalizeLearningSummary(raw: unknown): LearningSummaryBlock | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const pull = (v: unknown): string[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 5)
      : [];
  const strengths = pull(o.strengths);
  const weaknesses = pull(o.weaknesses ?? o.gaps);
  const whatToPracticeNext = pull(
    o.whatToPracticeNext ?? o.what_to_practice_next
  );
  if (
    strengths.length === 0 &&
    weaknesses.length === 0 &&
    whatToPracticeNext.length === 0
  ) {
    return null;
  }
  return { strengths, weaknesses, whatToPracticeNext };
}

/** Up to three pronunciation rows from model JSON (text or speech path). */
function normalizePronunciationFocusFromModel(
  value: unknown
): PronunciationFocusItem[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  const items = value.slice(0, 3).map(normalizePronunciationItem);
  while (items.length < 3) items.push({ ...PRON_FALLBACK });
  const hasReal = items.some((i) => i.word && i.word !== PRON_FALLBACK.word);
  return hasReal ? items : [];
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
 *   `pronunciationFocus` items are required (speech-test path). When false,
 *   optional `pronunciationFocus` is accepted only for **text-only** responses
 *   (no `imageInsights`); vision responses ignore it.
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

  const gapFallback = "（此處應有對照例：請重試分析或請老師補充具體寫法。）";
  const grammar = normalizeScoreCategory(
    o.grammar,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  const vocabulary = normalizeScoreCategory(
    o.vocabulary,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  const fluency = normalizeScoreCategory(
    o.fluency,
    gapFallback,
    "（此處暫無範例，建議多閱讀例句）"
  );
  const expression = normalizeScoreCategory(
    o.expression,
    gapFallback,
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
  const tutorModelAnswer = normalizeTutorModelAnswer(o.tutorModelAnswer);
  const learningSummary = normalizeLearningSummary(o.learningSummary);
  const visionMode = Boolean(imageInsights);
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
      ...(expression ? { expression } : {}),
      pronunciationFocus: pronunciationFocusStrict,
      tutorComment,
      ...(tutorModelAnswer ? { tutorModelAnswer } : {}),
      ...(learningSummary ? { learningSummary } : {}),
      ...(imageInsights ? { imageInsights } : {}),
    };
  }

  /**
   * Typed text and/or images: optional dictionary-style pronunciation rows when
   * the model returns `pronunciationFocus` (text-only path). Vision responses
   * include `imageInsights` and must not surface text-derived pronunciation.
   */
  log?.("parse_ok_non_speech_mode", {
    hasImageInsights: Boolean(imageInsights),
    imageInsights,
    ocrText: imageInsights?.ocrText,
    visualSummaryZh: imageInsights?.visualSummaryZh,
  });
  const pronunciationFocusNonSpeech = visionMode
    ? []
    : normalizePronunciationFocusFromModel(o.pronunciationFocus);
  return {
    grammar,
    vocabulary,
    fluency,
    ...(expression ? { expression } : {}),
    pronunciationFocus: pronunciationFocusNonSpeech,
    tutorComment,
    ...(tutorModelAnswer ? { tutorModelAnswer } : {}),
    ...(learningSummary ? { learningSummary } : {}),
    ...(imageInsights ? { imageInsights } : {}),
  };
}
