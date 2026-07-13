// =====================================================
// Architecture Rule
//
// Provider response
//          ↓
// Schema Mapping Layer  (homeworkSchemaMapping.ts)
//          ↓
// Internal Homework Schema
//          ↓
// Parser  (this file)
//          ↓
// UI
//
// Parser must never branch on Provider.
// Parser must only consume Internal Schema.
// Provider differences belong only in the Mapping Layer.
// =====================================================

import { NextResponse } from "next/server";

import {
  analyzeRequestHasContent,
  buildLearningReviewUserContent,
  buildSpeechUserContent,
  buildTypedTextUserContent,
  buildVisionUserContent,
  parseAnalyzeApiRequest,
  type VisionUserPart,
} from "@/lib/analyzeApiRequest";
import {
  countAnswerOverviewEntries,
  countHomeworkUiAnswerEntries,
  countOcrQuestionNumbers,
  extractAnswerOverviewFromFormattedReport,
  parseAnalyzeApiData,
  parseDeclaredQuestionCount,
} from "@/lib/analyzeFeedback";
import { mapProviderResponseToInternalHomeworkSchema } from "@/lib/homeworkSchemaMapping";

/** TEMPORARY: set false to silence verbose analyze logs. Remove after debugging. */
const ANALYZE_ROUTE_DEBUG = true;

function analyzeLog(label: string, payload?: unknown) {
  if (!ANALYZE_ROUTE_DEBUG) return;
  if (payload !== undefined) {
    console.log(`[analyze trace] ${label}`, payload);
  } else {
    console.log(`[analyze trace] ${label}`);
  }
}

async function logAnalyzeIncomingImageDebug(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  console.log("[image upload debug] api /api/analyze transport", {
    contentType,
    multipart: contentType.includes("multipart/form-data"),
    note:
      "StudySignal sends images as JSON body.images[] (base64), NOT FormData image field",
  });

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.clone().formData();
      const keys = [...formData.keys()];
      const image =
        formData.get("image") ?? formData.get("file") ?? formData.get("images");
      console.log("[image upload debug] api /api/analyze formData", {
        keys,
        "image exists": image != null,
        "image.name": image instanceof File ? image.name : null,
        "image.type": image instanceof Blob ? image.type : null,
        "image.size": image instanceof Blob ? image.size : null,
      });
    } catch (e) {
      console.log("[image upload debug] api /api/analyze formData error", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return;
  }

  console.log("[image upload debug] api /api/analyze formData skipped", {
    reason: "JSON transport — check JSON images received log next",
  });
}

