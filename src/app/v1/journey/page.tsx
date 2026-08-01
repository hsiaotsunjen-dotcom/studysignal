"use client";

import { SsAppShell } from "@/design-system";
import {
  getCurrentJourneyTask,
  mockLearningJourney,
} from "@/design-system/mock/journey";

import { JourneyAbilityEntry } from "./components/JourneyAbilityEntry";
import { JourneyAiCoach } from "./components/JourneyAiCoach";
import { JourneyDailyGoal } from "./components/JourneyDailyGoal";
import { JourneyFadeIn } from "./components/JourneyFadeIn";
import { JourneyHeader } from "./components/JourneyHeader";
import { JourneyQuickStats } from "./components/JourneyQuickStats";
import { JourneyTaskCard } from "./components/JourneyTaskCard";
import { JourneyTimeline } from "./components/JourneyTimeline";

/**
 * PRD-008 — AI Learning Journey (UI only, mock data).
 * No backend / AI / auth connections.
 */
export default function LearningJourneyPage() {
  const data = mockLearningJourney;
  const currentTask = getCurrentJourneyTask(data);

  return (
    <SsAppShell>
      <JourneyFadeIn delayMs={0}>
        <JourneyHeader
          greeting={data.greeting}
          studentName={data.studentName}
          journeyTitle={data.journeyTitle}
          heroSupport={data.heroSupport}
          progressToday={data.progressToday}
        />
      </JourneyFadeIn>

      <JourneyFadeIn delayMs={60}>
        <JourneyTimeline tasks={data.tasks} />
      </JourneyFadeIn>

      <JourneyFadeIn delayMs={120}>
        <JourneyTaskCard task={currentTask} />
      </JourneyFadeIn>

      <JourneyFadeIn delayMs={180}>
        <JourneyAiCoach
          title={data.aiCoach.title}
          message={data.aiCoach.message}
        />
      </JourneyFadeIn>

      <JourneyFadeIn delayMs={240}>
        <JourneyDailyGoal
          title={data.dailyGoal.title}
          current={data.dailyGoal.current}
          target={data.dailyGoal.target}
        />
      </JourneyFadeIn>

      <JourneyFadeIn delayMs={300}>
        <JourneyQuickStats stats={data.stats} />
      </JourneyFadeIn>

      <JourneyFadeIn delayMs={360}>
        <JourneyAbilityEntry
          title={data.abilityMap.title}
          subtitle={data.abilityMap.subtitle}
          href={data.abilityMap.href}
        />
      </JourneyFadeIn>
    </SsAppShell>
  );
}
