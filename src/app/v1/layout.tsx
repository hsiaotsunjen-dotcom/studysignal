import { Nunito, Nunito_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-ss-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-ss-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudySignal V1",
  description: "StudySignal UI prototype — AI Learning Agent",
};

export const viewport: Viewport = {
  themeColor: "#d9cebc",
  width: "device-width",
  initialScale: 1,
};

export default function V1Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${nunito.variable} ${nunitoSans.variable} ss-v1 min-h-dvh antialiased`}
      style={{ fontFamily: "var(--font-ss-sans), system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
