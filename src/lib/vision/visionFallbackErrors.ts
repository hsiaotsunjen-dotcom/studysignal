/**
 * Detect transient Vision provider failures that allow fallback to the next provider.
 * Does not change OCR / prompt / schema behavior.
 */

export function isTransientVisionProviderError(err: unknown): boolean {
  if (err == null) return false;

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

  const text = parts.join("\n").toLowerCase();

  if (/\bhttp\s*503\b/.test(text) || /\b503\b/.test(text)) return true;
  if (/\bhttp\s*429\b/.test(text) || /\b429\b/.test(text)) return true;
  if (text.includes("unavailable")) return true;
  if (text.includes("high demand")) return true;
  if (text.includes("resource_exhausted")) return true;
  if (text.includes("rate limit") || text.includes("rate_limit")) return true;
  if (text.includes("timeout") || text.includes("timed out") || text.includes("etimedout")) {
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
