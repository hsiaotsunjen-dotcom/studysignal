/**
 * Handwriting detection with explicit per-rule evidence for calibration.
 * Counting logic lives in homeworkStudentAnswers.ts — this module only decides
 * whether visible student handwriting is present for one question.
 */

export type HandwritingRuleId =
  | "empty_input"
  | "explicit_blank_marker"
  | "ocr_noise_only"
  | "printed_instruction"
  | "printed_chinese_hint"
  | "model_or_answer_key"
  | "correct_marker_without_handwriting"
  | "long_question_stem"
  | "model_handwriting_flag"
  | "model_handwriting_reason"
  | "model_snippet_confirmed"
  | "ocr_answer_area_match"
  | "short_handwritten_token"
  | "explicit_student_marker"
  | "no_confirmed_handwriting";

export type HandwritingRuleTrace = {
  rule: HandwritingRuleId;
  passed: boolean;
  detail: string;
};

export type HandwritingDetectionEvidence = {
  questionNumber: number;
  questionLabel: string;
  /** OCR text extracted from the answer blank region (may be empty if not found). */
  ocrTextInAnswerArea: string;
  /** How ocrTextInAnswerArea was extracted — for calibration, not guessing. */
  ocrExtractionMethod: string;
  /** Raw OCR lines searched (truncated). */
  ocrRawContext: string;
  /** answerOverview body for this question, if any. */
  answerOverviewBody: string;
  /** Fields from vision model questionAnswerAudit entry, if any. */
  modelAudit: {
    status?: string;
    reason?: string;
    studentAnswerSnippet?: string;
    answerAreaOcr?: string;
    handwritingDetected?: boolean;
    confidence?: number;
  };
  handwritingDetected: boolean;
  /** 0–100; derived only from rules that actually fired — not guessed. */
  confidence: number;
  classification: "answered" | "blank";
  classificationReason: string;
  /** Rule that caused rejection when handwriting signals existed but outcome is blank. */
  rejectedByRule?: HandwritingRuleId;
  rulesApplied: HandwritingRuleTrace[];
  exactEvidence: string[];
};

const BLANK_ANSWER_FRAGMENT =
  /^(?:—|–|-|\.\.\.|___+|\(\s*\)|\(\s*blank\s*\)|\(空白\)|\(未作答\)|blank|empty|unanswered|no answer|not answered|n\/a|未作答|空白|無作答|未填|未寫|no student)/i;

