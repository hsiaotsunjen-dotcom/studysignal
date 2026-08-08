/**
 * PRD-101.5 — Parent Insight foundation.
 * Derived from Student Model + Signals + State — never a parallel student model.
 * Boundary: useful / respectful / learning-focused. No chat logs, scores, or raw AI reasoning.
 */

import type {
  LearningSignal,
  LearningStateId,
  Mission,
  OnboardingSession,
  StudentModel,
} from "@/lib/learning/types";

export type ParentInsightStatus = "empty" | "ready";

export type ParentInsight = {
  version: "1.0";
  status: ParentInsightStatus;
  /** Preferred name only — no IDs or private keys surfaced */
  studentDisplayName: string | null;
  subject: string | null;
  /** Learning-focused narrative fields (parent-facing language) */
  progress: string | null;
  strengths: string[];
  currentChallenge: string | null;
  learningStateSummary: string | null;
  growthNote: string | null;
  supportNeeded: string | null;
  suggestedParentAction: string | null;
  /** Opaque freshness — not usage metrics */
  basedOn: "none" | "onboarding" | "learning_session";
  generatedAt: string;
  /** Explicit privacy boundary for clients */
  privacy: {
    includesChatHistory: false;
    includesRawAiReasoning: false;
    includesScores: false;
  };
};

const PRIVACY = {
  includesChatHistory: false,
  includesRawAiReasoning: false,
  includesScores: false,
} as const;

const STATE_PARENT_COPY: Record<LearningStateId, string> = {
  Ready: "孩子目前狀態偏穩定，可以承接稍有挑戰的練習。",
  Orienting: "孩子還在找起點，需要清楚、溫柔的方向感。",
  Building: "孩子正在建立基礎理解，適合小步前進。",
  "Productive Struggle": "孩子正處在有價值的努力中——卡住但還在想，這是好現象。",
  "Unproductive Struggle": "孩子可能卡住太久了，需要先把難度或引導調一下。",
  "Misconception-Led": "孩子的思路可能被某個迷思帶偏，適合一起釐清觀念。",
  Consolidating: "孩子在把已學的內容練穩、內化。",
  Transferring: "孩子開始嘗試把所學用到新情境。",
  Creating: "孩子正用自己的方式重組或表達所學。",
  Overloaded: "孩子可能負載偏高，建議先放慢、縮短一次練習量。",
  "Affect-Blocked": "情緒或壓力可能干擾學習，先照顧安全感再談進度。",
  Independent: "孩子展現較多自主性，家長可以多當旁觀支持者。",
  Disengaged: "投入感偏低，適合從孩子在意的小目標重新接上。",
  Reflecting: "孩子正在回頭看自己的學習，適合問「你學到什麼」。",
  Recovering: "孩子在從挫折或過載中恢復，請給空間與耐心。",
};

export function emptyParentInsight(): ParentInsight {
  return {
    version: "1.0",
    status: "empty",
    studentDisplayName: null,
    subject: null,
    progress: null,
    strengths: [],
    currentChallenge: null,
    learningStateSummary: null,
    growthNote: null,
    supportNeeded: null,
    suggestedParentAction: null,
    basedOn: "none",
    generatedAt: new Date().toISOString(),
    privacy: { ...PRIVACY },
  };
}

function strengthFromSignals(signals: LearningSignal[]): string[] {
  const out: string[] = [];
  const byKind = (k: LearningSignal["kind"]) =>
    signals.filter((s) => s.kind === k);

  if (byKind("goal_clarity").some((s) => s.confidence !== "low")) {
    out.push("能用自己的話說出想學什麼");
  }
  if (
    byKind("explanation_quality").some(
      (s) => s.value === "adequate" || s.value === "rich",
    )
  ) {
    out.push("願意說明自己的想法，而不只給答案");
  }
  if (byKind("persistence").some((s) => s.value === true)) {
    out.push("面對追問時會再試一次");
  }
  if (
    byKind("preferred_interaction_mode").some((s) => s.value === "practice")
  ) {
    out.push("傾向先自己嘗試");
  }
  return out.slice(0, 3);
}

function challengeFromModel(
  model: StudentModel,
  signals: LearningSignal[],
): string {
  const diffSignal = signals.find(
    (s) =>
      s.kind === "confidence" &&
      s.source === "self_report" &&
      (s.value === "hard" || s.value === "unsure"),
  );
  const thin = signals.find(
    (s) => s.kind === "explanation_quality" && s.value === "thin",
  );
  const subject = model.goals.subject;

  if (model.learningState === "Orienting") {
    return `在「${subject}」上還在摸索從哪裡開始，容易覺得方向不清楚。`;
  }
  if (thin) {
    return `說出推理過程時還比較簡短，遇到卡關可能不知道怎麼往下想。`;
  }
  if (diffSignal?.value === "hard") {
    return `孩子自覺「${subject}」偏難，需要把目標拆得更小。`;
  }
  if (model.learningState === "Productive Struggle") {
    return `正在努力突破，過程中可能顯得猶豫——這通常代表正在思考，不是放棄。`;
  }
  return `剛開始建立節奏，還需要更多可觀察的練習來確認卡點。`;
}

