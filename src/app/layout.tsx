import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito, Nunito_Sans } from "next/font/google";
import Script from "next/script";

import { DevUnhandledRejectionLogger } from "@/components/DevUnhandledRejectionLogger";
import { AtmosphereProvider } from "@/design-system/atmosphere/AtmosphereProvider";
import { atmosphereInitScript } from "@/design-system/atmosphere/atmosphereInitScript";
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
  title: "StudySignal",
  description:
    "Students learn. Parents stay informed. Your child learns every day. You know every day.",
};

export const viewport: Viewport = {
  themeColor: "#F6F1E8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      data-atmosphere="warm-paper"
      data-theme="warm-paper"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} ${nunitoSans.variable} font-sans`}
        style={{ fontFamily: "var(--font-ss-sans), system-ui, sans-serif" }}
      >
        <Script
          id="ss-atmosphere-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: atmosphereInitScript }}
        />
        {process.env.NODE_ENV === "development" ? (
          <DevUnhandledRejectionLogger />
        ) : null}
        <AtmosphereProvider>{children}</AtmosphereProvider>
      </body>
    </html>
  );
}
