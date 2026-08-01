import { SsBottomTab } from "@/design-system/components/SsBottomTab";
import type { ReactNode } from "react";

/**
 * Page shell inside the root phone frame (max-w-lg).
 * Do not add another max-w-lg or AtmosphereProvider here.
 */
export function SsAppShell({
  children,
  showTab = true,
}: {
  children: ReactNode;
  showTab?: boolean;
}) {
  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <main
        className={`ss-page-enter flex-1 px-[1.35rem] pt-[3.75rem] sm:px-8 ${
          showTab ? "pb-[7.5rem]" : "pb-[var(--ss-space-12)]"
        }`}
      >
        {children}
      </main>
      {showTab ? <SsBottomTab /> : null}
    </div>
  );
}
