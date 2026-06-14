import { NextResponse } from "next/server";

import { parseAnalyzeApiData } from "@/lib/analyzeFeedback";

/** TEMPORARY: set false to silence verbose analyze logs. Remove after debugging. */
const ANALYZE_ROUTE_DEBUG = true;

function analyzeLog(label: string, payload?: unknown) {
  if (!ANALYZE_ROUTE_DEBUG) return;
  if (payload !== undefined) {
    console.log(`[analyze api] ${label}`, payload);
  } else {
    console.log(`[analyze api] ${label}`);
  }
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

const TUTOR_VISION_IMAGES_PROMPT = `You are an expert tutor for Taiwanese junior-high / elementary learners. The student attached **one or more images** to analyze.

**Prioritize the images.** Perform OCR mentally, read all visible English/Chinese text, describe important visual content, and connect insights to any typed message the student provided.

**Do NOT** output pronunciationScores or pronunciationFocus. Do not invent how the student "spoke" a word.

Return ONLY one JSON object (no markdown fences). Use Traditional Chinese (繁體中文) for tutor-facing strings where specified.

Required keys:
- imageInsights: object with
  - ocrText: 繁體中文 — transcribe or summarize text you see in the images (if none, say so clearly)
  - visualSummaryZh: 繁體中文 — explain what the images show and what is relevant for learning
- grammar, vocabulary, fluency: same shapes as text-only (scores + 繁體中文 bullets), grounded in image content and any typed text. **Each whyNot100 bullet MUST use the three-part teacher style in one string:** 【學生】…【改寫】…【說明】… = (1) fragment from learner text or OCR-relevant English, (2) corrected English, (3) one 繁體 sentence why better. **FORBIDDEN** vague「還可以更好」alone.
- expression: OPTIONAL - same object shape as grammar; focus on communication, tone, and clarity in context of images/text. Same three-part whyNot100 rule. Omit if redundant with fluency.
- tutorModelAnswer: object with "studentVersion", "betterVersion", "nativeLikeVersion" — three English versions of the same intent suggested by the task in the images (student-like / clearer / native-like); optional short 繁體 gloss in parentheses.
- learningSummary: object with "strengths", "weaknesses", "whatToPracticeNext" — each an array of 2–4 bullets 繁體中文 grounded in the images and text.
- tutorComment: same three-string object 繁體中文, referencing what is visible in the images and/or their text

Omit pronunciationScores and pronunciationFocus entirely.`;

type ImagePart = {
  type: "image_url";
  image_url: { url: string };
};

function parseRequestBody(body: unknown): {
  text: string;
  includePronunciation: boolean;
  images: { mimeType: string; dataBase64: string }[];
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim() : "";
  const includePronunciation = o.includePronunciation === true;
  const rawImages = o.images;
  const images: { mimeType: string; dataBase64: string }[] = [];
  if (Array.isArray(rawImages)) {
    for (const item of rawImages) {
      if (!item || typeof item !== "object") continue;
      const im = item as Record<string, unknown>;
      const mimeType =
        typeof im.mimeType === "string" && im.mimeType.startsWith("image/")
          ? im.mimeType
          : "image/jpeg";
      const dataBase64 =
        typeof im.dataBase64 === "string" ? im.dataBase64.trim() : "";
      if (dataBase64.length > 0) {
        images.push({ mimeType, dataBase64 });
      }
    }
  }
  return { text, includePronunciation, images };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請傳送有效的 JSON。" }, { status: 400 });
  }

  const parsedBody = parseRequestBody(body);
  if (!parsedBody) {
    return NextResponse.json(
      { error: "請使用有效的 JSON 物件。" },
      { status: 400 }
    );
  }

  const { text, includePronunciation, images } = parsedBody;
  const hasImages = images.length > 0;

  analyzeLog("1_request_body_summary", {
    textLength: text.length,
    textPreview: text.slice(0, 500),
    includePronunciation,
    imageCount: images.length,
    perImage: images.map((im, i) => ({
      index: i,
      mimeType: im.mimeType,
      base64Length: im.dataBase64.length,
      base64Prefix: im.dataBase64.slice(0, 48),
    })),
  });

  if (!text && !hasImages) {
    return NextResponse.json(
      { error: "請提供文字或至少一張圖片。" },
      { status: 400 }
    );
  }

  /** Speech-based pronunciation only when client requests it and there are no images. */
  const requireSpeechPronunciation =
    includePronunciation === true && !hasImages;

  analyzeLog("1b_route_mode", {
    hasImages,
    requireSpeechPronunciation,
    branch: hasImages
      ? "vision"
      : requireSpeechPronunciation
        ? "speech_pronunciation"
        : "text_no_pronunciation",
  });

  let systemPrompt: string;
  let userContent:
    | string
    | ({ type: "text"; text: string } | ImagePart)[];

  if (hasImages) {
    systemPrompt = TUTOR_VISION_IMAGES_PROMPT;
    const parts: ({ type: "text"; text: string } | ImagePart)[] = [
      {
        type: "text",
        text:
          `Student typed message (may be empty):\n${text || "（無）"}\n\n` +
          "Analyze the attached image(s). Return JSON exactly as specified.",
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
    userContent = parts;
  } else if (requireSpeechPronunciation) {
    systemPrompt = TUTOR_SPEECH_WITH_PRONUNCIATION_PROMPT;
    userContent = `Student transcript from speech audio:\n\n${text}\n\nReturn the JSON object exactly as specified.`;
  } else {
    systemPrompt = TUTOR_TEXT_OR_IMAGE_NO_PRONUNCIATION_PROMPT;
    userContent = `Student typed text (no speech audio):\n\n${text}\n\nReturn the JSON object exactly as specified — **without** pronunciationScores or pronunciationFocus keys.`;
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
      { status: 502 }
    );
  }

  const data = (await openaiRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const choice0 = data.choices?.[0] as
    | { message?: { content?: string }; finish_reason?: string }
    | undefined;
  const rawContent = choice0?.message?.content?.trim() ?? "";

  analyzeLog("2_openai_message_meta", {
    choiceCount: data.choices?.length ?? 0,
    finishReason: choice0?.finish_reason,
    rawContentLength: rawContent.length,
    rawContentIsEmpty: rawContent.length === 0,
  });
  analyzeLog("2_openai_raw_content_length", rawContent.length);
  analyzeLog("2_openai_raw_content_full", rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent) as unknown;
  } catch (e) {
    analyzeLog("2_json_parse_failed", {
      error: e instanceof Error ? e.message : String(e),
      rawContentPrefix: rawContent.slice(0, 2000),
      rawContentSuffix: rawContent.slice(-2000),
    });
    return NextResponse.json(
      { error: "分析結果格式異常，請再試一次。" },
      { status: 502 }
    );
  }

  analyzeLog("3_parsed_json_keys", {
    keys:
      parsed && typeof parsed === "object"
        ? Object.keys(parsed as object)
        : [],
  });
  analyzeLog("3_parsed_json_full", JSON.stringify(parsed, null, 2));

  const parseLog = (label: string, payload?: unknown) =>
    analyzeLog(`parse_step:${label}`, payload);

  const feedback = parseAnalyzeApiData(
    parsed,
    requireSpeechPronunciation,
    parseLog
  );

  analyzeLog("4_parseAnalyzeApiData_result", {
    isNull: feedback === null,
    hasImageInsights: Boolean(feedback?.imageInsights),
    imageInsights: feedback?.imageInsights ?? null,
    ocrText: feedback?.imageInsights?.ocrText ?? null,
    visualSummaryZh: feedback?.imageInsights?.visualSummaryZh ?? null,
    hasPronunciationScores: Boolean(feedback?.pronunciationScores),
    pronunciationFocusLength: feedback?.pronunciationFocus?.length ?? null,
  });

  if (!feedback) {
    analyzeLog("4_UI_MESSAGE", {
      userSees: "分析結果不完整，請再試一次。",
      reason: "parseAnalyzeApiData returned null — see parse_step:* logs above",
    });
    return NextResponse.json(
      { error: "分析結果不完整，請再試一次。" },
      { status: 502 }
    );
  }

  if (hasImages && !feedback.imageInsights) {
    analyzeLog("5_fail_missing_image_insights_after_parse", {
      userSees: "分析結果缺少圖片辨識內容，請再試一次。",
      hasImages,
      feedbackKeys: Object.keys(feedback),
    });
    return NextResponse.json(
      { error: "分析結果缺少圖片辨識內容，請再試一次。" },
      { status: 502 }
    );
  }

  analyzeLog("6_response_to_client_full", JSON.stringify(feedback, null, 2));

  return NextResponse.json(feedback);
}
