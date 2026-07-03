/**
 * Homework Schema Mapping Layer — Provider-agnostic normalization.
 *
 * Supported Providers
 * - OpenAI
 * - Gemini
 * - Claude
 * - Future Providers
 *
 * Any new Provider must be mapped to Internal Homework Schema here first.
 * Do not modify Parser for provider-specific behavior.
 *
 * =====================================================
 * Architecture Rule
 *
 * Provider response
 *          ↓
 * Schema Mapping Layer  (this file)
 *          ↓
 * Internal Homework Schema
 *          ↓
 * Parser
 *          ↓
 * UI
 *
 * Parser must never branch on Provider.
 * Parser must only consume Internal Schema.
 * Provider differences belong only in this Mapping Layer.
 * =====================================================
 *
 * Maps any vision/homework provider JSON into the internal shape expected by
 * parseAnalyzeApiData → normalizeHomeworkReport (imageInsights.homeworkReport).
 *
 * Deterministic rules only — no heuristics, no AI.
 */

import {
  countAnswerOverviewEntries,
  extractAnswerOverviewFromFormattedReport,
} from "@/lib/analyzeFeedback";

export type SchemaMappingTraceLog = (
  layer: string,
  payload?: unknown,
) => void;

/** Rule identifiers — all mapping logic must be registered here. */
export const HOMEWORK_SCHEMA_RULES = {
  /** root.formattedReport → imageInsights.homeworkReport.formattedReport */
  RULE_A_ROOT_FORMATTED_REPORT_RELOCATE: "rule_a_root_formatted_report_relocate",
  /** root.answerOverview → imageInsights.homeworkReport.answerOverview */
  RULE_C_ROOT_ANSWER_OVERVIEW_RELOCATE: "rule_c_root_answer_overview_relocate",
  /** Extract ✅ Answer Overview section → homeworkReport.answerOverview (fallback) */
  RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT:
    "rule_b_answer_overview_from_formatted_extract_fallback",
} as const;

export type HomeworkSchemaRuleId =
  (typeof HOMEWORK_SCHEMA_RULES)[keyof typeof HOMEWORK_SCHEMA_RULES];

export type SchemaMappingResult = {
  /** Provider response with internal homework nesting applied (same top-level object). */
  normalized: unknown;
  rulesApplied: HomeworkSchemaRuleId[];
};

type RuleTraceStatus = "Applied" | "Not Applied" | "Skipped";

type RuleTraceEntry = {
  rule: "Rule A" | "Rule C" | "Rule B";
  ruleId: HomeworkSchemaRuleId;
  status: RuleTraceStatus;
  applied: boolean;
  reason: string;
};

type InternalHomeworkReportSnapshot = {
  questionCount: string | number;
  answerOverview: string;
  formattedReport: "exists" | "missing";
  keyExplanations: "exists" | "missing";
  pronunciationFocus: "exists" | "missing";
  learningSignal: "exists" | "missing";
};

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasNonEmpty(value: unknown): boolean {
  return trimmedString(value).length > 0;
}

function firstNonEmptyFromObject(
  obj: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const v = trimmedString(obj[key]);
    if (v) return v;
  }
  return "";
}

function ensureImageInsightsHomeworkReport(
  root: Record<string, unknown>,
): Record<string, unknown> {
  let insights = root.imageInsights ?? root.image_insights;
  if (!insights || typeof insights !== "object" || Array.isArray(insights)) {
    insights = {};
    root.imageInsights = insights;
  }
  const container = insights as Record<string, unknown>;
  let hr = container.homeworkReport ?? container.homework_report;
  if (!hr || typeof hr !== "object" || Array.isArray(hr)) {
    hr = {};
    container.homeworkReport = hr;
  }
  return hr as Record<string, unknown>;
}

function readAnswerOverview(hr: Record<string, unknown>): string {
  return firstNonEmptyFromObject(hr, [
    "answerOverview",
    "answer_overview",
    "answers",
  ]);
}

