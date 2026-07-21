/**
 * POST /api/experimental/ocr-multi-window — OCR MULTI-WINDOW EXPERIMENT.
 *
 * ISOLATED / EXPERIMENTAL — not called by any UI component, not called by
 * /api/photo-quality, not wired into mergeWorksheetCaptureSession or
 * mergeGlobalQuestions. Disabled unless OCR_MULTI_WINDOW_EXPERIMENT=1.
 *
 * This is NOT the Auto Zoom experiment (src/lib/ocrAutoZoomExperiment.ts /
 * /api/experimental/ocr-auto-zoom — both left completely untouched by this
 * file). There is no position estimation here, no yFraction, no "anchor
 * question", and computeContentAwareAutoZoomRegion is never called or
 * imported.
 *
 * Idea being tested: instead of guessing WHERE a low-confidence trailing
 * question sits in the photo, blindly cover the bottom of the photo with
 * three FIXED, OVERLAPPING vertical windows (40~70%, 55~85%, 70~100% of
 * height), zoom each 2x, and send each to Vision INDEPENDENTLY — same
 * system prompt / temperature / model / detail="high" as pass 1, but with
 * NO existingCoverage and no other hint — then union all four results
 * (pass 1 + window A + window B + window C).
 *
 * Trigger to enter the multi-window pass (BOTH must hold):
 *   1. estimatedTotalQuestions > max(questionsClearlyVisible)
 *   2. the last three question numbers are all still low confidence
 *
 * Does NOT modify: production OCR, mergeGlobalQuestions,
 * mergeWorksheetCaptureSession, any coverage/analysisScope logic, any UI
 * component, the Auto Zoom experiment, or the /api/photo-quality system
 * prompt (this route defines its own verbatim copy, so editing this
 * experiment can never affect the production endpoint).
 */
import { NextResponse } from "next/server";

import { parseAnalyzeImages } from "@/lib/analyzeApiRequest";
import {
  MULTI_WINDOW_ZOOM_FACTOR,
  computeAllWindowRegions,
  evaluateMultiWindowTrigger,
  isMultiWindowExperimentEnabled,
  mergeMultiWindowResults,
  type MultiWindowIssue,
  type MultiWindowName,
} from "@/lib/ocrMultiWindowExperiment";

export const runtime = "nodejs";

// Verbatim copy of PHOTO_QUALITY_PROMPT from /api/photo-quality/route.ts.
// Intentionally duplicated (not imported) so this experiment can never be
// affected by, or accidentally affect, the production prompt.
const PHOTO_QUALITY_PROMPT = `你是一位耐心、友善的英文家教，正在幫學生拍攝作業照片。

這一步只做「照片是否清楚」的檢查 — 不要批改、不要辨識作答內容、不要分析學習表現。

請檢查：
- 是否模糊、對焦、角度
- 反光、陰影
- 是否裁切不完整、邊角沒入鏡
- 題目與作答區域是否看得清楚

請只回傳 JSON：
{
  "estimatedTotalQuestions": number,
  "questionsClearlyVisible": [1, 2, ...],
  "questionsWithIssues": [
    { "questionNumber": 2, "issueType": "blur|focus|perspective|glare|shadow|crop|corner_missing|readability|answer_area", "fixInstruction": "繁體中文，具體做法" }
  ],
  "globalIssues": [],
  "readyForAnalysis": boolean,
  "tutorMessage": "可省略，應用程式會自行組裝給學生的訊息",
  "additionalPhotoRequest": {
    "reason": "繁體中文",
    "captureHint": "繁體中文，最小拍攝範圍",
    "targetQuestions": [9, 10],
    "targetRegion": "可省略"
  }
}

規則：
- 所有給學生看的文字（fixInstruction、captureHint、reason）必須是繁體中文，語氣像老師，不要像工程師。
- 禁止出現英文技術詞：Photo Quality、OCR、API、glare、blur、coverage、worksheet detected 等。
- 不要只說「請重拍」；要說清楚哪一題、什麼問題、怎麼拍。
- 盡量只請學生補拍必要的小範圍，不要重拍整張作業。
- 例：第2題模糊 → fixInstruction：「請靠近一點，只拍第2題即可」
- 例：第9題反光 → fixInstruction：「將手機稍微往左或往右傾斜；只拍第9題即可」
- issueType 欄位維持英文代碼供程式使用；fixInstruction 與 captureHint 必須是繁體中文。
- readyForAnalysis 僅在單張照片已足夠，或搭配既有照片已涵蓋全部題目時為 true。`;

function toPositiveInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return 0;
}

type ParsedVisionPass = {
  estimatedTotalQuestions: number;
  questionsClearlyVisible: number[];
  questionsWithIssues: MultiWindowIssue[];
  raw: unknown;
};

function parseVisionPass(raw: unknown): ParsedVisionPass {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const questionsClearlyVisible = Array.isArray(o.questionsClearlyVisible)
    ? o.questionsClearlyVisible.map((n) => toPositiveInt(n)).filter((n) => n > 0)
    : [];
  const questionsWithIssues: MultiWindowIssue[] = Array.isArray(
    o.questionsWithIssues,
  )
    ? o.questionsWithIssues
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const questionNumber = toPositiveInt(row.questionNumber);
          const issueType =
            typeof row.issueType === "string" ? row.issueType : "";
          if (!questionNumber || !issueType) return null;
          return { questionNumber, issueType };
        })
        .filter((x): x is MultiWindowIssue => x != null)
    : [];
  const reportedTotal = toPositiveInt(o.estimatedTotalQuestions);
  const detectedMax =
    questionsClearlyVisible.length > 0 || questionsWithIssues.length > 0
      ? Math.max(
          0,
          ...questionsClearlyVisible,
          ...questionsWithIssues.map((i) => i.questionNumber),
        )
      : 0;
  return {
    estimatedTotalQuestions: Math.max(reportedTotal, detectedMax),
    questionsClearlyVisible,
    questionsWithIssues,
    raw: o,
  };
}

