import { redirect } from "next/navigation";
// import { requireAuth } from "@/lib/auth";
// import { getBudgetDashboardSummary } from "@/actions/budgets";
// import { BudgetsDashboardView } from "@/components/budgets/budgets-dashboard-view";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  // Section commented out per user request until future feature expansion
  redirect("/dashboard");
  // await requireAuth();
  // const summary = await getBudgetDashboardSummary();
  // return <BudgetsDashboardView initialMetrics={summary} />;
}
