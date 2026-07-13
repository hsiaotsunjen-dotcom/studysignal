/**
 * Typed contract for `/api/analyze`.
 *
 * Separate fields — never overload one `text` bucket:
 * - homeworkQuestion: typed question about attached homework (this submission only)
 * - speechTranscript: dictation / speech-to-text for pronunciation analysis
 * - typedText: intentionally typed English for text-only rubric analysis
 * - learningReviewCorpus: aggregated chat lines for learning review
 */

import { LEARNING_REVIEW_ANALYZE_PREAMBLE } from "@/lib/learningReviewAnalyzeText";
import type {
  QuestionEvidence,
  QuestionEvidenceMap,
  WorksheetCaptureContext,
} from "@/lib/worksheetCapture";

export type AnalyzeImagePayload = {
  mimeType: string;
  dataBase64: string;
};

/** How the composer was last filled (Talk tab). */
export type ComposerTextSource = "empty" | "typed" | "dictation";

export type AnalyzeSubmissionKind =
  | "homework_image"
  | "homework_image_with_question"
  | "speech_transcript"
  | "typed_text"
  | "learning_review";

export type AnalyzeApiRequestBody = {
  submissionKind: AnalyzeSubmissionKind;
  /** Only true for `speech_transcript`. */
  includePronunciation?: boolean;
  images?: AnalyzeImagePayload[];
  homeworkQuestion?: string;
  speechTranscript?: string;
  typedText?: string;
  learningReviewCorpus?: string;
  /** Multi-photo worksheet capture metadata (post quality-check). */
  worksheetCaptureContext?: WorksheetCaptureContext;
};

export type ParsedAnalyzeApiRequest = {
  submissionKind: AnalyzeSubmissionKind;
  includePronunciation: boolean;
  images: AnalyzeImagePayload[];
  hasImages: boolean;
  homeworkQuestion: string;
  speechTranscript: string;
  typedText: string;
  learningReviewCorpus: string;
  /** Text injected into the LLM user message for this submission kind. */
  promptText: string;
  requireSpeechPronunciation: boolean;
  hasStudentCorpus: boolean;
  worksheetCaptureContext?: WorksheetCaptureContext;
};

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseAnalyzeImages(raw: unknown): AnalyzeImagePayload[] {
  const images: AnalyzeImagePayload[] = [];
  if (!Array.isArray(raw)) return images;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const im = item as Record<string, unknown>;
    const mimeType =
      typeof im.mimeType === "string" && im.mimeType.startsWith("image/")
        ? im.mimeType
        : "image/jpeg";
    const dataBase64 = trimmed(im.dataBase64);
    if (dataBase64.length > 0) {
      images.push({ mimeType, dataBase64 });
    }
  }
  return images;
}

function resolvePromptText(req: {
  submissionKind: AnalyzeSubmissionKind;
  homeworkQuestion: string;
  speechTranscript: string;
  typedText: string;
  learningReviewCorpus: string;
}): string {
  switch (req.submissionKind) {
    case "homework_image":
      return "";
    case "homework_image_with_question":
      return req.homeworkQuestion;
    case "speech_transcript":
      return req.speechTranscript;
    case "typed_text":
      return req.typedText;
    case "learning_review":
      return req.learningReviewCorpus;
    default:
      return "";
  }
}

export function resolveHasStudentCorpusForParser(
  submissionKind: AnalyzeSubmissionKind,
): boolean {
  switch (submissionKind) {
    case "homework_image":
    case "homework_image_with_question":
      return false;
    case "speech_transcript":
    case "typed_text":
    case "learning_review":
      return true;
    default:
      return false;
  }
}

export function resolveHomeworkQuestionAtSubmit(
  composerText: string,
  composerTextSource: ComposerTextSource,
): string | undefined {
  if (composerTextSource !== "typed") return undefined;
  const question = composerText.trim();
  return question.length > 0 ? question : undefined;
}

export function buildHomeworkAnalyzeRequest(input: {
  images: AnalyzeImagePayload[];
  composerText: string;
  composerTextSource: ComposerTextSource;
  worksheetCaptureContext?: WorksheetCaptureContext;
}): AnalyzeApiRequestBody {
  const homeworkQuestion = resolveHomeworkQuestionAtSubmit(
    input.composerText,
    input.composerTextSource,
  );
  return {
    submissionKind: homeworkQuestion
      ? "homework_image_with_question"
      : "homework_image",
    includePronunciation: false,
    images: input.images,
    ...(homeworkQuestion ? { homeworkQuestion } : {}),
    ...(input.worksheetCaptureContext
      ? { worksheetCaptureContext: input.worksheetCaptureContext }
      : {}),
  };
}