async function callVision(
  apiKey: string,
  userText: string,
  mimeType: string,
  dataBase64: string,
): Promise<ParsedVisionPass> {
  const messages = [
    { role: "system", content: PHOTO_QUALITY_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: userText },
        {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${dataBase64}`,
            detail: "high",
          },
        },
      ],
    },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages,
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { __parseError: true, raw: content };
  }
  return parseVisionPass(parsed);
}

// Identical, generic user text for pass 1 AND every window — deliberately
// contains no existingCoverage, no window label, no "this is a crop" hint,
// and no other context, so Vision judges each image purely on its own
// content.
const NO_HINT_USER_TEXT = "請判斷這張照片可清楚辨識哪些題號。";

export async function POST(req: Request) {
  if (!isMultiWindowExperimentEnabled()) {
    return NextResponse.json(
      {
        error:
          "OCR Multi-Window experiment is disabled (OCR_MULTI_WINDOW_EXPERIMENT!=1).",
      },
      { status: 404 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 OPENAI_API_KEY。" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "無效的 JSON。" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "缺少請求內容。" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const images = parseAnalyzeImages([o.image]);
  if (images.length === 0) {
    return NextResponse.json({ error: "缺少照片。" }, { status: 400 });
  }
  const image = images[0]!;
  // Optional — lets the caller replay the real production bug scenario
  // (with existingCoverage) for pass 1, exactly like the earlier Auto Zoom
  // validation. Pass 2 (the windows) NEVER receives this, regardless.
  const pass1UserText =
    typeof o.pass1UserText === "string" && o.pass1UserText.trim().length > 0
      ? o.pass1UserText
      : NO_HINT_USER_TEXT;

  console.log("====================================================");
  console.log("[ocr-multi-window-experiment] PASS 1 — full photo");
  console.log("====================================================");

  const pass1 = await callVision(
    apiKey,
    pass1UserText,
    image.mimeType,
    image.dataBase64,
  );

  console.log("第一次辨識：");
  console.log("  questionsClearlyVisible:", pass1.questionsClearlyVisible);
  console.log(
    "  questionsWithIssues:",
    pass1.questionsWithIssues.map((i) => `Q${i.questionNumber}(${i.issueType})`),
  );
  console.log("  estimatedTotalQuestions:", pass1.estimatedTotalQuestions);

  const trigger = evaluateMultiWindowTrigger(pass1);
  console.log("Multi-Window 是否啟動:", trigger.shouldTrigger, "原因:", trigger.reasons);

  if (!trigger.shouldTrigger) {
    return NextResponse.json({
      pass1,
      multiWindowTriggered: false,
      triggerReasons: trigger.reasons,
    });
  }

  const sharp = (await import("sharp")).default;
  const originalBuffer = Buffer.from(image.dataBase64, "base64");
  const meta = await sharp(originalBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const regions = computeAllWindowRegions(width, height);

  console.log("====================================================");
  console.log("[ocr-multi-window-experiment] PASS 2 — 3 fixed, overlapping windows");
  console.log("====================================================");

  const windowResults: {
    name: MultiWindowName;
    region: (typeof regions)[number];
    cropImageBase64: string;
    cropImageMimeType: string;
    visionResponse: ParsedVisionPass;
  }[] = [];

  for (const region of regions) {
    console.log(`Window ${region.name}: ${Math.round(region.startFraction * 100)}%~${Math.round(region.endFraction * 100)}%`);
    console.log("  裁切座標 (x, y):", region.x, region.y);
    console.log("  裁切大小 (width x height):", region.width, "x", region.height);
    console.log("  放大倍率:", MULTI_WINDOW_ZOOM_FACTOR);

    const cropBuffer = await sharp(originalBuffer)
      .extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      })
      .resize(region.width * MULTI_WINDOW_ZOOM_FACTOR, region.height * MULTI_WINDOW_ZOOM_FACTOR)
      .jpeg({ quality: 92 })
      .toBuffer();
    const cropBase64 = cropBuffer.toString("base64");

    const visionResponse = await callVision(
      apiKey,
      NO_HINT_USER_TEXT,
      "image/jpeg",
      cropBase64,
    );

    console.log(`  Vision 回覆 — questionsClearlyVisible:`, visionResponse.questionsClearlyVisible);
    console.log(
      `  Vision 回覆 — questionsWithIssues:`,
      visionResponse.questionsWithIssues.map((i) => `Q${i.questionNumber}(${i.issueType})`),
    );

    windowResults.push({
      name: region.name,
      region,
      cropImageBase64: cropBase64,
      cropImageMimeType: "image/jpeg",
      visionResponse,
    });
  }

  const merged = mergeMultiWindowResults({
    pass1,
    windows: windowResults.map((w) => ({
      name: w.name,
      questionsClearlyVisible: w.visionResponse.questionsClearlyVisible,
      questionsWithIssues: w.visionResponse.questionsWithIssues,
    })),
  });

  console.log("====================================================");
  console.log("[ocr-multi-window-experiment] 最後 merge 結果 (union of pass1 + A + B + C)");
  console.log("====================================================");
  console.log("  questionsClearlyVisible:", merged.questionsClearlyVisible);
  console.log("  questionsWithIssues:", merged.questionsWithIssues);
  console.log("  recoveredQuestions:", merged.recoveredQuestions);
  console.log("  recoveredQuestionSources:", merged.recoveredQuestionSources);

  const improved = merged.recoveredQuestions.length > 0;

  return NextResponse.json({
    pass1,
    multiWindowTriggered: true,
    triggerReasons: trigger.reasons,
    zoomFactor: MULTI_WINDOW_ZOOM_FACTOR,
    windows: windowResults.map((w) => ({
      name: w.name,
      region: w.region,
      cropImageBase64: w.cropImageBase64,
      cropImageMimeType: w.cropImageMimeType,
      visionResponse: w.visionResponse,
    })),
    merged,
    improved,
  });
}
