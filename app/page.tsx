import Link from "next/link";
import { BookOpen, GraduationCap, MessageCircle, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/25">
            <Sparkles className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <h1 className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            StudySignal
          </h1>
          <p className="mt-3 text-pretty text-muted-foreground">
            Practice English with your AI speaking coach
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/practice"
            className={cn(
              buttonVariants({ size: "lg" }),
              "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base shadow-lg shadow-primary/20 transition hover:shadow-primary/30"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            Practice English Speaking
          </Link>

          <Card className="border-border/50 bg-card/30 opacity-70">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Homework Help</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/50 bg-card/30 opacity-70">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Exam Prep</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          MVP preview · mock conversations only
        </p>
      </div>
    </main>
  );
}
