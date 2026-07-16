import { NextResponse } from "next/server";

import { parseAnalyzeImages } from "@/lib/analyzeApiRequest";
import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import type {
  AdditionalPhotoRequest,
  PhotoQualityCheckResult,
  PhotoQualityIssue,
  PhotoQualityIssueType,
} from "@/lib/worksheetCapture";
import {
  QUESTION_NUMBER_REGEX_SPECS,
  collectQuestionNumbersFromPayload,
  debugExtractQuestionNumbersFromText,
  extractVisionClearlyVisibleNumbers,
  ocrDetectQuestionNumbersDetailedWithRetry,
  uniqueSortedQuestionNumbers,
} from "@/lib/worksheetQuestionNumbers";
import {
  logImagePipelineOriginal,
  logImagePipelineByteComparison,
  logVisionRequestConfig,
  logOcrAttempt,
  logPhotoComparisonTable,
  readImagePipelineMetadata,
  recordPhotoPipelineSnapshot,
  saveVisionDebugImage,
  sha256Hex,
} from "@/lib/visionPipelineDebug";

export const runtime = "nodejs";

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

const ISSUE_TYPES = new Set<PhotoQualityIssueType>([
  "blur",
  "focus",
  "perspective",
  "glare",
  "shadow",
  "crop",
  "corner_missing",
  "readability",
  "answer_area",
]);

function toPositiveInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  return 0;
}

function parseIssueType(raw: unknown): PhotoQualityIssueType | null {
  const text = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (ISSUE_TYPES.has(text as PhotoQualityIssueType)) {
    return text as PhotoQualityIssueType;
  }
  if (text === "reflection") return "glare";
  if (text === "corners" || text === "missing_corner") return "corner_missing";
  return null;
}

function parsePhotoQualityResult(
  raw: unknown,
  photoId: string,
  photoIndex: number,
  ocrQuestionNumbers: number[] = [],
): PhotoQualityCheckResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const reportedTotal = toPositiveInt(o.estimatedTotalQuestions);
  const questionsClearlyVisible = Array.isArray(o.questionsClearlyVisible)
    ? o.questionsClearlyVisible
        .map((n) => toPositiveInt(n))
        .filter((n) => n > 0)
    : [];

  const questionsWithIssues = Array.isArray(o.questionsWithIssues)
    ? o.questionsWithIssues
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const questionNumber = toPositiveInt(row.questionNumber);
          const issueType = parseIssueType(row.issueType);
          const fixInstruction =
            typeof row.fixInstruction === "string"
              ? row.fixInstruction.trim()
              : "";
          if (!questionNumber || !issueType) return null;
          return { questionNumber, issueType, fixInstruction };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : [];

  const globalIssues: PhotoQualityIssue[] = Array.isArray(o.globalIssues)
    ? o.globalIssues
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const issueType = parseIssueType(row.issueType);
          const fixInstruction =
            typeof row.fixInstruction === "string"
              ? row.fixInstruction.trim()
              : "";
          if (!issueType || !fixInstruction) return null;
          const severity =
            row.severity === "minor" ? ("minor" as const) : ("major" as const);
          return {
            issueType,
            severity,
            ...(typeof row.affectedRegion === "string"
              ? { affectedRegion: row.affectedRegion.trim() }
              : {}),
            fixInstruction,
          };
        })
        .filter((x): x is PhotoQualityIssue => x != null)
    : [];

  const tutorMessage =
    typeof o.tutorMessage === "string" ? o.tutorMessage.trim() : "";

  let additionalPhotoRequest: AdditionalPhotoRequest | undefined;
  const apr = o.additionalPhotoRequest;
  if (apr && typeof apr === "object") {
    const row = apr as Record<string, unknown>;
    const reason = typeof row.reason === "string" ? row.reason.trim() : "";
    const captureHint =
      typeof row.captureHint === "string" ? row.captureHint.trim() : "";
    if (reason && captureHint) {
      additionalPhotoRequest = {
        reason,
        captureHint,
        ...(Array.isArray(row.targetQuestions)
          ? {
              targetQuestions: row.targetQuestions
                .map((n) => toPositiveInt(n))
                .filter((n) => n > 0),
            }
          : {}),
        ...(typeof row.targetRegion === "string"
          ? { targetRegion: row.targetRegion.trim() }
          : {}),
      };
    }
  }

  const hasSignal =
    reportedTotal > 0 ||
    questionsClearlyVisible.length > 0 ||
    questionsWithIssues.length > 0 ||
    globalIssues.length > 0 ||
    ocrQuestionNumbers.length > 0 ||
    o.readyForAnalysis === true;

  if (!hasSignal) return null;

  const payloadNumbers = collectQuestionNumbersFromPayload(o);
  // Persist every detected number (Vision + OCR). Global Question Merge uses
  // this field — never invent total from Vision's estimatedTotalQuestions alone.
  const detectedQuestionNumbers = uniqueSortedQuestionNumbers([
    ...questionsClearlyVisible,
    ...questionsWithIssues.map((i) => i.questionNumber),
    ...globalIssues.flatMap((g) => g.affectedQuestions ?? []),
    ...(additionalPhotoRequest?.targetQuestions ?? []),
    ...payloadNumbers,
    ...ocrQuestionNumbers,
  ]);
  // Per-photo estimate = max detected number on THIS photo only (debug/legacy).
  // Global homework total is computed later by mergeGlobalQuestions().
  const estimatedTotalQuestions =
    detectedQuestionNumbers.length > 0
      ? Math.max(...detectedQuestionNumbers)
      : reportedTotal > 0
        ? reportedTotal
        : 0;

  return {
    photoId,
    photoIndex,
    estimatedTotalQuestions,
    questionsClearlyVisible,
    questionsWithIssues,
    detectedQuestionNumbers,
    globalIssues,
    readyForAnalysis: o.readyForAnalysis === true,
    tutorMessage,
    ...(additionalPhotoRequest ? { additionalPhotoRequest } : {}),
  };
}

