"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { BudgetProgress } from "@/actions/budgets";
import { MonthInfo } from "@/lib/month-sync";
import {
  Target,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingDown,
  Scale,
} from "lucide-react";

interface BudgetIntelligenceSnapshotProps {
  budgets: BudgetProgress[];
  monthInfo: MonthInfo;
  className?: string;
}

export function BudgetIntelligenceSnapshot({
  budgets,
  monthInfo,
  className = "",
}: BudgetIntelligenceSnapshotProps) {
  const router = useRouter();

  // Active budgets for the selected month
  const activeBudgets = useMemo(() => {
    return budgets.filter((b) => b.status !== "archived");
  }, [budgets]);

  const currentBudget = activeBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const actualSpending = activeBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const remainingBudget = Math.max(0, currentBudget - actualSpending);
  const budgetUtilization = currentBudget > 0 ? Math.round((actualSpending / currentBudget) * 100) : 0;

  // Forecasting for selected month
  const dailyBurn = monthInfo.elapsedDays > 0 ? Math.round(actualSpending / monthInfo.elapsedDays) : 0;
  const projectedMonthEndSpending =
    monthInfo.isPastMonth
      ? actualSpending
      : monthInfo.isFutureMonth
      ? 0
      : Math.round(actualSpending + dailyBurn * monthInfo.remainingDays);

  const isOverBudget = actualSpending > currentBudget && currentBudget > 0;
  const isApproachingLimit = budgetUtilization >= 80 && !isOverBudget;
  const isProjectedOver = projectedMonthEndSpending > currentBudget && currentBudget > 0;

  // Spending Status
  let spendingStatus: "On Track" | "Approaching Limit" | "Over Budget" | "No Budget Set" = "On Track";
  let statusBadgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  let statusIcon = CheckCircle2;

  if (currentBudget === 0) {
    spendingStatus = "No Budget Set";
    statusBadgeStyle = "bg-slate-800 text-slate-400 border-slate-700";
    statusIcon = Calendar;
  } else if (isOverBudget) {
    spendingStatus = "Over Budget";
    statusBadgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    statusIcon = AlertTriangle;
  } else if (isApproachingLimit || isProjectedOver) {
    spendingStatus = "Approaching Limit";
    statusBadgeStyle = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    statusIcon = AlertTriangle;
  }

  const StatusIcon = statusIcon;

  const handleOpenBudgetsCenter = () => {
    router.push(`/dashboard/budgets?month=${monthInfo.monthStr}`);
  };

  return (
    <Card
      className={`rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-emerald-950/20 shadow-lg hover:border-emerald-500/40 transition-all duration-200 group relative overflow-hidden backdrop-blur-md ${className}`}
    >
      {/* Top subtle glow highlight line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header row: Title, Selected Month, Status Badge, Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100">Budget Intelligence Snapshot</h3>
                <span className="font-mono text-xs text-primary font-bold px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
                  {monthInfo.label}
                </span>
                <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 ${statusBadgeStyle}`}>
                  <StatusIcon className="h-3 w-3" />
                  <span>{spendingStatus}</span>
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                AI spending analytics for {monthInfo.label} • {monthInfo.isCurrentMonth ? `${monthInfo.remainingDays} days remaining` : monthInfo.isPastMonth ? "Finalized period" : "Upcoming period"}
              </p>
            </div>
          </div>

          {/* Primary Action Button: Open Budget Center */}
          <Button
            size="sm"
            onClick={handleOpenBudgetsCenter}
            className="rounded-xl text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3 shadow-xs shrink-0 self-start sm:self-auto group/btn transition-transform hover:translate-x-0.5"
            aria-label={`Open Budget Center for ${monthInfo.label}`}
          >
            <span>Open Budget Center</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Button>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Current Budget */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Current Budget
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-indigo-400 tracking-tight mt-0.5">
              {formatCurrency(currentBudget)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {activeBudgets.length} active target{activeBudgets.length === 1 ? "" : "s"}
            </span>
          </div>

          {/* 2. Actual Spending */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-rose-500/20 hover:border-rose-500/40 transition-colors">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Actual Spending
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-rose-400 tracking-tight mt-0.5">
              {formatCurrency(actualSpending)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Approved debits only
            </span>
          </div>

          {/* 3. Remaining Budget */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Remaining Budget
            </span>
            <div className={`text-base sm:text-lg font-black font-mono tracking-tight mt-0.5 ${isOverBudget ? "text-rose-400" : "text-emerald-400"}`}>
              {formatCurrency(remainingBudget)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {100 - Math.min(100, budgetUtilization)}% available
            </span>
          </div>

          {/* 4. Projected Month-End Spending */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
              Projected Month-End
            </span>
            <div className="text-base sm:text-lg font-black font-mono text-cyan-400 tracking-tight mt-0.5">
              {formatCurrency(projectedMonthEndSpending)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {monthInfo.isCurrentMonth ? `Pacing ${formatCurrency(dailyBurn)}/d` : "Completed period"}
            </span>
          </div>
        </div>

        {/* Progress Bar & Utilization */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span>Budget Utilization:</span>
              <strong className="text-slate-200 font-mono font-bold">{budgetUtilization}%</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              {currentBudget > 0
                ? `${formatCurrency(actualSpending)} of ${formatCurrency(currentBudget)} cap`
                : "No ceiling established"}
            </span>
          </div>

          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isOverBudget
                  ? "bg-rose-500"
                  : isApproachingLimit
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, budgetUtilization)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

