/**
 * POST /api/final-coverage — Final Coverage Verify (Phase 1, standalone).
 *
 * Takes ALL worksheet photos at once plus the per-photo capture summary, and
 * asks Vision to re-verify coverage ONLY (total / visible / missing / duplicate
 * / ready / retake). It does NOT grade answers, run OCR, act as a tutor, or
 * merge evidence.
 *
 * STANDALONE: nothing in the app calls this route yet. It does not import or
 * mutate any existing flow (photo-quality / analyze / merge / state machine /
 * UI). It only reuses the read-only `AnalyzeImagePayload` parser for images.
 */

import { NextResponse } from "next/server";

import { parseAnalyzeImages } from "@/lib/analyzeApiRequest";
import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import { FINAL_COVERAGE_SYSTEM_PROMPT } from "@/lib/finalCoveragePrompt";
import type {
  FinalCoverageAdditionalPhotoRequest,
  FinalCoverageCaptureSummary,
  FinalCoverageExistingCoverageEntry,
  FinalCoverageResult,
} from "@/lib/finalCoverageApi";

export const runtime = "nodejs";

function toPositiveInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function toPositiveIntArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<number>();
  for (const item of value) {
    const n = toPositiveInt(item);
    if (n > 0) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

function parseCaptureSummary(raw: unknown): FinalCoverageCaptureSummary {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const scopeRaw = o.analysisScope;
  const analysisScope: FinalCoverageCaptureSummary["analysisScope"] =
    scopeRaw === "full" || scopeRaw === "partial" || scopeRaw === "unknown"
      ? scopeRaw
      : "unknown";
  return {
    estimatedTotalQuestions: toPositiveInt(o.estimatedTotalQuestions),
    coveredQuestions: toPositiveIntArray(o.coveredQuestions),
    missingQuestions: toPositiveIntArray(o.missingQuestions),
    analysisScope,
  };
}

function parseExistingCoverage(
  raw: unknown,
): FinalCoverageExistingCoverageEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: FinalCoverageExistingCoverageEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const photoIndex =
      typeof r.photoIndex === "number" && Number.isFinite(r.photoIndex)
        ? Math.round(r.photoIndex)
        : -1;
    if (photoIndex < 0) continue;
    out.push({
      photoIndex,
      questionsClearlyVisible: toPositiveIntArray(r.questionsClearlyVisible),
    });
  }
  return out;
}

function normalizeFinalCoverageResult(raw: unknown): FinalCoverageResult {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  let additionalPhotoRequest: FinalCoverageAdditionalPhotoRequest | null = null;
  const apr = o.additionalPhotoRequest;
  if (apr && typeof apr === "object") {
    const a = apr as Record<string, unknown>;
    const reason = typeof a.reason === "string" ? a.reason.trim() : "";
    const suggestedQuestions = toPositiveIntArray(a.suggestedQuestions);
    if (reason.length > 0 || suggestedQuestions.length > 0) {
      additionalPhotoRequest = { reason, suggestedQuestions };
    }
  }

  return {
    estimatedTotalQuestions: toPositiveInt(o.estimatedTotalQuestions),
    questionsClearlyVisible: toPositiveIntArray(o.questionsClearlyVisible),
    missingQuestions: toPositiveIntArray(o.missingQuestions),
    duplicateQuestions: toPositiveIntArray(o.duplicateQuestions),
    readyForAnalysis: o.readyForAnalysis === true,
    additionalPhotoRequest,
  };
}

function buildUserContent(
  images: AnalyzeImagePayload[],
  captureSummary: FinalCoverageCaptureSummary,
  existingCoverage: FinalCoverageExistingCoverageEntry[],
) {
  const priorText =
    "以下為逐張品質檢查得到的先驗資訊，僅供參考。請以整份作業的全部照片重新獨立判斷覆蓋率：\n" +
    `先驗 estimatedTotalQuestions：${captureSummary.estimatedTotalQuestions}\n` +
    `先驗 coveredQuestions：${JSON.stringify(captureSummary.coveredQuestions)}\n` +
    `先驗 missingQuestions：${JSON.stringify(captureSummary.missingQuestions)}\n` +
    `先驗 analysisScope：${captureSummary.analysisScope}\n` +
    `各照片先驗覆蓋：${JSON.stringify(existingCoverage)}\n` +
    `本次共收到 ${images.length} 張照片。請只回傳符合格式的 JSON。`;

  const content: Array<
    | { type: "text"; text: string }
    | {
        type: "image_url";
        image_url: { url: string; detail: "low" };
      }
  > = [{ type: "text", text: priorText }];

  for (const image of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mimeType};base64,${image.dataBase64}`,
        detail: "low",
      },
    });
  }

  return content;
}

export async function POST(req: Request) {
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
  const images = parseAnalyzeImages(o.images);
  if (images.length === 0) {
    return NextResponse.json({ error: "缺少照片。" }, { status: 400 });
  }

  const captureSummary = parseCaptureSummary(o.captureSummary);
  const existingCoverage = parseExistingCoverage(o.existingCoverage);

  const messages = [
    { role: "system", content: FINAL_COVERAGE_SYSTEM_PROMPT },
    {
      role: "user",
      content: buildUserContent(images, captureSummary, existingCoverage),
    },
  ];

  let openaiRes: Response;
  try {
    openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
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
  } catch {
    return NextResponse.json(
      { error: "覆蓋率檢查暫時失敗。" },
      { status: 502 },
    );
  }

  if (!openaiRes.ok) {
    const detail = await openaiRes.text().catch(() => "");
    return NextResponse.json(
      { error: "覆蓋率檢查暫時失敗。", detail },
      { status: 502 },
    );
  }

  const data = (await openaiRes.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  const rawContent = data?.choices?.[0]?.message?.content?.trim() ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return NextResponse.json(
      { error: "覆蓋率檢查回應格式異常。" },
      { status: 502 },
    );
  }

  const result = normalizeFinalCoverageResult(parsed);
  return NextResponse.json({ result });
}
