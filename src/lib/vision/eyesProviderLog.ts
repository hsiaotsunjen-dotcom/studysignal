/**
 * Development-only Eyes provider diagnostics.
 * Never logs in production (NODE_ENV !== "development").
 */

import type { HomeworkVisionResult } from "@/lib/vision/types";

export type EyesAnswerTruncationHint = {
  questionNumber: number;
  studentAnswer: string;
  /** Heuristic: likely missing leading letter on a fill-in blank (e.g. end→nd). */
  possibleLeadingLetterDrop: boolean;
};

export type EyesProviderLogSummary = {
  provider: string;
  model: string;
  latencyMs: number;
  confidence: number;
  questionCount: number;
  answeredCount: number;
  fallbackUsed: boolean;
  retryCount: number;
  providerRetryCount: number;
  answers: Array<{ questionNumber: number; studentAnswer: string; confidence: number }>;
  truncationHints: EyesAnswerTruncationHint[];
};

/**
 * Known / investigation-style truncations and a light heuristic for
 * all-consonant short tails (e.g. "nd") that often lose the first letter.
 */
export function detectPossibleLeadingLetterDrop(answer: string): boolean {
  const t = answer.trim().toLowerCase();
  if (!t) return false;
  if (/^(nd|icture|encil|ook)$/i.test(t)) return true;
  // 2–3 letter all-consonant token is suspicious for English fill-blanks
  if (t.length <= 3 && /^[bcdfghjklmnpqrstvwxyz]+$/i.test(t)) return true;
  return false;
}

export function summarizeEyesProviderResult(
  result: HomeworkVisionResult,
): EyesProviderLogSummary {
  const answers = result.questions
    .filter(
      (q) =>
        q.status === "answered" &&
        typeof q.studentAnswer === "string" &&
        q.studentAnswer.trim().length > 0,
    )
    .map((q) => ({
      questionNumber: q.number,
      studentAnswer: q.studentAnswer!.trim(),
      confidence: q.confidence,
    }));

  const truncationHints: EyesAnswerTruncationHint[] = answers.map((a) => ({
    questionNumber: a.questionNumber,
    studentAnswer: a.studentAnswer,
    possibleLeadingLetterDrop: detectPossibleLeadingLetterDrop(a.studentAnswer),
  }));

  return {
    provider: result.provider.name ?? result.provider.provider,
    model: result.provider.model,
    latencyMs: result.provider.latency ?? 0,
    confidence: result.confidence,
    questionCount: result.questions.length,
    answeredCount: answers.length,
    fallbackUsed: result.provider.fallbackUsed === true,
    retryCount: result.provider.retryCount ?? 0,
    providerRetryCount:
      typeof result.provider.providerRetryCount === "number"
        ? result.provider.providerRetryCount
        : 0,
    answers,
    truncationHints: truncationHints.filter((h) => h.possibleLeadingLetterDrop),
  };
}

/** Dev-only console dump matching the product logging template. */
export function logEyesProviderDevSummary(result: HomeworkVisionResult): void {
  if (process.env.NODE_ENV !== "development") return;
  const s = summarizeEyesProviderResult(result);
  console.log("==================================================");
  console.log("===== Eyes Provider =====");
  console.log("Provider:", s.provider);
  console.log("Model:", s.model);
  console.log("Latency:", `${(s.latencyMs / 1000).toFixed(2)}s`);
  console.log("Confidence:", s.confidence);
  console.log("Questions:", s.questionCount);
  console.log("Answered:", s.answeredCount);
  console.log("Fallback used:", s.fallbackUsed);
  console.log("Provider index (retryCount):", s.retryCount);
  console.log("Intra-provider retries:", s.providerRetryCount);
  console.log("Answers:");
  if (s.answers.length === 0) {
    console.log("  (none)");
  } else {
    for (const a of s.answers) {
      console.log(
        `  Q${a.questionNumber} = ${a.studentAnswer} (confidence=${a.confidence})`,
      );
    }
  }
  console.log(
    "Truncation hints:",
    s.truncationHints.length === 0
      ? "(none)"
      : s.truncationHints
          .map(
            (h) =>
              `Q${h.questionNumber}="${h.studentAnswer}" (possible leading-letter drop)`,
          )
          .join("; "),
  );
  console.log("==================================================");
}
