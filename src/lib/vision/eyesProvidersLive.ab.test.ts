/**
 * LIVE Eyes A/B on the real 3-photo homework.
 * Skipped unless EYES_LIVE_AB=1 (avoids quota burn in CI).
 *
 * Asserts for each provider independently:
 *   Tutor overview == Signals overview == SAO
 * Provider answer differences are allowed.
 *
 * Production VISION_PROVIDER_PRIORITY is not changed by this test.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyHomeworkStudentAnswersGuard } from "@/lib/homeworkStudentAnswers";
import { buildStudentAnswerObject } from "@/lib/studentAnswerObject";
import { tutorOverviewFromSao } from "@/lib/tutorSaoContext";
import {
  compareEyesProviders,
  logEyesAbCompareDev,
  summarizeEyesProviderResult,
  type HomeworkVisionResult,
} from "@/lib/vision";
import type { WorksheetCaptureSession } from "@/lib/worksheetCapture";

const LIVE = process.env.EYES_LIVE_AB === "1";

const PHOTO_FILES = [
  "Photo-1-95fc330f-a1d0-4cee-b23d-b59d70f769bb-original-upload.jpg",
  "Photo-2-aa35586a-0b08-4a2d-ad2e-e4f4a5b4d915-original-upload.jpg",
  "Photo-3-235bf598-d431-483e-8315-61dcc4956ae0-original-upload.jpg",
];

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function makeSession(): WorksheetCaptureSession {
  return {
    photos: [
      {
        id: "p1",
        name: "Photo1.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p1",
          photoIndex: 0,
          estimatedTotalQuestions: 13,
          questionsClearlyVisible: [1],
          questionsWithIssues: [],
          detectedQuestionNumbers: [1],
          ocrRawText: "",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "p2",
        name: "Photo2.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p2",
          photoIndex: 1,
          estimatedTotalQuestions: 13,
          questionsClearlyVisible: [9],
          questionsWithIssues: [],
          detectedQuestionNumbers: [9],
          ocrRawText: "",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
      {
        id: "p3",
        name: "Photo3.jpg",
        qualityStatus: "ok",
        quality: {
          photoId: "p3",
          photoIndex: 2,
          estimatedTotalQuestions: 13,
          questionsClearlyVisible: [13],
          questionsWithIssues: [],
          detectedQuestionNumbers: [13],
          ocrRawText: "",
          globalIssues: [],
          readyForAnalysis: true,
          tutorMessage: "",
        },
      },
    ],
    estimatedTotalQuestions: 13,
    coveredQuestions: [1, 9, 13],
    detectedQuestions: [1, 9, 13],
    questionsNeedingRetake: [],
    openIssues: [],
    questionPhotoMap: { 1: "p1", 9: "p2", 13: "p3" },
    questionEvidenceMap: {},
    analysis: {
      coverageComplete: false,
      qualityAcceptable: true,
      canAnalyzeCurrent: true,
      recommendedAction: "retake-missing",
      analysisScope: "partial",
      analysisConfidence: "medium",
      missingQuestions: [],
      lowQualityQuestions: [],
    },
    tutorMessage: "",
  };
}

function assertConsumersMatchSao(eyes: HomeworkVisionResult) {
  const sao = buildStudentAnswerObject({
    session: makeSession(),
    ocrRawTextByPhotoId: { p1: "", p2: "", p3: "" },
    eyes,
  });
  const tutorOverview = tutorOverviewFromSao(sao);
  const guarded = applyHomeworkStudentAnswersGuard(
    {
      ocrText: "",
      visualSummaryZh: "",
      homeworkReport: {
        homeworkType: "worksheet",
        questionCount: 13,
        imageQuality: "good",
        studentAnswersStatus: "none",
        answerOverview: "—",
        keyExplanations: [],
        pronunciationFocus: [],
        learningSignal: [],
      },
    },
    { studentAnswerObject: sao },
  );
  expect(tutorOverview).toBe(guarded.homeworkReport?.answerOverview);
  expect(guarded.homeworkReport?.studentAnsweredQuestions).toBe(
    sao.summary.answered,
  );
  expect(guarded.homeworkReport?.studentAnswersStatus).not.toBe("none");
  return {
    overview: tutorOverview,
    summary: summarizeEyesProviderResult(eyes),
  };
}

describe.skipIf(!LIVE)("Eyes LIVE A/B — real 3-photo homework", () => {
  it(
    "Gemini and OpenAI each keep Tutor == Signals == SAO",
    async () => {
      loadEnvLocal();

      const images = PHOTO_FILES.map((f) => {
        const file = path.join(process.cwd(), "debug/vision-images", f);
        expect(existsSync(file)).toBe(true);
        return {
          mimeType: "image/jpeg",
          base64: readFileSync(file).toString("base64"),
        };
      });

      const ab = await compareEyesProviders({ images }, "gemini", "openai");
      logEyesAbCompareDev(ab);

      const gemini = assertConsumersMatchSao(ab.resultA);
      const openai = assertConsumersMatchSao(ab.resultB);

      console.log("[LIVE] Gemini overview:", gemini.overview);
      console.log("[LIVE] OpenAI overview:", openai.overview);
      console.log("[LIVE] Answer diffs (provider-only):", ab.answerDiffs);

      // Production selection unchanged: default remains gemini,openai.
      expect(process.env.VISION_PROVIDER_PRIORITY ?? "gemini,openai").toMatch(
        /gemini/,
      );
    },
    180_000,
  );
});