export function buildSpeechAnalyzeRequest(input: {
  speechTranscript: string;
}): AnalyzeApiRequestBody {
  const speechTranscript = input.speechTranscript.trim();
  return {
    submissionKind: "speech_transcript",
    includePronunciation: true,
    speechTranscript,
  };
}

export function buildTypedTextAnalyzeRequest(input: {
  typedText: string;
}): AnalyzeApiRequestBody {
  return {
    submissionKind: "typed_text",
    includePronunciation: false,
    typedText: input.typedText.trim(),
  };
}

export function buildLearningReviewAnalyzeRequest(input: {
  learningReviewCorpus: string;
  includePronunciation?: boolean;
}): AnalyzeApiRequestBody {
  return {
    submissionKind: "learning_review",
    includePronunciation: input.includePronunciation === true,
    learningReviewCorpus: input.learningReviewCorpus,
  };
}

export function buildComposerAnalyzeRequest(input: {
  composerText: string;
  composerTextSource: ComposerTextSource;
  hasImages: boolean;
  images?: AnalyzeImagePayload[];
  learningReviewCorpus?: string;
  includePronunciationForLearningReview?: boolean;
  worksheetCaptureContext?: WorksheetCaptureContext;
}): AnalyzeApiRequestBody | null {
  /** Homework pipeline — images must never fall through to Talk / Learning Review. */
  if (input.hasImages) {
    if (!input.images?.length) return null;
    return buildHomeworkAnalyzeRequest({
      images: input.images,
      composerText: input.composerText,
      composerTextSource: input.composerTextSource,
      worksheetCaptureContext: input.worksheetCaptureContext,
    });
  }

  if (input.learningReviewCorpus?.trim()) {
    return buildLearningReviewAnalyzeRequest({
      learningReviewCorpus: input.learningReviewCorpus,
      includePronunciation: input.includePronunciationForLearningReview,
    });
  }

  const text = input.composerText.trim();
  if (!text) return null;

  if (input.composerTextSource === "dictation") {
    return buildSpeechAnalyzeRequest({ speechTranscript: text });
  }

  return buildTypedTextAnalyzeRequest({ typedText: text });
}

function validateSubmission(req: AnalyzeApiRequestBody): string | null {
  const images = parseAnalyzeImages(req.images);
  switch (req.submissionKind) {
    case "homework_image":
      if (images.length === 0) return "homework_image requires images";
      if (trimmed(req.homeworkQuestion)) {
        return "homework_image must not include homeworkQuestion";
      }
      if (
        trimmed(req.speechTranscript) ||
        trimmed(req.typedText) ||
        trimmed(req.learningReviewCorpus)
      ) {
        return "homework_image must not include transcript or typed text fields";
      }
      return null;
    case "homework_image_with_question":
      if (images.length === 0) {
        return "homework_image_with_question requires images";
      }
      if (!trimmed(req.homeworkQuestion)) {
        return "homework_image_with_question requires homeworkQuestion";
      }
      if (
        trimmed(req.speechTranscript) ||
        trimmed(req.typedText) ||
        trimmed(req.learningReviewCorpus)
      ) {
        return "homework_image_with_question must not include transcript fields";
      }
      return null;
    case "speech_transcript":
      if (images.length > 0) return "speech_transcript must not include images";
      if (!trimmed(req.speechTranscript)) {
        return "speech_transcript requires speechTranscript";
      }
      if (req.includePronunciation !== true) {
        return "speech_transcript requires includePronunciation: true";
      }
      return null;
    case "typed_text":
      if (images.length > 0) return "typed_text must not include images";
      if (!trimmed(req.typedText)) return "typed_text requires typedText";
      return null;
    case "learning_review":
      if (images.length > 0) return "learning_review must not include images";
      if (!trimmed(req.learningReviewCorpus)) {
        return "learning_review requires learningReviewCorpus";
      }
      return null;
    default:
      return "unknown submissionKind";
  }
}

