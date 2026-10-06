import { requireAuth } from "@/lib/auth";
import { getBudgetDashboardSummary } from "@/actions/budgets";
import { BudgetsDashboardView } from "@/components/budgets/budgets-dashboard-view";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  await requireAuth();
  const summary = await getBudgetDashboardSummary();

  return <BudgetsDashboardView initialMetrics={summary} />;
}
