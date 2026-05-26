import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { ModeCard } from "@/components/ModeCard";
import { getLevel, isSchoolLevel, MODES_BY_LEVEL } from "@/lib/practice";

type PageProps = {
  params: Promise<{ level: string }>;
};

export default async function LevelModesPage({ params }: PageProps) {
  const { level: levelSlug } = await params;

  if (!isSchoolLevel(levelSlug)) {
    notFound();
  }

  const level = getLevel(levelSlug);
  if (!level) notFound();

  const modes = MODES_BY_LEVEL[levelSlug];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        title={level.title}
        subtitle="Pick a practice mode"
        backHref="/practice"
      />

      <div className="mx-auto w-full max-w-lg flex-1 space-y-3 px-4 py-6 sm:px-6">
        <p className="mb-1 text-pretty text-sm text-muted-foreground">
          Each mode is tailored to your level. Tap one to begin.
        </p>
        {modes.map((mode) => (
          <ModeCard key={mode.slug} level={levelSlug} mode={mode} />
        ))}
      </div>
    </div>
  );
}
