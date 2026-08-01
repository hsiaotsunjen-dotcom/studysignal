export type JourneyTaskStatus = "completed" | "current" | "locked";

export type JourneyTask = {
  id: string;
  title: string;
  emoji: string;
  status: JourneyTaskStatus;
  durationMin: number;
  level: string;
  progress: number; // 0–1
};

export const mockLearningJourney = {
  studentName: "小宇",
  greeting: "早安",
  journeyTitle: "今天的學習，我已經替你準備好了。",
  heroSupport: "完成今天，就是今天最大的進步。",
  progressToday: 0.35,
  tasks: [
    {
      id: "speaking",
      title: "英文口說",
      emoji: "🎤",
      status: "current" as const,
      durationMin: 8,
      level: "溫和",
      progress: 0.2,
    },
    {
      id: "reading",
      title: "閱讀",
      emoji: "📖",
      status: "locked" as const,
      durationMin: 10,
      level: "溫和",
      progress: 0,
    },
    {
      id: "math",
      title: "數學",
      emoji: "🧮",
      status: "locked" as const,
      durationMin: 12,
      level: "專心",
      progress: 0,
    },
    {
      id: "review",
      title: "複習",
      emoji: "🌱",
      status: "locked" as const,
      durationMin: 5,
      level: "輕鬆",
      progress: 0,
    },
  ] satisfies JourneyTask[],
  currentTaskId: "speaking",
  aiCoach: {
    title: "AI 建議",
    message: "我建議我們先一起完成閱讀，之後再挑戰口說。你一定可以的。",
  },
  dailyGoal: {
    title: "今天的小目標",
    current: 18,
    target: 35,
  },
  stats: [
    { id: "accuracy", label: "專心", value: 0.88, icon: "target" as const },
    { id: "focus", label: "平穩", value: 0.91, icon: "focus" as const },
    { id: "speaking", label: "口說", value: 0.76, icon: "mic" as const },
    { id: "reading", label: "閱讀", value: 0.93, icon: "book" as const },
  ],
  abilityMap: {
    title: "看看成長地圖",
    subtitle: "溫柔地認識自己的長處與還能練習的地方。",
    href: "/v1/ability",
  },
};

export function getCurrentJourneyTask(
  data: typeof mockLearningJourney = mockLearningJourney,
): JourneyTask {
  return (
    data.tasks.find((t) => t.id === data.currentTaskId) ??
    data.tasks.find((t) => t.status === "current") ??
    data.tasks[0]
  );
}
