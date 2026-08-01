import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "StudySignal",
  description: "孩子每天學習。你每天都知道。",
};

export const viewport: Viewport = {
  themeColor: "#F6F1E8",
  width: "device-width",
  initialScale: 1,
};

/**
 * Segment layout only — AtmosphereProvider lives in the root App Router layout
 * so selection persists across every /v1 route and marketing pages.
 */
export default function V1Layout({ children }: { children: React.ReactNode }) {
  return children;
}
