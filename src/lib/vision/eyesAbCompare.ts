/**
 * Eyes A/B compare — run two providers on the same homework independently.
 * Does NOT change production PriorityVisionProvider selection or Tutor/Signals.
 */

import { HomeworkVisionService } from "@/lib/vision/HomeworkVisionService";
import { createVisionProviderById } from "@/lib/vision/PriorityVisionProvider";
import type { VisionProvider, VisionProviderId } from "@/lib/vision/VisionProvider";
import type {
  HomeworkVisionAnalyzeInput,
  HomeworkVisionResult,
} from "@/lib/vision/types";
import { summarizeEyesProviderResult } from "@/lib/vision/eyesProviderLog";

export type EyesAbAnswerDiff = {
  questionNumber: number;
  a: string | null;
  b: string | null;
};

export type EyesAbCompareResult = {
  providerA: VisionProviderId;
  providerB: VisionProviderId;
  resultA: HomeworkVisionResult;
  resultB: HomeworkVisionResult;
  summaryA: ReturnType<typeof summarizeEyesProviderResult>;
  summaryB: ReturnType<typeof summarizeEyesProviderResult>;
  questionInventoryEqual: boolean;
  answeredCountEqual: boolean;
  answerDiffs: EyesAbAnswerDiff[];
  confidenceDelta: number;
};

function answerMap(result: HomeworkVisionResult): Map<number, string | null> {
  const m = new Map<number, string | null>();
  for (const q of result.questions) {
    m.set(
      q.number,
      typeof q.studentAnswer === "string" ? q.studentAnswer : q.studentAnswer,
    );
  }
  return m;
}

export function diffEyesAnswers(
  a: HomeworkVisionResult,
  b: HomeworkVisionResult,
): EyesAbAnswerDiff[] {
  const mapA = answerMap(a);
  const mapB = answerMap(b);
  const nums = uniqueSorted([...mapA.keys(), ...mapB.keys()]);
  const diffs: EyesAbAnswerDiff[] = [];
  for (const n of nums) {
    const va = mapA.has(n) ? mapA.get(n)! : null;
    const vb = mapB.has(n) ? mapB.get(n)! : null;
    if (va !== vb) {
      diffs.push({ questionNumber: n, a: va, b: vb });
    }
  }
  return diffs;
}

function uniqueSorted(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))]
    .map((n) => Math.round(n))
    .sort((a, b) => a - b);
}

/**
 * Analyze the same images with two providers in isolation (no shared fallback chain).
 * Production traffic must continue to use createHomeworkVisionProviderFromEnv().
 */
export async function compareEyesProviders(
  input: HomeworkVisionAnalyzeInput,
  providerA: VisionProviderId | VisionProvider,
  providerB: VisionProviderId | VisionProvider,
): Promise<EyesAbCompareResult> {
  const a =
    typeof providerA === "string"
      ? createVisionProviderById(providerA)
      : providerA;
  const b =
    typeof providerB === "string"
      ? createVisionProviderById(providerB)
      : providerB;

  const serviceA = new HomeworkVisionService(a);
  const serviceB = new HomeworkVisionService(b);

  const [resultA, resultB] = await Promise.all([
    serviceA.analyze(input),
    serviceB.analyze(input),
  ]);

  const summaryA = summarizeEyesProviderResult(resultA);
  const summaryB = summarizeEyesProviderResult(resultB);
  const idsA = resultA.questions.map((q) => q.number).sort((x, y) => x - y);
  const idsB = resultB.questions.map((q) => q.number).sort((x, y) => x - y);

  const idA =
    typeof providerA === "string" ? providerA : providerA.info.id;
  const idB =
    typeof providerB === "string" ? providerB : providerB.info.id;

  return {
    providerA: idA,
    providerB: idB,
    resultA,
    resultB,
    summaryA,
    summaryB,
    questionInventoryEqual: idsA.join(",") === idsB.join(","),
    answeredCountEqual: summaryA.answeredCount === summaryB.answeredCount,
    answerDiffs: diffEyesAnswers(resultA, resultB),
    confidenceDelta: resultA.confidence - resultB.confidence,
  };
}

/** Dev-only A/B dump. */
export function logEyesAbCompareDev(result: EyesAbCompareResult): void {
  if (process.env.NODE_ENV !== "development") return;
  console.log("==================================================");
  console.log("===== Eyes A/B Compare =====");
  console.log(`A: ${result.providerA} (${result.summaryA.model})`);
  console.log(`B: ${result.providerB} (${result.summaryB.model})`);
  console.log("Question inventory equal:", result.questionInventoryEqual);
  console.log("Answered count equal:", result.answeredCountEqual);
  console.log("Confidence delta (A-B):", result.confidenceDelta);
  console.log(
    "Answer diffs:",
    result.answerDiffs.length === 0
      ? "(none)"
      : JSON.stringify(result.answerDiffs, null, 2),
  );
  console.log("==================================================");
}