function normalizeFromLegacyBody(
  o: Record<string, unknown>,
): AnalyzeApiRequestBody | null {
  const legacyText = trimmed(o.text);
  const includePronunciation = o.includePronunciation === true;
  const images = parseAnalyzeImages(o.images);

  if (images.length > 0) {
    // Legacy clients sent dictation/chat in `text` — never reuse for homework.
    return { submissionKind: "homework_image", includePronunciation: false, images };
  }

  if (!legacyText) return null;

  if (includePronunciation) {
    return buildSpeechAnalyzeRequest({ speechTranscript: legacyText });
  }

  if (legacyText.startsWith(LEARNING_REVIEW_ANALYZE_PREAMBLE)) {
    return buildLearningReviewAnalyzeRequest({
      learningReviewCorpus: legacyText,
      includePronunciation: false,
    });
  }

  return buildTypedTextAnalyzeRequest({ typedText: legacyText });
}

function parseWorksheetCaptureContext(
  raw: unknown,
): WorksheetCaptureContext | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const estimatedTotalQuestions =
    typeof o.estimatedTotalQuestions === "number" &&
    Number.isFinite(o.estimatedTotalQuestions)
      ? Math.round(o.estimatedTotalQuestions)
      : 0;
  const photos = Array.isArray(o.photos)
    ? o.photos
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const photoIndex =
            typeof row.photoIndex === "number" ? Math.round(row.photoIndex) : -1;
          const photoLabel =
            typeof row.photoLabel === "string" ? row.photoLabel.trim() : "";
          const covers = Array.isArray(row.coversQuestions)
            ? row.coversQuestions
                .map((n) =>
                  typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0,
                )
                .filter((n) => n > 0)
            : [];
          if (photoIndex < 0 || !photoLabel || covers.length === 0) return null;
          return { photoIndex, photoLabel, coversQuestions: covers };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];
  if (photos.length === 0) return undefined;
  const parseNumList = (raw: unknown): number[] =>
    Array.isArray(raw)
      ? [
          ...new Set(
            raw
              .map((n) =>
                typeof n === "number" && Number.isFinite(n) ? Math.round(n) : 0,
              )
              .filter((n) => n > 0),
          ),
        ].sort((a, b) => a - b)
      : [];
  const lowQualityQuestions = parseNumList(
    o.lowQualityQuestions ?? o.low_quality_questions,
  );
  const coveredQuestions = parseNumList(
    o.coveredQuestions ?? o.covered_questions,
  );
  const missingQuestions = parseNumList(
    o.missingQuestions ?? o.missing_questions,
  );
  const scopeRaw =
    o.analysisScope ??
    o.analysis_scope ??
    o.analyzeScope ??
    o.analyze_scope;
  const analysisScope = normalizeAnalysisScope(
    scopeRaw,
    estimatedTotalQuestions,
    o.captureComplete === true,
    missingQuestions,
    coveredQuestions.length > 0
      ? coveredQuestions
      : uniqueSortedFromPhotos(photos),
  );
  const confidenceRaw =
    o.analysisConfidence ?? o.analysis_confidence;
  const analysisConfidence =
    confidenceRaw === "high" ||
    confidenceRaw === "medium" ||
    confidenceRaw === "low"
      ? confidenceRaw
      : analysisScope === "partial" || lowQualityQuestions.length >= 3
        ? "low"
        : analysisScope === "full" && lowQualityQuestions.length === 0
          ? "high"
          : "medium";
  const coveredResolved =
    coveredQuestions.length > 0
      ? coveredQuestions
      : uniqueSortedFromPhotos(photos);
  const questionEvidenceMap = parseQuestionEvidenceMap(
    o.questionEvidenceMap ?? o.question_evidence_map,
    coveredResolved,
  );
  return {
    photos,
    estimatedTotalQuestions,
    captureComplete: analysisScope === "full",
    coveredQuestions: coveredResolved,
    missingQuestions,
    analysisScope,
    analysisConfidence,
    lowQualityQuestions,
    questionEvidenceMap,
  };
}

