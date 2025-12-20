import type { Metadata, Viewport } from "next";
import "./globals.css";
import FloatingFeedbackButton from "@/components/ui/FloatingFeedbackButton";

export const metadata: Metadata = {
  title: "NoteKeeper - AI Lecture Notes",
  description: "Record lectures, mark key points, and get AI-generated study notes",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[var(--background)]" suppressHydrationWarning>
        {children}
        <FloatingFeedbackButton />
      </body>
    </html>
  );
}


