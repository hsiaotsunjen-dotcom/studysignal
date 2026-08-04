/**
 * Shared DEV guard — onboarding / auth screens redirect to Dashboard
 * instead of enforcing PRD-001 steps. Production path is unchanged.
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  DEMO_DASHBOARD_PATH,
  enterDemoMode,
  isDemoAuthEnabled,
} from "@/lib/demoAuth";

/** Returns true when this screen should skip real auth (caller should return early). */
export function useDemoAuthBypass(): boolean {
  const router = useRouter();
  const demo = isDemoAuthEnabled();

  useEffect(() => {
    if (!demo) return;
    enterDemoMode();
    router.replace(DEMO_DASHBOARD_PATH);
  }, [demo, router]);

  return demo;
}
