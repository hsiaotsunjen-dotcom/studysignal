/**
 * Homework Vision (Eyes) public exports.
 * Brain should import from here, not from concrete providers directly
 * (except when wiring DI at the API boundary).
 *
 * Future rule: every Brain feature consumes StudentAnswerObject / HomeworkVisionResult.
 * No new module may read homework images for understanding unless it is an Eyes provider.
 */

export type {
  HomeworkVisionAnalyzeInput,
  HomeworkVisionAssignment,
  HomeworkVisionImageInput,
  HomeworkVisionModelPayload,
  HomeworkVisionPhotoQuality,
  HomeworkVisionProviderMeta,
  HomeworkVisionQuestion,
  HomeworkVisionQuestionStatus,
  HomeworkVisionResult,
} from "@/lib/vision/types";
export { HOMEWORK_VISION_SCHEMA_VERSION } from "@/lib/vision/types";

export type {
  VisionCallMeta,
  VisionProvider,
  VisionProviderId,
  VisionProviderInfo,
  VisionProviderRawResult,
  VisionProviderWithCallMeta,
  VisionProviderWithUsage,
  VisionTokenUsage,
} from "@/lib/vision/VisionProvider";
export { getVisionCallMeta, getVisionTokenUsage } from "@/lib/vision/VisionProvider";

export {
  GeminiVisionProvider,
  GEMINI_VISION_MODEL,
  GEMINI_VISION_PROVIDER,
} from "@/lib/vision/GeminiVisionProvider";

export {
  OpenAIVisionProvider,
  OPENAI_VISION_MODEL,
  OPENAI_VISION_PROVIDER,
} from "@/lib/vision/OpenAIVisionProvider";

export {
  PriorityVisionProvider,
  createHomeworkVisionProviderFromEnv,
  createVisionProviderById,
  parseVisionProviderPriority,
  DEFAULT_VISION_PROVIDER_PRIORITY,
  DEFAULT_PROVIDER_MAX_ATTEMPTS,
} from "@/lib/vision/PriorityVisionProvider";

export { isTransientVisionProviderError } from "@/lib/vision/visionFallbackErrors";

export {
  HomeworkVisionSchemaError,
  HomeworkVisionService,
  HOMEWORK_VISION_MOCK_PAYLOAD,
  HOMEWORK_VISION_USE_MOCK,
  isHomeworkVisionUseMock,
  setHomeworkVisionUseMock,
} from "@/lib/vision/HomeworkVisionService";

export { parseHomeworkVisionModelPayload } from "@/lib/vision/homeworkVisionSchema";

export {
  detectPossibleLeadingLetterDrop,
  logEyesProviderDevSummary,
  summarizeEyesProviderResult,
} from "@/lib/vision/eyesProviderLog";

export {
  compareEyesProviders,
  diffEyesAnswers,
  logEyesAbCompareDev,
  type EyesAbCompareResult,
  type EyesAbAnswerDiff,
} from "@/lib/vision/eyesAbCompare";

export * from "@/lib/vision/quality";
