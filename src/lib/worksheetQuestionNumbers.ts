import type { PhotoQualityCheckResult } from "@/lib/worksheetCapture";

export type QuestionNumberRegexSpec = {
  name: string;
  pattern: string;
  description: string;
};

/** All regex patterns used to extract worksheet question numbers — logged for debug. */
export const QUESTION_NUMBER_REGEX_SPECS: QuestionNumberRegexSpec[] = [
  {
    name: "paren_blank",
    pattern: String.raw`\(\s*(\d{1,3})\s*\)`,
    description: "(9) or ( 13 )",
  },
  {
    name: "open_paren",
    pattern: String.raw`\(\s*(\d{1,3})(?!\d)`,
    description: "(9 without closing paren",
  },
  {
    name: "close_paren_only",
    pattern: String.raw`(?:^|\s)(\d{1,3})\)`,
    description: "9) at line start or after whitespace",
  },
  {
    name: "chinese_question",
    pattern: String.raw`第\s*(\d{1,3})\s*題`,
    description: "第9題",
  },
  {
    name: "numbered_suffix",
    pattern: String.raw`(?:^|[\s(])(\d{1,3})[.)]\s`,
    description: "9. or 9) followed by whitespace",
  },
];

function compileQuestionNumberRegexes(): RegExp[] {
  return QUESTION_NUMBER_REGEX_SPECS.map(
    (spec) => new RegExp(spec.pattern, "gm"),
  );
}

const QUESTION_NUMBER_REGEXES = compileQuestionNumberRegexes();

function addQuestionNumber(nums: Set<number>, raw: string): void {
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n > 0 && n <= 999) nums.add(Math.round(n));
}

/** Extract numbered blanks like (1), (13), 9), 第N題 from text. */
export function extractQuestionNumbersFromText(text: string): number[] {
  const nums = new Set<number>();

  for (const regex of QUESTION_NUMBER_REGEXES) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const captured = match[1];
      if (captured) addQuestionNumber(nums, captured);
    }
  }

  return [...nums].sort((a, b) => a - b);
}

export function debugExtractQuestionNumbersFromText(text: string): {
  questionNumbers: number[];
  matchesByRegex: Record<string, number[]>;
} {
  const nums = new Set<number>();
  const matchesByRegex: Record<string, number[]> = {};

  for (let i = 0; i < QUESTION_NUMBER_REGEX_SPECS.length; i++) {
    const spec = QUESTION_NUMBER_REGEX_SPECS[i]!;
    const regex = QUESTION_NUMBER_REGEXES[i]!;
    regex.lastIndex = 0;
    const found: number[] = [];
    for (const match of text.matchAll(regex)) {
      const captured = match[1];
      if (!captured) continue;
      const n = parseInt(captured, 10);
      if (!Number.isFinite(n) || n <= 0 || n > 999) continue;
      found.push(Math.round(n));
      nums.add(Math.round(n));
    }
    matchesByRegex[spec.name] = [...new Set(found)].sort((a, b) => a - b);
  }

  return {
    questionNumbers: [...nums].sort((a, b) => a - b),
    matchesByRegex,
  };
}

export function uniqueSortedQuestionNumbers(nums: number[]): number[] {
  return [...new Set(nums.filter((n) => Number.isFinite(n) && n > 0))].sort(
    (a, b) => a - b,
  );
}

/** Worksheet total = max(reported total, highest question number seen anywhere). */
export function inferWorksheetQuestionTotal(
  reportedTotal: number,
  ...numberSources: number[][]
): number {
  const all = numberSources.flat().filter((n) => n > 0);
  const maxN = all.length > 0 ? Math.max(...all) : 0;
  return Math.max(reportedTotal, maxN);
}

export function collectQuestionNumbersFromPayload(
  o: Record<string, unknown>,
): number[] {
  const found = new Set<number>();
  const walk = (val: unknown) => {
    if (typeof val === "string") {
      for (const n of extractQuestionNumbersFromText(val)) found.add(n);
    } else if (typeof val === "number" && Number.isFinite(val) && val > 0) {
      found.add(Math.round(val));
    } else if (Array.isArray(val)) {
      for (const item of val) walk(item);
    } else if (val && typeof val === "object") {
      for (const v of Object.values(val)) walk(v);
    }
  };
  walk(o);
  return [...found].sort((a, b) => a - b);
}

export function extractVisionClearlyVisibleNumbers(
  o: Record<string, unknown>,
): number[] {
  if (!Array.isArray(o.questionsClearlyVisible)) return [];
  return o.questionsClearlyVisible
    .map((n) => {
      if (typeof n === "number" && Number.isFinite(n) && n > 0) {
        return Math.round(n);
      }
      if (typeof n === "string") {
        const parsed = parseInt(n.trim(), 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      }
      return 0;
    })
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
}

export function collectQuestionNumbersFromQualityResult(
  q: PhotoQualityCheckResult,
): number[] {
  return uniqueSortedQuestionNumbers([
    ...q.questionsClearlyVisible,
    ...q.questionsWithIssues.map((i) => i.questionNumber),
    ...q.globalIssues.flatMap((g) => g.affectedQuestions ?? []),
    ...(q.additionalPhotoRequest?.targetQuestions ?? []),
  ]);
}

export const OCR_DETECT_TIMEOUT_MS = 10_000;

export type OcrQuestionDetectResult = {
  rawText: string;
  questionNumbers: number[];
  timedOut: boolean;
  error?: string;
};

type TesseractWorker = {
  recognize: (image: Buffer) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
};

async function terminateWorker(worker: TesseractWorker | null): Promise<void> {
  if (!worker) return;
  try {
    await worker.terminate();
  } catch {
    // Best-effort cleanup after timeout or failure.
  }
}

export async function ocrDetectQuestionNumbersDetailed(
  _mimeType: string,
  dataBase64: string,
  options?: { timeoutMs?: number },
): Promise<OcrQuestionDetectResult> {
  const timeoutMs = options?.timeoutMs ?? OCR_DETECT_TIMEOUT_MS;
  let worker: TesseractWorker | null = null;
  let timedOut = false;

  const ocrTask = (async (): Promise<OcrQuestionDetectResult> => {
    try {
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("eng");
      const buffer = Buffer.from(dataBase64, "base64");
      const {
        data: { text },
      } = await worker.recognize(buffer);
      await terminateWorker(worker);
      worker = null;
      const rawText = text ?? "";
      return {
        rawText,
        questionNumbers: rawText.trim()
          ? extractQuestionNumbersFromText(rawText)
          : [],
        timedOut: false,
      };
    } catch (error) {
      await terminateWorker(worker);
      worker = null;
      return {
        rawText: "",
        questionNumbers: [],
        timedOut: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })();

  const timeoutTask = new Promise<OcrQuestionDetectResult>((resolve) => {
    setTimeout(() => {
      timedOut = true;
      void terminateWorker(worker).finally(() =>
        resolve({
          rawText: "",
          questionNumbers: [],
          timedOut: true,
          error: "timeout",
        }),
      );
    }, timeoutMs);
  });

  const result = await Promise.race([ocrTask, timeoutTask]);
  if (timedOut || result.timedOut) {
    console.warn(
      "[photo-quality] OCR timeout — continuing with Vision API result only",
      { timeoutMs },
    );
  }
  return result;
}

export async function ocrDetectQuestionNumbers(
  mimeType: string,
  dataBase64: string,
  options?: { timeoutMs?: number },
): Promise<number[]> {
  const result = await ocrDetectQuestionNumbersDetailed(
    mimeType,
    dataBase64,
    options,
  );
  return result.questionNumbers;
}
