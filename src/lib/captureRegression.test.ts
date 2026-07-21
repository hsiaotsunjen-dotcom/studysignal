import { describe, expect, it } from "vitest";

import { buildVisionUserContent } from "@/lib/analyzeApiRequest";
import type { AnalyzeImagePayload } from "@/lib/analyzeApiRequest";
import {
  applyMonotonicEstimatedTotal,
  buildCaptureAnalysisState,
  buildQuestionEvidenceMap,
  buildWorksheetCaptureContext,
  type QuestionEvidenceMap,
  type WorksheetCaptureSession,
  type WorksheetPhotoEntry,
} from "@/lib/worksheetCapture";

/** Mirrors WorksheetCaptureGuide / handleAnalyzePress gates — read state only. */
function uiActionsFromAnalysis(
  analysis: ReturnType<typeof buildCaptureAnalysisState>,
) {
  return {
    showRetakePrimary:
      analysis.recommendedAction === "retake-missing" ||
      analysis.recommendedAction === "retake-none-found",
    showAnalyzeSecondary:
      analysis.canAnalyzeCurrent &&
      analysis.recommendedAction === "retake-missing",
    allowAnalyzeApi: analysis.canAnalyzeCurrent,
  };
}

function visionPromptText(
  ctx: ReturnType<typeof buildWorksheetCaptureContext>,
): string {
  const images: AnalyzeImagePayload[] = [
    { mimeType: "image/jpeg", dataBase64: "dGVzdA==" },
  ];
  const parts = buildVisionUserContent("", images, ctx);
  return parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

function makePhotos(
  rows: Array<{ id: string; clearlyVisible: number[] }>,
): WorksheetPhotoEntry[] {
  return rows.map((row, index) => ({
    id: row.id,
    name: `photo-${index + 1}.jpg`,
    qualityStatus: "ok" as const,
    quality: {
      photoId: row.id,
      photoIndex: index,
      estimatedTotalQuestions: 0,
      questionsClearlyVisible: row.clearlyVisible,
      questionsWithIssues: [],
      globalIssues: [],
      readyForAnalysis: true,
      tutorMessage: "",
    },
  }));
}

function buildSession(input: {
  estimatedTotalQuestions: number;
  coveredQuestions: number[];
  questionsNeedingRetake?: Array<{
    questionNumber: number;
    issueType: "blur" | "readability";
  }>;
  photos?: WorksheetPhotoEntry[];
  questionPhotoMap?: Record<number, string>;
}): WorksheetCaptureSession {
  const retake = (input.questionsNeedingRetake ?? []).map((row) => ({
    questionNumber: row.questionNumber,
    issueType: row.issueType,
    fixInstruction: "請靠近一點",
  }));
  const analysis = buildCaptureAnalysisState({
    estimatedTotalQuestions: input.estimatedTotalQuestions,
    coveredQuestions: input.coveredQuestions,
    questionsNeedingRetake: retake,
    anyPhotoInProgress: false,
    checkedCount: input.coveredQuestions.length > 0 ? 1 : 1,
  });
  const photos =
    input.photos ??
    makePhotos([
      {
        id: "photo-a",
        clearlyVisible: input.coveredQuestions,
      },
    ]);
  const questionPhotoMap =
    input.questionPhotoMap ??
    Object.fromEntries(
      input.coveredQuestions.map((n) => [n, photos[0]?.id ?? "photo-a"]),
    );
  const questionEvidenceMap = buildQuestionEvidenceMap({
    photos,
    coveredQuestions: input.coveredQuestions,
    questionPhotoMap,
    questionsNeedingRetake: retake,
    analysis,
  });

  return {
    photos,
    estimatedTotalQuestions: input.estimatedTotalQuestions,
    coveredQuestions: input.coveredQuestions,
    detectedQuestions: input.coveredQuestions,
    questionsNeedingRetake: retake,
    openIssues: [],
    tutorMessage: "",
    questionPhotoMap,
    questionEvidenceMap,
    analysis,
  };
}

/** Scenario 6/7 — reject hallucination / overclaim language for missing evidence. */
function assertPromptDoesNotClaimMissingQuestions(
  prompt: string,
  missingQuestions: number[],
): void {
  expect(prompt).not.toMatch(/整份作業/);
  expect(prompt).not.toMatch(/全部題目/);
  for (const n of missingQuestions) {
    // Must not claim the missing question as analyzable content.
    expect(prompt).not.toMatch(new RegExp(`第${n}題`));
    expect(prompt).not.toMatch(
      new RegExp(`analyze\\s+(only\\s+)?question\\s*${n}\\b`, "i"),
    );
  }
}

/** Scenario 5/6 — a fabricated model answer without Evidence must fail the guard. */
function assertModelAnswerOnlyUsesEvidence(
  modelAnswer: string,
  evidenceMap: QuestionEvidenceMap,
): void {
  const evidenced = new Set(
    Object.values(evidenceMap).map((e) => e.questionNumber),
  );
  const mentioned = [
    ...modelAnswer.matchAll(/第\s*(\d{1,3})\s*題/g),
  ].map((m) => Number(m[1]));

  for (const n of mentioned) {
    if (evidenced.has(n)) continue;
    const isUnavailableNotice = modelAnswer.includes(
      `目前沒有收到第 ${n} 題影像，因此無法分析`,
    ) || modelAnswer.includes(`目前沒有收到第${n}題影像，因此無法分析`);
    expect(
      isUnavailableNotice,
      `Question ${n} has no Evidence but model claimed it without unavailable notice`,
    ).toBe(true);
  }
}

describe("Capture Regression — Scenario 1: no questions found", () => {
  it("retake-none-found, unknown scope, must not call /api/analyze", () => {
    const analysis = buildCaptureAnalysisState({
      estimatedTotalQuestions: 0,
      coveredQuestions: [],
      questionsNeedingRetake: [],
      anyPhotoInProgress: false,
      checkedCount: 1,
    });
    const ui = uiActionsFromAnalysis(analysis);

    expect(analysis.recommendedAction).toBe("retake-none-found");
    expect(analysis.analysisScope).toBe("unknown");
    expect(analysis.canAnalyzeCurrent).toBe(false);
    expect(ui.allowAnalyzeApi).toBe(false);
    expect(ui.showRetakePrimary).toBe(true);
    expect(ui.showAnalyzeSecondary).toBe(false);
  });
});

describe("Capture Regression — Scenario 2: covered 3/5 partial", () => {
  it("partial scope, missing 4–5, dual CTAs, prompt forbids analyzing missing", () => {
    const session = buildSession({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3],
      photos: makePhotos([
        { id: "p1", clearlyVisible: [1, 2] },
        { id: "p2", clearlyVisible: [3] },
      ]),
      questionPhotoMap: { 1: "p1", 2: "p1", 3: "p2" },
    });
    const { analysis } = session;
    const ui = uiActionsFromAnalysis(analysis);
    const ctx = buildWorksheetCaptureContext(session);
    const prompt = visionPromptText(ctx);

    expect(analysis.analysisScope).toBe("partial");
    expect(session.coveredQuestions).toEqual([1, 2, 3]);
    expect(analysis.missingQuestions).toEqual([4, 5]);
    expect(analysis.recommendedAction).toBe("retake-missing");
    expect(ui.showRetakePrimary).toBe(true);
    expect(ui.showAnalyzeSecondary).toBe(true);
    expect(ui.allowAnalyzeApi).toBe(true);

    expect(ctx.coveredQuestions).toEqual([1, 2, 3]);
    expect(ctx.missingQuestions).toEqual([4, 5]);
    expect(ctx.analysisScope).toBe("partial");
    expect(
      Object.keys(ctx.questionEvidenceMap)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([1, 2, 3]);
    expect(ctx.questionEvidenceMap["4"]).toBeUndefined();
    expect(ctx.questionEvidenceMap["5"]).toBeUndefined();

    expect(prompt).toMatch(/analysisScope:\s*partial/);
    expect(prompt).toMatch(/questionEvidenceMap/);
    expect(prompt).toMatch(/ONLY questions listed in questionEvidenceMap/);
    expect(prompt).toMatch(/FORBIDDEN/);
    expect(prompt).toMatch(/missingQuestions/);
    assertPromptDoesNotClaimMissingQuestions(prompt, [4, 5]);
  });
});

describe("Capture Regression — Scenario 3: full + clear", () => {
  it("full scope, high confidence, direct analyze", () => {
    const session = buildSession({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3, 4, 5],
    });
    const { analysis } = session;
    const ui = uiActionsFromAnalysis(analysis);

    expect(analysis.analysisScope).toBe("full");
    expect(analysis.coverageComplete).toBe(true);
    expect(analysis.qualityAcceptable).toBe(true);
    expect(analysis.analysisConfidence).toBe("high");
    expect(analysis.recommendedAction).toBe("analyze");
    expect(analysis.missingQuestions).toEqual([]);
    expect(analysis.lowQualityQuestions).toEqual([]);
    expect(ui.allowAnalyzeApi).toBe(true);
    expect(ui.showRetakePrimary).toBe(false);
    expect(ui.showAnalyzeSecondary).toBe(false);
  });
});

