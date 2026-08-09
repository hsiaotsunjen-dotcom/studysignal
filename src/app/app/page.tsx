import { Suspense } from "react";

import { StudySignalHome } from "@/components/StudySignalHome";

import { AppTalkBackLink } from "./AppTalkBackLink";

/** Live student Talk product (moved from `/` so landing can be parent-first). */
export default function AppTalkPage() {
  return (
    <div className="relative min-h-dvh">
      <Suspense fallback={null}>
        <AppTalkBackLink />
      </Suspense>
      <StudySignalHome layout="talk" />
    </div>
  );
}
