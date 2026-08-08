import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "StudySignal — AI Learning Companion",
  description:
    "StudySignal is a Family Learning Hub. Students learn every day. Parents stay informed every day.",
};

export const viewport: Viewport = {
  themeColor: "#F6F1E8",
  width: "device-width",
  initialScale: 1,
};

/**
 * Segment layout only — AtmosphereProvider lives in the root App Router layout
 * so selection persists across Landing ↔ auth ↔ app routes.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