function parseQuestionEvidenceMap(
  raw: unknown,
  coveredFallback: number[],
): QuestionEvidenceMap {
  const out: QuestionEvidenceMap = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(
      raw as Record<string, unknown>,
    )) {
      if (!value || typeof value !== "object") continue;
      const row = value as Record<string, unknown>;
      const questionNumber =
        typeof row.questionNumber === "number" &&
        Number.isFinite(row.questionNumber)
          ? Math.round(row.questionNumber)
          : Number.parseInt(key, 10);
      if (!Number.isFinite(questionNumber) || questionNumber <= 0) continue;
      const visionConfidence =
        row.visionConfidence === "high" ||
        row.visionConfidence === "medium" ||
        row.visionConfidence === "low"
          ? row.visionConfidence
          : "medium";
      const quality =
        typeof row.quality === "string" && row.quality.trim()
          ? (row.quality as QuestionEvidence["quality"])
          : "clear";
      out[String(questionNumber)] = {
        questionNumber,
        sourcePhotoId:
          typeof row.sourcePhotoId === "string" ? row.sourcePhotoId : "",
        sourcePhotoIndex:
          typeof row.sourcePhotoIndex === "number"
            ? Math.round(row.sourcePhotoIndex)
            : -1,
        sourcePhotoLabel:
          typeof row.sourcePhotoLabel === "string" && row.sourcePhotoLabel.trim()
            ? row.sourcePhotoLabel.trim()
            : `Photo${
                typeof row.sourcePhotoIndex === "number"
                  ? Math.round(row.sourcePhotoIndex) + 1
                  : "?"
              }`,
        ocrText: typeof row.ocrText === "string" ? row.ocrText : "",
        visionConfidence,
        quality,
        isLowConfidence: row.isLowConfidence === true,
        ...(row.boundingBox &&
        typeof row.boundingBox === "object" &&
        !Array.isArray(row.boundingBox)
          ? {
              boundingBox: row.boundingBox as {
                x: number;
                y: number;
                width: number;
                height: number;
              },
            }
          : {}),
      };
    }
  }
  if (Object.keys(out).length > 0) return out;
  for (const n of coveredFallback) {
    out[String(n)] = {
      questionNumber: n,
      sourcePhotoId: "",
      sourcePhotoIndex: -1,
      sourcePhotoLabel: "Photo?",
      ocrText: "",
      visionConfidence: "medium",
      quality: "clear",
      isLowConfidence: false,
    };
  }
  return out;
}

function normalizeAnalysisScope(
  scopeRaw: unknown,
  estimatedTotalQuestions: number,
  captureComplete: boolean,
  missingQuestions: number[],
  coveredQuestions: number[],
): "full" | "partial" | "unknown" {
  if (scopeRaw === "full" || scopeRaw === "partial" || scopeRaw === "unknown") {
    return scopeRaw;
  }
  // Legacy values from earlier analyzeScope naming
  if (scopeRaw === "full-worksheet") return "full";
  if (scopeRaw === "partial-covered-only") return "partial";
  if (scopeRaw === "unknown-total") return "unknown";

  if (estimatedTotalQuestions === 0) return "unknown";
  if (captureComplete) return "full";
  if (missingQuestions.length > 0) return "partial";
  if (
    coveredQuestions.length > 0 &&
    coveredQuestions.length >= estimatedTotalQuestions
  ) {
    return "full";
  }
  return coveredQuestions.length > 0 ? "partial" : "unknown";
}

function uniqueSortedFromPhotos(
  photos: Array<{ coversQuestions: number[] }>,
): number[] {
  return [
    ...new Set(photos.flatMap((p) => p.coversQuestions)),
  ].sort((a, b) => a - b);
}

