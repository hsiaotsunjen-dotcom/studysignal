"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Users } from "lucide-react";

/** V0 demo nav — only the core journey surfaces */
const tabs = [
  { href: "/v1/dashboard", label: "今天", icon: Home },
  { href: "/v1/flow", label: "學習", icon: BookOpen },
  { href: "/v1/parent", label: "家長", icon: Users },
] as const;

export function SsBottomTab() {
  const pathname = usePathname();

  return (
    <nav
      className="ss-bg-elevated fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--ss-border)] backdrop-blur-md"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="主選單"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pt-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/v1/dashboard"
              ? pathname === "/v1/dashboard" || pathname.startsWith("/v1/goals")
              : href === "/v1/parent"
                ? pathname.startsWith("/v1/parent")
                : pathname === href || pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 rounded-[var(--ss-radius-md)] px-1 py-1.5 text-[11px] font-medium transition ${
                  active
                    ? "text-[var(--ss-primary)]"
                    : "text-[var(--ss-fg-muted)] hover:text-[var(--ss-fg)]"
                }`}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
