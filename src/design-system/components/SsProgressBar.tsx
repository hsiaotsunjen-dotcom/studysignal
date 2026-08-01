import { progressJourneyPhrase } from "@/design-system/voice/progressVoice";

export function SsProgressBar({
  value,
  label,
  className = "",
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value));
  const voice = progressJourneyPhrase(pct);

  return (
    <div className={`w-full ${className}`}>
      {label ? (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
            {label}
          </span>
          <span className="text-[13px] font-medium tracking-tight text-[var(--ss-fg)]">
            {voice}
          </span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--ss-border)]/70"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label} · ${voice}` : voice}
      >
        <div
          className="h-full rounded-full bg-[var(--ss-primary)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