export function parseAnalyzeApiRequest(body: unknown): ParsedAnalyzeApiRequest | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  let raw: AnalyzeApiRequestBody | null = null;
  const kind = trimmed(o.submissionKind);
  if (kind) {
    raw = {
      submissionKind: kind as AnalyzeSubmissionKind,
      includePronunciation: o.includePronunciation === true,
      images: parseAnalyzeImages(o.images),
      homeworkQuestion: trimmed(o.homeworkQuestion) || undefined,
      speechTranscript: trimmed(o.speechTranscript) || undefined,
      typedText: trimmed(o.typedText) || undefined,
      learningReviewCorpus: trimmed(o.learningReviewCorpus) || undefined,
      worksheetCaptureContext: parseWorksheetCaptureContext(
        o.worksheetCaptureContext ?? o.worksheet_capture_context,
      ),
    };
  } else {
    raw = normalizeFromLegacyBody(o);
  }

  if (!raw) return null;

  const validationError = validateSubmission(raw);
  if (validationError) return null;

  const images = parseAnalyzeImages(raw.images);
  const hasImages = images.length > 0;
  const homeworkQuestion = trimmed(raw.homeworkQuestion);
  const speechTranscript = trimmed(raw.speechTranscript);
  const typedText = trimmed(raw.typedText);
  const learningReviewCorpus = trimmed(raw.learningReviewCorpus);
  const includePronunciation = raw.includePronunciation === true;
  const requireSpeechPronunciation =
    raw.submissionKind === "speech_transcript" && includePronunciation;
  const promptText = resolvePromptText({
    submissionKind: raw.submissionKind,
    homeworkQuestion,
    speechTranscript,
    typedText,
    learningReviewCorpus,
  });
  const hasStudentCorpus = resolveHasStudentCorpusForParser(raw.submissionKind);
  const worksheetCaptureContext = parseWorksheetCaptureContext(
    raw.worksheetCaptureContext,
  );

  return {
    submissionKind: raw.submissionKind,
    includePronunciation,
    images,
    hasImages,
    homeworkQuestion,
    speechTranscript,
    typedText,
    learningReviewCorpus,
    promptText,
    requireSpeechPronunciation,
    hasStudentCorpus,
    ...(worksheetCaptureContext ? { worksheetCaptureContext } : {}),
  };
}

