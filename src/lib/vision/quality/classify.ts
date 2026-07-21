/**
 * AI Quality Platform — answer normalization + failure category classification.
 */

import { detectPossibleLeadingLetterDrop } from "@/lib/vision/eyesProviderLog";
import type { EyesFailureCategory } from "@/lib/vision/quality/constants";
import type { EyesQualityAnswerExpectation } from "@/lib/vision/quality/types";

export function normalizeEyesAnswer(text: string | null | undefined): string {
  if (text == null) return "";
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function answersMatch(
  expected: EyesQualityAnswerExpectation,
  predicted: string | null,
): boolean {
  const want = expected.studentAnswer;
  if (want == null || want.trim() === "") {
    return predicted == null || predicted.trim() === "";
  }
  const pred = normalizeEyesAnswer(predicted);
  const accepted = [want, ...(expected.acceptedAnswers ?? [])].map(
    normalizeEyesAnswer,
  );
  return accepted.includes(pred);
}

export function classifyAnswerMismatch(input: {
  expected: string | null;
  predicted: string | null;
  expectedBlank: boolean;
}): EyesFailureCategory[] {
  const cats: EyesFailureCategory[] = [];
  const exp = input.expected;
  const pred = input.predicted;

  if (input.expectedBlank) {
    if (pred != null && pred.trim() !== "") {
      cats.push("Hallucination");
    }
    return cats.length ? cats : ["Other"];
  }

  if (exp != null && exp.trim() !== "") {
    if (pred == null || pred.trim() === "") {
      cats.push("Answer Missing");
    } else if (normalizeEyesAnswer(pred) !== normalizeEyesAnswer(exp)) {
      cats.push("Wrong Student Answer");
      if (
        detectPossibleLeadingLetterDrop(pred) ||
        (exp.length > 1 &&
          normalizeEyesAnswer(pred) === normalizeEyesAnswer(exp.slice(1)))
      ) {
        cats.push("Truncation");
      }
    }
  }

  return cats.length ? cats : ["Other"];
}