function logPhotoQualityStep(
  step: string,
  meta?: Record<string, unknown>,
): void {
  console.log("[photo-quality]", step, meta ?? "");
}

function logPhotoQualityPerPhotoDebug(input: {
  photoLabel: string;
  photoId: string;
  ocrRawText: string;
  ocrQuestionNumbers: number[];
  ocrTimedOut: boolean;
  ocrError?: string;
  visionRawResponse: string;
  visionClearlyVisible: number[];
  visionPayloadNumbers: number[];
  mergedQuestionNumbers: number[];
  estimatedTotalQuestions: number;
  questionsClearlyVisible: number[];
  questionsWithIssues: number[];
}): void {
  console.log("==================================================");
  console.log(input.photoLabel);
  console.log("photoId:", input.photoId);
  console.log("Question number regex patterns:");
  for (const spec of QUESTION_NUMBER_REGEX_SPECS) {
    console.log(`  - ${spec.name}: /${spec.pattern}/gm — ${spec.description}`);
  }
  console.log("OCR raw text：");
  console.log(input.ocrRawText || "(empty)");
  if (input.ocrTimedOut) {
    console.log("OCR status: timeout");
  } else if (input.ocrError) {
    console.log("OCR status: error —", input.ocrError);
  }
  const ocrDebug = debugExtractQuestionNumbersFromText(input.ocrRawText || "");
  console.log("OCR regex matches by pattern:", ocrDebug.matchesByRegex);
  console.log("OCR extracted question numbers：", input.ocrQuestionNumbers);
  console.log("Vision raw response：");
  console.log(input.visionRawResponse || "(empty)");
  console.log(
    "Vision questionsClearlyVisible (structured)：",
    input.visionClearlyVisible,
  );
  console.log(
    "Vision extracted question numbers (full JSON scan)：",
    input.visionPayloadNumbers,
  );
  console.log("Merged question numbers (Vision+OCR)：", input.mergedQuestionNumbers);
  console.log(
    "per-photo estimatedTotalQuestions (ignored for global total)：",
    input.estimatedTotalQuestions,
  );
  console.log(
    "questionsClearlyVisible (stored in result)：",
    input.questionsClearlyVisible,
  );
  console.log("questionsWithIssues (stored in result)：", input.questionsWithIssues);
  console.log("==================================================");
}

