/**
 * StudySignal Study Atmospheres — emotional learning environments.
 * Components consume CSS variables only. Add new atmospheres here + a
 * matching `[data-atmosphere="…"]` block in tokens.css — no component changes.
 */

export const ATMOSPHERE_STORAGE_KEY = "studysignal.atmosphere";
/** Legacy key — read once for migration from Theme → Atmosphere */
export const LEGACY_THEME_STORAGE_KEY = "studysignal.theme";

export const ATMOSPHERE_IDS = [
  "warm-paper",
  "night-study",
  "forest-focus",
  "ocean-calm",
] as const;

export type AtmosphereId = (typeof ATMOSPHERE_IDS)[number];

export type AtmosphereVoiceMood =
  | "hope"
  | "quiet"
  | "concentration"
  | "relaxation";

export type AtmosphereMeta = {
  id: AtmosphereId;
  /** Short UI name (Traditional Chinese) */
  label: string;
  /** English product name */
  nameEn: string;
  emoji: string;
  /** One-line emotional cue for the picker */
  description: string;
  /** Brand Voice Rule 9 — writing mood */
  voiceMood: AtmosphereVoiceMood;
  /** Companion whisper matching this atmosphere */
  voiceLine: string;
  /** Swatch / browser theme-color */
  preview: string;
  /** Secondary preview chip (accent) */
  accent: string;
  themeColor: string;
  colorScheme: "light" | "dark";
};

export const ATMOSPHERES: Record<AtmosphereId, AtmosphereMeta> = {
  "warm-paper": {
    id: "warm-paper",
    label: "暖紙模式",
    nameEn: "Warm Paper",
    emoji: "☀️",
    description: "希望 · 晨光筆記本",
    voiceMood: "hope",
    voiceLine: "今天會是溫暖的一步。我們一起開始。",
    preview: "#F6F1E8",
    accent: "#4D7BF3",
    themeColor: "#F6F1E8",
    colorScheme: "light",
  },
  "night-study": {
    id: "night-study",
    label: "夜間學習",
    nameEn: "Night Study",
    emoji: "🌙",
    description: "安靜 · 桌燈夜讀",
    voiceMood: "quiet",
    voiceLine: "安靜就好。我們慢慢來，不必急。",
    preview: "#181715",
    accent: "#E8B86A",
    themeColor: "#181715",
    colorScheme: "dark",
  },
  "forest-focus": {
    id: "forest-focus",
    label: "森林專注",
    nameEn: "Forest Focus",
    emoji: "🌲",
    description: "深度專注 · 林間清新",
    voiceMood: "concentration",
    voiceLine: "深呼吸。我們一起專心，一步一步。",
    preview: "#EEF5EE",
    accent: "#5A8F5A",
    themeColor: "#EEF5EE",
    colorScheme: "light",
  },
  "ocean-calm": {
    id: "ocean-calm",
    label: "海洋靜心",
    nameEn: "Ocean Calm",
    emoji: "🌊",
    description: "放鬆 · 海風呼吸",
    voiceMood: "relaxation",
    voiceLine: "放鬆一點。我們輕輕往前就好。",
    preview: "#EDF7FA",
    accent: "#4D8FD8",
    themeColor: "#EDF7FA",
    colorScheme: "light",
  },
};

export const DEFAULT_ATMOSPHERE: AtmosphereId = "warm-paper";

export function isAtmosphereId(value: unknown): value is AtmosphereId {
  return (
    typeof value === "string" &&
    (ATMOSPHERE_IDS as readonly string[]).includes(value)
  );
}

export function readStoredAtmosphere(): AtmosphereId {
  if (typeof window === "undefined") return DEFAULT_ATMOSPHERE;
  try {
    const next = window.localStorage.getItem(ATMOSPHERE_STORAGE_KEY);
    if (isAtmosphereId(next)) return next;
    const legacy = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (isAtmosphereId(legacy)) return legacy;
    return DEFAULT_ATMOSPHERE;
  } catch {
    return DEFAULT_ATMOSPHERE;
  }
}

export function storeAtmosphere(atmosphere: AtmosphereId): void {
  try {
    window.localStorage.setItem(ATMOSPHERE_STORAGE_KEY, atmosphere);
  } catch {
    // ignore quota / private mode
  }
}

/** Apply atmosphere to document + all StudySignal roots (no flash when called early). */
export function applyAtmosphereToDom(atmosphere: AtmosphereId): void {
  if (typeof document === "undefined") return;
  const meta = ATMOSPHERES[atmosphere];
  document.documentElement.setAttribute("data-atmosphere", atmosphere);
  // Keep data-theme mirrored for any residual selectors during migration
  document.documentElement.setAttribute("data-theme", atmosphere);
  document.documentElement.style.colorScheme = meta.colorScheme;
  document.querySelectorAll(".ss-v1").forEach((node) => {
    node.setAttribute("data-atmosphere", atmosphere);
    node.setAttribute("data-theme", atmosphere);
  });
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", meta.themeColor);
  }
}