function progressFromModel(model: StudentModel, mission: Mission | null): string {
  const name = model.identity.preferredName || "孩子";
  const subject = model.goals.subject;
  if (mission) {
    return `${name}已設定「${subject}」的學習方向，並有了第一個可觀察的學習任務。`;
  }
  return `${name}已開始與 StudySignal 建立學習理解，聚焦在「${subject}」。`;
}

function supportAndAction(
  model: StudentModel,
): { support: string; action: string } {
  const mode = model.learningDna.preferredMode;
  if (model.learningState === "Orienting" || mode === "guide") {
    return {
      support: "需要清楚的起點與少量引導，避免一次丟太多。",
      action:
        "可以請孩子用自己的話說明「今天想先搞定哪一小步」，而不是直接給完整答案。",
    };
  }
  if (mode === "practice") {
    return {
      support: "適合先自己試，家長在旁邊當安全網即可。",
      action:
        "等孩子試過再說：問「你是怎麼判斷的？」比「這題答案是什麼」更有幫助。",
    };
  }
  if (model.learningState === "Productive Struggle") {
    return {
      support: "努力中需要被看見，而不是被急著解圍。",
      action:
        "先肯定「你有在想」，再一起找卡住的那一步；避免立刻接管整題。",
    };
  }
  return {
    support: "需要穩定、可重複的小練習來累積掌握感。",
    action:
      "回家可請孩子重述今天學到的一點；聽他說，比檢查對錯更重要。",
  };
}

/**
 * Safe projection: Student Model → Parent Insight.
 * Never copies diagnostic attempt text, chat, or internal unknown lists as-is.
 */
export function buildParentInsight(input: {
  studentModel: StudentModel | null;
  signals: LearningSignal[];
  mission: Mission | null;
  basedOn?: ParentInsight["basedOn"];
}): ParentInsight {
  const { studentModel, signals, mission } = input;
  if (!studentModel) {
    return emptyParentInsight();
  }

  const { support, action } = supportAndAction(studentModel);
  const strengths = strengthFromSignals(signals);
  if (
    studentModel.confidenceEstimates.goalClarity !== "low" &&
    !strengths.some((s) => s.includes("想學什麼"))
  ) {
    strengths.unshift("學習目標相對清楚");
  }

  return {
    version: "1.0",
    status: "ready",
    studentDisplayName: studentModel.identity.preferredName || null,
    subject: studentModel.goals.subject,
    progress: progressFromModel(studentModel, mission),
    strengths: strengths.slice(0, 3),
    currentChallenge: challengeFromModel(studentModel, signals),
    learningStateSummary: STATE_PARENT_COPY[studentModel.learningState],
    growthNote:
      "這是初步觀察：真正的成長會隨著多次學習累積。目前請把焦點放在「願意嘗試」而不是成績。",
    supportNeeded: support,
    suggestedParentAction: action,
    basedOn: input.basedOn ?? "onboarding",
    generatedAt: new Date().toISOString(),
    privacy: { ...PRIVACY },
  };
}

/** Read path from existing onboarding persistence — no duplicate model. */
export function parentInsightFromOnboardingSession(
  session: OnboardingSession | null,
): ParentInsight {
  if (!session?.studentModel) {
    return emptyParentInsight();
  }
  return buildParentInsight({
    studentModel: session.studentModel,
    signals: session.signals,
    mission: session.mission,
    basedOn: "onboarding",
  });
}

/** Guard for tests / UI — ensure insight payload never embeds chat-like blobs */
export function insightLooksSurveillanceFree(insight: ParentInsight): boolean {
  const blob = JSON.stringify(insight);
  if (insight.privacy.includesChatHistory) return false;
  if (insight.privacy.includesRawAiReasoning) return false;
  if (insight.privacy.includesScores) return false;
  // Heuristic: no typical chat turn markers or score patterns as primary content
  if (/"role"\s*:\s*"(user|assistant|tutor)"/.test(blob)) return false;
  if (/\b\d{1,3}\s*分\b/.test(blob)) return false;
  if (/聊了\s*\d+/.test(blob)) return false;
  return true;
}
