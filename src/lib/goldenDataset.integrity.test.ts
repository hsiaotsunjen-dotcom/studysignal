import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const GOLDEN_ROOT = path.resolve(__dirname, "../../tests/golden");

const REQUIRED_CASES = [
  "001_complete",
  "002_partial",
  "003_blur",
  "004_cross_page",
  "005_no_answer",
  "006_wrong_answer",
  "007_multiple_choice",
  "008_fill_blank",
  "009_handwriting",
  "010_mixed_language",
] as const;

type AnswerVerdict = {
  questionNumber: number;
  verdict: string;
  studentAnswer?: string | null;
  expectedAnswer?: string | null;
  isLowConfidence?: boolean;
  sourcePhoto?: string;
  notes?: string;
};

type FeedbackExpectation = {
  questionNumber: number;
  mustInclude?: string[];
  mustNotInclude?: string[];
  tone?: string;
};

type GoldenExpected = {
  id: string;
  description: string;
  photos: string[];
  analysisScope: "full" | "partial" | "unknown";
  analysisConfidence: "high" | "medium" | "low";
  coveredQuestions: number[];
  missingQuestions: number[];
  lowQualityQuestions: number[];
  estimatedTotalQuestions?: number;
  expectedAnswerVerdict: AnswerVerdict[];
  expectedFeedback?: FeedbackExpectation[];
  promptGuards?: {
    mustNotAnalyzeQuestions?: number[];
    mustNotContain?: string[];
    mustContain?: string[];
  };
};

const SCOPES = new Set(["full", "partial", "unknown"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);
const VERDICTS = new Set([
  "correct",
  "incorrect",
  "uncertain",
  "blank",
  "unevidenced",
]);

function assertUniquePositiveInts(label: string, nums: unknown): number[] {
  expect(Array.isArray(nums), `${label} must be array`).toBe(true);
  const list = nums as unknown[];
  const out: number[] = [];
  for (const n of list) {
    expect(typeof n === "number" && Number.isInteger(n) && n >= 1).toBe(true);
    // Runtime-verified by the assertion above; `expect(...).toBe(true)` does
    // not narrow `n`'s type for TS, so assert what we just checked.
    out.push(n as number);
  }
  expect(new Set(out).size, `${label} must be unique`).toBe(out.length);
  return out.sort((a, b) => a - b);
}

/** Structural validation aligned with tests/golden/expected.schema.json */
function assertValidExpected(raw: unknown, folderId: string): GoldenExpected {
  expect(raw && typeof raw === "object").toBe(true);
  const o = raw as Record<string, unknown>;

  expect(o.id).toBe(folderId);
  expect(typeof o.description === "string" && o.description.length > 0).toBe(
    true,
  );
  expect(Array.isArray(o.photos) && (o.photos as unknown[]).length >= 1).toBe(
    true,
  );
  for (const p of o.photos as unknown[]) {
    expect(typeof p === "string" && /^photo\d+\.jpg$/.test(p)).toBe(true);
  }

  expect(SCOPES.has(o.analysisScope as string)).toBe(true);
  expect(CONFIDENCES.has(o.analysisConfidence as string)).toBe(true);

  const covered = assertUniquePositiveInts(
    "coveredQuestions",
    o.coveredQuestions,
  );
  const missing = assertUniquePositiveInts(
    "missingQuestions",
    o.missingQuestions,
  );
  const lowQuality = assertUniquePositiveInts(
    "lowQualityQuestions",
    o.lowQualityQuestions,
  );

  for (const n of covered) {
    expect(missing.includes(n), `Q${n} cannot be covered and missing`).toBe(
      false,
    );
  }

  const rawEstimatedTotalQuestions = o.estimatedTotalQuestions;
  if (typeof rawEstimatedTotalQuestions === "number") {
    expect(rawEstimatedTotalQuestions).toBeGreaterThanOrEqual(0);
    if (o.analysisScope !== "unknown" && rawEstimatedTotalQuestions > 0) {
      expect(covered.length + missing.length).toBe(
        rawEstimatedTotalQuestions,
      );
    }
  }

  expect(Array.isArray(o.expectedAnswerVerdict)).toBe(true);
  const verdicts = o.expectedAnswerVerdict as AnswerVerdict[];
  for (const row of verdicts) {
    expect(typeof row.questionNumber === "number" && row.questionNumber >= 1).toBe(
      true,
    );
    expect(VERDICTS.has(row.verdict)).toBe(true);
    if (missing.includes(row.questionNumber)) {
      expect(row.verdict).toBe("unevidenced");
    }
    if (row.verdict === "unevidenced") {
      expect(covered.includes(row.questionNumber)).toBe(false);
    }
  }

  if (o.analysisScope === "partial") {
    expect(missing.length).toBeGreaterThan(0);
  }
  if (o.analysisScope === "full" && covered.length > 0) {
    expect(missing.length).toBe(0);
  }

  for (const n of lowQuality) {
    // Low quality is a Quality-axis flag; prefer it on covered questions.
    expect(
      covered.includes(n) || missing.includes(n),
      `lowQuality Q${n} should appear in covered or missing list for fixture clarity`,
    ).toBe(true);
  }

  return o as GoldenExpected;
}

describe("Golden Dataset architecture", () => {
  it("ships expected.schema.json and README", () => {
    expect(fs.existsSync(path.join(GOLDEN_ROOT, "expected.schema.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(GOLDEN_ROOT, "README.md"))).toBe(true);
  });

  it.each(REQUIRED_CASES)(
    "%s has photos + valid expected.json",
    (caseId) => {
      const dir = path.join(GOLDEN_ROOT, caseId);
      expect(fs.existsSync(dir)).toBe(true);

      const expectedPath = path.join(dir, "expected.json");
      expect(fs.existsSync(expectedPath)).toBe(true);
      const expected = assertValidExpected(
        JSON.parse(fs.readFileSync(expectedPath, "utf8")),
        caseId,
      );

      for (const photo of expected.photos) {
        const photoPath = path.join(dir, photo);
        expect(fs.existsSync(photoPath), `missing ${photo}`).toBe(true);
        expect(fs.statSync(photoPath).size).toBeGreaterThan(0);
      }
    },
  );

  it("002_partial encodes unevidenced missing questions and prompt guards", () => {
    const expected = assertValidExpected(
      JSON.parse(
        fs.readFileSync(
          path.join(GOLDEN_ROOT, "002_partial", "expected.json"),
          "utf8",
        ),
      ),
      "002_partial",
    );
    expect(expected.analysisScope).toBe("partial");
    expect(expected.missingQuestions).toEqual([4, 5]);
    expect(expected.promptGuards?.mustNotAnalyzeQuestions).toEqual([4, 5]);
    expect(expected.promptGuards?.mustNotContain).toEqual(
      expect.arrayContaining(["整份作業", "全部題目", "第5題"]),
    );
  });
});

/**
 * Placeholder hook for Homework Analysis Pipeline regression.
 * When the engine exists, replace the skip with:
 *   runHomeworkAnalysisPipeline(fixture) ↔ expected.json
 */
describe("Golden Dataset — Analysis Pipeline (deferred)", () => {
  it.skip("compares pipeline output to expected.json for every golden case", () => {
    // Intentionally empty until Homework Analysis Engine lands.
  });
});
