import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  className?: string;
};

export function Header({ title, subtitle, backHref, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl",
        className
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5 sm:px-6">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Go back"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "shrink-0 rounded-xl"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
