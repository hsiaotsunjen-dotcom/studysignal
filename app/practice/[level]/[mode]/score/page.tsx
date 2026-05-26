import Link from "next/link";
import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { Header } from "@/components/Header";
import { ScoreCard } from "@/components/ScoreCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMode,
  isSchoolLevel,
  MOCK_SCORES,
  type SchoolLevel,
} from "@/lib/practice";

type PageProps = {
  params: Promise<{ level: string; mode: string }>;
};

export default async function ScorePage({ params }: PageProps) {
  const { level: levelSlug, mode: modeSlug } = await params;

  if (!isSchoolLevel(levelSlug) || levelSlug !== "high-school") {
    notFound();
  }

  const mode = getMode(levelSlug as SchoolLevel, modeSlug);
  if (!mode) {
    notFound();
  }

  const total = MOCK_SCORES.reduce((sum, s) => sum + s.score, 0);
  const maxTotal = MOCK_SCORES.reduce((sum, s) => sum + s.max, 0);
  const average = Math.round((total / maxTotal) * 100);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header
        title="Speaking score"
        subtitle={mode.title}
        backHref={`/practice/${levelSlug}/${modeSlug}`}
      />

      <div className="mx-auto w-full max-w-lg flex-1 space-y-5 px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-secondary/30 p-6 text-center shadow-lg shadow-black/15">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overall band
            </p>
            <p className="mt-1 bg-gradient-to-br from-primary to-emerald-300 bg-clip-text text-5xl font-bold tabular-nums text-transparent">
              {average}%
            </p>
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              Mock rubric for MVP — keep practicing to improve each skill.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Rubric breakdown
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MOCK_SCORES.map((item) => (
              <ScoreCard
                key={item.label}
                label={item.label}
                score={item.score}
                max={item.max}
              />
            ))}
          </div>
        </div>

        <Link
          href={`/practice/${levelSlug}/${modeSlug}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "flex h-12 w-full items-center justify-center rounded-xl text-base font-semibold shadow-lg shadow-primary/15"
          )}
        >
          Try Again
        </Link>
      </div>
    </div>
  );
}
