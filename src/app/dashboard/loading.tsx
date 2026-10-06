import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-4 w-72 rounded-lg skeleton-shimmer" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl skeleton-shimmer" />
          <Skeleton className="h-10 w-32 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24 rounded-md skeleton-shimmer" />
              <Skeleton className="h-8 w-8 rounded-full skeleton-shimmer" />
            </div>
            <Skeleton className="h-8 w-32 rounded-lg skeleton-shimmer" />
            <div className="pt-2 flex justify-between">
              <Skeleton className="h-3 w-20 rounded-md skeleton-shimmer" />
              <Skeleton className="h-3 w-16 rounded-md skeleton-shimmer" />
            </div>
          </Card>
        ))}
      </div>

      {/* Charts / Activity Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40 rounded-lg skeleton-shimmer" />
            <Skeleton className="h-4 w-20 rounded-md skeleton-shimmer" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl skeleton-shimmer" />
        </Card>
        <Card className="border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <Skeleton className="h-5 w-36 rounded-lg skeleton-shimmer" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="flex justify-between items-center">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded-md skeleton-shimmer" />
                  <Skeleton className="h-3 w-20 rounded-md skeleton-shimmer" />
                </div>
                <Skeleton className="h-4 w-16 rounded-md skeleton-shimmer" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
