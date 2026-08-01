/**
 * Brand Voice Rule 5 — Progress is a journey.
 * Never surface “73%”. Speak like a companion.
 * Source: docs/BRAND_VOICE.md
 */

/** Longer phrase beside a progress label */
export function progressJourneyPhrase(value: number): string {
  const pct = Math.max(0, Math.min(1, value));
  if (pct >= 0.95) return "今天完成了很多";
  if (pct >= 0.7) return "今天又往前一步";
  if (pct >= 0.4) return "距離今天的小目標很近了";
  if (pct >= 0.15) return "已經開始往前了";
  return "我們一起開始";
}

/** Short center label for rings / compact stats */
export function progressJourneyShort(value: number): string {
  const pct = Math.max(0, Math.min(1, value));
  if (pct >= 0.95) return "完成了";
  if (pct >= 0.7) return "往前了";
  if (pct >= 0.4) return "很接近";
  if (pct >= 0.15) return "開始了";
  return "一起";
}
