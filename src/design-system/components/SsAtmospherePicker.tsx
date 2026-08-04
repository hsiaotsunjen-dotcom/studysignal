"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";

import { useAtmosphere } from "@/design-system/atmosphere/AtmosphereProvider";
import {
  ATMOSPHERE_IDS,
  ATMOSPHERES,
  type AtmosphereId,
} from "@/design-system/atmosphere/atmospheres";
import { isDemoAuthEnabled } from "@/lib/demoAuth";

/**
 * Atmosphere trigger — top-right INSIDE `.ss-phone-frame` (max-w-lg).
 * Never `fixed` to the browser viewport.
 */
export function SsAtmospherePicker({ className = "" }: { className?: string }) {
  const { atmosphere, meta, setAtmosphere, ready } = useAtmosphere();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const demoMode = isDemoAuthEnabled();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function select(id: AtmosphereId) {
    setAtmosphere(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[60]"
        style={{
          // Sit below DEMO MODE chip when visible
          paddingTop: demoMode
            ? "max(2.35rem, calc(env(safe-area-inset-top) + 1.6rem))"
            : "max(0.75rem, env(safe-area-inset-top))",
        }}
      >
        <div className="pointer-events-none flex justify-end px-[1.35rem] sm:px-8">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`學習氛圍：${meta.label}。開啟選擇器`}
            title="學習氛圍"
            className={`ss-atmosphere-trigger pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ss-border)]/70 px-3.5 text-[12px] font-semibold tracking-wide text-[var(--ss-fg)] shadow-[var(--ss-shadow-soft)] backdrop-blur-md transition duration-300 ease-out active:scale-[0.98] ${
              ready ? "opacity-100" : "opacity-0"
            } ${className}`}
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--ss-card) 92%, transparent)",
            }}
          >
            <span
              aria-hidden
              className="flex h-4 w-4 items-center justify-center text-[13px] leading-none"
            >
              {meta.emoji}
            </span>
            <span className="hidden leading-none sm:inline">{meta.label}</span>
            <Palette
              className="h-3.5 w-3.5 text-[var(--ss-fg-hint)] sm:hidden"
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {open ? (
        <div className="absolute inset-0 z-[70] flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="關閉"
            className="ss-atmosphere-backdrop absolute inset-0 bg-[rgba(30,26,22,0.28)] backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="ss-atmosphere-sheet relative z-10 w-full outline-none sm:px-4"
          >
            <div
              className="ss-card mx-0 rounded-t-[var(--ss-radius-xl)] border border-[var(--ss-border)]/50 shadow-[var(--ss-shadow-card)] sm:rounded-[var(--ss-radius-xl)]"
              style={{
                paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
              }}
            >
              <div className="flex justify-center pt-3 sm:hidden" aria-hidden>
                <span className="h-1 w-10 rounded-full bg-[var(--ss-border)]" />
              </div>

              <div className="px-5 pb-2 pt-4 sm:px-6 sm:pt-6">
                <p
                  id={titleId}
                  className="ss-display text-[1.2rem] font-semibold text-[var(--ss-fg)]"
                >
                  學習氛圍
                </p>
                <p className="mt-1.5 text-[13px] text-[var(--ss-fg-muted)]">
                  選擇今天的學習感覺
                </p>
                <p className="mt-2 text-[13px] text-[var(--ss-fg-hint)]">
                  {meta.voiceLine}
                </p>
              </div>

              <ul
                className="flex flex-col gap-1.5 px-3 pb-3 sm:px-4"
                role="listbox"
                aria-label="學習氛圍選項"
              >
                {ATMOSPHERE_IDS.map((id) => {
                  const option = ATMOSPHERES[id];
                  const selected = id === atmosphere;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => select(id)}
                        className={`flex w-full items-center gap-3.5 rounded-[var(--ss-radius-lg)] px-3.5 py-3.5 text-left transition duration-200 ease-out active:scale-[0.99] ${
                          selected
                            ? "bg-[var(--ss-primary-soft)]"
                            : "hover:bg-[var(--ss-bg-elevated)]"
                        }`}
                      >
                        <span
                          className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ss-radius-md)] border border-[var(--ss-border)]/50 text-lg shadow-[var(--ss-shadow-soft)]"
                          style={{ backgroundColor: option.preview }}
                          aria-hidden
                        >
                          <span className="relative z-10 drop-shadow-sm">
                            {option.emoji}
                          </span>
                          <span
                            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-tl-[6px]"
                            style={{ backgroundColor: option.accent }}
                          />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold tracking-tight text-[var(--ss-fg)]">
                              {option.label}
                            </span>
                            <span className="text-[11px] font-medium tracking-wide text-[var(--ss-fg-hint)]">
                              {option.nameEn}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[13px] text-[var(--ss-fg-muted)]">
                            {option.description}
                          </span>
                        </span>

                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                            selected
                              ? "border-[var(--ss-primary)] bg-[var(--ss-primary)] text-[var(--ss-on-primary)]"
                              : "border-[var(--ss-border)] bg-transparent text-transparent"
                          }`}
                          aria-hidden
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
