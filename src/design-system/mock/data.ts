export const mockStudent = {
  name: "小宇",
  grade: "國小五年級",
  greeting: "今天也一起慢慢進步吧",
};

export const mockAiHome = {
  headline: "我是你的學習夥伴",
  subcopy: "我會陪你完成今天的練習，爸媽晚上也會知道你今天學了什麼。",
  suggestion: "建議先完成「看圖說句子」，大約 8 分鐘。",
};

export type PlanDifficulty = "輕鬆" | "適中" | "挑戰";
export type PlanTaskStatus = "todo" | "doing" | "done";

/** Student Home — companion mood, not a task manager */
export const mockStudentHome = {
  greeting: "早安",
  streakDays: 5,
  todayMinutesPlanned: 35,
  /** Hero — journal opening, not a dashboard */
  planReadyCopy: "今天的學習，\n我已經替你準備好了。",
  heroSupport: "完成今天，\n就是今天最大的進步。",
  companionLine: "慢慢來就好。我一直在。",
  /** Today’s journey first — not percentages */
  todayPath: [
    { emoji: "🎤", title: "英文口說", detail: "8分鐘" },
    { emoji: "📖", title: "閱讀", detail: "10分鐘" },
    { emoji: "🧮", title: "數學", detail: "12分鐘" },
    { emoji: "🌱", title: "複習", detail: "5分鐘" },
  ],
  tasks: [
    {
      id: "t1",
      title: "英文口說",
      detail: "8分鐘",
      difficulty: "適中" as PlanDifficulty,
      status: "todo" as PlanTaskStatus,
    },
    {
      id: "t2",
      title: "閱讀",
      detail: "10分鐘",
      difficulty: "適中" as PlanDifficulty,
      status: "todo" as PlanTaskStatus,
    },
    {
      id: "t3",
      title: "數學",
      detail: "12分鐘",
      difficulty: "挑戰" as PlanDifficulty,
      status: "todo" as PlanTaskStatus,
    },
    {
      id: "t4",
      title: "複習",
      detail: "5分鐘",
      difficulty: "輕鬆" as PlanDifficulty,
      status: "todo" as PlanTaskStatus,
    },
  ],
  yesterday: {
    subjects: ["英文口說", "閱讀"],
    minutes: 28,
    encouragement: "昨天進步很多，今天我們再往前一步。",
  },
  todaySignal: "昨天進步很多，今天我們再往前一步。",
  todaySignals: [
    "昨天進步很多，今天我們再往前一步。",
    "今天先完成閱讀，之後再挑戰口說吧。",
  ],
  tomorrowPreview: ["英文對話", "閱讀", "溫和複習"],
  successMoment: {
    title: "太棒了！",
    body: "今天的旅程完成了。\n好好休息，\n明天我們再一起努力。",
  },
};

/** @deprecated Prefer mockStudentHome — kept for goals page */
export const mockDashboard = {
  todayProgress: 0.45,
  completedGoals: 2,
  totalGoals: 4,
  focusSubject: "英語口說",
  aiTip: "昨天進步很多，今天我們再往前一步。",
};

export type GoalStatus = "todo" | "doing" | "done";

export const mockGoals: Array<{
  id: string;
  title: string;
  detail: string;
  minutes: number;
  status: GoalStatus;
}> = [
  {
    id: "g1",
    title: "看圖說句子",
    detail: "用 3 句英文描述一張圖片",
    minutes: 8,
    status: "done",
  },
  {
    id: "g2",
    title: "複習過去式",
    detail: "完成 6 題短練習",
    minutes: 10,
    status: "doing",
  },
  {
    id: "g3",
    title: "作業拍照檢查",
    detail: "拍下今日英語作業，AI 幫你看進度",
    minutes: 5,
    status: "todo",
  },
  {
    id: "g4",
    title: "聽力小測驗",
    detail: "聽一段短對話並回答問題",
    minutes: 7,
    status: "todo",
  },
];

export const mockFlowSteps = [
  { id: "s1", label: "暖身", done: true },
  { id: "s2", label: "練習", done: false, current: true },
  { id: "s3", label: "回饋", done: false },
];

export const mockFlowChat = [
  {
    role: "ai" as const,
    text: "看這張圖：公園裡有一個小男孩在放風箏。你可以用英文說一句完整的話嗎？",
  },
  {
    role: "student" as const,
    text: "The boy is flying a kite in the park.",
  },
  {
    role: "ai" as const,
    text: "很好！句子清楚。接下來試試加上時間：今天下午……",
  },
];

/**
 * Daily Learning Session — teacher-beside-you, not a chat.
 * Driven by today's plan from Student Home.
 */
export type SessionPhase =
  | "welcome"
  | "goal"
  | "step"
  | "encourage"
  | "struggle"
  | "celebrate"
  | "signals"
  | "parent";

