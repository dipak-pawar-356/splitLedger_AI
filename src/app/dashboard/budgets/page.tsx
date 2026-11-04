import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo/config";
import { requireAuth } from "@/lib/auth";
import { getBudgetDashboardSummary } from "@/actions/budgets";
import { BudgetsDashboardView } from "@/components/budgets/budgets-dashboard-view";
import { BudgetDashboardMetrics } from "@/lib/types/budgets";

export const metadata: Metadata = createPageMetadata({
  title: "Monthly Budget Planner & Category Limits | SplitLedger AI",
  description:
    "Set monthly spending limits, monitor category allowances, and receive proactive budget threshold notifications.",
  path: "/dashboard/budgets",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function BudgetsPage(props: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const month = searchParams.month;

  try {
    await requireAuth();
    const summary = await getBudgetDashboardSummary(month);
    return <BudgetsDashboardView initialMetrics={summary} initialMonth={month} />;
  } catch (error) {
    console.error("Error loading budgets page:", error);
    const fallbackMetrics: BudgetDashboardMetrics = {
      totalBudgetAllocated: 0,
      totalSpent: 0,
      totalRemaining: 0,
      overallUsagePercent: 0,
      activeSavingsGoalsCount: 0,
      totalSavedAcrossGoals: 0,
      currency: "INR",
      budgets: [],
      savingsGoals: [],
      spendingLimits: [],
      forecast: {
        projectedMonthlySpend: 0,
        exhaustionDate: null,
        remainingDailyBudget: 0,
        averageDailyBurn: 0,
        isOverBudgetRisk: false,
      },
      verifiedIncome: 0,
      verifiedExpenses: 0,
      currentNetSavings: 0,
      expectedSavings: 0,
      savingsRate: 0,
    };
    return <BudgetsDashboardView initialMetrics={fallbackMetrics} initialMonth={month} />;
  }
}