export type VisionUserPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export function buildVisionUserContent(
  homeworkQuestion: string,
  images: AnalyzeImagePayload[],
  worksheetCaptureContext?: WorksheetCaptureContext,
): VisionUserPart[] {
  const questionBlock = homeworkQuestion
    ? `Student homework question (typed for this submission):\n${homeworkQuestion}\n\n`
    : "";
  const lowQualityLine =
    worksheetCaptureContext &&
    worksheetCaptureContext.lowQualityQuestions.length > 0
      ? `lowQualityQuestions (Quality — present but unclear; mark lower confidence): ${worksheetCaptureContext.lowQualityQuestions.join(", ")}\n`
      : "";
  const missingLine =
    worksheetCaptureContext &&
    worksheetCaptureContext.missingQuestions.length > 0
      ? `missingQuestions (Coverage — NOT photographed): ${worksheetCaptureContext.missingQuestions.join(", ")}\n`
      : "";
  const scope = worksheetCaptureContext?.analysisScope;
  const confidence = worksheetCaptureContext?.analysisConfidence;
  const evidenceEntries = worksheetCaptureContext
    ? Object.values(worksheetCaptureContext.questionEvidenceMap).sort(
        (a, b) => a.questionNumber - b.questionNumber,
      )
    : [];
  const evidenceBlock =
    evidenceEntries.length > 0
      ? [
          "questionEvidenceMap (Evidence Layer — AUTHORITATIVE):",
          JSON.stringify(evidenceEntries, null, 2),
          "You may analyze ONLY questionNumbers that appear in questionEvidenceMap.",
          "For each analyzed question, cite its QuestionEvidence (sourcePhotoLabel, visionConfidence, quality).",
          "If a question has no Evidence entry, reply in Traditional Chinese:",
          "「目前沒有收到第 X 題影像，因此無法分析。」",
          "FORBIDDEN: guessing, inventing answers, or analyzing missingQuestions.",
        ].join("\n") + "\n"
      : "";
  const scopeRules =
    scope === "partial"
      ? [
          "analysisScope = partial.",
          "You may analyze ONLY questions listed in questionEvidenceMap / coveredQuestions.",
          "FORBIDDEN:",
          "- Guessing or inventing answers for missingQuestions",
          "- Hallucinating questions that were not photographed",
          "- Answering questions not in questionEvidenceMap",
          "- Claiming the full worksheet was recognized or completed",
          "You may ONLY discuss currently evidenced questions.",
          'If the student asks about a missing / unphotographed question, reply exactly in Traditional Chinese: 「目前沒有收到該題影像，無法分析。」',
        ].join("\n") + "\n"
      : scope === "unknown"
        ? [
            "analysisScope = unknown (total question count unknown).",
            "Analyze only questions in questionEvidenceMap.",
            "Do not invent a full worksheet inventory.",
          ].join("\n") + "\n"
        : scope === "full"
          ? "analysisScope = full. Coverage is complete for estimatedTotalQuestions; still cite QuestionEvidence per question.\n"
          : "";
  const confidenceRules =
    confidence === "high"
      ? "analysisConfidence = high. Analyze normally with clear, confident wording.\n"
      : confidence === "medium"
        ? [
            "analysisConfidence = medium. Analysis is allowed.",
            "For Evidence with isLowConfidence=true, hedge: use 「可能」「看起來」; do not overstate certainty.",
            "Remind: 「此題影像可信度較低。」 on those questions.",
          ].join("\n") + "\n"
        : confidence === "low"
          ? [
              "analysisConfidence = low. Do NOT invent content.",
              "Analyze ONLY what QuestionEvidence supports.",
              "For every low-confidence Evidence question, remind: 「此題影像可信度較低。」",
              "You MUST include this Traditional Chinese reminder in the report:",
              "「部分題目影像可信度不足，以下分析僅供參考。」",
            ].join("\n") + "\n"
          : "";
  const captureBlock = worksheetCaptureContext
    ? `Multi-photo worksheet capture (quality check complete):\n` +
      `analysisScope: ${worksheetCaptureContext.analysisScope}\n` +
      `analysisConfidence: ${worksheetCaptureContext.analysisConfidence}\n` +
      `estimatedTotalQuestions: ${worksheetCaptureContext.estimatedTotalQuestions}\n` +
      `coveredQuestions: [${worksheetCaptureContext.coveredQuestions.join(", ")}]\n` +
      `missingQuestions: [${worksheetCaptureContext.missingQuestions.join(", ")}]\n` +
      `lowQualityQuestions: [${worksheetCaptureContext.lowQualityQuestions.join(", ")}]\n` +
      `captureComplete: ${worksheetCaptureContext.captureComplete ? "yes" : "no"}\n` +
      worksheetCaptureContext.photos
        .map(
          (p) =>
            `${p.photoLabel} covers questions: ${p.coversQuestions.join(", ")}`,
        )
        .join("\n") +
      `\n${missingLine}${lowQualityLine}${evidenceBlock}${scopeRules}${confidenceRules}` +
      `Coverage gaps and quality issues are SEPARATE: missing ≠ low-confidence.\n` +
      `Do not refuse analysis for low-quality evidenced questions; note lower confidence instead.\n\n`
    : "";
  const parts: VisionUserPart[] = [
    {
      type: "text",
      text:
        questionBlock +
        captureBlock +
        "Homework worksheet image(s) ONLY.\n" +
        "STEP 1: Fill homeworkReport.questionAnswerAudit (per-question answered|blank + reason). Derive counts ONLY from that audit.\n" +
        "Do not count printed questions, Chinese hints, model answers, or answer-key text as student answers.\n" +
        "Learning analytics (strengths, weaknesses, learning summary) only when status = detected (≥3 answered AND ≥20% coverage).\n" +
        "If insufficient: explain only answered questions; no overall ability evaluation.\n" +
        "Use ONLY OCR + visible worksheet content. No conversation history, no tutoring chat, no Whisper transcript, no Learning Review.\n" +
        "Do NOT analyze recent student messages or spoken responses.\n" +
        "Return JSON exactly as specified (imageInsights.homeworkReport + formattedReport).",
    },
  ];
  for (const img of images) {
    parts.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.dataBase64}`,
      },
    });
  }
  return parts;
}

export function buildSpeechUserContent(speechTranscript: string): string {
  return `Student transcript from speech audio:\n\n${speechTranscript}\n\nReturn the JSON object exactly as specified.`;
}

export function buildTypedTextUserContent(typedText: string): string {
  return `Student typed text (no speech audio):\n\n${typedText}\n\nReturn the JSON object exactly as specified — **without** pronunciationScores or pronunciationFocus keys.`;
}

export function buildLearningReviewUserContent(corpus: string): string {
  return `${corpus}\n\nReturn the JSON object exactly as specified.`;
}

export function analyzeRequestHasContent(req: ParsedAnalyzeApiRequest): boolean {
  switch (req.submissionKind) {
    case "homework_image":
    case "homework_image_with_question":
      return req.hasImages;
    case "speech_transcript":
      return req.speechTranscript.length > 0;
    case "typed_text":
      return req.typedText.length > 0;
    case "learning_review":
      return req.learningReviewCorpus.length > 0;
    default:
      return false;
  }
}