const TUTOR_SPEECH_WITH_PRONUNCIATION_PROMPT = `You are an expert, warm English tutor for Taiwanese junior-high / elementary learners. The student submitted text that came from **actual speech audio** (dictation). Infer intended English when ASR is imperfect.

Return ONLY one JSON object (no markdown fences, no prose outside JSON). All student-facing explanation strings MUST be Traditional Chinese (繁體中文), except:
- "pronunciationFocus[].word" = English word/short phrase from their text
- "pronunciationFocus[].reasonToPractice" and "pronunciationTip" = concise English is OK, or short bilingual if helpful.

Use exactly these keys and nesting (camelCase):

- grammar: object with score 0–100, strengths (2–3 繁體中文), whyNot100 (2–3 繁體中文), improvementExamples (1–3 繁體中文). **Each whyNot100 bullet MUST read like a teacher marking homework in one string with three clear parts:** (1) **Student:** quote or tightly paraphrase their actual words (use 「」 for the student fragment); (2) **Correction:** your improved English; (3) **Why (繁體):** one short sentence why the correction is clearer / more accurate / more natural. **FORBIDDEN:** bullets that only say the score could be higher with no (1)(2)(3).
- vocabulary: same shape and **same whyNot100 three-part rule** as grammar.
- fluency: same shape and **same whyNot100 three-part rule**, but for sentence flow and naturalness (NOT accent — accent belongs ONLY in pronunciationScores / pronunciationFocus below).

- expression: OPTIONAL — same object shape as grammar. If included, focus on **communication, tone, clarity, and dialogue naturalness** (not single-word lexis already covered under vocabulary). Use the **same three-part whyNot100 rule**. If the transcript is too short to add value beyond fluency, omit this key entirely.

- pronunciationScores: REQUIRED object (based on the spoken transcript and speech context). Keys:
  - overallScore, accuracy, fluency, clarity: integers 0–100
  - feedback: one paragraph 繁體中文 with concrete pronunciation tips tied to their wording

- pronunciationFocus: array of exactly 3 objects. Each object MUST include keys "word", "ipaUs", "ipaUk", "reasonToPractice", "pronunciationTip". "ipaUs" and "ipaUk" are REQUIRED (not optional): use slash-wrapped General American IPA in "ipaUs" and British RP IPA in "ipaUk" (e.g. "/həˈloʊ/" and "/həˈləʊ/"). If pronunciation is unknown for a field, use an empty string "" for that field—never omit "ipaUs" or "ipaUk".

- tutorModelAnswer: REQUIRED object with "studentVersion", "betterVersion", "nativeLikeVersion" — three English versions of the same communicative intent: (1) close to their current output, (2) clearer corrected English, (3) concise native-like English; optional short 繁體 gloss in parentheses per line.

- learningSummary: REQUIRED object with "strengths", "weaknesses", "whatToPracticeNext" — each an array of 2–4 concise bullets 繁體中文 grounded in their transcript.

- tutorComment: object (繁體中文 for all three): whatWentWell, biggestImprovementOpportunity, whatToTryNextTime — cite observable details from their transcript.

STRICTLY FORBIDDEN in tutorComment: empty platitudes without specifics.

If the transcript is very short, still fill arrays to required lengths; be fair and specific.`;

const TUTOR_TEXT_OR_IMAGE_NO_PRONUNCIATION_PROMPT = `You are an expert, warm English tutor for Taiwanese junior-high / elementary learners.

**There is NO speech audio for this submission.** Do NOT output pronunciationScores or any numeric "how they sounded when speaking" rubric.

Return ONLY one JSON object (no markdown fences). All student-facing explanation strings MUST be Traditional Chinese (繁體中文), except English example sentences where helpful.

Use exactly these keys (camelCase):

- grammar, vocabulary, fluency: each object with score 0–100, strengths (2–3 繁體中文), whyNot100 (2–3 繁體中文), improvementExamples (1–3 繁體中文). **Each whyNot100 bullet MUST use one string with three labeled parts** like 【學生】…【改寫】…【說明】… (or "Student wrote: … | Correction: … | Why better (繁體): …"): (1) a **specific** fragment from the learner's submission (quote their words when possible); (2) the **corrected English**; (3) **one short Traditional Chinese sentence** why that correction is better (clearer / more accurate / more natural). **FORBIDDEN:** generic「還可以更好」or score-only comments without (1)(2)(3).

- expression: OPTIONAL — same object shape as grammar. When the submission is **multi-turn student chat** or otherwise rich enough, **include expression** for **overall communication, tone, clarity, and dialogue naturalness** (do not repeat pure vocabulary issues already in vocabulary.whyNot100). Use the **same three-part whyNot100 rule**. If it would only duplicate fluency, omit the key.

- pronunciationFocus: array of exactly 3 objects — **dictionary / read-aloud practice** for English words or short phrases that **literally appear** in the student's submitted text. Each object MUST have "word" (copied from their text), "ipaUs", "ipaUk" (slash-wrapped General American and RP; use "" if unknown), "reasonToPractice", "pronunciationTip" (繁體中文, may add brief English). Do **NOT** claim they mispronounced these in real life; this is how to pronounce what they wrote.

- tutorModelAnswer: object with "studentVersion", "betterVersion", "nativeLikeVersion" — three English versions of the **same communicative intent**: (1) close to their level, (2) clearer English, (3) concise native-like English; optional short 繁體 gloss in parentheses.

- learningSummary: object with "strengths", "weaknesses", "whatToPracticeNext" — each an array of 2–4 concise bullets 繁體中文 grounded in the submission.

- tutorComment: object (繁體中文): whatWentWell, biggestImprovementOpportunity, whatToTryNextTime — cite their written text.

**Omit** pronunciationScores entirely (do not include that key).`;

