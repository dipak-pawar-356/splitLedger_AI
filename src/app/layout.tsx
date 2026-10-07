import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ClerkAuthProvider } from "@/components/providers/clerk-provider";
import { Toaster } from "@/components/ui/sonner";

import { RealtimeProvider } from "@/components/providers/realtime-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SplitLedger AI - Smart Expense Sharing",
  description: "AI-powered expense sharing and personal ledger management",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClerkAuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
            <Toaster />
          </ThemeProvider>
        </ClerkAuthProvider>
      </body>
    </html>
  );
}
