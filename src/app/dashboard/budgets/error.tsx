"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BudgetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Budgets Dashboard Route Error:", error);
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-5">
      <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
        <AlertCircle className="h-9 w-9" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Budget Planning Center Sync Issue
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          An issue occurred while rendering your budget intelligence dashboard. All your verified ledger records and transactions are safe.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={handleReset}
          className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-5 shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload Budget View</span>
        </Button>
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-5"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