const TUTOR_VISION_IMAGES_PROMPT = `You are a real English teacher reviewing a student's **worksheet photo**. You are NOT reviewing tutoring chat, speech, or conversation history.

The input is **worksheet image(s) only** — OCR + visible questions and written answers. There is NO Whisper transcript, NO microphone audio, NO Talk chat log, and NO "Learning Review" task.

========================
STEP 1 — STUDENT ANSWERS & EVIDENCE CHECK (MANDATORY FIRST)
========================
Count before any learning analytics — **do not guess from model answers or printed question text**:

1. **questionAnswerAudit** (REQUIRED array) — one entry per worksheet question:
   { "questionNumber": 1, "questionLabel": "Q1", "status": "answered"|"blank", "reason": "why", "studentAnswerSnippet": "only if answered", "answerAreaOcr": "OCR text inside the answer blank only", "handwritingDetected": true|false, "confidence": 0-100 }
   - **answered** = visible **student handwriting** in the answer blank (not printed question text, not Chinese hints, not answer-key text)
   - **blank** = empty blank, printed-only, unreadable, or uncertain
   - **reason** must cite what you saw (e.g. "handwriting: 'in'" or "empty blank")
   - **answerAreaOcr** = exact text you read inside the answer blank (empty string if blank)
   - **handwritingDetected** = true only when you see pen/pencil handwriting in the blank

2. Derive counts **only** from questionAnswerAudit (ignore aggregate guesses):
   - **totalQuestionCount** = audit array length (or questionCount on sheet)
   - **studentAnsweredQuestions** = count where status = "answered"
   - **studentAnswerCoveragePercent** = round(answered ÷ total × 100)

Set **homeworkReport.studentAnswersStatus**:
- **"none"** — studentAnsweredQuestions = 0 (blank / only printed questions)
- **"unclear"** — cannot confidently tell if handwriting exists (blur, glare, crop)
- **"insufficient"** — studentAnsweredQuestions > 0 BUT evidence too low: **fewer than 3 answered** OR **coverage below 20%**
- **"detected"** — at least 3 answered questions AND coverage ≥ 20%

**Never guess student ability from the worksheet alone.**

If **"none"**:
- Set **noStudentAnswersMessage** (Traditional Chinese + English) as before
- **DO NOT output** marking, model answers, keyExplanations, learningSignal, learningSummary, strengths, weaknesses, practice recommendations, or ability evaluation
- **formattedReport** = only the noStudentAnswersMessage

If **"unclear"**:
- Set **unclearPhotoMessage** — ask for clearer photo (Traditional Chinese + English)
- Same restrictions as **"none"**

If **"insufficient"**:
- Set **insufficientEvidenceMessage**:
  "只偵測到少量作答。尚無足夠證據評估整體學習表現。"
  "Only a small number of answers were detected. There is not enough evidence to evaluate learning performance yet."
- Include totalQuestionCount, studentAnsweredQuestions, studentAnswerCoveragePercent
- **ONLY explain the answered question(s)** in answerOverview / keyExplanations
- **DO NOT output**: learningSummary, learningSignal, strengths, weaknesses, practice recommendations, or overall ability evaluation
- **formattedReport** may include Answer Overview + Question Analysis for answered items only — **no Learning Summary section**

Only if **"detected"** (sufficient evidence) proceed to Step 2 full analytics below.

========================
ABSOLUTELY FORBIDDEN (all statuses)
========================
- Any "Learning Review" section or title
- Phrases like "analyze the student's recent responses", "recent student lines", "tutoring conversation", "student said in chat"
- Top-level keys: grammar, vocabulary, fluency, expression, pronunciationScores, pronunciationFocus, tutorModelAnswer, tutorComment
- Invented spoken sentences, fake dialogue, speech scores, pronunciation practice
- 【學生】/【改寫】/【說明】 Talk-rubric speaking corrections
- Summaries of chat messages or tutor-student conversation
- Inferring student strengths/weaknesses when evidence is none, unclear, or insufficient

========================
STEP 2 — FULL MARKING & LEARNING ANALYTICS (only when studentAnswersStatus = "detected")
========================
Traditional Chinese (繁體中文) for explanations; English for worksheet answers.

Required **imageInsights**:
- ocrText: OCR summary from the sheet
- visualSummaryZh: what the worksheet shows (worksheet content only — NOT chat)
- homeworkReport:
  - studentAnswersStatus: "detected"
  - totalQuestionCount, studentAnsweredQuestions, studentAnswerCoveragePercent
  - homeworkType, questionCount, imageQuality
  - questionRecognitionIssues: [] or list of { questionLabel, issue } for unreadable items only
  - hintsFirst: optional (learning mode)
  - answerOverview: numbered answers 1..N — include **student's visible answers** and marking; do not invent answers they did not write
  - keyExplanations: **one object per worksheet question** with ALL fields:
    {
      "questionLabel": "Question 1",
      "correctAnswer": "English answer",
      "why": "繁體中文 — why this answer is correct (teacher tone, specific to this item)",
      "grammarExplanation": "繁體中文 — grammar point for this item",
      "vocabularyExplanation": "繁體中文 — vocabulary point for this item",
      "whyWrongChoices": "繁體中文 — why other options are wrong (use 不適用 if not multiple choice)",
      "commonMistakes": "繁體中文 — common student mistakes on this item",
      "learningTips": "繁體中文 — practical tip",
      "learningTakeaway": "繁體中文 — one memorable takeaway from this question",
      "example": "optional short English example"
    }
  - learningSignal: 3–6 bullets of concepts from the **worksheet** (e.g. "✅ Third-person singular")
  - learningSummary: REQUIRED { "strengths", "weaknesses", "whatToPracticeNext" } — 2–4 bullets each, **only from visible student work** (NOT conversation or speaking)

**formattedReport** (REQUIRED string when detected) — read like a teacher's marked homework:
📸 Homework analyzed
✅ Answer Overview
🔍 Question-by-Question Analysis
📚 Learning Summary
   Strengths · Weaknesses · What to practice next (from **student's actual answers only**)

Tone: direct, warm, specific — like red-pen feedback on the sheet. No generic AI intros. No mention of chat, speech, or Learning Review.`;

