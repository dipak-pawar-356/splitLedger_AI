import type { Metadata } from "next";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { PublicFooter } from "@/components/layout/public-footer";
import { createPageMetadata } from "@/lib/seo/config";
import { JsonLd, createHowToSplitExpensesSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = createPageMetadata({
  title: "SplitLedger AI – Smart Expense Tracker & Group Expense Manager",
  description:
    "SplitLedger AI is an intelligent financial management platform that helps individuals and groups manage expenses, settlements, receivables, payables, notes, analytics, reports, AI-assisted transaction management, and financial insights securely in real time.",
  path: "/",
  keywords: [
    "Expense Tracker",
    "Expense Manager",
    "Personal Finance Tracker",
    "Budget Planner",
    "Budget Management",
    "Expense Split App",
    "Split Bills",
    "Group Expense Tracker",
    "Shared Expenses",
    "Trip Expense Tracker",
    "Travel Budget Planner",
    "Expense Analytics",
    "Financial Reports",
    "AI Finance Assistant",
    "Money Manager",
    "Daily Expense Tracker",
    "Expense Notes",
    "Cash Flow Tracker",
    "Settlement Tracker",
    "Income & Expense Manager",
    "UPI Expense Tracker",
    "India Expense Tracker",
  ],
});

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased selection:bg-primary/20 selection:text-primary">
      <JsonLd data={createHowToSplitExpensesSchema()} />
      <PublicNavbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