describe("Capture Regression — Scenario 4: full + some low quality", () => {
  it("full scope, medium confidence, allow analyze with low-quality flags", () => {
    const session = buildSession({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3, 4, 5],
      questionsNeedingRetake: [{ questionNumber: 2, issueType: "blur" }],
    });
    // Note: questionsNeedingRetake only includes questions NOT in covered in merge.
    // For state machine input we pass retake list directly as low-quality source.
    const analysis = buildCaptureAnalysisState({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3, 4, 5],
      questionsNeedingRetake: [{ questionNumber: 2 }],
      anyPhotoInProgress: false,
      checkedCount: 1,
    });
    const evidence = buildQuestionEvidenceMap({
      photos: makePhotos([{ id: "p1", clearlyVisible: [1, 2, 3, 4, 5] }]),
      coveredQuestions: [1, 2, 3, 4, 5],
      questionPhotoMap: {
        1: "p1",
        2: "p1",
        3: "p1",
        4: "p1",
        5: "p1",
      },
      questionsNeedingRetake: [
        { questionNumber: 2, issueType: "blur" },
      ],
      analysis,
    });
    const ui = uiActionsFromAnalysis(analysis);
    const ctx = buildWorksheetCaptureContext({
      ...session,
      analysis,
      questionsNeedingRetake: [
        {
          questionNumber: 2,
          issueType: "blur",
          fixInstruction: "請靠近",
        },
      ],
      questionEvidenceMap: evidence,
    });
    const prompt = visionPromptText(ctx);

    expect(analysis.analysisScope).toBe("full");
    expect(analysis.analysisConfidence).toBe("medium");
    expect(analysis.lowQualityQuestions).toEqual([2]);
    expect(analysis.recommendedAction).toBe("analyze-low-confidence");
    expect(ui.allowAnalyzeApi).toBe(true);
    expect(evidence["2"]?.isLowConfidence).toBe(true);
    expect(evidence["2"]?.visionConfidence).toBe("low");
    expect(prompt).toMatch(/analysisConfidence:\s*medium/);
    expect(prompt).toMatch(/此題影像可信度較低/);
    expect(prompt).toMatch(/lowQualityQuestions/);
  });
});

