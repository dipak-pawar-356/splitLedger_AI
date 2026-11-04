"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { BudgetProgress } from "@/actions/budgets";
import {
  Target,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Flame,
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
  amount: number | null; // in paise or rupees
  currency?: string;
  priority?: "low" | "medium" | "high" | "urgent" | string;
  status?: string;
  isCompleted?: boolean;
}

interface AIBudgetAndRemindersHubProps {
  budgets: BudgetProgress[];
  reminders?: ReminderItem[];
  onOpenBudgetDialog?: () => void;
  onNavigateToBudgetsTab?: () => void;
}

export function AIBudgetAndRemindersHub({
  budgets,
  onOpenBudgetDialog,
  onNavigateToBudgetsTab,
}: AIBudgetAndRemindersHubProps) {
  const router = useRouter();

  // Master entry point handler to navigate to Budget Planning & Intelligence Center
  const handleOpenBudgetsCenter = () => {
    router.push("/dashboard/budgets");
  };

  // Live aggregates across active budgets
  const activeBudgets = useMemo(() => {
    return budgets.filter((b) => b.status !== "archived");
  }, [budgets]);

  const totalAllocated = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = Math.max(0, totalAllocated - totalSpent);
  const overallUsagePct = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Days remaining in current calendar month
  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);
  const dailySafeSpend = Math.max(0, Math.round(totalRemaining / daysRemaining));
  const dailyAverageSpend = Math.round(totalSpent / Math.max(1, currentDay));
  const projectedMonthEndSpend = Math.round(totalSpent + dailyAverageSpend * daysRemaining);

  // Determine health risk status
  const isOverBudget = overallUsagePct >= 100;
  const isNearLimit = overallUsagePct >= 80 && !isOverBudget;
  const budgetStatusText = isOverBudget
    ? "Budget Exceeded"
    : isNearLimit
    ? "Approaching Limit"
    : "On Track";
  const budgetBadgeColor = isOverBudget
    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
    : isNearLimit
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. MASTER ENTRY POINT: ACCURATE LIVE BUDGET TRACKER CARD */}
      <Card 
        onClick={handleOpenBudgetsCenter}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenBudgetsCenter();
          }
        }}
        aria-label="Open Budget Planning & Intelligence Center"
        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-card via-card to-emerald-500/[0.03] shadow-xs hover:border-emerald-500/50 hover:-translate-y-1.5 hover:shadow-lg active:scale-[0.99] transition-all duration-200 cursor-pointer group relative overflow-hidden"
      >
        {/* Subtle accent glow line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />

        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Live Budget Tracker
                  <Badge variant="outline" className={`text-[10px] font-bold py-0 px-1.5 ${budgetBadgeColor}`}>
                    {budgetStatusText}
                  </Badge>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Calculated exclusively from approved ledger debits
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {onOpenBudgetDialog && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBudgetDialog();
                  }}
                  className="rounded-xl h-7 px-2.5 text-[11px] font-semibold gap-1 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50"
                >
                  <Plus className="h-3 w-3" />
                  <span>Set Limit</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenBudgetsCenter();
                }}
                className="rounded-xl h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                <span>Center</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {totalAllocated > 0 ? (
            <div className="space-y-3">
              {/* Financial Breakdown Row */}
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Remaining to Spend
                  </span>
                  <div className={`text-xl sm:text-2xl font-black tracking-tight ${isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(totalRemaining)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Spent / Total Target
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(totalSpent)} <span className="text-slate-400 font-normal">/ {formatCurrency(totalAllocated)}</span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Utilization ({overallUsagePct}%)</span>
                  <span>{daysRemaining} days left in month</span>
                </div>
                <Progress
                  value={Math.min(100, overallUsagePct)}
                  className={`h-2 rounded-full ${
                    isOverBudget
                      ? "[&>div]:bg-rose-500"
                      : isNearLimit
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-emerald-500"
                  }`}
                />
              </div>

              {/* Category Quick Badges */}
              {activeBudgets.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {activeBudgets.slice(0, 4).map((b) => (
                      <span
                        key={b.id}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[10px] font-semibold text-slate-700 dark:text-slate-300 shrink-0 flex items-center gap-1"
                      >
                        <span className="text-slate-400">{b.categoryName || b.name}:</span>
                        <span>{formatCurrency(b.spent)}</span>
                        <span className={`text-[9px] ${b.percentage >= 100 ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                          ({b.percentage}%)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center space-y-2 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Target className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                No monthly spending target configured yet.
              </p>
              {onOpenBudgetDialog && (
                <Button
                  size="sm"
                  onClick={onOpenBudgetDialog}
                  className="rounded-xl text-xs font-semibold h-7 bg-primary text-primary-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Set Budget Target
                </Button>
              )}
            </div>
          )}

          {/* Master Entry Hint */}
          <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-primary transition-colors border-t border-slate-100 dark:border-slate-800/80">
            <span className="flex items-center gap-1 font-semibold">
              <Sparkles className="h-3 w-3 text-emerald-500" />
              Budget Planning & Intelligence Center
            </span>
            <span className="flex items-center gap-0.5 font-bold group-hover:translate-x-1 transition-transform">
              Open Center
              <ArrowRight className="h-3 w-3 ml-0.5" />
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. REAL-TIME BUDGET VELOCITY & GUARDRAILS CARD (Integrated without standalone notification panel) */}
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

            {onNavigateToBudgetsTab && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onNavigateToBudgetsTab}
                className="rounded-xl h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1"
              >
                <span>Planner</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
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
                For {daysRemaining} days left in cycle
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
                Over {currentDay} days elapsed
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
              ) : null}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
