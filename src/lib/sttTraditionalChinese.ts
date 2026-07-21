/**
 * Display-only Simplified → Traditional Chinese (Taiwan) for STT transcripts.
 * Whisper stays unchanged; convert once before UI render.
 */

import { Converter } from "opencc-js";
import { normalizeTaiwanUiText } from "@/lib/normalizeTaiwanUiText";

const HAS_HAN = /\p{Script=Han}/u;

/** OpenCC s2tw: Simplified Chinese → Traditional Chinese (Taiwan). */
const s2tw = Converter({ from: "cn", to: "tw" });

/**
 * If the transcript contains Chinese, convert Simplified → Traditional (Taiwan),
 * then apply StudySignal Taiwan UI place-name preferences.
 * English and other non-Chinese text are left unchanged.
 */
export function toTraditionalChineseForDisplay(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (!HAS_HAN.test(trimmed)) return text;
  return normalizeTaiwanUiText(s2tw(text));
}
