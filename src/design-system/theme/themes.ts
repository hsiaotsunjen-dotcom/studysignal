/**
 * @deprecated Use `@/design-system/atmosphere/atmospheres` instead.
 * Thin compatibility shim — Theme → Study Atmosphere.
 */

export {
  ATMOSPHERE_STORAGE_KEY as THEME_STORAGE_KEY,
  ATMOSPHERE_IDS as THEME_IDS,
  ATMOSPHERES as THEMES,
  DEFAULT_ATMOSPHERE as DEFAULT_THEME,
  isAtmosphereId as isThemeId,
  readStoredAtmosphere as readStoredTheme,
  storeAtmosphere as storeTheme,
  applyAtmosphereToDom as applyThemeToDom,
  type AtmosphereId as ThemeId,
  type AtmosphereMeta as ThemeMeta,
} from "@/design-system/atmosphere/atmospheres";

import type { AtmosphereId } from "@/design-system/atmosphere/atmospheres";
import { ATMOSPHERE_IDS, DEFAULT_ATMOSPHERE } from "@/design-system/atmosphere/atmospheres";

/** @deprecated Atmosphere picker replaces cycling toggle. */
export function nextThemeId(current: AtmosphereId): AtmosphereId {
  const idx = ATMOSPHERE_IDS.indexOf(current);
  return ATMOSPHERE_IDS[(idx + 1) % ATMOSPHERE_IDS.length] ?? DEFAULT_ATMOSPHERE;
}
