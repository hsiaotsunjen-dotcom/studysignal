import { NextResponse } from "next/server";

import { parseAnalyzeApiData } from "@/lib/analyzeFeedback";

const TUTOR_JSON_PROMPT = `You are an expert, warm English tutor for Taiwanese junior-high / elementary learners. Student text may come from Whisper dictation—infer intended English when ASR is imperfect.

Return ONLY one JSON object (no markdown fences, no prose outside JSON). All student-facing explanation strings MUST be Traditional Chinese (繁體中文), except:
- "pronunciationFocus[].word" = English word/short phrase from their text
- "pronunciationFocus[].reasonToPractice" and "pronunciationTip" = concise English is OK (clear for pronunciation teaching, like the weather/TH example), or short bilingual if helpful.

Use exactly these keys and nesting (camelCase):

- grammar: object with
  - score: integer 0–100
  - strengths: array of 2–3 strings (繁體中文 bullet ideas—what they did well for GRAMMAR)
  - whyNot100: array of 2–3 strings (繁體中文—specific reasons the grammar score is not 100, tied to their actual text)
  - improvementExamples: array of 1–3 strings (繁體中文—each shows a clearer/corrected way, e.g. wrong → right or mini pattern)

- vocabulary: same shape as grammar but for word choice/range.

- fluency: same shape but for how natural/connected the English reads (writing—NOT accent).

- pronunciationScores: REQUIRED object (infer from transcript text only; no audio). Use exactly these keys inside it:
  - overallScore: integer 0–100 (holistic pronunciation quality implied by spelling/word choice/stress cues in the text)
  - accuracy: integer 0–100 (likely sound–spelling alignment / word-level correctness as readable from text)
  - fluency: integer 0–100 (rhythm / chunking / connected speech as inferable from punctuation and phrasing in the transcript—this is NOT the same as the writing "fluency" block above)
  - clarity: integer 0–100 (how clearly the intended words come across from the written transcript)
  - feedback: one paragraph in Traditional Chinese (繁體中文) with concrete tips to improve pronunciation based on the transcript; reference specific words or patterns when possible.

- pronunciationFocus: array of exactly 3 objects, each:
  - word: English string from their transcript (or clear intended word)
  - ipaUs: optional string — General American IPA for "word" with slashes (e.g. "/ɪˈrɑːn/"). Omit if unsure.
  - ipaUk: optional string — British (RP-style) IPA for "word" with slashes (e.g. "/ɪˈræn/"). Omit if unsure.
  - (Deprecated but still accepted: optional "ipa" — if present and ipaUs/ipaUk are absent, it is treated as ipaUs only.)
  - reasonToPractice: short string (English OK) e.g. which sound or stress pattern
  - pronunciationTip: actionable tip (English OK), e.g. tongue/teeth placement, like: "Place your tongue lightly between your teeth."

- tutorComment: object (繁體中文 for all three values—reference concrete phrases from their transcript, no generic praise):
  - whatWentWell: 2–4 sentences on what they did well with examples from THEIR text
  - biggestImprovementOpportunity: 2–4 sentences naming the single biggest gap and why, with reference to their wording
  - whatToTryNextTime: 2–4 sentences with one concrete practice habit or exercise for next time

STRICTLY FORBIDDEN in tutorComment: empty platitudes like "Good job, keep going" / "繼續加油" without specifics / "表現不錯" alone. Every sentence must cite something observable from the transcript or scores.

If the transcript is very short, still fill all arrays to required lengths; be fair and encouraging but specific.`;

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

  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { text?: unknown }).text !== "string"
  ) {
    return NextResponse.json(
      { error: "請使用格式：{ \"text\": \"學生英文句子\" }" },
      { status: 400 }
    );
  }

  const text = (body as { text: string }).text.trim();
  if (!text) {
    return NextResponse.json(
      { error: "text 不能是空白。" },
      { status: 400 }
    );
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
        { role: "system", content: TUTOR_JSON_PROMPT },
        {
          role: "user",
          content: `Student transcript (possibly from dictation):\n\n${text}\n\nReturn the JSON object exactly as specified.`,
        },
      ],
      temperature: 0.4,
      max_tokens: 3000,
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
  const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent) as unknown;
  } catch {
    return NextResponse.json(
      { error: "分析結果格式異常，請再試一次。" },
      { status: 502 }
    );
  }

  const feedback = parseAnalyzeApiData(parsed);
  if (!feedback) {
    return NextResponse.json(
      { error: "分析結果不完整，請再試一次。" },
      { status: 502 }
    );
  }

  return NextResponse.json(feedback);
}
