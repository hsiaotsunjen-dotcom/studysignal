import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudySignal",
  description:
    "Practice English with your AI speaking coach — elementary through high school",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
