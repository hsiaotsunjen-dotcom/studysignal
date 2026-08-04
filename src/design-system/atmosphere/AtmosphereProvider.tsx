"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ATMOSPHERES,
  DEFAULT_ATMOSPHERE,
  applyAtmosphereToDom,
  isAtmosphereId,
  readStoredAtmosphere,
  storeAtmosphere,
  type AtmosphereId,
  type AtmosphereMeta,
} from "@/design-system/atmosphere/atmospheres";
import { SsAtmospherePicker } from "@/design-system/components/SsAtmospherePicker";
import { SsDemoModeBadge } from "@/design-system/components/SsDemoModeBadge";

type AtmosphereContextValue = {
  atmosphere: AtmosphereId;
  meta: AtmosphereMeta;
  setAtmosphere: (atmosphere: AtmosphereId) => void;
  atmospheres: typeof ATMOSPHERES;
  ready: boolean;
};

const AtmosphereContext = createContext<AtmosphereContextValue | null>(null);

function readDomAtmosphere(): AtmosphereId | null {
  if (typeof document === "undefined") return null;
  const fromHtml = document.documentElement.getAttribute("data-atmosphere");
  return isAtmosphereId(fromHtml) ? fromHtml : null;
}

/**
 * App-wide Study Atmosphere — mount once at the root layout.
 * Never remount per route (that resets selection).
 */
export function AtmosphereProvider({ children }: { children: ReactNode }) {
  const [atmosphere, setAtmosphereState] =
    useState<AtmosphereId>(DEFAULT_ATMOSPHERE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readDomAtmosphere() ?? readStoredAtmosphere();
    setAtmosphereState(initial);
    storeAtmosphere(initial);
    applyAtmosphereToDom(initial);
    setReady(true);
  }, []);

  const setAtmosphere = useCallback((next: AtmosphereId) => {
    setAtmosphereState(next);
    storeAtmosphere(next);
    applyAtmosphereToDom(next);
  }, []);

  const value = useMemo<AtmosphereContextValue>(
    () => ({
      atmosphere,
      meta: ATMOSPHERES[atmosphere],
      setAtmosphere,
      atmospheres: ATMOSPHERES,
      ready,
    }),
    [atmosphere, setAtmosphere, ready],
  );

  return (
    <AtmosphereContext.Provider value={value}>
      <div className="ss-v1 ss-bg min-h-dvh w-full antialiased">
        {/* Phone / content column — picker is positioned inside this, never the viewport */}
        <div className="ss-phone-frame relative mx-auto min-h-dvh w-full max-w-lg">
          {children}
          <SsDemoModeBadge />
          <SsAtmospherePicker />
        </div>
      </div>
    </AtmosphereContext.Provider>
  );
}

export function useAtmosphere(): AtmosphereContextValue {
  const ctx = useContext(AtmosphereContext);
  if (!ctx) {
    throw new Error("useAtmosphere must be used within AtmosphereProvider");
  }
  return ctx;
}
