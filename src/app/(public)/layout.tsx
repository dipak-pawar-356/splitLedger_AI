import type { Metadata } from "next";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Smart Expense Tracker, Personal Finance & Group Ledger",
  description:
    "SplitLedger AI is an intelligent financial management platform that helps individuals and groups manage expenses, settlements, receivables, payables, notes, analytics, reports, AI-assisted transaction management, and financial insights securely in real time.",
  path: "/",
  keywords: [
    "Expense Tracker",
    "Personal Finance",
    "Group Expense Management",
    "Debt Simplification",
    "UPI Split",
    "AI Financial Assistant",
  ],
});

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
