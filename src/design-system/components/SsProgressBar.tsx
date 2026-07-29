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
  return (
    <div className={`w-full ${className}`}>
      {label ? (
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-[var(--ss-fg-muted)]">{label}</span>
          <span className="font-medium text-[var(--ss-fg)]">
            {Math.round(pct * 100)}%
          </span>
        </div>
      ) : null}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--ss-border)]">
        <div
          className="h-full rounded-full bg-[var(--ss-primary)] transition-[width] duration-500"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
