"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, Scale, TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsDateComparisonProps {
  comparison: {
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    currentIncome: number;
    previousIncome: number;
    incomeDiff: number;
    incomeGrowthPct: number;
    currentExpense: number;
    previousExpense: number;
    expenseDiff: number;
    expenseGrowthPct: number;
    currentSavings: number;
    previousSavings: number;
    savingsDiff: number;
    savingsGrowthPct: number;
  };
}

export function AnalyticsDateComparison({ comparison }: AnalyticsDateComparisonProps) {
  const isIncomeUp = comparison.incomeGrowthPct >= 0;
  const isExpenseUp = comparison.expenseGrowthPct > 0;
  const isSavingsUp = comparison.savingsGrowthPct >= 0;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/30">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Period Performance Comparison
              </span>
              <p className="text-[11px] text-slate-400">
                Comparing <strong>{comparison.currentPeriodLabel}</strong> vs <strong>{comparison.previousPeriodLabel}</strong>
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {comparison.currentPeriodLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Income Comparison */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
              <span>Income Growth</span>
              <span className={isIncomeUp ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                {isIncomeUp ? `+${comparison.incomeGrowthPct}%` : `${comparison.incomeGrowthPct}%`}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {formatCurrency(comparison.currentIncome)}
              </span>
              <span className="text-[11px] text-slate-400">
                prev {formatCurrency(comparison.previousIncome)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Diff: <strong className={isIncomeUp ? "text-emerald-600" : "text-rose-600"}>{comparison.incomeDiff >= 0 ? "+" : ""}{formatCurrency(comparison.incomeDiff)}</strong>
            </span>
          </div>

          {/* Expense Comparison */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
              <span>Expense Change</span>
              <span className={isExpenseUp ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                {isExpenseUp ? `+${comparison.expenseGrowthPct}%` : `${comparison.expenseGrowthPct}%`}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {formatCurrency(comparison.currentExpense)}
              </span>
              <span className="text-[11px] text-slate-400">
                prev {formatCurrency(comparison.previousExpense)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Diff: <strong className={isExpenseUp ? "text-rose-600" : "text-emerald-600"}>{comparison.expenseDiff >= 0 ? "+" : ""}{formatCurrency(comparison.expenseDiff)}</strong>
            </span>
          </div>

          {/* Savings Comparison */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-semibold">
              <span>Net Savings Change</span>
              <span className={isSavingsUp ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                {isSavingsUp ? `+${comparison.savingsGrowthPct}%` : `${comparison.savingsGrowthPct}%`}
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {formatCurrency(comparison.currentSavings)}
              </span>
              <span className="text-[11px] text-slate-400">
                prev {formatCurrency(comparison.previousSavings)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Diff: <strong className={isSavingsUp ? "text-emerald-600" : "text-rose-600"}>{comparison.savingsDiff >= 0 ? "+" : ""}{formatCurrency(comparison.savingsDiff)}</strong>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
