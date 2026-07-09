import assert from "node:assert/strict";

import {
  buildComposerAnalyzeRequest,
  buildHomeworkAnalyzeRequest,
  buildVisionUserContent,
  parseAnalyzeApiRequest,
  resolveHasStudentCorpusForParser,
} from "../src/lib/analyzeApiRequest";
import {
  isParsedAnalyzeFeedbackResponse,
  parseAnalyzeApiData,
  resolveAnalysisCapabilities,
} from "../src/lib/analyzeFeedback";

const IMG = [{ mimeType: "image/jpeg", dataBase64: "abc123" }];
const DICTATION = "I very like this movie and go to school yesterday.";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  console.log("PASS:", name);
  passed++;
}

test("1a image-only ignores dictation composer text", () => {
  const req = buildHomeworkAnalyzeRequest({
    images: IMG,
    composerText: DICTATION,
    composerTextSource: "dictation",
  });
  assert.equal(req.submissionKind, "homework_image");
  assert.equal(req.homeworkQuestion, undefined);
  assert.equal(req.speechTranscript, undefined);
});

test("1b image-only parser uses image-only capabilities", () => {
  const mockLlm = {
    imageInsights: {
      ocrText: "1. fill blank",
      visualSummaryZh: "worksheet",
      homeworkReport: {
        homeworkType: "worksheet",
        questionCount: 1,
        imageQuality: "Good",
        answerOverview: "1. test",
        formattedReport: "report",
        keyExplanations: [],
        pronunciationFocus: [],
        learningSignal: [],
      },
    },
    grammar: {
      score: 80,
      strengths: ["bad"],
      whyNot100: ["should not show"],
      improvementExamples: [],
    },
  };
  const parsed = parseAnalyzeApiData(mockLlm, false, undefined, {
    hasStudentCorpus: resolveHasStudentCorpusForParser("homework_image"),
  });
  assert.ok(parsed?.imageInsights);
  const caps =
    parsed.analysisCapabilities ?? resolveAnalysisCapabilities(parsed);
  assert.equal(caps.grammar, false);
  assert.equal(caps.vocabulary, false);
  assert.equal(caps.fluency, false);
  assert.equal(caps.pronunciation, false);
  assert.equal(caps.imageAnalysis, true);
  assert.equal(caps.learningSummary, true);
});

test("1c vision prompt has no transcript for image-only", () => {
  const parts = buildVisionUserContent("", IMG);
  const text = parts.find((p) => p.type === "text")?.text ?? "";
  assert.ok(!text.includes(DICTATION));
  assert.ok(!text.includes("Student typed message"));
});

test("2a typed question becomes homeworkQuestion only", () => {
  const q = "Why is Question 6 incorrect?";
  const req = buildHomeworkAnalyzeRequest({
    images: IMG,
    composerText: q,
    composerTextSource: "typed",
  });
  assert.equal(req.submissionKind, "homework_image_with_question");
  assert.equal(req.homeworkQuestion, q);
});

test("2b vision prompt includes homework question", () => {
  const q = "Why is Question 6 incorrect?";
  const parts = buildVisionUserContent(q, IMG);
  const text = parts.find((p) => p.type === "text")?.text ?? "";
  assert.ok(text.includes(q));
  assert.ok(text.includes("homework question"));
});

test("2c homework with question still image-only parser caps", () => {
  assert.equal(
    resolveHasStudentCorpusForParser("homework_image_with_question"),
    false,
  );
});

test("3a dictation without images -> speech_transcript", () => {
  const req = buildComposerAnalyzeRequest({
    composerText: DICTATION,
    composerTextSource: "dictation",
    hasImages: false,
  });
  assert.equal(req?.submissionKind, "speech_transcript");
  assert.equal(req?.includePronunciation, true);
  assert.equal(req?.speechTranscript, DICTATION);
});

test("3b speech server parse accepts speech_transcript payload", () => {
  const parsed = parseAnalyzeApiRequest({
    submissionKind: "speech_transcript",
    includePronunciation: true,
    speechTranscript: DICTATION,
  });
  assert.ok(parsed);
  assert.equal(parsed!.submissionKind, "speech_transcript");
  assert.equal(parsed!.requireSpeechPronunciation, true);
  assert.equal(parsed!.hasStudentCorpus, true);
});

