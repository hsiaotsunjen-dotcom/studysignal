/**
 * Taiwan consumer-UI localization after OpenCC.
 * OpenCC uses official place forms (臺*); StudySignal prefers common 台*.
 * Whitelist only — not a generic character rewrite.
 */

const TAIWAN_UI_PLACE_NAMES: ReadonlyArray<readonly [string, string]> = [
  ["臺灣", "台灣"],
  ["臺北", "台北"],
  ["臺中", "台中"],
  ["臺南", "台南"],
  ["臺東", "台東"],
];

/**
 * Apply short Taiwan UI display preferences to already-converted Chinese text.
 * English and unrelated text are unchanged.
 */
export function normalizeTaiwanUiText(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [from, to] of TAIWAN_UI_PLACE_NAMES) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
    }
  }
  return out;
}
