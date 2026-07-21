/**
 * Latency profiler — measurement only. Does not change feature behavior.
 * Console: [LAT] <step> t=+Xs ms Δ=Yms
 */

type LatMark = {
  step: string;
  tAbs: number;
  tRel: number;
  delta: number;
  detail?: Record<string, unknown>;
};

let sessionId = 0;
let t0 = 0;
let last = 0;
let marks: LatMark[] = [];
let active = false;

function now(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

export function latStart(label = "session"): number {
  sessionId += 1;
  t0 = now();
  last = t0;
  marks = [];
  active = true;
  const iso = new Date().toISOString();
  console.log(
    `%c[LAT] ========== START #${sessionId} ${label} @ ${iso} ==========`,
    "color:#0ea5e9;font-weight:bold",
  );
  latMark("0_session_start", { label });
  return sessionId;
}

export function latMark(
  step: string,
  detail?: Record<string, unknown>,
): void {
  if (!active) {
    // Auto-start if a late mark arrives without session (still measurable).
    latStart("auto");
  }
  const tAbs = now();
  const tRel = tAbs - t0;
  const delta = tAbs - last;
  last = tAbs;
  const entry: LatMark = { step, tAbs, tRel, delta, detail };
  marks.push(entry);
  const detailStr = detail ? ` ${JSON.stringify(detail)}` : "";
  console.log(
    `[LAT] ${step}  t=+${tRel.toFixed(1)}ms  Δ=${delta.toFixed(1)}ms${detailStr}`,
  );
}

export function latNote(step: string, note: string): void {
  latMark(step, { note });
}

export function latEnd(summaryLabel = "session"): LatMark[] {
  if (!active) return marks;
  latMark("Z_session_end", { summaryLabel });
  active = false;
  const sorted = [...marks].sort((a, b) => b.delta - a.delta);
  console.log(
    `%c[LAT] ========== SUMMARY #${sessionId} ${summaryLabel} ==========`,
    "color:#0ea5e9;font-weight:bold",
  );
  console.table(
    marks.map((m) => ({
      step: m.step,
      "t_ms": Number(m.tRel.toFixed(1)),
      "Δ_ms": Number(m.delta.toFixed(1)),
      detail: m.detail ? JSON.stringify(m.detail) : "",
    })),
  );
  console.log(
    "[LAT] Largest gaps (excluding session_start):",
    sorted
      .filter((m) => m.step !== "0_session_start")
      .slice(0, 8)
      .map((m) => `${m.step}=${m.delta.toFixed(0)}ms`),
  );
  const biggest = sorted.find((m) => m.step !== "0_session_start");
  if (biggest) {
    console.log(
      `%c[LAT] SLOWEST STEP: ${biggest.step} (Δ=${biggest.delta.toFixed(0)}ms)`,
      "color:#ef4444;font-weight:bold",
    );
  }
  return marks;
}

export function latIsActive(): boolean {
  return active;
}
