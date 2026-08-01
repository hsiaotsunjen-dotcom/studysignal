"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Route, Users } from "lucide-react";

/** V0 / PRD-008 nav — Journey is the student learning dashboard */
const tabs = [
  { href: "/v1/dashboard", label: "今天", icon: Home },
  { href: "/v1/journey", label: "旅程", icon: Route },
  { href: "/v1/parent", label: "家長", icon: Users },
] as const;

/**
 * Bottom nav — anchored inside the phone frame / AppShell, not the viewport.
 */
export function SsBottomTab() {
  const pathname = usePathname();

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 border-t border-[var(--ss-border)]/60 backdrop-blur-xl"
      style={{
        paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))",
        backgroundColor: "color-mix(in srgb, var(--ss-card) 94%, transparent)",
      }}
      aria-label="主選單"
    >
      <ul className="flex items-stretch justify-between gap-1 px-3 pt-2.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/v1/dashboard"
              ? pathname === "/v1/dashboard" || pathname.startsWith("/v1/goals")
              : href === "/v1/journey"
                ? pathname.startsWith("/v1/journey") ||
                  pathname.startsWith("/v1/flow")
                : href === "/v1/parent"
                  ? pathname.startsWith("/v1/parent")
                  : pathname === href || pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-1 rounded-[var(--ss-radius-md)] px-2 py-2 text-[11px] font-medium leading-none tracking-wide transition duration-200 active:scale-[0.98] ${
                  active
                    ? "text-[var(--ss-primary)]"
                    : "text-[var(--ss-fg-hint)] hover:text-[var(--ss-fg-muted)]"
                }`}
              >
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={active ? 2.1 : 1.7}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
