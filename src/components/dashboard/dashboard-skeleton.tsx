import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse pb-12">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-56 rounded-xl" />
            <Skeleton className="h-4 w-36 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-12 w-44 rounded-2xl shrink-0" />
      </div>

      {/* 2. Summary Cards Skeleton (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="rounded-2xl p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-3 w-40 rounded-md" />
          </Card>
        ))}
      </div>

      {/* 3. Quick Actions Skeleton (6 Actions) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>

      {/* 6 & 7: Pending Tasks & Insights Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>

      {/* 8. Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-72 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="col-span-1 lg:col-span-3 h-60 rounded-3xl" />
      </div>

      {/* 4 & 5: Recent Transactions & Streamlined Feed Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}
