import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo/config";

export const metadata: Metadata = createPageMetadata({
  title: "Debt & Loan Tracker | SplitLedger AI",
  description:
    "Track informal loans, interest calculations, EMI payment schedules, and settlement history.",
  path: "/dashboard/loans",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  // Section commented out per user request until future feature expansion
  redirect("/dashboard");
  // await requireAuth();
  // const summary = await getLoanDashboardSummary();
  // return <LoansDashboardView initialMetrics={summary} />;
}