export const mockDailySession = {
  focus: "英語口說",
  fromPlan: "今天的學習計畫 · 英語口說",
  goalSentence: "今天我們一起把一句英文說得更清楚、更完整。",
  welcomeLine: "歡迎回來。今天的練習，我已經替你準備好了。",
  steps: [
    {
      id: "step1",
      prompt: "先看這張畫面：公園裡，一個小男孩正在放風箏。",
      guide: "用英文說出一句完整的話。慢慢來就好。",
      hint: "可以從 The boy… 開始。",
      successEncourage: "很好。句子清楚，我聽得懂。",
      simplifyPrompt: "沒關係。我們先說更短的：The boy flies a kite.",
      sampleResponse: "The boy is flying a kite in the park.",
    },
    {
      id: "step2",
      prompt: "同一畫面，再試一次。",
      guide: "這次在句子裡加上時間：今天下午。",
      hint: "可以想想 this afternoon…",
      successEncourage: "太棒了。你把時間加進去了，聽起來更自然。",
      simplifyPrompt: "我們一起組：This afternoon, the boy is flying a kite.",
      sampleResponse: "This afternoon, the boy is flying a kite in the park.",
    },
  ],
  celebrateLine:
    "太棒了！今天的旅程完成了。好好休息，明天我們再一起努力。",
  signals: [
    "今天比剛開始更自然了。這就是進步。",
    "剛剛遇到一點難的時候，你願意慢慢重來——很好的嘗試。",
  ],
  parentSummary: {
    happened: "今天一起完成了英文口說練習，說出含時間的完整句子。",
    improved: "今天的專注力很好，句子也比昨天更完整。",
    attention: "接下來可以多練習把想法慢慢組成較長句。",
    next: "明天我們先做一小段對話，再輕輕複習今天的句型。",
  },
};

export const mockAbilities = [
  { id: "a1", label: "口說流暢", value: 0.72 },
  { id: "a2", label: "聽力理解", value: 0.64 },
  { id: "a3", label: "文法基礎", value: 0.58 },
  { id: "a4", label: "詞彙量", value: 0.61 },
  { id: "a5", label: "閱讀理解", value: 0.55 },
];

export const mockGrowth = [
  {
    id: "m1",
    date: "本週",
    title: "連續練習 4 天",
    detail: "口說比上週更自然了",
  },
  {
    id: "m2",
    date: "上週",
    title: "第一次獨立完成聽力小測",
    detail: "大部分題目都穩穩完成了",
  },
  {
    id: "m3",
    date: "兩週前",
    title: "過去式單元啟動",
    detail: "從認句子開始，一步一步建立安全感",
  },
];

/** Hero / notebook daily report — what parents buy for */
export const mockHeroReport = {
  title: "今日學習日記",
  studentName: "小宇",
  completed: [
    { label: "英語口說", detail: "15 分鐘" },
    { label: "數學", detail: "12 題" },
    { label: "單字", detail: "34 個" },
  ],
  observations: [
    "今天的口說比昨天更自然了。",
    "接下來可以多練習分數，我們一起慢慢來。",
  ],
  tomorrow: [
    { subject: "英語", detail: "10 分鐘" },
    { subject: "數學複習", detail: "" },
  ],
};

/** Parent dashboard — flagship peace-of-mind surface */
export const mockParent = {
  todayStudyMinutes: 28,
  subjectsCompleted: ["英語口說", "數學", "單字"],
  streakDays: 5,
  weekDaysActive: 5,
  weekMinutes: 142,
  weekSessionsCompleted: 11,
  goalsCompleted: 11,
  focus: "英語口說與聽力",
  subjectProgress: [
    { subject: "英語", progress: 0.72, note: "口說穩定進步" },
    { subject: "數學", progress: 0.54, note: "分數單元進行中" },
    { subject: "單字", progress: 0.68, note: "本週新增 34 字" },
  ],
  strengths: ["口說句子比以前更完整", "願意主動再試一次"],
  weaknesses: ["分數還可以再多一點練習", "長句時可以慢慢想再開口"],
  aiObservations: [
    "今天的專注力很好。",
    "看圖說句子已經能穩穩說出完整句；接下來可以試著加上時間與地點。",
  ],
  recommendedNextStep:
    "我建議明天我們先輕輕複習分數約 10 分鐘，再一起做一小段口說。",
  tomorrowRecommendations: [
    "分數短練習 10 分鐘",
    "口說：用昨天學的單字描述日常",
  ],
  recentEmails: [
    { id: "e1", date: "今天", preview: "口說 15 分 · 數學 12 題 · 單字 34" },
    { id: "e2", date: "昨天", preview: "聽力小測 · 作業檢查完成" },
    { id: "e3", date: "週二", preview: "連續第 3 天完成口說練習" },
  ],
  monthlyGrowth: [
    { label: "本月一起學習", value: "18 天" },
    { label: "累積學習時光", value: "6.4 小時" },
    { label: "最明顯進步", value: "口說更完整了" },
  ],
  highlights: [
    "主動完成看圖說句子，句子比以前更完整",
    "聽力小測越來越穩了",
  ],
  watchouts: ["文法練習這週可以再補一小段，我們一起慢慢來"],
  emailOn: true,
  emailFrequency: "每日晚上",
};

/** Premium daily email — Apple Notes tone */
export const mockDailyEmail = {
  subject: "今日學習 · 小宇",
  studentName: "小宇",
  dateLabel: "今天晚上",
  completedLearning: [
    { label: "英語口說", detail: "15 分鐘" },
    { label: "數學", detail: "12 題" },
    { label: "單字", detail: "34 個" },
  ],
  speakingPractice: "完成 1 次口說練習，說出 3 句完整英文",
  homework: "英語作業已檢查，引導完成 2 處訂正",
  mistakesCorrected: 2,
  vocabularyLearned: ["kite", "park", "afternoon"],
  studyDurationMinutes: 28,
  observations: [
    "今天的口說比昨天更自然了。",
    "接下來可以多練習分數，我們一起慢慢來。",
  ],
  tomorrowPlan: [
    { subject: "英語", detail: "10 分鐘" },
    { subject: "數學複習", detail: "分數短練習" },
  ],
  closing: "你的孩子今天真的有學習。",
};
