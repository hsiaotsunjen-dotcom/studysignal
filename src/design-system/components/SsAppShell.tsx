import { SsBottomTab } from "@/design-system/components/SsBottomTab";
import type { ReactNode } from "react";

export function SsAppShell({
  children,
  showTab = true,
}: {
  children: ReactNode;
  showTab?: boolean;
}) {
  return (
    <div className="ss-v1 ss-bg mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <main
        className={`flex-1 px-[var(--ss-space-4)] pt-[var(--ss-space-6)] sm:px-[var(--ss-space-6)] ${
          showTab ? "pb-28" : "pb-[var(--ss-space-10)]"
        }`}
      >
        {children}
      </main>
      {showTab ? <SsBottomTab /> : null}
    </div>
  );
}
