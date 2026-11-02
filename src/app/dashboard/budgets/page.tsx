import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Monthly Budget Planner & Category Limits | SplitLedger AI",
  description:
    "Set monthly spending limits, monitor category allowances, and receive proactive budget threshold notifications.",
  path: "/dashboard/budgets",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  // Section commented out per user request until future feature expansion
  redirect("/dashboard");
  // await requireAuth();
  // const summary = await getBudgetDashboardSummary();
  // return <BudgetsDashboardView initialMetrics={summary} />;
}