function readFormattedReport(hr: Record<string, unknown>): string {
  return firstNonEmptyFromObject(hr, [
    "formattedReport",
    "formatted_report",
    "reportMarkdown",
  ]);
}

function hasAnswerOverview(hr: Record<string, unknown>): boolean {
  const value = readAnswerOverview(hr);
  return value.length > 0 && value !== "—";
}

function formattedReportHasAnswerOverviewSection(
  formattedReport: string,
): boolean {
  if (!formattedReport) return false;
  return Boolean(
    extractAnswerOverviewFromFormattedReport(formattedReport).trim(),
  );
}

function providerResponseHasHomeworkShape(root: Record<string, unknown>): boolean {
  if (root.imageInsights != null || root.image_insights != null) return true;
  if (hasNonEmpty(root.formattedReport) || hasNonEmpty(root.formatted_report)) {
    return true;
  }
  if (
    hasNonEmpty(root.answerOverview) ||
    hasNonEmpty(root.answer_overview) ||
    hasNonEmpty(root.answers)
  ) {
    return true;
  }
  return false;
}

function fieldExists(
  hr: Record<string, unknown>,
  keys: string[],
): "exists" | "missing" {
  for (const key of keys) {
    const value = hr[key];
    if (Array.isArray(value) && value.length > 0) return "exists";
    if (hasNonEmpty(value)) return "exists";
  }
  return "missing";
}

function buildInternalHomeworkReportSnapshot(
  hr: Record<string, unknown>,
): InternalHomeworkReportSnapshot {
  const questionCountRaw = hr.questionCount ?? hr.question_count ?? hr.questions;
  const questionCount =
    typeof questionCountRaw === "number" && Number.isFinite(questionCountRaw)
      ? questionCountRaw
      : trimmedString(questionCountRaw) || "—";

  const answerOverviewText = readAnswerOverview(hr);
  const answerOverviewEntryCount = countAnswerOverviewEntries(answerOverviewText);
  const answerOverview =
    answerOverviewEntryCount > 0
      ? `${answerOverviewEntryCount} entries`
      : answerOverviewText.length > 0 && answerOverviewText !== "—"
        ? "present (unnumbered)"
        : "missing";

  return {
    questionCount,
    answerOverview,
    formattedReport: readFormattedReport(hr) ? "exists" : "missing",
    keyExplanations: fieldExists(hr, [
      "keyExplanations",
      "key_explanations",
      "explanations",
    ]),
    pronunciationFocus: fieldExists(hr, [
      "pronunciationFocus",
      "pronunciation_focus",
      "pronunciation",
    ]),
    learningSignal: fieldExists(hr, [
      "learningSignal",
      "learning_signal",
      "todayLearned",
    ]),
  };
}

function formatMappingSummaryTrace(entries: RuleTraceEntry[]): string {
  return entries
    .map((entry) => {
      const lines = [
        entry.rule,
        entry.status === "Applied"
          ? "Applied = true"
          : entry.status === "Skipped"
            ? "Skipped"
            : "Not Applied",
        "Reason:",
        entry.reason,
      ];
      return lines.join("\n");
    })
    .join("\n--------------------\n");
}

function formatInternalSnapshotTrace(
  snapshot: InternalHomeworkReportSnapshot,
): string {
  return [
    "Internal HomeworkReport",
    `questionCount = ${snapshot.questionCount}`,
    `answerOverview = ${snapshot.answerOverview}`,
    `formattedReport = ${snapshot.formattedReport}`,
    `keyExplanations = ${snapshot.keyExplanations}`,
    `pronunciationFocus = ${snapshot.pronunciationFocus}`,
    `learningSignal = ${snapshot.learningSignal}`,
  ].join("\n");
}

