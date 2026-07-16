"use client";

import {
  ANALYSIS_CONFIDENCE_UI,
  formatQuestionRangesZh,
} from "@/lib/worksheetCapture";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

type WorksheetCaptureGuideProps = {
  session: WorksheetCaptureSession;
  checking: boolean;
  onAddPhoto?: () => void;
  onAnalyzeCurrent?: () => void;
  canAddPhoto: boolean;
  analyzeBusy?: boolean;
};

function statusIcon(status: WorksheetCaptureSession["photos"][0]["qualityStatus"]) {
  if (status === "checking") {
    return <span className="text-amber-300" aria-hidden>…</span>;
  }
  if (status === "ok") {
    return <span className="text-emerald-400" aria-hidden>✓</span>;
  }
  if (status === "needs_improvement" || status === "error") {
    return <span className="text-amber-400" aria-hidden>!</span>;
  }
  return <span className="text-zinc-500" aria-hidden>○</span>;
}

export function WorksheetCaptureGuide({
  session,
  checking,
  onAddPhoto,
  onAnalyzeCurrent,
  canAddPhoto,
  analyzeBusy = false,
}: WorksheetCaptureGuideProps) {
  const { estimatedTotalQuestions, detectedQuestions, analysis } = session;
  const {
    canAnalyzeCurrent,
    recommendedAction,
    missingQuestions,
    lowQualityQuestions,
    analysisScope,
    analysisConfidence,
  } = analysis;
  const confidenceUi = ANALYSIS_CONFIDENCE_UI[analysisConfidence];

  const progressLabel =
    estimatedTotalQuestions > 0
      ? `${detectedQuestions.length} / ${estimatedTotalQuestions} 題`
      : `${detectedQuestions.length} 題`;

  const showRetakePrimary =
    canAddPhoto &&
    (recommendedAction === "retake-missing" ||
      recommendedAction === "retake-none-found");
  const showAnalyzeSecondary =
    Boolean(onAnalyzeCurrent) &&
    canAnalyzeCurrent &&
    recommendedAction === "retake-missing";

  return (
    <div className="mb-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] p-3 ring-1 ring-violet-500/10">
      <div
        className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/30"
        role="progressbar"
        aria-valuenow={detectedQuestions.length}
        aria-valuemin={0}
        aria-valuemax={Math.max(estimatedTotalQuestions, 1)}
        aria-label={`已辨識 ${progressLabel}`}
      >
        <div
          className={`h-full transition-all ${
            analysisScope === "full" ? "bg-emerald-500" : "bg-violet-500"
          }`}
          style={{
            width: `${
              estimatedTotalQuestions > 0
                ? Math.min(
                    100,
                    Math.round(
                      (detectedQuestions.length / estimatedTotalQuestions) * 100,
                    ),
                  )
                : detectedQuestions.length > 0
                  ? 40
                  : 8
            }%`,
          }}
        />
      </div>

      <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/95">
        {checking ? "📷 正在幫你看照片…" : session.tutorMessage}
      </pre>

      {!checking && canAnalyzeCurrent ? (
        <p
          className={`mt-2 text-xs font-medium ${
            analysisConfidence === "high"
              ? "text-emerald-300/90"
              : analysisConfidence === "medium"
                ? "text-amber-200/90"
                : "text-rose-300/90"
          }`}
        >
          {confidenceUi.emoji} {confidenceUi.label}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5 text-xs text-zinc-400">
        {session.photos.map((photo, index) => {
          const range = formatQuestionRangesZh(
            photo.quality?.questionsClearlyVisible ?? [],
          );
          return (
            <li key={photo.id} className="flex items-start gap-2">
              {statusIcon(photo.qualityStatus)}
              <span>
                照片 {index + 1}
                {range ? `：${range}` : ""}
                {photo.qualityStatus === "checking" ? "（檢查中…）" : ""}
                {photo.qualityError ? ` — ${photo.qualityError}` : ""}
              </span>
            </li>
          );
        })}
      </ul>

      {(showRetakePrimary || showAnalyzeSecondary) && !checking ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {showRetakePrimary ? (
            <button
              type="button"
              onClick={onAddPhoto}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-violet-400/40 bg-violet-500/25 px-3 py-2.5 text-xs font-semibold text-violet-50 transition hover:bg-violet-500/35"
            >
              <span aria-hidden>📷</span>
              {recommendedAction === "retake-none-found"
                ? "補拍缺少題目"
                : `補拍缺少題目${
                    missingQuestions.length > 0
                      ? `（${formatQuestionRangesZh(missingQuestions) || missingQuestions.join("、")}）`
                      : ""
                  }`}
            </button>
          ) : null}
          {showAnalyzeSecondary ? (
            <button
              type="button"
              disabled={analyzeBusy}
              onClick={onAnalyzeCurrent}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
            >
              直接分析目前已辨識題目
            </button>
          ) : null}
        </div>
      ) : null}

      {canAnalyzeCurrent && analysisScope !== "partial" && !checking ? (
        <p className="mt-2 text-xs font-medium text-emerald-300/90">
          {recommendedAction === "analyze-low-confidence"
            ? `覆蓋已完整（analysisScope=full）；以下題目可信度較低：${
                formatQuestionRangesZh(lowQualityQuestions) ||
                lowQualityQuestions.map((n) => `第${n}題`).join("、")
              }。可開始分析。`
            : analysisScope === "unknown"
              ? "可分析目前已辨識內容（analysisScope=unknown，總題數尚不確定）。"
              : "照片已完整辨識（analysisScope=full），可以開始分析。"}
        </p>
      ) : recommendedAction === "retake-missing" && !checking ? (
        <p className="mt-2 text-xs text-amber-200/85">
          覆蓋尚未完整（{progressLabel}，analysisScope=partial）。建議先補拍缺少題目；若直接分析，AI
          只會看已辨識題目。
        </p>
      ) : !checking ? (
        <p className="mt-2 text-xs text-zinc-500">
          我會把多張照片自動合併，你不用自己對應哪張是哪一題。
        </p>
      ) : null}
    </div>
  );
}
