"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { BudgetProgress } from "@/actions/budgets";
import { MonthInfo, parseMonthParam } from "@/lib/month-sync";
import { BudgetIntelligenceSnapshot } from "@/components/ai/budget-intelligence-snapshot";
import {
  Flame,
  ArrowRight,
  Sparkles,
  Zap,
} from "lucide-react";

export interface ReminderItem {
  id: number;
  publicId?: string;
  title: string | null;
  recipientName: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  method?: string | null;
  message: string;
  dueDate: Date | string | null;
  reminderDate?: Date | string | null;
  amount: number | null;
  currency?: string;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  status?: string;
  isCompleted?: boolean;
}

interface AIBudgetAndRemindersHubProps {
  budgets: BudgetProgress[];
  reminders?: ReminderItem[];
  monthInfo?: MonthInfo;
}

export function AIBudgetAndRemindersHub({
  budgets,
  monthInfo: customMonthInfo,
}: AIBudgetAndRemindersHubProps) {
  const router = useRouter();
  const monthInfo = useMemo(() => customMonthInfo || parseMonthParam(), [customMonthInfo]);

  // Master entry point handler to navigate to Budget Planning & Intelligence Center
  const handleOpenBudgetsCenter = () => {
    router.push(`/dashboard/budgets?month=${monthInfo.monthStr}`);
  };

  // Live aggregates across active budgets
  const activeBudgets = useMemo(() => {
    return budgets.filter((b) => b.status !== "archived");
  }, [budgets]);

  const totalAllocated = activeBudgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);

  // Month-synced velocity metrics
  const elapsedDays = monthInfo.elapsedDays;
  const remainingDays = monthInfo.remainingDays;
  const dailySafeSpend = remainingDays > 0 ? Math.max(0, Math.round(totalRemaining / remainingDays)) : 0;
  const dailyAverageSpend = elapsedDays > 0 ? Math.round(totalSpent / elapsedDays) : 0;
  const projectedMonthEndSpend = monthInfo.isPastMonth
    ? totalSpent
    : monthInfo.isFutureMonth
    ? 0
    : Math.round(totalSpent + dailyAverageSpend * remainingDays);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. MASTER ENTRY POINT: COMPACT BUDGET INTELLIGENCE SNAPSHOT */}
      <BudgetIntelligenceSnapshot
        budgets={budgets}
        monthInfo={monthInfo}
      />

      {/* 2. REAL-TIME BUDGET VELOCITY & GUARDRAILS CARD */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-card via-card to-indigo-500/[0.03] shadow-xs hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Flame className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Spending Velocity & Discipline
                  <Badge variant="secondary" className="text-[10px] font-bold py-0 px-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    Live Guardrails
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mathematical pacing to maintain liquidity through month-end
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenBudgetsCenter}
              className="rounded-xl h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1"
            >
              <span>Planner</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>

          {/* Core Velocity Metrics */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Safe Daily Velocity
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                ₹{dailySafeSpend.toLocaleString("en-IN")}<span className="text-xs font-normal text-slate-400">/day</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {monthInfo.isPastMonth
                  ? "Cycle finalized"
                  : `For ${remainingDays} days left in cycle`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Current Daily Burn
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                ₹{dailyAverageSpend.toLocaleString("en-IN")}<span className="text-xs font-normal text-slate-400">/day</span>
              </span>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Over {elapsedDays} days elapsed
              </p>
            </div>
          </div>

          {/* Real-time AI Velocity Insight */}
          <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              Projected month-end outflow: <strong>₹{projectedMonthEndSpend.toLocaleString("en-IN")}</strong>.
              {totalAllocated > 0 && projectedMonthEndSpend <= totalAllocated ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                  You are tracking within your total target limit!
                </span>
              ) : totalAllocated > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1">
                  Adjust discretionary spending to prevent overrun.
                </span>
              ) : (
                <span className="text-slate-400 ml-1">
                  Configure limits in Budget Center to monitor thresholds.
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