describe("Capture Regression — Scenario 5: missing Evidence", () => {
  it("unevidenced question must use unavailable notice, not analysis", () => {
    const session = buildSession({
      estimatedTotalQuestions: 3,
      coveredQuestions: [1, 2],
    });
    const ctx = buildWorksheetCaptureContext(session);
    const prompt = visionPromptText(ctx);

    expect(ctx.questionEvidenceMap["3"]).toBeUndefined();
    expect(prompt).toContain(
      "「目前沒有收到第 X 題影像，因此無法分析。」",
    );

    // Valid model reply for missing Q3
    assertModelAnswerOnlyUsesEvidence(
      "第1題正確。第2題正確。目前沒有收到第3題影像，因此無法分析。",
      ctx.questionEvidenceMap,
    );

    // Invalid model reply inventing Q3
    expect(() =>
      assertModelAnswerOnlyUsesEvidence(
        "第3題答案是 apple。",
        ctx.questionEvidenceMap,
      ),
    ).toThrow();
  });
});

describe("Capture Regression — Scenario 6: Prompt must not fantasize", () => {
  it("fails when content analyzes a question absent from QuestionEvidence", () => {
    const session = buildSession({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3],
    });
    const evidence = session.questionEvidenceMap;
    const prompt = visionPromptText(buildWorksheetCaptureContext(session));

    expect(prompt).toMatch(/You may analyze ONLY questionNumbers that appear in questionEvidenceMap/);
    expect(prompt).toMatch(/FORBIDDEN: guessing, inventing answers/);

    expect(() =>
      assertModelAnswerOnlyUsesEvidence(
        "第5題寫得很好，答案是 banana。",
        evidence,
      ),
    ).toThrow();
  });
});

