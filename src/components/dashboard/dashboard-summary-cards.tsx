"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Clock, 
  Users,
  Calendar 
} from "lucide-react";

interface DashboardSummaryCardsProps {
  summary: {
    totalReceivable: number;
    totalPayable: number;
    netBalance: number;
    totalIncome?: number;
    totalExpenses?: number;
    monthlyContactIncome?: number;
    monthlyContactExpense?: number;
    monthlySpending: number;
    monthlyIncome: number;
    savings: number;
    totalTransactions: number;
    pendingSettlementsAmount: number;
    pendingSettlementsCount: number;
    myGroupsCount: number;
    previousMonthExpense?: {
      monthName: string;
      shortMonthName: string;
      priorMonthName: string;
      amount: number;
      percentChange: number;
      trend: "up" | "down" | "neutral";
      comparisonText: string;
    };
    currentMonthExpense?: {
      amount: number;
      prevMonthAmount: number;
      difference: number;
      differenceFormatted: string;
      percentChange: number;
      trend: "up" | "down" | "neutral";
      trendFormatted: string;
    };
  };
  trends: {
    spendingTrend: number;
    incomeTrend: number;
    balanceTrend: number;
  };
}

export function DashboardSummaryCards({ summary, trends }: DashboardSummaryCardsProps) {
  const isNetPositive = summary.netBalance >= 0;
  const totalIncome = summary.totalIncome ?? summary.monthlyContactIncome ?? summary.monthlyIncome;
  const totalExpenses = summary.totalExpenses ?? summary.monthlyContactExpense ?? summary.monthlySpending;
  const savings = summary.savings;
  const isSavingsPositive = savings >= 0;
  const prevMonth = summary.previousMonthExpense;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Financial Summary
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Aggregated overview of live transactions, journals, and reflected balances
          </p>
        </div>
        <span className="text-xs text-slate-400 font-medium">All amounts in INR (₹)</span>
      </div>

      {/* Row 1: Net Position, Total Receivable, Total Payable, Total Income */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1 - Card 1: Net Position */}
        <Card className={`card-lift group rounded-2xl border shadow-xs p-4 transition-all cursor-pointer relative overflow-hidden ${
          isNetPositive 
            ? "border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20 dark:to-transparent hover:border-emerald-500/60" 
            : "border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/40 to-transparent dark:from-rose-950/20 dark:to-transparent hover:border-rose-500/60"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200">
              Net Position
            </span>
            <div className={`p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${
              isNetPositive 
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" 
                : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
            }`}>
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black truncate tracking-tight ${
            isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            <AnimatedCounter value={`${isNetPositive ? "+" : ""}${formatCurrency(summary.netBalance)}`} />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isNetPositive ? "Net positive across peers & contacts" : "Net obligations to settle"}
          </p>
        </Card>

        {/* Row 1 - Card 2: Total Receivable */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-blue-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Total Receivable
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summary.totalReceivable)} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Amount others owe you</p>
        </Card>

        {/* Row 1 - Card 3: Total Payable */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-amber-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Total Payable
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summary.totalPayable)} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Amount you owe to others</p>
        </Card>

        {/* Row 1 - Card 4: Total Income */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-emerald-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Total Income
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(totalIncome)} />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px]">
            <span className="text-slate-400">Total earned in active period</span>
            {trends.incomeTrend !== 0 && (
              <span className={trends.incomeTrend >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                {trends.incomeTrend >= 0 ? `+${trends.incomeTrend}%` : `${trends.incomeTrend}%`}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Total Expenses, Previous Month Expense, Savings, Pending Settlements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 2 - Card 1: Current Month Expense */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-purple-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Current Month Expense
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(totalExpenses)} />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] min-w-0">
            <span className="text-slate-400 truncate">
              Diff: {summary.currentMonthExpense?.differenceFormatted || (totalExpenses - (prevMonth?.amount || 0) >= 0 ? `+${formatCurrency(totalExpenses - (prevMonth?.amount || 0))}` : `-${formatCurrency(Math.abs(totalExpenses - (prevMonth?.amount || 0)))}`)}
            </span>
            {(summary.currentMonthExpense?.trendFormatted || trends.spendingTrend !== 0) && (
              <span className={`font-semibold shrink-0 ml-1.5 ${
                (summary.currentMonthExpense?.trend === "up" || trends.spendingTrend > 0)
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {summary.currentMonthExpense?.trendFormatted || (trends.spendingTrend > 0 ? `↑ ${trends.spendingTrend}%` : `↓ ${Math.abs(trends.spendingTrend)}%`)}
              </span>
            )}
          </div>
        </Card>

        {/* Row 2 - Card 2: Previous Month Expense (Dedicated Historical Card) */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-indigo-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {prevMonth?.monthName || "Previous Month Expense"}
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(prevMonth?.amount || 0)} />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] min-w-0">
            <span className="text-slate-400 truncate">
              {prevMonth?.comparisonText || "Historical baseline"}
            </span>
            {prevMonth && prevMonth.percentChange !== 0 && (
              <span className={`font-semibold shrink-0 ml-1.5 ${
                prevMonth.trend === "up" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {prevMonth.trend === "up" ? "↑" : "↓"}
                {Math.abs(prevMonth.percentChange)}%
              </span>
            )}
          </div>
        </Card>

        {/* Row 2 - Card 3: Savings */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-teal-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Savings
            </span>
            <div className={`p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${
              isSavingsPositive 
                ? "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400" 
                : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            }`}>
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black truncate tracking-tight ${
            isSavingsPositive ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            <AnimatedCounter value={`${isSavingsPositive ? "+" : ""}${formatCurrency(savings)}`} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSavingsPositive ? "Net surplus in active period" : "Net deficit in active period"}
          </p>
        </Card>

        {/* Row 2 - Card 4: Pending Settlements */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-amber-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Pending Settlements
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summary.pendingSettlementsAmount)} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            <AnimatedCounter value={summary.pendingSettlementsCount} /> active settlements
          </p>
        </Card>
      </div>
    </div>
  );
}