test("4a Talk -> Homework -> Talk -> Homework switch", () => {
  const afterTalk = buildHomeworkAnalyzeRequest({
    images: IMG,
    composerText: DICTATION,
    composerTextSource: "dictation",
  });
  assert.equal(afterTalk.submissionKind, "homework_image");
  const backToTalk = buildComposerAnalyzeRequest({
    composerText: DICTATION,
    composerTextSource: "dictation",
    hasImages: false,
  });
  assert.equal(backToTalk?.submissionKind, "speech_transcript");
  const homeworkAgain = buildHomeworkAnalyzeRequest({
    images: IMG,
    composerText: DICTATION,
    composerTextSource: "dictation",
  });
  assert.equal(homeworkAgain.submissionKind, "homework_image");
});

test("4b legacy text+images coerced to homework_image without text", () => {
  const parsed = parseAnalyzeApiRequest({
    text: DICTATION,
    includePronunciation: false,
    images: IMG,
  });
  assert.ok(parsed);
  assert.equal(parsed!.submissionKind, "homework_image");
  assert.equal(parsed!.homeworkQuestion, "");
  assert.equal(parsed!.speechTranscript, "");
  assert.equal(parsed!.hasStudentCorpus, false);
});

test("4c server rejects homework_image with speechTranscript", () => {
  const parsed = parseAnalyzeApiRequest({
    submissionKind: "homework_image",
    includePronunciation: false,
    images: IMG,
    speechTranscript: DICTATION,
  });
  assert.equal(parsed, null);
});

test("4d attached images never use learning review corpus", () => {
  const req = buildComposerAnalyzeRequest({
    composerText: "",
    composerTextSource: "empty",
    hasImages: true,
    images: IMG,
    learningReviewCorpus:
      "The following contains up to 15 recent student lines from an English tutoring conversation",
  });
  assert.equal(req?.submissionKind, "homework_image");
  assert.equal(req?.learningReviewCorpus, undefined);
});

test("7a server-parsed homework body keeps imageInsights on re-parse", () => {
  const serverBody = {
    grammar: {
      score: 0,
      strengths: [],
      whyNot100: [],
      improvementExamples: [],
    },
    vocabulary: {
      score: 0,
      strengths: [],
      whyNot100: [],
      improvementExamples: [],
    },
    fluency: {
      score: 0,
      strengths: [],
      whyNot100: [],
      improvementExamples: [],
    },
    pronunciationFocus: [],
    tutorComment: {
      whatWentWell: "",
      biggestImprovementOpportunity: "",
      whatToTryNextTime: "",
    },
    imageInsights: {
      ocrText: "1. test",
      visualSummaryZh: "worksheet",
      homeworkReport: {
        homeworkType: "ws",
        questionCount: 1,
        imageQuality: "Good",
        answerOverview: "1. a",
        keyExplanations: [],
        pronunciationFocus: [],
        learningSignal: [],
        formattedReport: "report",
      },
    },
    analysisCapabilities: {
      imageAnalysis: true,
      learningSummary: true,
      grammar: false,
      vocabulary: false,
      fluency: false,
      pronunciation: false,
      tutorModelAnswer: false,
      tutorComment: false,
    },
  };
  assert.ok(isParsedAnalyzeFeedbackResponse(serverBody));
  const reparsed = parseAnalyzeApiData(serverBody, false, undefined, {
    hasStudentCorpus: false,
  });
  assert.ok(reparsed?.imageInsights);
});

test("6 capability rendering hides speech rubric for homework", () => {
  const mockLlm = {
    imageInsights: {
      ocrText: "ocr",
      visualSummaryZh: "zh",
      homeworkReport: {
        homeworkType: "ws",
        questionCount: 1,
        imageQuality: "Good",
        answerOverview: "1. a",
        keyExplanations: [],
        pronunciationFocus: [{ word: "hello", ipa: "/h/", tip: "tip" }],
        learningSignal: ["learned"],
        formattedReport: "report",
      },
    },
    grammar: {
      score: 90,
      strengths: ["x"],
      whyNot100: ["y"],
      improvementExamples: ["z"],
    },
    tutorComment: {
      whatWentWell: "spoken",
      biggestImprovementOpportunity: "a",
      whatToTryNextTime: "b",
    },
  };
  const feedback = parseAnalyzeApiData(mockLlm, false, undefined, {
    hasStudentCorpus: false,
  });
  assert.ok(feedback);
  const caps =
    feedback!.analysisCapabilities ?? resolveAnalysisCapabilities(feedback!);
  assert.equal(caps.imageAnalysis, true);
  assert.equal(caps.grammar, false);
  assert.equal(caps.tutorComment, false);
});

console.log(`\nAll ${passed} regression checks passed.`);
