import type { Metadata } from "next";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export const metadata: Metadata = {
  title: "SplitLedger AI — Smart Expense Sharing & Personal Finance Platform",
  description:
    "Manage shared expenses, personal finances, trips, budgets, settlements, and financial notes effortlessly with AI-powered insights.",
  openGraph: {
    title: "SplitLedger AI — Smart Expense Sharing & Personal Finance Platform",
    description:
      "Manage shared expenses, personal finances, trips, budgets, settlements, and financial notes effortlessly with AI-powered insights.",
    type: "website",
    locale: "en_US",
    siteName: "SplitLedger AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitLedger AI — Smart Expense Sharing & Personal Finance Platform",
    description:
      "Manage shared expenses, personal finances, trips, budgets, settlements, and financial notes effortlessly with AI-powered insights.",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
