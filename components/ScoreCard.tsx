import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ScoreCardProps = {
  label: string;
  score: number;
  max: number;
};

export function ScoreCard({ label, score, max }: ScoreCardProps) {
  const percent = Math.round((score / max) * 100);

  return (
    <Card
      className={cn(
        "border-border/50 bg-card/80 shadow-md transition-shadow hover:shadow-lg"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums text-primary">
            {score}/{max}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {percent}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400/90 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