type LossLayer = "OpenAI" | "JSON Parse" | "Parser" | "UI" | "none";

type HomeworkTraceSnapshot = {
  ocrQuestionCount: number;
  declaredQuestionCount: number | null;
  answerOverviewEntryCount: number;
  answerOverviewCharLength: number;
};

/** Extract a JSON string value by key from raw text without JSON.parse (trace only). */
function extractRawJsonStringField(raw: string, key: string): string {
  const marker = `"${key}"`;
  const idx = raw.indexOf(marker);
  if (idx < 0) return "";
  const colon = raw.indexOf(":", idx + marker.length);
  if (colon < 0) return "";
  let i = colon + 1;
  while (i < raw.length && /\s/.test(raw[i]!)) i++;
  if (raw[i] !== '"') return "";
  i++;
  let out = "";
  let escaped = false;
  for (; i < raw.length; i++) {
    const ch = raw[i]!;
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') break;
    out += ch;
  }
  return out
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractRawQuestionCount(raw: string): unknown {
  const m =
    /"questionCount"\s*:\s*("([^"]*)"|(\d+))/.exec(raw) ??
    /"question_count"\s*:\s*("([^"]*)"|(\d+))/.exec(raw);
  if (!m) return null;
  if (m[3] != null) return Number(m[3]);
  if (m[2] != null) return m[2];
  return null;
}