/**
 * Apply deterministic mapping rules to a provider homework vision response.
 * Returns a shallow-cloned root with normalized imageInsights.homeworkReport.
 *
 * Rule order (First Match Wins):
 * 1. Rule A — formal relocate formattedReport; on success, hydrate answerOverview
 *    from the relocated report when needed, then stop before Rule B
 * 2. Rule C — formal relocate answerOverview
 * 3. Rule B — fallback extract only when Rule A and Rule C both did not apply
 */
export function mapProviderResponseToInternalHomeworkSchema(
  providerResponse: unknown,
  options?: {
    provider?: string;
    traceLog?: SchemaMappingTraceLog;
  },
): SchemaMappingResult {
  const trace = options?.traceLog;
  const rulesApplied: HomeworkSchemaRuleId[] = [];
  const ruleTrace: RuleTraceEntry[] = [];

  if (!providerResponse || typeof providerResponse !== "object") {
    trace?.("schema_mapping:skip", {
      reason: "provider_response_not_object",
      provider: options?.provider ?? "unknown",
    });
    return { normalized: providerResponse, rulesApplied };
  }

  const root = {
    ...(providerResponse as Record<string, unknown>),
  };

  if (!providerResponseHasHomeworkShape(root)) {
    trace?.("schema_mapping:skip", {
      reason: "no_homework_shape_detected",
      provider: options?.provider ?? "unknown",
      topLevelKeys: Object.keys(root),
    });
    return { normalized: root, rulesApplied };
  }

  trace?.("schema_mapping:provider_raw", {
    provider: options?.provider ?? "unknown",
    topLevelKeys: Object.keys(root),
    rootFormattedReportPresent: hasNonEmpty(
      root.formattedReport ?? root.formatted_report,
    ),
    rootAnswerOverviewPresent: hasNonEmpty(
      root.answerOverview ?? root.answer_overview ?? root.answers,
    ),
  });

  const hr = ensureImageInsightsHomeworkReport(root);

  const rootFormatted = firstNonEmptyFromObject(root, [
    "formattedReport",
    "formatted_report",
    "reportMarkdown",
  ]);
  const hrFormattedBefore = readFormattedReport(hr);

  let ruleAApplied = false;
  if (rootFormatted && !hrFormattedBefore) {
    hr.formattedReport = rootFormatted;
    ruleAApplied = true;
    rulesApplied.push(
      HOMEWORK_SCHEMA_RULES.RULE_A_ROOT_FORMATTED_REPORT_RELOCATE,
    );
    if (
      !hasAnswerOverview(hr) &&
      formattedReportHasAnswerOverviewSection(rootFormatted)
    ) {
      const extracted = extractAnswerOverviewFromFormattedReport(rootFormatted);
      if (extracted) {
        hr.answerOverview = extracted;
      }
    }
    ruleTrace.push({
      rule: "Rule A",
      ruleId: HOMEWORK_SCHEMA_RULES.RULE_A_ROOT_FORMATTED_REPORT_RELOCATE,
      status: "Applied",
      applied: true,
      reason: "root.formattedReport exists",
    });
  } else if (!rootFormatted) {
    ruleTrace.push({
      rule: "Rule A",
      ruleId: HOMEWORK_SCHEMA_RULES.RULE_A_ROOT_FORMATTED_REPORT_RELOCATE,
      status: "Not Applied",
      applied: false,
      reason: "root.formattedReport missing",
    });
  } else {
    ruleTrace.push({
      rule: "Rule A",
      ruleId: HOMEWORK_SCHEMA_RULES.RULE_A_ROOT_FORMATTED_REPORT_RELOCATE,
      status: "Not Applied",
      applied: false,
      reason: "homeworkReport.formattedReport already exists",
    });
  }

  const rootAnswerOverview = firstNonEmptyFromObject(root, [
    "answerOverview",
    "answer_overview",
    "answers",
  ]);
  const hrAnswerOverviewBefore = readAnswerOverview(hr);

  let ruleCApplied = false;
  if (rootAnswerOverview && !hrAnswerOverviewBefore) {
    hr.answerOverview = rootAnswerOverview;
    ruleCApplied = true;
    rulesApplied.push(
      HOMEWORK_SCHEMA_RULES.RULE_C_ROOT_ANSWER_OVERVIEW_RELOCATE,
    );
    ruleTrace.push({
      rule: "Rule C",
      ruleId: HOMEWORK_SCHEMA_RULES.RULE_C_ROOT_ANSWER_OVERVIEW_RELOCATE,
      status: "Applied",
      applied: true,
      reason: "root.answerOverview exists",
    });
  } else if (!rootAnswerOverview) {
    ruleTrace.push({
      rule: "Rule C",
      ruleId: HOMEWORK_SCHEMA_RULES.RULE_C_ROOT_ANSWER_OVERVIEW_RELOCATE,
      status: "Not Applied",
      applied: false,
      reason: "root.answerOverview missing",
    });
  } else {
    ruleTrace.push({
      rule: "Rule C",
      ruleId: HOMEWORK_SCHEMA_RULES.RULE_C_ROOT_ANSWER_OVERVIEW_RELOCATE,
      status: "Not Applied",
      applied: false,
      reason: "homeworkReport.answerOverview already exists",
    });
  }

  const answerOverviewAfterFormalRules = hasAnswerOverview(hr);
  const formattedAfterRelocate = readFormattedReport(hr);

  if (answerOverviewAfterFormalRules) {
    ruleTrace.push({
      rule: "Rule B",
      ruleId:
        HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
      status: "Skipped",
      applied: false,
      reason: "answerOverview already exists",
    });
  } else if (ruleCApplied) {
    ruleTrace.push({
      rule: "Rule B",
      ruleId:
        HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
      status: "Skipped",
      applied: false,
      reason: "Rule C formal relocate already applied",
    });
  } else if (ruleAApplied) {
    ruleTrace.push({
      rule: "Rule B",
      ruleId:
        HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
      status: "Skipped",
      applied: false,
      reason: "Rule A formal relocate succeeded",
    });
  } else if (!formattedAfterRelocate) {
    ruleTrace.push({
      rule: "Rule B",
      ruleId:
        HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
      status: "Not Applied",
      applied: false,
      reason: "formattedReport missing",
    });
  } else if (!formattedReportHasAnswerOverviewSection(formattedAfterRelocate)) {
    ruleTrace.push({
      rule: "Rule B",
      ruleId:
        HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
      status: "Not Applied",
      applied: false,
      reason: "formattedReport missing Answer Overview section",
    });
  } else if (!ruleAApplied && !ruleCApplied) {
    const extracted = extractAnswerOverviewFromFormattedReport(
      formattedAfterRelocate,
    );
    if (extracted) {
      hr.answerOverview = extracted;
      rulesApplied.push(
        HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
      );
      ruleTrace.push({
        rule: "Rule B",
        ruleId:
          HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
        status: "Applied",
        applied: true,
        reason: "formattedReport contains Answer Overview section",
      });
    } else {
      ruleTrace.push({
        rule: "Rule B",
        ruleId:
          HOMEWORK_SCHEMA_RULES.RULE_B_ANSWER_OVERVIEW_FROM_FORMATTED_EXTRACT,
        status: "Not Applied",
        applied: false,
        reason: "formattedReport Answer Overview section could not be extracted",
      });
    }
  }

  const internalSnapshot = buildInternalHomeworkReportSnapshot(hr);

  trace?.("schema_mapping:summary", {
    provider: options?.provider ?? "unknown",
    rules: ruleTrace,
    summaryText: formatMappingSummaryTrace(ruleTrace),
  });

  trace?.("schema_mapping:internal_snapshot", {
    provider: options?.provider ?? "unknown",
    snapshot: internalSnapshot,
    snapshotText: formatInternalSnapshotTrace(internalSnapshot),
    rulesApplied,
  });

  return { normalized: root, rulesApplied };
}
