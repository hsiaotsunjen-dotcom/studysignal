/**
 * POST /api/experimental/ocr-auto-zoom — OCR AUTO ZOOM EXPERIMENT.
 *
 * ISOLATED / EXPERIMENTAL — not called by any UI component, not called by
 * /api/photo-quality, not wired into mergeWorksheetCaptureSession or
 * mergeGlobalQuestions. Disabled unless OCR_AUTO_ZOOM_EXPERIMENT=1.
 *
 * Idea being tested: when a first Vision pass reports low confidence on the
 * LAST few questions of a worksheet photo, instead of immediately asking the
 * student to retake the whole photo, automatically crop + 2x-zoom a
 * CONTENT-AWARE region of the SAME photo and send one extra Vision pass —
 * using the exact same system prompt, with NO existingCoverage hint — then
 * union the two passes' results.
 *
 * Content-aware crop (v2 — replaces the earlier fixed "bottom 40%" crop,
 * which validation showed misses the target when a worksheet has a large
 * graphic/blank area below the last question):
 *   1. Take the highest question number in pass 1's questionsClearlyVisible
 *      (e.g. 1..9 -> anchor = 9).
 *   2. Ask Vision a small, separate, single-purpose question: "where
 *      (0..1 fraction of photo height) does question {anchor} appear?"
 *   3. Crop from that Y position down to the bottom of the photo (full
 *      width, no fixed percentage).
 *   4. Zoom 2x, then run pass 2 exactly as before.
 *
 * Does NOT modify: production OCR, mergeGlobalQuestions,
 * mergeWorksheetCaptureSession, any coverage/analysisScope logic, any UI
 * component, or the /api/photo-quality system prompt (this route defines
 * its own verbatim copy, so editing this experiment can never affect the
 * production endpoint).
 */
import { NextResponse } from "next/server";