function readHomeworkFieldsFromParsed(parsed: unknown): {
  ocrText: string;
  questionCount: unknown;
  answerOverview: string;
  formattedReport: string;
} {
  if (!parsed || typeof parsed !== "object") {
    return {
      ocrText: "",
      questionCount: null,
      answerOverview: "",
      formattedReport: "",
    };
  }
  const root = parsed as Record<string, unknown>;
  const insights =
    root.imageInsights && typeof root.imageInsights === "object"
      ? (root.imageInsights as Record<string, unknown>)
      : null;
  const hr =
    insights?.homeworkReport && typeof insights.homeworkReport === "object"
      ? (insights.homeworkReport as Record<string, unknown>)
      : null;

  return {
    ocrText: String(insights?.ocrText ?? insights?.ocr_text ?? ""),
    questionCount:
      hr?.questionCount ??
      hr?.question_count ??
      root.questionCount ??
      root.question_count ??
      null,
    answerOverview: String(
      hr?.answerOverview ??
        hr?.answer_overview ??
        root.answerOverview ??
        root.answer_overview ??
        "",
    ),
    formattedReport: String(
      root.formattedReport ?? root.formatted_report ?? "",
    ),
  };
}

function snapshotFromHomeworkFields(fields: {
  ocrText: string;
  questionCount: unknown;
  answerOverview: string;
  formattedReport: string;
}): HomeworkTraceSnapshot {
  const ocrQuestionCount = countOcrQuestionNumbers(fields.ocrText);
  const declaredQuestionCount = parseDeclaredQuestionCount(
    typeof fields.questionCount === "number" ||
      typeof fields.questionCount === "string"
      ? fields.questionCount
      : undefined,
  );
  const overviewSource =
    fields.answerOverview ||
    (fields.formattedReport
      ? extractAnswerOverviewFromFormattedReport(fields.formattedReport)
      : "");
  return {
    ocrQuestionCount,
    declaredQuestionCount,
    answerOverviewEntryCount: countAnswerOverviewEntries(overviewSource),
    answerOverviewCharLength: overviewSource.length,
  };
}

function promptRequiresCompleteAnswerOverview(systemPrompt: string): boolean {
  return (
    systemPrompt.includes("every** question from 1 through questionCount") ||
    systemPrompt.includes("Never skip a question number")
  );
}

function inferLossLayer(
  step1: HomeworkTraceSnapshot,
  step3: HomeworkTraceSnapshot,
  step4: HomeworkTraceSnapshot,
  step5: HomeworkTraceSnapshot,
  step6: HomeworkTraceSnapshot,
): LossLayer {
  const baseline =
    step1.ocrQuestionCount > 0
      ? step1.ocrQuestionCount
      : step1.declaredQuestionCount ?? 0;
  if (baseline <= 0) return "none";

  if (step3.answerOverviewEntryCount < baseline) return "OpenAI";
  if (step4.answerOverviewEntryCount < step3.answerOverviewEntryCount) {
    return "JSON Parse";
  }
  if (step5.answerOverviewEntryCount < step4.answerOverviewEntryCount) {
    return "Parser";
  }
  if (step6.answerOverviewEntryCount < step5.answerOverviewEntryCount) {
    return "UI";
  }
  return "none";
}