const STUDENT_ANSWER_MARKER =
  /student(?:'s)?\s+(?:wrote|written|answer|response|handwriting)|handwritten(?:\s+answer)?|學生(?:手寫|作答|寫了|寫的|填寫)|visible handwriting|手寫(?:答案|作答)/i;

const HANDWRITING_REASON =
  /handwrit|student\s+(?:wrote|written|answer)|visible\s+(?:pen|ink)|學生(?:手寫|寫了|作答|填寫)|手寫(?:答案|作答)|ink\s+mark|pencil|填在|寫在.*空白/i;

const MODEL_OR_KEY_MARKER =
  /^(?:correct answer|model answer|reference answer|answer key|key answer|標準答案|參考答案|應為|建議答案|teacher answer|expected answer)/i;

const PRINTED_INSTRUCTION_MARKER =
  /^(?:choose|fill in|circle|write|select|read|complete|match|look|根據|請|下列|選出|選擇|填入|完成句子)/i;

const OCR_NOISE_FRAGMENT = /^[\s|/\\*•·.。,，:：;；!?？!'"`~^]+$/;

/** Short Latin token that could be a handwritten fill-in (e.g. "in", "at", "dog"). */
const SHORT_HANDWRITTEN_TOKEN = /^[a-zA-Z]{2,20}$/;

const ANSWERED_CONFIDENCE_THRESHOLD = 50;

function toTrimmed(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function bodyLooksLikePrintedHint(body: string): boolean {
  const compact = body.replace(/\s+/g, "");
  if (!compact) return true;
  const cjk = (compact.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latin = (compact.match(/[a-zA-Z]/g) ?? []).length;
  if (cjk >= 4 && latin === 0) return true;
  if (cjk >= 6 && cjk > latin * 2) return true;
  return false;
}

function bodyLooksLikeOcrNoise(body: string): boolean {
  const compact = body.replace(/\s+/g, "");
  if (!compact) return true;
  if (OCR_NOISE_FRAGMENT.test(compact)) return true;
  if (compact.length <= 1) return true;
  if (/^[\d\s.()]+$/.test(compact) && compact.length <= 4) return true;
  return false;
}

function normalizeToken(text: string): string {
  return text.trim().toLowerCase().replace(/[^\w]/g, "");
}

function tokensMatch(a: string, b: string): boolean {
  const na = normalizeToken(a);
  const nb = normalizeToken(b);
  return na.length > 0 && na === nb;
}

export type OcrAnswerAreaExtraction = {
  ocrTextInAnswerArea: string;
  ocrExtractionMethod: string;
  ocrRawContext: string;
};

/** Extract OCR text near a numbered blank — reports method and context, does not infer answers. */
export function extractOcrAnswerArea(
  ocrText: string,
  questionNumber: number,
): OcrAnswerAreaExtraction {
  const lines = ocrText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const q = questionNumber;
  const lineMatchers = [
    new RegExp(`\\(${q}\\)`, "i"),
    new RegExp(`^${q}[.)]\\s`, "i"),
    new RegExp(`^Q\\s*${q}\\b`, "i"),
    new RegExp(`^Question\\s*${q}\\b`, "i"),
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!lineMatchers.some((re) => re.test(line))) continue;

    const contextLines = lines.slice(i, Math.min(i + 4, lines.length));
    const rawContext = contextLines.join(" | ").slice(0, 400);

    // Fill-in-blank: text immediately after (n) e.g. "I live (1) in the city"
    const afterNumberedBlank = line.match(
      new RegExp(`\\(${q}\\)\\s*[_\u2014\u2013\\-.\u00b7\u00b7\u00b7]*\\s*([a-zA-Z]{1,30})`, "i"),
    );
    if (afterNumberedBlank?.[1]) {
      return {
        ocrTextInAnswerArea: afterNumberedBlank[1],
        ocrExtractionMethod: `regex_after_(${q})_blank`,
        ocrRawContext: rawContext,
      };
    }

    // Underline blank: (1) _____ word
    const afterUnderline = line.match(
      new RegExp(`\\(${q}\\)\\s*[_\s]{2,}\\s*([a-zA-Z]{1,30})`, "i"),
    );
    if (afterUnderline?.[1]) {
      return {
        ocrTextInAnswerArea: afterUnderline[1],
        ocrExtractionMethod: `regex_after_(${q})_underline`,
        ocrRawContext: rawContext,
      };
    }

    // Answer on following line (standalone short token)
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const next = lines[j]!;
      if (SHORT_HANDWRITTEN_TOKEN.test(next)) {
        return {
          ocrTextInAnswerArea: next,
          ocrExtractionMethod: `following_line_after_(${q})`,
          ocrRawContext: rawContext,
        };
      }
    }

    // Trailing word on same line after blank markers
    const trailingWord = line.match(
      new RegExp(`\\(${q}\\)[^a-zA-Z]*([a-zA-Z]{2,20})\\s*$`, "i"),
    );
    if (trailingWord?.[1]) {
      return {
        ocrTextInAnswerArea: trailingWord[1],
        ocrExtractionMethod: `trailing_word_on_question_line`,
        ocrRawContext: rawContext,
      };
    }

    return {
      ocrTextInAnswerArea: "",
      ocrExtractionMethod: `question_line_found_no_extractable_answer_for_(${q})`,
      ocrRawContext: rawContext,
    };
  }

  return {
    ocrTextInAnswerArea: "",
    ocrExtractionMethod: `no_line_matching_question_${q}`,
    ocrRawContext: ocrText.slice(0, 400),
  };
}

export type HandwritingDetectionInput = {
  questionNumber: number;
  ocrText: string;
  answerOverviewBody?: string;
  modelAudit?: {
    status?: string;
    reason?: string;
    studentAnswerSnippet?: string;
    answerAreaOcr?: string;
    handwritingDetected?: boolean;
    confidence?: number;
  };
};

export function detectQuestionHandwriting(
  input: HandwritingDetectionInput,
): HandwritingDetectionEvidence {
  const questionNumber = input.questionNumber;
  const questionLabel = `Q${questionNumber}`;
  const overviewBody = toTrimmed(input.answerOverviewBody);
  const modelAudit = {
    status: toTrimmed(input.modelAudit?.status) || undefined,
    reason: toTrimmed(input.modelAudit?.reason) || undefined,
    studentAnswerSnippet:
      toTrimmed(input.modelAudit?.studentAnswerSnippet) || undefined,
    answerAreaOcr: toTrimmed(input.modelAudit?.answerAreaOcr) || undefined,
    handwritingDetected: input.modelAudit?.handwritingDetected,
    confidence:
      typeof input.modelAudit?.confidence === "number" &&
      Number.isFinite(input.modelAudit.confidence)
        ? Math.round(
            Math.min(100, Math.max(0, input.modelAudit.confidence)),
          )
        : undefined,
  };

  const ocrExtracted = extractOcrAnswerArea(input.ocrText, questionNumber);
  const ocrTextInAnswerArea =
    modelAudit.answerAreaOcr || ocrExtracted.ocrTextInAnswerArea;
  const ocrExtractionMethod = modelAudit.answerAreaOcr
    ? "model_audit.answerAreaOcr"
    : ocrExtracted.ocrExtractionMethod;

  const rulesApplied: HandwritingRuleTrace[] = [];
  const exactEvidence: string[] = [];
  let confidence = 0;
  let acceptRule: HandwritingRuleId | undefined;

  const addRule = (rule: HandwritingRuleId, passed: boolean, detail: string) => {
    rulesApplied.push({ rule, passed, detail });
  };

  const reject = (rule: HandwritingRuleId, detail: string): HandwritingDetectionEvidence => {
    addRule(rule, true, detail);
    exactEvidence.push(`REJECTED by ${rule}: ${detail}`);
    return finalize("blank", detail, rule);
  };

  const accept = (
    rule: HandwritingRuleId,
    detail: string,
    score: number,
  ): HandwritingDetectionEvidence => {
    acceptRule = rule;
    confidence = Math.min(100, confidence + score);
    addRule(rule, true, detail);
    exactEvidence.push(`ACCEPTED by ${rule}: ${detail} (+${score} confidence)`);
    return finalize("answered", detail);
  };

  const finalize = (
    classification: "answered" | "blank",
    reason: string,
    rejectRule?: HandwritingRuleId,
  ): HandwritingDetectionEvidence => {
    const handwritingDetected = classification === "answered";
    if (modelAudit.handwritingDetected === true && !handwritingDetected) {
      exactEvidence.push(
        "NOTE: model reported handwritingDetected=true but server rules rejected",
      );
    }
    if (modelAudit.handwritingDetected === false && handwritingDetected) {
      exactEvidence.push(
        "NOTE: model reported handwritingDetected=false but server rules accepted",
      );
    }
    return {
      questionNumber,
      questionLabel,
      ocrTextInAnswerArea,
      ocrExtractionMethod,
      ocrRawContext: ocrExtracted.ocrRawContext,
      answerOverviewBody: overviewBody,
      modelAudit,
      handwritingDetected,
      confidence: handwritingDetected ? Math.max(confidence, ANSWERED_CONFIDENCE_THRESHOLD) : confidence,
      classification,
      classificationReason: reason,
      ...(rejectRule ? { rejectedByRule: rejectRule } : {}),
      rulesApplied,
      exactEvidence,
    };
  };

  // --- Record inputs ---
  exactEvidence.push(`ocrTextInAnswerArea="${ocrTextInAnswerArea}" (${ocrExtractionMethod})`);
  if (overviewBody) exactEvidence.push(`answerOverviewBody="${overviewBody}"`);
  if (modelAudit.studentAnswerSnippet) {
    exactEvidence.push(`modelSnippet="${modelAudit.studentAnswerSnippet}"`);
  }
  if (modelAudit.reason) exactEvidence.push(`modelReason="${modelAudit.reason}"`);
  if (modelAudit.status) exactEvidence.push(`modelStatus="${modelAudit.status}"`);

  const primaryText = overviewBody || modelAudit.studentAnswerSnippet || ocrTextInAnswerArea;

  // --- Blank rejection rules (on primary text) ---
  if (!primaryText && !modelAudit.handwritingDetected) {
    addRule("empty_input", true, "no overview, snippet, or OCR answer-area text");
    return finalize(
      "blank",
      "no text in answer area (overview, model snippet, or OCR extraction all empty)",
      "empty_input",
    );
  }
  addRule("empty_input", false, "at least one text source present");

  const checkText = overviewBody || modelAudit.studentAnswerSnippet || "";
  if (checkText && BLANK_ANSWER_FRAGMENT.test(checkText)) {
    return reject("explicit_blank_marker", `text matches blank marker: "${checkText}"`);
  }
  addRule("explicit_blank_marker", false, "not a blank marker");

  if (checkText && bodyLooksLikeOcrNoise(checkText)) {
    return reject("ocr_noise_only", `text looks like OCR noise: "${checkText}"`);
  }
  addRule("ocr_noise_only", false, "not OCR noise");

  if (checkText && PRINTED_INSTRUCTION_MARKER.test(checkText)) {
    return reject("printed_instruction", `printed instruction: "${checkText}"`);
  }
  addRule("printed_instruction", false, "not printed instruction");

  if (checkText && bodyLooksLikePrintedHint(checkText)) {
    return reject("printed_chinese_hint", `printed Chinese hint: "${checkText}"`);
  }
  addRule("printed_chinese_hint", false, "not printed Chinese hint");

  if (checkText && MODEL_OR_KEY_MARKER.test(checkText)) {
    return reject("model_or_answer_key", `model/answer-key text: "${checkText}"`);
  }
  addRule("model_or_answer_key", false, "not model answer key");

  if (
    checkText &&
    /^(?:correct|✓|✔|√)\s*[:：]?\s*/i.test(checkText) &&
    !STUDENT_ANSWER_MARKER.test(checkText)
  ) {
    return reject(
      "correct_marker_without_handwriting",
      `correct-answer marker without handwriting evidence: "${checkText}"`,
    );
  }
  addRule("correct_marker_without_handwriting", false, "no spurious correct marker");

  if (checkText.length > 100 && /[?？]/.test(checkText)) {
    return reject("long_question_stem", `long printed question stem: "${checkText.slice(0, 80)}…"`);
  }
  addRule("long_question_stem", false, "not a long question stem");

  // --- Acceptance rules ---

  if (modelAudit.handwritingDetected === true) {
    const modelConf = modelAudit.confidence ?? 40;
    confidence += modelConf;
    addRule("model_handwriting_flag", true, `model handwritingDetected=true (confidence ${modelConf})`);
    if (confidence >= ANSWERED_CONFIDENCE_THRESHOLD) {
      return accept(
        "model_handwriting_flag",
        `vision model flagged handwriting (confidence ${confidence})`,
        0,
      );
    }
  } else {
    addRule("model_handwriting_flag", false, "model handwritingDetected not true");
  }

  if (modelAudit.reason && HANDWRITING_REASON.test(modelAudit.reason)) {
    const snippet = modelAudit.studentAnswerSnippet;
    if (snippet && bodyLooksLikePrintedHint(snippet)) {
      return reject(
        "printed_chinese_hint",
        `handwriting reason present but snippet looks printed: "${snippet}"`,
      );
    }
    return accept(
      "model_handwriting_reason",
      `model reason cites handwriting: "${modelAudit.reason}"`,
      55,
    );
  }
  addRule("model_handwriting_reason", false, "model reason does not cite handwriting");

  if (modelAudit.studentAnswerSnippet && modelAudit.reason) {
    const synthetic = `student wrote: "${modelAudit.studentAnswerSnippet}"`;
    if (STUDENT_ANSWER_MARKER.test(synthetic) || HANDWRITING_REASON.test(modelAudit.reason)) {
      return accept(
        "model_snippet_confirmed",
        `model snippet with handwriting reason: "${modelAudit.studentAnswerSnippet}"`,
        60,
      );
    }
  }
  addRule("model_snippet_confirmed", false, "no confirmed model snippet");

  const snippet = modelAudit.studentAnswerSnippet;
  if (snippet && ocrTextInAnswerArea && tokensMatch(snippet, ocrTextInAnswerArea)) {
    return accept(
      "ocr_answer_area_match",
      `model snippet "${snippet}" matches OCR answer area "${ocrTextInAnswerArea}"`,
      65,
    );
  }
  if (overviewBody && ocrTextInAnswerArea && tokensMatch(overviewBody, ocrTextInAnswerArea)) {
    return accept(
      "ocr_answer_area_match",
      `overview "${overviewBody}" matches OCR answer area "${ocrTextInAnswerArea}"`,
      60,
    );
  }
  addRule(
    "ocr_answer_area_match",
    false,
    `no token match (snippet="${snippet ?? ""}", overview="${overviewBody}", ocr="${ocrTextInAnswerArea}")`,
  );

  // Short handwritten token: OCR or overview has a short word, cross-confirmed
  const ocrToken = ocrTextInAnswerArea.trim();
  const overviewToken = overviewBody.trim();
  if (SHORT_HANDWRITTEN_TOKEN.test(ocrToken)) {
    if (!overviewToken || tokensMatch(overviewToken, ocrToken)) {
      return accept(
        "short_handwritten_token",
        `short token "${ocrToken}" in OCR answer area${overviewToken ? ` (matches overview "${overviewToken}")` : ""}`,
        55,
      );
    }
  }
  if (
    SHORT_HANDWRITTEN_TOKEN.test(overviewToken) &&
    (!ocrToken || tokensMatch(overviewToken, ocrToken))
  ) {
    return accept(
      "short_handwritten_token",
      `short token "${overviewToken}" in overview${ocrToken ? ` (matches OCR "${ocrToken}")` : " (no OCR contradiction)"}`,
      50,
    );
  }
  addRule(
    "short_handwritten_token",
    false,
    `no short-token match (ocr="${ocrToken}", overview="${overviewToken}")`,
  );

  const markerText = overviewBody || modelAudit.reason || "";
  if (STUDENT_ANSWER_MARKER.test(markerText)) {
    return accept(
      "explicit_student_marker",
      `explicit student handwriting marker in: "${markerText.slice(0, 100)}"`,
      70,
    );
  }
  addRule("explicit_student_marker", false, "no explicit student marker");

  // Had some text but no rule accepted
  addRule(
    "no_confirmed_handwriting",
    true,
    `insufficient evidence (confidence=${confidence}, acceptRule=${acceptRule ?? "none"})`,
  );
  return finalize(
    "blank",
    primaryText
      ? `no confirmed handwriting for "${primaryText}" — no rule met threshold (confidence ${confidence})`
      : "no confirmed handwriting — all sources empty or rejected",
    "no_confirmed_handwriting",
  );
}

export function logHandwritingDetectionEvidence(
  evidence: HandwritingDetectionEvidence,
): void {
  const label = evidence.questionLabel;
  console.log(`[handwriting detection ${label}]`, {
    ocrTextInAnswerArea: evidence.ocrTextInAnswerArea,
    ocrExtractionMethod: evidence.ocrExtractionMethod,
    ocrRawContext: evidence.ocrRawContext,
    answerOverviewBody: evidence.answerOverviewBody,
    modelAudit: evidence.modelAudit,
    handwritingDetected: evidence.handwritingDetected,
    confidence: evidence.confidence,
    classification: evidence.classification,
    classificationReason: evidence.classificationReason,
    rejectedByRule: evidence.rejectedByRule,
    exactEvidence: evidence.exactEvidence,
    rulesApplied: evidence.rulesApplied,
  });
}