async function logPhotoVisionRequestDebug(
  photoIndex: number,
  photoId: string,
  image: AnalyzeImagePayload,
  messages: unknown[],
): Promise<void> {
  const { mimeType, dataBase64 } = image;
  const imageBuffer = Buffer.from(dataBase64, "base64");
  const imageUrl = `data:${mimeType};base64,${dataBase64}`;

  let imageWidth: number | string = "unknown";
  let imageHeight: number | string = "unknown";
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(imageBuffer).metadata();
    imageWidth = meta.width ?? "unknown";
    imageHeight = meta.height ?? "unknown";
  } catch {
    imageWidth = "unknown";
    imageHeight = "unknown";
  }

  console.log("====================================");
  console.log(`PHOTO ${photoIndex + 1} IMAGE INFO`);
  console.log("====================================");
  console.log("photoIndex:", photoIndex);
  console.log("photoId:", photoId);
  console.log("mimeType:", mimeType);
  console.log("image width:", imageWidth);
  console.log("image height:", imageHeight);
  console.log("image bytes:", imageBuffer.byteLength);
  console.log("base64 length:", dataBase64.length);
  console.log("image url (如果是 image_url):");
  console.log(imageUrl);
  console.log("base64 前 100 個字元:");
  console.log(dataBase64.slice(0, 100));
  console.log("base64 最後 100 個字元:");
  console.log(dataBase64.slice(-100));
  console.log("====================================");
  console.dir(messages, { depth: null, maxArrayLength: null });
  console.log("====================================");
}

/**
 * Debug-only: print the exact Vision request (model, messages, full prompt text,
 * image count) WITHOUT dumping base64. Does not modify any request logic.
 */
function logVisionRequestSummary(model: string, messages: unknown[]): void {
  console.log("====================================");
  console.log("Vision Request");
  console.log("====================================");
  console.log("model:", model);
  console.log("messages 長度:", messages.length);

  let imagesSent = 0;
  let totalTextLength = 0;

  messages.forEach((msg, msgIndex) => {
    const m = (msg ?? {}) as { role?: unknown; content?: unknown };
    const role = typeof m.role === "string" ? m.role : "(unknown)";
    console.log(`--- message[${msgIndex}] ---`);
    console.log(`message[${msgIndex}].role:`, role);

    if (typeof m.content === "string") {
      console.log(`message[${msgIndex}].content 長度:`, m.content.length);
      totalTextLength += m.content.length;
      console.log(`message[${msgIndex}].content (完整 text):`);
      console.log(m.content);
      return;
    }

    if (Array.isArray(m.content)) {
      console.log(
        `message[${msgIndex}].content 長度 (陣列 items):`,
        m.content.length,
      );
      m.content.forEach((item, itemIndex) => {
        const it = (item ?? {}) as { type?: unknown; text?: unknown };
        const type = typeof it.type === "string" ? it.type : "(unknown)";
        console.log(`  content[${itemIndex}] index:`, itemIndex);
        console.log(`  content[${itemIndex}] type:`, type);
        if (type === "text" && typeof it.text === "string") {
          totalTextLength += it.text.length;
          console.log(`  content[${itemIndex}] text (完整):`);
          console.log(it.text);
        } else if (type === "image_url") {
          imagesSent += 1;
          console.log(`  content[${itemIndex}] image #${imagesSent}`);
        }
      });
      return;
    }

    console.log(`message[${msgIndex}].content: (非字串也非陣列)`);
  });

  console.log("====================================");
  console.log("Vision Request Summary");
  console.log("Images sent:");
  console.log(imagesSent);
  console.log("Text length:");
  console.log(totalTextLength);
  console.log("====================================");
}