export async function POST(request: Request) {
  await logAnalyzeIncomingImageDebug(request);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請傳送有效的 JSON。" }, { status: 400 });
  }

  const parsedRequest = parseAnalyzeApiRequest(body);
  if (!parsedRequest) {
    return NextResponse.json(
      { error: "請使用有效的 JSON 物件。" },
      { status: 400 },
    );
  }

  if (!analyzeRequestHasContent(parsedRequest)) {
    return NextResponse.json(
      { error: "請提供文字或至少一張圖片。" },
      { status: 400 },
    );
  }

  const {
    submissionKind,
    includePronunciation,
    images,
    hasImages,
    homeworkQuestion,
    speechTranscript,
    typedText,
    learningReviewCorpus,
    requireSpeechPronunciation,
    hasStudentCorpus,
  } = parsedRequest;

  analyzeLog("signals_pipeline_guard", {
    submissionKind,
    "Signals started": hasImages,
    "Microphone started?": false,
    "Whisper called?": false,
    homeworkQuestionLength: homeworkQuestion.length,
    speechTranscriptLength: speechTranscript.length,
    typedTextLength: typedText.length,
    learningReviewCorpusLength: learningReviewCorpus.length,
    imageCount: images.length,
    includePronunciation,
    hasStudentCorpus,
    note: "Homework submissions never accept speechTranscript; legacy text+images is coerced to homework_image.",
  });

  let systemPrompt: string;
  let userContent: string | VisionUserPart[];

  if (hasImages) {
    if (
      speechTranscript.length > 0 ||
      learningReviewCorpus.length > 0 ||
      (typedText.length > 0 && submissionKind.startsWith("homework"))
    ) {
      analyzeLog("homework_pipeline_isolation_reject", {
        submissionKind,
        speechTranscriptLength: speechTranscript.length,
        learningReviewCorpusLength: learningReviewCorpus.length,
        typedTextLength: typedText.length,
      });
      return NextResponse.json(
        { error: "作業圖片分析不可包含對話紀錄或語音轉寫。" },
        { status: 400 },
      );
    }
    systemPrompt = TUTOR_VISION_IMAGES_PROMPT;
    userContent = buildVisionUserContent(
      homeworkQuestion,
      images,
      parsedRequest.worksheetCaptureContext,
    );
  } else if (requireSpeechPronunciation) {
    systemPrompt = TUTOR_SPEECH_WITH_PRONUNCIATION_PROMPT;
    userContent = buildSpeechUserContent(speechTranscript);
  } else if (submissionKind === "learning_review") {
    systemPrompt = TUTOR_TEXT_OR_IMAGE_NO_PRONUNCIATION_PROMPT;
    userContent = buildLearningReviewUserContent(learningReviewCorpus);
  } else {
    systemPrompt = TUTOR_TEXT_OR_IMAGE_NO_PRONUNCIATION_PROMPT;
    userContent = buildTypedTextUserContent(typedText);
  }

  if (hasImages) {
    analyzeLog("STEP1_ocr_question_count", {
      ocrQuestionCount: null,
      note: "OCR is produced inside the LLM response (imageInsights.ocrText). Counted after OpenAI returns — see STEP3/STEP4.",
    });

    const userTextPart =
      typeof userContent !== "string"
        ? (userContent.find((p) => p.type === "text") as
            | { type: "text"; text: string }
            | undefined)
        : undefined;

    analyzeLog("STEP2_llm_prompt", {
      systemPromptLength: systemPrompt.length,
      systemPrompt,
      userText: typeof userContent === "string" ? userContent : userTextPart?.text,
      homeworkQuestionLength: homeworkQuestion.length,
      speechTranscriptLength: speechTranscript.length,
      promptPayload: {
        submissionKind,
        hasImages: true,
        homeworkQuestionInPrompt: homeworkQuestion.length > 0,
        imageCount: images.length,
      },
      promptQuestionCount: null,
      promptQuestionCountNote:
        "Prompt asks model to set homeworkReport.questionCount from visible worksheet; no fixed N sent.",
      requiresCompleteAnswerOverview:
        promptRequiresCompleteAnswerOverview(systemPrompt),
      imageCount: images.length,
    });
  }

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.4,
      max_tokens: hasImages ? 8192 : 4096,
    }),
  });

  if (!openaiRes.ok) {
    const detail = await openaiRes.text();
    return NextResponse.json(
      { error: "分析服務暫時失敗，請稍後再試。", detail },
      { status: 502 },
    );
  }

  const data = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const choice0 = data.choices?.[0];
  const rawContent = choice0?.message?.content?.trim() ?? "";
  console.log("RAW RESPONSE:");
  console.log(choice0?.message?.content);
  const finishReason = choice0?.finish_reason ?? null;

  let step3Snapshot: HomeworkTraceSnapshot | null = null;
  let step4Snapshot: HomeworkTraceSnapshot | null = null;
  let step5Snapshot: HomeworkTraceSnapshot | null = null;
  let step6Snapshot: HomeworkTraceSnapshot | null = null;
  let step1Snapshot: HomeworkTraceSnapshot | null = null;

  if (hasImages) {
    const ocrTextRaw = extractRawJsonStringField(rawContent, "ocrText");
    const answerOverviewRaw =
      extractRawJsonStringField(rawContent, "answerOverview") ||
      extractRawJsonStringField(rawContent, "answer_overview");
    const formattedReportRaw =
      extractRawJsonStringField(rawContent, "formattedReport") ||
      extractRawJsonStringField(rawContent, "formatted_report");
    const questionCountRaw = extractRawQuestionCount(rawContent);

    step3Snapshot = snapshotFromHomeworkFields({
      ocrText: ocrTextRaw,
      questionCount: questionCountRaw,
      answerOverview: answerOverviewRaw,
      formattedReport: formattedReportRaw,
    });

    step1Snapshot = step3Snapshot;

    analyzeLog("STEP1_ocr_question_count", {
      ocrQuestionCount: step1Snapshot.ocrQuestionCount,
      "OCR length": ocrTextRaw.length,
      ocrTextSnippet: ocrTextRaw.slice(0, 400),
      source: "imageInsights.ocrText from raw OpenAI response (string extract, no JSON.parse)",
    });

    analyzeLog("STEP3_openai_raw_before_json_parse", {
      responseLength: rawContent.length,
      finishReason,
      questionCount: questionCountRaw,
      answerOverviewRaw,
      answerOverviewRawLength: answerOverviewRaw.length,
      formattedReportRaw,
      formattedReportRawLength: formattedReportRaw.length,
      answerOverviewEntryCount: step3Snapshot.answerOverviewEntryCount,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent) as unknown;
  } catch (e) {
    analyzeLog("STEP4_json_parse_failed", {
      error: e instanceof Error ? e.message : String(e),
      rawContentPrefix: rawContent.slice(0, 2000),
    });
    return NextResponse.json(
      { error: "分析結果格式異常，請再試一次。" },
      { status: 502 },
    );
  }

  if (hasImages) {
    const fields4 = readHomeworkFieldsFromParsed(parsed);
    step4Snapshot = snapshotFromHomeworkFields(fields4);

    analyzeLog("STEP4_after_json_parse", {
      questionCount: fields4.questionCount,
      answerOverviewLength: fields4.answerOverview.length,
      formattedReportLength: fields4.formattedReport.length,
      answerOverviewEntryCount: step4Snapshot.answerOverviewEntryCount,
      ocrQuestionCount: step4Snapshot.ocrQuestionCount,
    });
  }

  // Schema Mapping Layer runs before Parser — do not add provider logic below.
  const schemaMapping = mapProviderResponseToInternalHomeworkSchema(parsed, {
    provider: hasImages ? "openai" : undefined,
    traceLog: (layer, payload) => analyzeLog(layer, payload),
  });
  parsed = schemaMapping.normalized;

  if (hasImages) {
    const fieldsMapped = readHomeworkFieldsFromParsed(parsed);
    analyzeLog("schema_mapping:pipeline_step", {
      step: "Provider Raw → Schema Mapping → Internal HomeworkReport (pre-parser)",
      rulesApplied: schemaMapping.rulesApplied,
      internalAnswerOverviewLength: fieldsMapped.answerOverview.length,
      internalFormattedReportLength: fieldsMapped.formattedReport.length,
      internalAnswerOverviewEntryCount: countAnswerOverviewEntries(
        fieldsMapped.answerOverview ||
          extractAnswerOverviewFromFormattedReport(fieldsMapped.formattedReport),
      ),
    });
  }

  const parseLog = (label: string, payload?: unknown) =>
    analyzeLog(`parse_step:${label}`, payload);

  const feedback = parseAnalyzeApiData(
    parsed,
    requireSpeechPronunciation,
    parseLog,
    { hasStudentCorpus },
  );

  if (!feedback) {
    return NextResponse.json(
      { error: "分析結果不完整，請再試一次。" },
      { status: 502 },
    );
  }

  if (hasImages && !feedback.imageInsights) {
    return NextResponse.json(
      { error: "分析結果缺少圖片辨識內容，請再試一次。" },
      { status: 502 },
    );
  }

  if (hasImages && feedback.imageInsights?.homeworkReport) {
    const report = feedback.imageInsights.homeworkReport;
    const ctx = parsedRequest.worksheetCaptureContext;
    const lowConfidenceQuestions = ctx?.lowQualityQuestions ?? [];
    const questionEvidenceMap = ctx?.questionEvidenceMap;
    if (lowConfidenceQuestions.length > 0 || questionEvidenceMap) {
      feedback.imageInsights.homeworkReport = {
        ...report,
        ...(lowConfidenceQuestions.length > 0
          ? { lowConfidenceQuestions }
          : {}),
        ...(questionEvidenceMap ? { questionEvidenceMap } : {}),
      };
    }
    const parserOverview = report.answerOverview;
    step5Snapshot = {
      ocrQuestionCount: countOcrQuestionNumbers(
        feedback.imageInsights.ocrText,
      ),
      declaredQuestionCount: parseDeclaredQuestionCount(report.questionCount),
      answerOverviewEntryCount: countHomeworkUiAnswerEntries(report),
      answerOverviewCharLength: report.formattedReport
        ? report.formattedReport.length
        : parserOverview.length,
    };

    analyzeLog("STEP5_after_parser", {
      parserAnswerCount: step5Snapshot.answerOverviewEntryCount,
      parserAnswerOverviewFieldCount: countAnswerOverviewEntries(parserOverview),
      parserFormattedReportLength: report.formattedReport?.length ?? 0,
      parserFormattedReportAnswerCount: report.formattedReport
        ? countAnswerOverviewEntries(
            extractAnswerOverviewFromFormattedReport(report.formattedReport),
          )
        : 0,
      answerOverviewFieldLength: parserOverview.length,
      questionCount: report.questionCount,
      hasFormattedReport: Boolean(report.formattedReport),
    });

    analyzeLog("schema_mapping:pipeline_step", {
      step: "Internal HomeworkReport → Parser → UI (pre-render)",
      rulesAppliedBeforeParser: schemaMapping.rulesApplied,
    });

    step6Snapshot = {
      ocrQuestionCount: step5Snapshot.ocrQuestionCount,
      declaredQuestionCount: step5Snapshot.declaredQuestionCount,
      answerOverviewEntryCount: countHomeworkUiAnswerEntries(report),
      answerOverviewCharLength: report.formattedReport
        ? report.formattedReport.length
        : parserOverview.length,
    };

    analyzeLog("STEP6_before_ui_render", {
      uiAnswerCount: step6Snapshot.answerOverviewEntryCount,
      uiUsesFormattedReport: Boolean(report.formattedReport),
      formattedReportLength: report.formattedReport?.length ?? 0,
    });

    const lossLayer = inferLossLayer(
      step1Snapshot!,
      step3Snapshot!,
      step4Snapshot!,
      step5Snapshot,
      step6Snapshot,
    );

    analyzeLog("LOSS_LAYER", {
      lossLayer,
      baselineQuestionCount:
        step1Snapshot!.ocrQuestionCount > 0
          ? step1Snapshot!.ocrQuestionCount
          : step1Snapshot!.declaredQuestionCount,
      trace: {
        STEP1_ocrQuestionCount: step1Snapshot!.ocrQuestionCount,
        STEP2_promptRequiresComplete: promptRequiresCompleteAnswerOverview(
          systemPrompt,
        ),
        STEP3_llmRawAnswerCount: step3Snapshot!.answerOverviewEntryCount,
        STEP4_parsedAnswerCount: step4Snapshot!.answerOverviewEntryCount,
        STEP5_parserAnswerCount: step5Snapshot.answerOverviewEntryCount,
        STEP6_uiAnswerCount: step6Snapshot.answerOverviewEntryCount,
      },
      flow:
        lossLayer === "OpenAI"
          ? "OCR → LLM (incomplete Answer Overview) → …"
          : lossLayer === "JSON Parse"
            ? "OCR → LLM → JSON Parse (field loss) → …"
            : lossLayer === "Parser"
              ? "OCR → LLM → JSON Parse → Parser (field loss) → …"
              : lossLayer === "UI"
                ? "OCR → LLM → JSON Parse → Parser → UI (display path loss) → …"
                : "OCR → LLM → JSON Parse → Parser → UI (no loss detected)",
    });
  }

  return NextResponse.json(feedback);
}
