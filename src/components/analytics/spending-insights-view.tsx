"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Clock, 
  Zap, 
  Award, 
  ArrowUpRight, 
  ArrowDownLeft,
  Activity
} from "lucide-react";

interface SpendingInsightsViewProps {
  monthlyTrends: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    totalTransactions: number;
    averageDailyExpense: number;
    averageWeeklyExpense: number;
    highestSpendingDay: { date: string; amount: number } | null;
    lowestSpendingDay: { date: string; amount: number } | null;
    highestIncomeDay: { date: string; amount: number } | null;
    mostActiveMonth: { month: string; count: number } | null;
  };
  spendingInsights: {
    topCategories: Array<{ name: string; amount: number; percentage: number }>;
    topGroups: Array<{ name: string; amount: number }>;
    averageExpensePerTransaction: number;
    averageGroupExpense: number;
    averagePersonalExpense: number;
    monthlyExpenseGrowthPct: number;
    dailySpendingAverage: number;
    weeklySpendingAverage: number;
  };
}

export function SpendingInsightsView({
  monthlyTrends,
  spendingInsights,
}: SpendingInsightsViewProps) {
  return (
    <div className="space-y-6">
      {/* SECTION 3: Velocity & Spending Averages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Spending Average */}
        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Daily Spending Average</span>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 truncate">
            {formatCurrency(spendingInsights.dailySpendingAverage)} / day
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Based on active spending days</p>
        </Card>

        {/* Weekly Spending Average */}
        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Weekly Spending Average</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 truncate">
            {formatCurrency(spendingInsights.weeklySpendingAverage)} / week
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Rolling 7-day velocity</p>
        </Card>

        {/* Avg per Transaction */}
        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Avg / Transaction</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 truncate">
            {formatCurrency(spendingInsights.averageExpensePerTransaction)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Per recorded transaction</p>
        </Card>

        {/* Expense Growth Rate */}
        <Card className="rounded-3xl border p-4 shadow-sm bg-card">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Expense Growth Rate</span>
            {spendingInsights.monthlyExpenseGrowthPct > 0 ? (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <div className={`text-xl font-black mt-1 truncate ${
            spendingInsights.monthlyExpenseGrowthPct > 0 ? "text-rose-600" : "text-emerald-600"
          }`}>
            {spendingInsights.monthlyExpenseGrowthPct >= 0 ? `+${spendingInsights.monthlyExpenseGrowthPct}%` : `${spendingInsights.monthlyExpenseGrowthPct}%`}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">vs previous period</p>
        </Card>
      </div>

      {/* SECTION 4: Peak Activity Days & Highs/Lows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Days Breakdown */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-bold">Peak Financial Days</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {monthlyTrends.highestSpendingDay && (
              <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
                    Highest Spending Day
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {monthlyTrends.highestSpendingDay.date}
                  </span>
                </div>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(monthlyTrends.highestSpendingDay.amount)}
                </span>
              </div>
            )}

            {monthlyTrends.lowestSpendingDay && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Lowest Spending Day
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {monthlyTrends.lowestSpendingDay.date}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                  {formatCurrency(monthlyTrends.lowestSpendingDay.amount)}
                </span>
              </div>
            )}

            {monthlyTrends.highestIncomeDay && (
              <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                    Highest Income Day
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {monthlyTrends.highestIncomeDay.date}
                  </span>
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(monthlyTrends.highestIncomeDay.amount)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Spending Categories & Groups */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Top Spending Categories</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {spendingInsights.topCategories.length > 0 ? (
              spendingInsights.topCategories.map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {formatCurrency(c.amount)} ({c.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, c.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">No category spending data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
