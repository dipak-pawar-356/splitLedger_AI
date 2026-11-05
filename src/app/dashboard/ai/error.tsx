"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, LayoutDashboard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AIIntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AI Financial Intelligence Route Error:", error);
  }, [error]);

  const handleReset = () => {
    try {
      reset();
    } catch {
      window.location.reload();
    }
  };

  const handleResetCurrentMonth = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("splitledger_selected_month");
        window.location.href = "/dashboard/ai";
      }
    } catch {
      window.location.href = "/dashboard/ai";
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-5">
      <div className="p-3.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-2xl text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm">
        <Sparkles className="h-9 w-9" />
      </div>

      <div className="space-y-2 max-w-md">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          AI Financial Intelligence Synchronization Notice
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          An issue occurred while synthesizing your AI financial models for the requested cycle. All your underlying ledger records, budgets, and transactions remain completely secure.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={handleReset}
          className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload AI Insights</span>
        </Button>

        <Button
          onClick={handleResetCurrentMonth}
          variant="outline"
          className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-5 border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Switch to Current Month</span>
        </Button>

        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="rounded-xl text-xs font-semibold gap-1.5 h-10 px-5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

