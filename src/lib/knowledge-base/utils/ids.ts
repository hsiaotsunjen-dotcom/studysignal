/** Stable id helper for seed / imports (not a crypto UUID requirement). */
export function kbId(prefix: string, slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${prefix}_${normalized || "item"}`;
}
