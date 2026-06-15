"use client";

import type { ReactNode } from "react";
import MicIcon from "lucide-react/dist/esm/icons/mic.js";
import TrendingUpIcon from "lucide-react/dist/esm/icons/trending-up.js";
import WrenchIcon from "lucide-react/dist/esm/icons/wrench.js";

export type MainTab = "talk" | "signals" | "tools";

const NAV_ITEMS: {
  id: MainTab;
  label: string;
  description: string;
  icon: typeof MicIcon;
}[] = [
  {
    id: "talk",
    label: "Talk",
    description: "AI conversation and voice practice",
    icon: MicIcon,
  },
  {
    id: "signals",
    label: "Signals",
    description: "Learning signals and progress",
    icon: TrendingUpIcon,
  },
  {
    id: "tools",
    label: "Tools",
    description: "OCR and analyzers",
    icon: WrenchIcon,
  },
];

export function StudySignalAppShell({
  activeTab,
  onTabChange,
  talk,
  signals,
  tools,
}: {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  talk: ReactNode;
  signals: ReactNode;
  tools: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-surface">
      <div
        className={
          activeTab === "talk"
            ? "pb-[calc(5.25rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
        }
      >
        {activeTab === "talk" ? talk : null}
        {activeTab === "signals" ? signals : null}
        {activeTab === "tools" ? tools : null}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-surface-raised/95 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl ring-1 ring-white/[0.04]"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 transition-colors touch-manipulation active:scale-[0.98] ${
                  isActive
                    ? "bg-violet-500/15 text-violet-100 ring-1 ring-violet-500/25"
                    : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-violet-500/20 text-violet-200"
                      : "bg-transparent text-zinc-500"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                </span>
                <span
                  className={`max-w-[5.5rem] truncate text-[11px] font-semibold leading-tight ${
                    isActive ? "text-violet-100" : "text-zinc-500"
                  }`}
                >
                  {item.label}
                </span>
                <span className="sr-only">{item.description}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
