import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { DevUnhandledRejectionLogger } from "@/components/DevUnhandledRejectionLogger";
import "@/design-system/tokens.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudySignal",
  description:
    "Students learn. Parents stay informed. Your child learns every day. You know every day.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        {process.env.NODE_ENV === "development" ? (
          <DevUnhandledRejectionLogger />
        ) : null}
        {children}
      </body>
    </html>
  );
}
