/**
 * Development-only demo auth.
 * Production auth (authClient API + Supabase path) stays intact — this module
 * short-circuits only when `isDemoAuthEnabled()` is true.
 */

import type { AuthSession } from "@/lib/authClient";
import {
  writeParentSession,
  type ParentSession,
} from "@/lib/parentSession";

/** Canonical demo parent — used by Dashboard / Parent surfaces in DEV. */
export const mockParent = {
  id: "demo-parent",
  name: "王媽媽",
  email: "demo@studysignal.ai",
  isDemo: true as const,
};

const DEMO_STUDENT = {
  id: "demo-student",
  name: "小宇",
  grade: "國小五年級",
} as const;

const DEMO_FAMILY = {
  id: "demo-family",
  name: "王家學習圈",
} as const;

/** True in local Next.js `next dev` — never in production builds. */
export function isDemoAuthEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function getDemoAuthSession(): AuthSession {
  return {
    parent: {
      id: mockParent.id,
      email: mockParent.email,
      displayName: mockParent.name,
      emailVerified: true,
    },
    family: { id: DEMO_FAMILY.id, name: DEMO_FAMILY.name },
    student: {
      id: DEMO_STUDENT.id,
      name: DEMO_STUDENT.name,
      grade: DEMO_STUDENT.grade,
    },
    onboardingStep: "complete",
  };
}

export function getDemoParentSession(): ParentSession {
  return {
    parentName: mockParent.name,
    parentEmail: mockParent.email,
    password: "demo",
    onboardingComplete: true,
    student: {
      name: DEMO_STUDENT.name,
      grade: DEMO_STUDENT.grade,
      subjects: ["英語", "閱讀", "數學"],
      goals: "每天穩定練習，更敢開口",
      dailyMinutes: 35,
    },
    firstPlan: [
      "英文口說（約 8 分鐘）",
      "閱讀（約 10 分鐘）",
      "數學（約 12 分鐘）",
      "複習（約 5 分鐘）",
    ],
  };
}

/** Seed local demo session and return AuthSession for routing. */
export function enterDemoMode(): AuthSession {
  if (typeof window !== "undefined") {
    writeParentSession(getDemoParentSession());
  }
  return getDemoAuthSession();
}

/** Student Home destination in demo mode. */
export const DEMO_DASHBOARD_PATH = "/v1/dashboard";