describe("Capture Regression — Scenario 7: partial prompt must not claim full worksheet", () => {
  it("fails if prompt claims 整份作業 / 全部題目 / 第5題 when Q5 is missing", () => {
    const session = buildSession({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3],
    });
    const prompt = visionPromptText(buildWorksheetCaptureContext(session));

    assertPromptDoesNotClaimMissingQuestions(prompt, [4, 5]);

    // Simulated regressive prompt that over-claims
    const badPrompt = [
      prompt,
      "請分析整份作業與全部題目，包含第5題。",
    ].join("\n");
    expect(() =>
      assertPromptDoesNotClaimMissingQuestions(badPrompt, [4, 5]),
    ).toThrow();
  });
});

describe("Capture Regression — Coverage / Quality / Scope / Confidence / Evidence / Prompt Guard", () => {
  it("keeps Coverage and Quality axes independent", () => {
    const analysis = buildCaptureAnalysisState({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 2, 3],
      questionsNeedingRetake: [{ questionNumber: 2 }],
      anyPhotoInProgress: false,
      checkedCount: 1,
    });
    // Coverage incomplete → partial / low confidence from scope, not only quality
    expect(analysis.missingQuestions).toEqual([4, 5]);
    expect(analysis.lowQualityQuestions).toEqual([2]);
    expect(analysis.analysisScope).toBe("partial");
    expect(analysis.analysisConfidence).toBe("low");
  });

  it("Evidence map only contains covered questions", () => {
    const session = buildSession({
      estimatedTotalQuestions: 5,
      coveredQuestions: [1, 3],
      questionPhotoMap: { 1: "p1", 3: "p2" },
      photos: makePhotos([
        { id: "p1", clearlyVisible: [1] },
        { id: "p2", clearlyVisible: [3] },
      ]),
    });
    expect(
      Object.keys(session.questionEvidenceMap)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([1, 3]);
    expect(session.questionEvidenceMap["1"]?.sourcePhotoLabel).toBe("Photo1");
    expect(session.questionEvidenceMap["3"]?.sourcePhotoLabel).toBe("Photo2");
  });
});

describe("Capture Regression — Scenario 8: estimatedTotalQuestions must be monotonic within a session", () => {
  it("does not let a re-check regress 13 → 10; missing/scope stay correct", () => {
    // First check of this session found 13 (Q11-13 issue-flagged, not clear).
    const highWaterMark = 13;

    // A later re-check (retake / re-OCR / re-Vision) under-detects this time —
    // Q11-13 vanish entirely from this round's coverage.
    const reChecked = buildSession({
      estimatedTotalQuestions: 10,
      coveredQuestions: range(1, 10),
    });

    const monotonic = applyMonotonicEstimatedTotal(reChecked, highWaterMark);

    // Total never regresses.
    expect(monotonic.estimatedTotalQuestions).toBe(13);
    // Coverage still reflects only the LATEST OCR/Vision result — not unioned.
    expect(monotonic.coveredQuestions).toEqual(range(1, 10));
    // missingQuestions / analysisScope are recomputed against the raised
    // floor, so the false "10/10 complete" is corrected back to "10/13".
    expect(monotonic.analysis.missingQuestions).toEqual([11, 12, 13]);
    expect(monotonic.analysis.analysisScope).toBe("partial");
    expect(monotonic.analysis.coverageComplete).toBe(false);
    // Evidence layer is untouched — still only the covered questions.
    expect(
      Object.keys(monotonic.questionEvidenceMap)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual(range(1, 10));
  });

  it("still rises when a fresh check finds MORE than the previous high-water mark", () => {
    const session = buildSession({
      estimatedTotalQuestions: 15,
      coveredQuestions: range(1, 15),
    });

    const monotonic = applyMonotonicEstimatedTotal(session, 13);

    expect(monotonic.estimatedTotalQuestions).toBe(15);
    expect(monotonic.analysis.missingQuestions).toEqual([]);
    expect(monotonic.analysis.analysisScope).toBe("full");
  });

  it("is a no-op when the current total already meets the floor", () => {
    const session = buildSession({
      estimatedTotalQuestions: 13,
      coveredQuestions: range(1, 13),
    });

    const monotonic = applyMonotonicEstimatedTotal(session, 13);

    // Same object identity — confirms no unnecessary recompute/rebuild.
    expect(monotonic).toBe(session);
  });

  it("previousHighWaterMark of 0 (fresh session) never lowers anything", () => {
    const session = buildSession({
      estimatedTotalQuestions: 13,
      coveredQuestions: range(1, 10),
    });

    const monotonic = applyMonotonicEstimatedTotal(session, 0);

    expect(monotonic).toBe(session);
    expect(monotonic.estimatedTotalQuestions).toBe(13);
  });
});

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
