import { requireAuth } from "@/lib/auth";
import { getTripDashboardSummary } from "@/actions/trips";
import { TripsDashboardView } from "@/components/trips/trips-dashboard-view";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  try {
    await requireAuth();
    const summary = await getTripDashboardSummary();
    return <TripsDashboardView initialMetrics={summary} />;
  } catch (error) {
    console.error("Error loading trips page:", error);
    return (
      <div className="p-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-600 font-bold">
          !
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Unable to Load Trips</h2>
          <p className="text-slate-500 text-xs mt-1">Please try refreshing the page or returning to the dashboard.</p>
        </div>
        <Link href="/dashboard">
          <Button size="sm" className="rounded-xl text-xs font-semibold">Return to Dashboard</Button>
        </Link>
      </div>
    );
  }
}
