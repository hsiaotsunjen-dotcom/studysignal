/**
 * Transient TTS failures that allow retry / fallback (mirrors visionFallbackErrors).
 */

/** True for attempt wall-clock timeouts (long synthesis) — not immediate glitches. */
export function isTtsAttemptTimeoutError(err: unknown): boolean {
  const text = errorText(err).toLowerCase();
  return (
    text.includes("timed out after") ||
    (text.includes("timed out") && text.includes("priorityttsprovider")) ||
    (text.includes("request timed out") && text.includes("openai"))
  );
}

function errorText(err: unknown): string {
  const parts: string[] = [];
  if (typeof err === "string") parts.push(err);
  if (err instanceof Error) {
    parts.push(err.message);
    parts.push(err.name);
    if ("cause" in err && err.cause != null) {
      parts.push(String(err.cause));
    }
  }
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.status === "number") parts.push(`HTTP ${o.status}`);
    if (typeof o.statusCode === "number") parts.push(`HTTP ${o.statusCode}`);
    if (typeof o.code === "string") parts.push(o.code);
    if (typeof o.message === "string") parts.push(o.message);
  }
  return parts.join("\n");
}

export function isTransientTtsProviderError(err: unknown): boolean {
  if (err == null) return false;

  const text = errorText(err).toLowerCase();

  if (/\bhttp\s*503\b/.test(text) || /\b503\b/.test(text)) return true;
  if (/\bhttp\s*429\b/.test(text) || /\b429\b/.test(text)) return true;
  if (/\bhttp\s*502\b/.test(text) || /\b502\b/.test(text)) return true;
  if (text.includes("unavailable")) return true;
  if (text.includes("high demand")) return true;
  if (text.includes("resource_exhausted")) return true;
  if (text.includes("rate limit") || text.includes("rate_limit")) return true;
  if (
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("etimedout") ||
    text.includes("aborted")
  ) {
    return true;
  }
  if (text.includes("econnreset")) return true;
  if (text.includes("econnrefused")) return true;
  if (text.includes("enotfound")) return true;
  if (text.includes("fetch failed") || text.includes("fetch error")) return true;
  if (text.includes("network error") || text.includes("networkerror")) return true;
  if (text.includes("socket hang up")) return true;

  return false;
}

/**
 * Tutor policy: retry only immediate glitches (429 / connection / network)
 * within a short window. Long synthesis timeouts are NOT retryable.
 */
export const TUTOR_TTS_IMMEDIATE_RETRY_WINDOW_MS = 2_000;

export function isImmediateTutorTtsRetryable(
  err: unknown,
  attemptElapsedMs: number,
): boolean {
  if (attemptElapsedMs > TUTOR_TTS_IMMEDIATE_RETRY_WINDOW_MS) return false;
  if (isTtsAttemptTimeoutError(err)) return false;

  const text = errorText(err).toLowerCase();
  if (/\bhttp\s*429\b/.test(text) || /\b429\b/.test(text)) return true;
  if (text.includes("rate limit") || text.includes("rate_limit")) return true;
  if (text.includes("econnreset")) return true;
  if (text.includes("econnrefused")) return true;
  if (text.includes("socket hang up")) return true;
  if (text.includes("fetch failed") || text.includes("fetch error")) return true;
  if (text.includes("network error") || text.includes("networkerror")) return true;
  // Very fast abort/connection drop — not a full 8s synthesis timeout message.
  if (
    text.includes("network") &&
    !text.includes("timed out after") &&
    attemptElapsedMs <= TUTOR_TTS_IMMEDIATE_RETRY_WINDOW_MS
  ) {
    return true;
  }
  return false;
}

export type TtsRetryPolicy = "default" | "tutor";

export function isTutorTtsPurpose(purpose: string | null | undefined): boolean {
  if (!purpose) return false;
  const p = purpose.trim().toLowerCase();
  return p === "tutor" || p.startsWith("tutor_");
}
