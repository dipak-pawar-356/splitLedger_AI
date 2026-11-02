import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { requireAuth } from "@/lib/auth";
import { getBudgetDashboardSummary } from "@/actions/budgets";
import { BudgetsDashboardView } from "@/components/budgets/budgets-dashboard-view";

export const metadata: Metadata = createPageMetadata({
  title: "Monthly Budget Planner & Category Limits | SplitLedger AI",
  description:
    "Set monthly spending limits, monitor category allowances, and receive proactive budget threshold notifications.",
  path: "/dashboard/budgets",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  await requireAuth();
  const summary = await getBudgetDashboardSummary();
  return <BudgetsDashboardView initialMetrics={summary} />;
}
