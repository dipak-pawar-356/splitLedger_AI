"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import Link from "next/link";
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
    lifetimeIncome?: number;
    lifetimeExpenses?: number;
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
  const lifetimeIncome = summary.lifetimeIncome ?? summary.totalIncome ?? summary.monthlyIncome ?? 0;
  const lifetimeExpenses = summary.lifetimeExpenses ?? summary.totalExpenses ?? summary.monthlySpending ?? 0;
  const currentMonthExpenseAmt = summary.currentMonthExpense?.amount ?? summary.totalExpenses ?? summary.monthlySpending ?? 0;
  const savings = summary.savings;
  const isSavingsPositive = savings >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Financial Summary
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time live aggregation across ledger, journal notes, settlements & groups
          </p>
        </div>
        <span className="text-xs text-slate-400 font-medium">All amounts in INR (₹)</span>
      </div>

      {/* Row 1: Total Income, Total Expenses, Total Payable, Total Receivable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Total Income */}
        <Link href="/dashboard/transactions?type=received" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-emerald-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200">
                  Total Income
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
                <AnimatedCounter value={formatCurrency(lifetimeIncome)} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Lifetime earned income</span>
              {trends.incomeTrend !== 0 && (
                <span className={trends.incomeTrend >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                  {trends.incomeTrend >= 0 ? `+${trends.incomeTrend}%` : `${trends.incomeTrend}%`}
                </span>
              )}
            </div>
          </Card>
        </Link>

        {/* Card 2 — Total Expenses */}
        <Link href="/dashboard/transactions?type=paid" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-rose-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-200">
                  Total Expenses
                </span>
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  <TrendingDown className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 truncate tracking-tight">
                <AnimatedCounter value={formatCurrency(lifetimeExpenses)} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Lifetime debit & expenses</span>
              {trends.spendingTrend !== 0 && (
                <span className={trends.spendingTrend > 0 ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
                  {trends.spendingTrend > 0 ? `+${trends.spendingTrend}%` : `${trends.spendingTrend}%`}
                </span>
              )}
            </div>
          </Card>
        </Link>

        {/* Card 3 — Total Payable */}
        <Link href="/dashboard/settlements?tab=payable" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-amber-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
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
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              Amount you owe to others
            </p>
          </Card>
        </Link>

        {/* Card 4 — Total Receivable */}
        <Link href="/dashboard/contacts" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-blue-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
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
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              Amount others owe you
            </p>
          </Card>
        </Link>
      </div>

      {/* Row 2: Current Month Expense, Savings, Pending Settlements, Total Groups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 5 — Current Month Expense */}
        <Link href="/dashboard/transactions?period=current_month&type=paid" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-purple-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                  Current Month Expense
                </span>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  <Calendar className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
                <AnimatedCounter value={formatCurrency(currentMonthExpenseAmt)} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] min-w-0">
              <span className="text-slate-400 truncate">
                Diff: {summary.currentMonthExpense?.differenceFormatted || "₹0.00"}
              </span>
              {summary.currentMonthExpense?.trendFormatted && (
                <span className={`font-semibold shrink-0 ml-1.5 ${
                  summary.currentMonthExpense.trend === "up" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {summary.currentMonthExpense.trendFormatted}
                </span>
              )}
            </div>
          </Card>
        </Link>

        {/* Card 6 — Savings */}
        <Link href="/dashboard/analytics" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-teal-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
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
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              {isSavingsPositive ? "Net surplus in active period" : "Net deficit in active period"}
            </p>
          </Card>
        </Link>

        {/* Card 7 — Pending Settlements */}
        <Link href="/dashboard/settlements" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-amber-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
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
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <AnimatedCounter value={summary.pendingSettlementsCount} /> active settlements
            </p>
          </Card>
        </Link>

        {/* Card 8 — Total Groups */}
        <Link href="/dashboard/groups" className="block h-full group">
          <Card className="card-lift h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-purple-500/60 transition-all bg-card cursor-pointer flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                  Total Groups
                </span>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
                <AnimatedCounter value={summary.myGroupsCount} />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              Active group ledgers
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
