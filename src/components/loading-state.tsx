import { Card, CardContent } from "@/components/ui/card";

interface LoadingStateProps {
  type?: "skeleton" | "spinner" | "progress";
  count?: number;
}

export default function LoadingState({ type = "skeleton", count = 3 }: LoadingStateProps) {
  if (type === "skeleton") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "spinner") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "progress") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4 w-64">
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
            </div>
            <p className="text-slate-600 dark:text-slate-400">Loading data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
