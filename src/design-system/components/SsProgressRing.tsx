import { progressJourneyShort } from "@/design-system/voice/progressVoice";

export function SsProgressRing({
  value,
  label,
  size = 96,
}: {
  value: number;
  label?: string;
  size?: number;
}) {
  const pct = Math.max(0, Math.min(1, value));
  const voice = progressJourneyShort(pct);
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="inline-flex flex-col items-center gap-2.5">
      <div
        className="relative"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label} · ${voice}` : voice}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--ss-border)"
            strokeWidth={stroke}
            opacity={0.85}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--ss-primary)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center px-2 text-center text-[12px] font-semibold leading-tight tracking-tight text-[var(--ss-fg)]">
          {voice}
        </div>
      </div>
      {label ? (
        <p className="text-center text-[12px] font-medium tracking-wide text-[var(--ss-fg-muted)]">
          {label}
        </p>
      ) : null}
    </div>
  );
}