export async function POST(req: Request) {
  console.log("===== /api/photo-quality REQUEST ENTERED =====");
  console.log("request url:", req.url);
  console.log("request method:", req.method);

  let photoId = "";
  let photoIndex = 0;

  try {
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
    photoId = typeof o.photoId === "string" ? o.photoId.trim() : "";
    photoIndex =
      typeof o.photoIndex === "number" && Number.isFinite(o.photoIndex)
        ? Math.round(o.photoIndex)
        : 0;

    console.log("===== /api/photo-quality REQUEST BODY ID =====");
    console.log("photoId:", photoId || "(empty)");
    console.log("photoIndex:", photoIndex);
    console.log("hasImage:", o.image != null);
    console.log("existingCoverage length:", Array.isArray(o.existingCoverage) ? o.existingCoverage.length : 0);
    console.log("================================================");
    const images = parseAnalyzeImages([o.image]);
    if (!photoId || images.length === 0) {
      return NextResponse.json({ error: "缺少照片。" }, { status: 400 });
    }

    const image = images[0]!;
    const photoLabel = `Photo ${photoIndex + 1}`;

    // ===== Investigation instrumentation — logging only, no transforms. =====
    // Checkpoint A: "original upload" — bytes as received in the request body,
    // decoded exactly once, immediately, before anything else touches `image`.
    const originalBuffer = Buffer.from(image.dataBase64, "base64");
    const originalMeta = await readImagePipelineMetadata(originalBuffer);
    const originalSha256 = sha256Hex(originalBuffer);
    logImagePipelineOriginal({
      photoLabel,
      photoId,
      mimeType: image.mimeType,
      uploadedBytes: originalBuffer.byteLength,
      base64Length: image.dataBase64.length,
      sha256: originalSha256,
      width: originalMeta.width,
      height: originalMeta.height,
      format: originalMeta.format,
      orientationExif: originalMeta.orientationExif,
    });
    void saveVisionDebugImage({
      photoLabel,
      photoId,
      mimeType: image.mimeType,
      buffer: originalBuffer,
      checkpoint: "original-upload",
    });

    const existingCoverage = Array.isArray(o.existingCoverage)
      ? o.existingCoverage
          .map((row) => {
            if (!row || typeof row !== "object") return null;
            const r = row as Record<string, unknown>;
            const idx =
              typeof r.photoIndex === "number" ? Math.round(r.photoIndex) : -1;
            const qs = Array.isArray(r.questionsClearlyVisible)
              ? r.questionsClearlyVisible
                  .map((n) => toPositiveInt(n))
                  .filter((n) => n > 0)
              : [];
            if (idx < 0 || qs.length === 0) return null;
            return { photoIndex: idx, questionsClearlyVisible: qs };
          })
          .filter((x): x is NonNullable<typeof x> => x != null)
      : [];

    const coverageNote =
      existingCoverage.length > 0
        ? `\n\n其他照片已涵蓋：${existingCoverage
            .map(
              (c) =>
                `照片${c.photoIndex + 1} → 第${c.questionsClearlyVisible.join("、")}題`,
            )
            .join("；")}。只需針對尚未清楚的題目建議補拍。`
        : "";

    // Checkpoint B: "sent to Vision" — re-decode `image.dataBase64` completely
    // independently, right at the point the request body is built, so any
    // mutation of `image` between checkpoints A and B would be caught.
    const imageUrlForVision = `data:${image.mimeType};base64,${image.dataBase64}`;
    const bufferSentToVision = Buffer.from(image.dataBase64, "base64");
    const sentMeta = await readImagePipelineMetadata(bufferSentToVision);
    const sentSha256 = sha256Hex(bufferSentToVision);

    logImagePipelineByteComparison({
      photoLabel,
      before: {
        label: "original-upload",
        buffer: originalBuffer,
        sha256: originalSha256,
        width: originalMeta.width,
        height: originalMeta.height,
        mimeType: image.mimeType,
        format: originalMeta.format,
        orientationExif: originalMeta.orientationExif,
      },
      after: {
        label: "sent-to-vision",
        buffer: bufferSentToVision,
        sha256: sentSha256,
        width: sentMeta.width,
        height: sentMeta.height,
        mimeType: image.mimeType,
        format: sentMeta.format,
        orientationExif: sentMeta.orientationExif,
      },
    });
    logVisionRequestConfig({
      photoLabel,
      model: "gpt-4o-mini",
      detail: "high",
    });
    void saveVisionDebugImage({
      photoLabel,
      photoId,
      mimeType: image.mimeType,
      buffer: bufferSentToVision,
      checkpoint: "sent-to-vision",
    });

    const userContent = [
      {
        type: "text" as const,
        text:
          `第 ${photoIndex + 1} 張作業照片。${coverageNote}\n` +
          "請只回傳 JSON，不要批改或分析作答。",
      },
      {
        type: "image_url" as const,
        image_url: {
          url: imageUrlForVision,
          detail: "high" as const,
        },
      },
    ];

    const messages = [
      { role: "system", content: PHOTO_QUALITY_PROMPT },
      { role: "user", content: userContent },
    ];

    logPhotoQualityStep("開始 OCR", { photoId, photoIndex });
    const ocrPromise = ocrDetectQuestionNumbersDetailedWithRetry(
      image.mimeType,
      image.dataBase64,
    ).then((result) => {
      for (const attempt of result.attempts) {
        logOcrAttempt({
          photoLabel,
          attempt: attempt.attempt,
          startedAtIso: attempt.startedAtIso,
          endedAtIso: attempt.endedAtIso,
          durationMs: attempt.durationMs,
          timedOut: attempt.timedOut,
          ...(attempt.error ? { error: attempt.error } : {}),
          rawTextLength: attempt.rawTextLength,
          questionNumbersFound: attempt.questionNumbersFound,
        });
        if (attempt.errorStack) {
          console.log(
            `[vision-pipeline] OCR attempt ${attempt.attempt} exception stack:`,
            attempt.errorStack,
          );
        }
      }
      logPhotoQualityStep("OCR 完成", {
        photoId,
        photoIndex,
        timedOut: result.timedOut,
        totalAttempts: result.attempts.length,
        rawTextLength: result.rawText.length,
        questionCount: result.questionNumbers.length,
        questionNumbers: result.questionNumbers,
      });
      return result;
    });

    await logPhotoVisionRequestDebug(photoIndex, photoId, image, messages);
    logVisionRequestSummary("gpt-4o-mini", messages);

    logPhotoQualityStep("開始 Vision API", { photoId, photoIndex });
    const visionPromise = fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
    ).then(async (res) => {
      logPhotoQualityStep("Vision API 完成", {
        photoId,
        photoIndex,
        ok: res.ok,
        status: res.status,
      });
      return res;
    });

    const [openaiRes, ocrResult] = await Promise.all([
      visionPromise,
      ocrPromise,
    ]);
    const ocrQuestionNumbers = ocrResult.questionNumbers;

    if (!openaiRes.ok) {
      const detail = await openaiRes.text();
      logPhotoQualityStep("回傳 response", {
        photoId,
        photoIndex,
        ok: false,
        status: 502,
      });
      return NextResponse.json(
        { error: "照片品質檢查暫時失敗。", detail },
        { status: 502 },
      );
    }

    const data = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      console.log("====================");
      console.log(`PHOTO ${photoIndex + 1} RAW JSON`);
      console.log("====================");
      console.log(rawContent);
      console.log("====================");
      console.log("photoIndex:", photoIndex);
      console.log("estimatedTotalQuestions:", "(parse failed)");
      console.log("questionsClearlyVisible:", "(parse failed)");
      console.log("questionsWithIssues:", "(parse failed)");
      console.log("Vision 擷取到的所有題號:", "(parse failed)");
      console.log("====================");
      logPhotoQualityStep("回傳 response", {
        photoId,
        photoIndex,
        ok: false,
        status: 502,
        reason: "invalid_json",
      });
      return NextResponse.json(
        { error: "品質檢查回應格式異常。" },
        { status: 502 },
      );
    }

    const parsedObject =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    const visionClearlyVisible = extractVisionClearlyVisibleNumbers(parsedObject);
    const visionPayloadNumbers = collectQuestionNumbersFromPayload(parsedObject);
    const visionAllQuestionNumbers = uniqueSortedQuestionNumbers([
      ...visionClearlyVisible,
      ...visionPayloadNumbers,
    ]);

    console.log(`===== PHOTO ${photoIndex + 1} =====`);
    console.log("photoIndex:", photoIndex);
    console.log(
      "estimatedTotalQuestions:",
      parsedObject.estimatedTotalQuestions ?? null,
    );
    console.log(
      "questionsClearlyVisible:",
      parsedObject.questionsClearlyVisible ?? null,
    );
    console.log(
      "VisionExtractedQuestionNumbers:",
      visionAllQuestionNumbers,
    );
    console.log("====================");
    console.log(`PHOTO ${photoIndex + 1} RAW JSON`);
    console.log("====================");
    console.dir(parsed, { depth: null, maxArrayLength: null });
    console.log("====================");

    logPhotoQualityStep("開始合併結果", {
      photoId,
      photoIndex,
      ocrQuestionCount: ocrQuestionNumbers.length,
    });

    const mergedQuestionNumbers = uniqueSortedQuestionNumbers([
      ...ocrQuestionNumbers,
      ...visionClearlyVisible,
      ...visionPayloadNumbers,
    ]);

    const result = parsePhotoQualityResult(
      parsed,
      photoId,
      photoIndex,
      ocrQuestionNumbers,
    );
    if (!result) {
      logPhotoQualityPerPhotoDebug({
        photoLabel: `Photo ${photoIndex + 1}`,
        photoId,
        ocrRawText: ocrResult.rawText,
        ocrQuestionNumbers,
        ocrTimedOut: ocrResult.timedOut,
        ...(ocrResult.error ? { ocrError: ocrResult.error } : {}),
        visionRawResponse: rawContent,
        visionClearlyVisible,
        visionPayloadNumbers,
        mergedQuestionNumbers,
        estimatedTotalQuestions: 0,
        questionsClearlyVisible: [],
        questionsWithIssues: [],
      });
      logPhotoQualityStep("回傳 response", {
        photoId,
        photoIndex,
        ok: false,
        status: 502,
        reason: "incomplete_result",
      });
      return NextResponse.json(
        { error: "品質檢查回應不完整。" },
        { status: 502 },
      );
    }

    logPhotoQualityPerPhotoDebug({
      photoLabel: `Photo ${photoIndex + 1}`,
      photoId,
      ocrRawText: ocrResult.rawText,
      ocrQuestionNumbers,
      ocrTimedOut: ocrResult.timedOut,
      ...(ocrResult.error ? { ocrError: ocrResult.error } : {}),
      visionRawResponse: rawContent,
      visionClearlyVisible,
      visionPayloadNumbers,
      mergedQuestionNumbers,
      estimatedTotalQuestions: result.estimatedTotalQuestions,
      questionsClearlyVisible: result.questionsClearlyVisible,
      questionsWithIssues: result.questionsWithIssues.map((i) => i.questionNumber),
    });

    // Step 8 — record this photo and print a cross-photo comparison (same process only).
    recordPhotoPipelineSnapshot({
      photoLabel,
      photoId,
      photoIndex,
      width: originalMeta.width,
      height: originalMeta.height,
      uploadedBytes: originalBuffer.byteLength,
      mimeType: image.mimeType,
      ocrQuestionNumbers,
      ocrTimedOut: ocrResult.timedOut,
      visionQuestionNumbers: visionAllQuestionNumbers,
      visionEstimatedTotal: toPositiveInt(parsedObject.estimatedTotalQuestions),
      detectedQuestionNumbers: result.detectedQuestionNumbers ?? mergedQuestionNumbers,
      recordedAtIso: new Date().toISOString(),
    });
    logPhotoComparisonTable(photoId);

    logPhotoQualityStep("回傳 response", {
      photoId,
      photoIndex,
      ok: true,
      status: 200,
      estimatedTotalQuestions: result.estimatedTotalQuestions,
      clearlyVisibleCount: result.questionsClearlyVisible.length,
    });
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[photo-quality] 未預期錯誤", {
      photoId,
      photoIndex,
      error,
    });
    logPhotoQualityStep("回傳 response", {
      photoId,
      photoIndex,
      ok: false,
      status: 500,
      reason: "unexpected_error",
    });
    return NextResponse.json(
      { error: "照片品質檢查暫時失敗，請稍後再試。" },
      { status: 500 },
    );
  }
}
