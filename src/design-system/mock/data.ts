export const mockStudent = {
  name: "小宇",
  grade: "國小五年級",
  greeting: "今天也一起慢慢進步吧",
};

export const mockAiHome = {
  headline: "我是你的學習夥伴",
  subcopy: "我會幫你安排今天的練習，陪你把英語學得更穩、更有信心。",
  suggestion: "建議先完成「看圖說句子」，大約 8 分鐘。",
};

export const mockDashboard = {
  todayProgress: 0.45,
  completedGoals: 2,
  totalGoals: 4,
  focusSubject: "英語口說",
  aiTip: "昨天的發音練習很棒。今天可以挑戰更自然的完整句子。",
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
    detail: "口說任務完成率提升",
  },
  {
    id: "m2",
    date: "上週",
    title: "第一次獨立完成聽力小測",
    detail: "答對 5 / 6 題",
  },
  {
    id: "m3",
    date: "兩週前",
    title: "過去式單元啟動",
    detail: "從認句子開始建立安全感",
  },
];

export const mockParent = {
  weekDaysActive: 5,
  goalsCompleted: 11,
  focus: "英語口說與聽力",
  highlights: [
    "主動完成看圖說句子，句子完整度提高",
    "聽力小測穩定在 80% 以上",
  ],
  watchouts: ["文法練習偶有跳過，建議本週補一次短練習"],
  emailOn: true,
  emailFrequency: "每週日晚上",
};
