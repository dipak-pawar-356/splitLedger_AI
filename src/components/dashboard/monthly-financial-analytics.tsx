"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  PiggyBank, 
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import type { MonthlyFinancialAnalyticsData } from "@/actions/dashboard";

interface MonthlyFinancialAnalyticsProps {
  analytics: MonthlyFinancialAnalyticsData;
}

export function MonthlyFinancialAnalytics({ analytics }: MonthlyFinancialAnalyticsProps) {
  const isNetPositive = analytics.netMonthlyBalance >= 0;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden bg-card">
      <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Contact Financial Analytics & Cash Flow
              </CardTitle>
              <CardDescription className="text-xs">
                Time-series run-rates, peak settlement days, and net cashflow velocity
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-bold uppercase">
            Live Synchronized
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Core 4 Analytical Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Contact Income */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Total Contact Income</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(analytics.totalContactIncome)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={analytics.incomeTrend >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                {analytics.incomeTrend >= 0 ? `+${analytics.incomeTrend}%` : `${analytics.incomeTrend}%`}
              </span>
              <span className="text-slate-400">vs prior period</span>
            </div>
          </div>

          {/* 2. Total Contact Expense */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Total Contact Expense</span>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {formatCurrency(analytics.totalContactExpense)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={analytics.expenseTrend > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                {analytics.expenseTrend > 0 ? `+${analytics.expenseTrend}%` : `${analytics.expenseTrend}%`}
              </span>
              <span className="text-slate-400">vs prior period</span>
            </div>
          </div>

          {/* 3. Net Period Balance */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            isNetPositive
              ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-900/40"
              : "bg-rose-50/20 dark:bg-rose-950/10 border-rose-200/80 dark:border-rose-900/40"
          }`}>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Net Contact Balance</span>
              <PiggyBank className="h-4 w-4 text-primary" />
            </div>
            <div className={`text-2xl font-black font-mono ${
              isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              {isNetPositive ? "+" : ""}{formatCurrency(analytics.netMonthlyBalance)}
            </div>
            <p className="text-[11px] text-slate-400">
              {isNetPositive ? "Net surplus retained" : "Net deficit funded"}
            </p>
          </div>

          {/* 4. Daily Run-Rates */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card/60 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px]">Daily Run-Rates</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">Avg Daily In:</span>
                <span className="font-bold font-mono text-emerald-600">
                  {formatCurrency(analytics.averageDailyIncome)}/day
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 text-[11px]">Avg Daily Out:</span>
                <span className="font-bold font-mono text-rose-600">
                  {formatCurrency(analytics.averageDailyExpense)}/day
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Peak Activity Days */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Highest Income Day */}
          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Highest Income Day
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {analytics.highestIncomeDay ? analytics.highestIncomeDay.day : "No peak day recorded"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {analytics.highestIncomeDay ? formatCurrency(analytics.highestIncomeDay.amount) : "₹0.00"}
              </span>
            </div>
          </div>

          {/* Highest Expense Day */}
          <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Highest Expense Day
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {analytics.highestExpenseDay ? analytics.highestExpenseDay.day : "No peak day recorded"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                {analytics.highestExpenseDay ? formatCurrency(analytics.highestExpenseDay.amount) : "₹0.00"}
              </span>
            </div>
          </div>
        </div>

        {/* 6-Month Cash Flow Table / Visualization */}
        {analytics.monthlyCashFlow && analytics.monthlyCashFlow.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Historical Monthly Cash Flow
              </span>
              <span className="text-[11px] text-slate-400">Recent 6 months breakdown</span>
            </div>

            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Month</th>
                    <th className="py-2.5 px-4 text-right">Income</th>
                    <th className="py-2.5 px-4 text-right">Expense</th>
                    <th className="py-2.5 px-4 text-right">Net Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {analytics.monthlyCashFlow.map((cf) => {
                    const isPositive = cf.net >= 0;
                    return (
                      <tr key={cf.month} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {cf.month}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600">
                          +{formatCurrency(cf.income)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                          -{formatCurrency(cf.expense)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                          <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                            {isPositive ? "+" : ""}{formatCurrency(cf.net)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

