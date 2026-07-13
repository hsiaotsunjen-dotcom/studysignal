import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import type { PhotoQualityCheckResult } from "@/lib/worksheetCapture";

export type PhotoQualityRequestBody = {
  image: AnalyzeImagePayload;
  photoId: string;
  photoIndex: number;
  existingCoverage?: Array<{
    photoIndex: number;
    questionsClearlyVisible: number[];
  }>;
};

export type PhotoQualityResponse = {
  result: PhotoQualityCheckResult;
};

export async function postPhotoQualityCheck(
  body: PhotoQualityRequestBody,
): Promise<
  { ok: true; result: PhotoQualityCheckResult } | { ok: false; error: string }
> {
  const res = await fetch("/api/photo-quality", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : "照片品質檢查失敗，請稍後再試。";
    return { ok: false, error: err };
  }
  const result =
    data &&
    typeof data === "object" &&
    "result" in data &&
    (data as PhotoQualityResponse).result
      ? (data as PhotoQualityResponse).result
      : null;
  if (!result) {
    return { ok: false, error: "照片品質檢查回應格式異常。" };
  }
  return { ok: true, result };
}
