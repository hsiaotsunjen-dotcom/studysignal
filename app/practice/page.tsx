import { Header } from "@/components/Header";
import { LevelCard } from "@/components/LevelCard";
import { LEVELS } from "@/lib/practice";

export default function PracticePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header title="Choose your level" subtitle="StudySignal" backHref="/" />

      <div className="mx-auto w-full max-w-lg flex-1 space-y-3 px-4 py-6 sm:px-6">
        <p className="mb-1 text-pretty text-sm text-muted-foreground">
          Pick the level that matches you. You can change anytime.
        </p>
        {LEVELS.map((level) => (
          <LevelCard key={level.slug} level={level} />
        ))}
      </div>
    </div>
  );
}
