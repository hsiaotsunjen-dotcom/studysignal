import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LevelConfig } from "@/lib/practice";

type LevelCardProps = {
  level: LevelConfig;
};

export function LevelCard({ level }: LevelCardProps) {
  return (
    <Link
      href={`/practice/${level.slug}`}
      className="group block active:scale-[0.99]"
    >
      <Card
        className={cn(
          "border-border/60 bg-card/70 transition-all duration-200",
          "hover:border-primary/30 hover:bg-card hover:shadow-md hover:shadow-black/20"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-4">
          <div className="space-y-1.5 pr-2">
            <CardTitle className="text-lg transition-colors group-hover:text-primary">
              {level.title}
            </CardTitle>
            <CardDescription className="text-pretty leading-relaxed">
              {level.description}
            </CardDescription>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary/15">
            <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
        </CardHeader>
      </Card>
    </Link>
  );
}
