export type SchoolLevel = "elementary" | "junior-high" | "high-school";

export type PracticeMode =
  | "daily-conversation"
  | "picture-talk"
  | "topic-discussion"
  | "read-aloud"
  | "exam-speaking"
  | "opinion-response";

export type ScreenType = "chat" | "picture" | "read-aloud" | "score";

export type LevelConfig = {
  slug: SchoolLevel;
  title: string;
  description: string;
};

export type ModeConfig = {
  slug: PracticeMode;
  title: string;
  description: string;
  screen: ScreenType;
  starterMessage: string;
};

export const LEVELS: LevelConfig[] = [
  {
    slug: "elementary",
    title: "Elementary",
    description: "Build confidence and start speaking",
  },
  {
    slug: "junior-high",
    title: "Junior High",
    description: "Improve speaking and sentence building",
  },
  {
    slug: "high-school",
    title: "High School",
    description: "Exam practice and advanced speaking",
  },
];

export const MODES_BY_LEVEL: Record<SchoolLevel, ModeConfig[]> = {
  elementary: [
    {
      slug: "daily-conversation",
      title: "Daily Conversation",
      description: "Talk about your day in simple English",
      screen: "chat",
      starterMessage: "Hi! What did you do today?",
    },
    {
      slug: "picture-talk",
      title: "Picture Talk",
      description: "Describe a photo and build vocabulary",
      screen: "picture",
      starterMessage: "Tell me what you see.",
    },
  ],
  "junior-high": [
    {
      slug: "topic-discussion",
      title: "Topic Discussion",
      description: "Share opinions on school-life topics",
      screen: "chat",
      starterMessage: "What do you think about school uniforms?",
    },
    {
      slug: "read-aloud",
      title: "Read Aloud",
      description: "Practice pronunciation with short passages",
      screen: "read-aloud",
      starterMessage: "",
    },
  ],
  "high-school": [
    {
      slug: "exam-speaking",
      title: "Exam Speaking",
      description: "Timed prompts like real speaking tests",
      screen: "chat",
      starterMessage:
        "Describe a challenge you faced and how you overcame it.",
    },
    {
      slug: "opinion-response",
      title: "Opinion Response",
      description: "Build arguments with clear reasons",
      screen: "chat",
      starterMessage: "Do you think AI should be used in schools?",
    },
  ],
};

export const READ_ALOUD_PASSAGE =
  "Tom went to the park with his friends last Sunday.";

export const MOCK_SCORES = [
  { label: "Pronunciation", score: 8, max: 10 },
  { label: "Fluency", score: 7, max: 10 },
  { label: "Grammar", score: 8, max: 10 },
  { label: "Vocabulary", score: 6, max: 10 },
  { label: "Coherence", score: 7, max: 10 },
] as const;

export function isSchoolLevel(value: string): value is SchoolLevel {
  return value === "elementary" || value === "junior-high" || value === "high-school";
}

export function getLevel(slug: string): LevelConfig | undefined {
  return LEVELS.find((l) => l.slug === slug);
}

export function getMode(level: SchoolLevel, modeSlug: string): ModeConfig | undefined {
  return MODES_BY_LEVEL[level].find((m) => m.slug === modeSlug);
}

export function getLevelLabel(slug: SchoolLevel): string {
  return getLevel(slug)?.title ?? slug;
}
