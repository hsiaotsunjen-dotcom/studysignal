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
}): AnalyzeApiRequestBody | null {
  /** Homework pipeline — images must never fall through to Talk / Learning Review. */
  if (input.hasImages) {
    if (!input.images?.length) return null;
    return buildHomeworkAnalyzeRequest({
      images: input.images,
      composerText: input.composerText,
      composerTextSource: input.composerTextSource,
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
  };
}

export type VisionUserPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export function buildVisionUserContent(
  homeworkQuestion: string,
  images: AnalyzeImagePayload[],
): VisionUserPart[] {
  const questionBlock = homeworkQuestion
    ? `Student homework question (typed for this submission):\n${homeworkQuestion}\n\n`
    : "";
  const parts: VisionUserPart[] = [
    {
      type: "text",
      text:
        questionBlock +
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
