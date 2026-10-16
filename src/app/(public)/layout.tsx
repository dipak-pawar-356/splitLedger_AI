import type { Metadata } from "next";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";

export const metadata: Metadata = {
  title: "SplitLedger AI — Intelligent Group Expense Ledger",
  description:
    "The cleanest way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.",
  openGraph: {
    title: "SplitLedger AI — Intelligent Group Expense Ledger",
    description:
      "The cleanest way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.",
    type: "website",
    locale: "en_US",
    siteName: "SplitLedger AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitLedger AI — Intelligent Group Expense Ledger",
    description:
      "The cleanest way for roommates, trips, and friends to track expenses, minimize debts, and settle instantly with dynamic UPI.",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
