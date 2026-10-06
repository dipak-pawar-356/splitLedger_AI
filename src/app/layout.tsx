import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ClerkAuthProvider } from "@/components/providers/clerk-provider";
import { Toaster } from "@/components/ui/sonner";

import { RealtimeProvider } from "@/components/providers/realtime-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SplitLedger AI - Smart Expense Sharing",
  description: "AI-powered expense sharing and personal ledger management",
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