import { parseAnalyzeImages } from "@/lib/analyzeApiRequest";
import {
  AUTO_ZOOM_FACTOR,
  computeContentAwareAutoZoomRegion,
  evaluateAutoZoomTrigger,
  getLastClearQuestionNumber,
  isAutoZoomExperimentEnabled,
  mergeAutoZoomResults,
  type AutoZoomIssue,
} from "@/lib/ocrAutoZoomExperiment";

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
  questionsWithIssues: AutoZoomIssue[];
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
  const questionsWithIssues: AutoZoomIssue[] = Array.isArray(
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
        .filter((x): x is AutoZoomIssue => x != null)
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

// Small, single-purpose prompt for Step 2 (position estimation) ONLY.
// Deliberately NOT the PHOTO_QUALITY_PROMPT — this is a different, narrower
// task (locate one question number), not a quality/coverage check, and does
// not replace or alter the production prompt in any way.
const POSITION_ESTIMATE_SYSTEM_PROMPT = `你會看到一張作業照片。你的任務只有一個：估計指定題號在這張照片中「垂直方向」的位置。
只回傳 JSON：
{
  "questionNumber": number,
  "found": boolean,
  "yFraction": number
}
規則：
- yFraction 是 0.0 到 1.0 之間的小數，0.0 代表最上方，1.0 代表最下方。
- 只估計這一題的題號或題目文字第一次出現的垂直位置，不要估計整份作業。
- 如果完全找不到這個題號，found 設為 false，yFraction 給你最佳猜測即可。`;

async function estimateQuestionYFraction(
  apiKey: string,
  questionNumber: number,
  mimeType: string,
  dataBase64: string,
): Promise<{ found: boolean; yFraction: number }> {
  const messages = [
    { role: "system", content: POSITION_ESTIMATE_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: `請估計第 ${questionNumber} 題在這張照片中的垂直位置。` },
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
      max_tokens: 200,
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
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = {};
  }
  const yFraction =
    typeof parsed.yFraction === "number" && Number.isFinite(parsed.yFraction)
      ? Math.min(1, Math.max(0, parsed.yFraction))
      : 0.5;
  const found = parsed.found === true;
  return { found, yFraction };
}

export async function POST(req: Request) {
  if (!isAutoZoomExperimentEnabled()) {
    return NextResponse.json(
      { error: "OCR Auto Zoom experiment is disabled (OCR_AUTO_ZOOM_EXPERIMENT!=1)." },
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

  console.log("====================================================");
  console.log("[ocr-auto-zoom-experiment] PASS 1 — full photo");
  console.log("====================================================");

  const pass1 = await callVision(
    apiKey,
    "請判斷這張照片可清楚辨識哪些題號。",
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

  const trigger = evaluateAutoZoomTrigger(pass1);
  console.log("Auto Zoom 是否啟動:", trigger.shouldTrigger, "原因:", trigger.reasons);

  if (!trigger.shouldTrigger) {
    return NextResponse.json({
      pass1,
      autoZoomTriggered: false,
      triggerReasons: trigger.reasons,
    });
  }

  const sharp = (await import("sharp")).default;
  const originalBuffer = Buffer.from(image.dataBase64, "base64");
  const meta = await sharp(originalBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Step 1 — anchor question = highest number Vision clearly read in pass 1.
  const anchorQuestionNumber = getLastClearQuestionNumber(pass1);
  if (anchorQuestionNumber == null) {
    console.log(
      "[ocr-auto-zoom-experiment] No clearly-visible question in pass 1 — " +
        "cannot anchor a content-aware crop. Stopping (no pass 2).",
    );
    return NextResponse.json({
      pass1,
      autoZoomTriggered: true,
      triggerReasons: trigger.reasons,
      autoZoomAborted: "no-anchor-question",
    });
  }

  // Step 2 — estimate where that question actually sits in THIS photo.
  const positionEstimate = await estimateQuestionYFraction(
    apiKey,
    anchorQuestionNumber,
    image.mimeType,
    image.dataBase64,
  );
  console.log(`第${anchorQuestionNumber}題估計位置 (yFraction):`, positionEstimate.yFraction, "found:", positionEstimate.found);

  // Step 3 — crop from that Y position down to the bottom of the photo.
  // NOT a fixed percentage — the top edge is derived from the estimate above.
  const region = computeContentAwareAutoZoomRegion(
    width,
    height,
    anchorQuestionNumber,
    positionEstimate.yFraction,
  );
  console.log("裁切座標:", { x: region.x, y: region.y }, "策略:", region.strategy);
  console.log("裁切大小:", { width: region.width, height: region.height });
  console.log("放大倍率:", AUTO_ZOOM_FACTOR);

  const zoomedBuffer = await sharp(originalBuffer)
    .extract({
      left: region.x,
      top: region.y,
      width: region.width,
      height: region.height,
    })
    .resize(region.width * AUTO_ZOOM_FACTOR, region.height * AUTO_ZOOM_FACTOR)
    .jpeg({ quality: 92 })
    .toBuffer();
  const zoomedBase64 = zoomedBuffer.toString("base64");

  console.log("====================================================");
  console.log("[ocr-auto-zoom-experiment] PASS 2 — cropped + zoomed region");
  console.log("====================================================");

  const pass2 = await callVision(
    apiKey,
    "這是同一張作業照片的局部放大（畫面下方區域，已放大2倍）。請判斷這個放大區域內可清楚辨識哪些題號。",
    "image/jpeg",
    zoomedBase64,
  );

  console.log("第二次辨識：");
  console.log("  questionsClearlyVisible:", pass2.questionsClearlyVisible);
  console.log(
    "  questionsWithIssues:",
    pass2.questionsWithIssues.map((i) => `Q${i.questionNumber}(${i.issueType})`),
  );

  const merged = mergeAutoZoomResults({ first: pass1, second: pass2 });
  console.log("最後 merge 結果:");
  console.log("  questionsClearlyVisible:", merged.questionsClearlyVisible);
  console.log("  questionsWithIssues:", merged.questionsWithIssues);
  console.log("  recoveredQuestions:", merged.recoveredQuestions);

  // Step 5 — if pass 2 recovered nothing new, surface everything needed to
  // manually verify whether the crop actually contained Q10~13: the anchor
  // question's estimated position, the exact crop coordinates, and the crop
  // image itself (base64) so it can be viewed/saved by the caller.
  const improved = merged.recoveredQuestions.length > 0;
  if (!improved) {
    console.log(
      "[ocr-auto-zoom-experiment] Pass 2 recovered nothing new — " +
        "diagnostics below (anchor position / crop coords / crop image).",
    );
  }

  return NextResponse.json({
    pass1,
    autoZoomTriggered: true,
    triggerReasons: trigger.reasons,
    anchorQuestionNumber,
    anchorPositionEstimate: positionEstimate,
    cropRegion: region,
    zoomFactor: AUTO_ZOOM_FACTOR,
    pass2,
    merged,
    improved,
    ...(improved
      ? {}
      : {
          diagnostics: {
            anchorQuestionNumber,
            anchorYFraction: positionEstimate.yFraction,
            cropRegion: region,
            croppedZoomedImageBase64: zoomedBase64,
            croppedZoomedImageMimeType: "image/jpeg",
          },
        }),
  });
}
