import { requireAuth } from "@/lib/auth";
import { getLoanDashboardSummary } from "@/actions/loans";
import { LoansDashboardView } from "@/components/loans/loans-dashboard-view";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  await requireAuth();
  const summary = await getLoanDashboardSummary();

  return <LoansDashboardView initialMetrics={summary} />;
}
