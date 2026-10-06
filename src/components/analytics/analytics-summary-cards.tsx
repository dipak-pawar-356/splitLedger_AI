"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Receipt, 
  Clock, 
  FileCheck, 
  PiggyBank, 
  User, 
  Layers,
  Calendar
} from "lucide-react";

interface AnalyticsSummaryCardsProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    totalReceivable: number;
    totalPayable: number;
    personalExpenses: number;
    groupExpenses: number;
    pendingSettlementsAmount: number;
    pendingSettlementsCount: number;
    completedSettlementsAmount: number;
    activeGroupsCount: number;
    totalMembersCount: number;
    averageMonthlySpending: number;
    averageMonthlyIncome: number;
    lastUpdated: Date | string;
    trends: {
      incomeChangePct: number;
      expenseChangePct: number;
      savingsChangePct: number;
      personalExpenseChangePct: number;
      groupExpenseChangePct: number;
    };
  };
}

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  const isSavingsPositive = summary.netSavings >= 0;

  const renderTrendBadge = (pct: number, inverse: boolean = false) => {
    const isGood = inverse ? pct <= 0 : pct >= 0;
    return (
      <Badge
        variant="secondary"
        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
          isGood
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
            : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
        }`}
      >
        {pct >= 0 ? `+${pct}%` : `${pct}%`}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* 4 Primary Top Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Income */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Income</span>
            <div className="flex items-center gap-1.5">
              {renderTrendBadge(summary.trends.incomeChangePct)}
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
            {formatCurrency(summary.totalIncome)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Total credited receipts</p>
        </Card>

        {/* 2. Total Expenses */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 hover:border-rose-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Expenses</span>
            <div className="flex items-center gap-1.5">
              {renderTrendBadge(summary.trends.expenseChangePct, true)}
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 truncate tracking-tight">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Personal + Group Outflow</p>
        </Card>

        {/* 3. Net Savings */}
        <Card className={`rounded-3xl border shadow-sm p-4 transition-colors ${
          isSavingsPositive 
            ? "border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/15 dark:bg-emerald-950/10" 
            : "border-rose-200/80 dark:border-rose-900/60 bg-rose-50/15 dark:bg-rose-950/10"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Net Savings</span>
            <div className="flex items-center gap-1.5">
              {renderTrendBadge(summary.trends.savingsChangePct)}
              <div className={`p-1.5 rounded-lg ${isSavingsPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
          </div>
          <div className={`text-2xl font-black truncate tracking-tight ${isSavingsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {formatCurrency(summary.netSavings)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Income minus expenses</p>
        </Card>

        {/* 4. Total Receivable */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Receivable</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 truncate tracking-tight">
            {formatCurrency(summary.totalReceivable)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Owed to you across groups</p>
        </Card>
      </div>

      {/* 9 Secondary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 5. Total Payable */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Total Payable</span>
            <ArrowDownLeft className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 block mt-0.5 truncate">
            {formatCurrency(summary.totalPayable)}
          </span>
          <span className="text-[10px] text-slate-400">You owe others</span>
        </Card>

        {/* 6. Personal Expenses */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Personal Expenses</span>
            <User className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 truncate">
            {formatCurrency(summary.personalExpenses)}
          </span>
          <span className="text-[10px] text-slate-400">Non-group spending</span>
        </Card>

        {/* 7. Group Expenses */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Group Expenses</span>
            <Users className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 truncate">
            {formatCurrency(summary.groupExpenses)}
          </span>
          <span className="text-[10px] text-slate-400">Shared group tabs</span>
        </Card>

        {/* 8. Pending Settlements */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Pending Debts</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <span className="text-base font-extrabold text-amber-600 block mt-0.5 truncate">
            {formatCurrency(summary.pendingSettlementsAmount)}
          </span>
          <span className="text-[10px] text-slate-400">{summary.pendingSettlementsCount} active settlements</span>
        </Card>

        {/* 9. Completed Settlements */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Settled Amount</span>
            <FileCheck className="h-3.5 w-3.5 text-teal-500" />
          </div>
          <span className="text-base font-extrabold text-teal-600 block mt-0.5 truncate">
            {formatCurrency(summary.completedSettlementsAmount)}
          </span>
          <span className="text-[10px] text-slate-400">Total settled</span>
        </Card>

        {/* 10. Active Groups */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Active Groups</span>
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
            {summary.activeGroupsCount}
          </span>
          <span className="text-[10px] text-slate-400">Member groups</span>
        </Card>

        {/* 11. Total Members */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Group Members</span>
            <Users className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
            {summary.totalMembersCount}
          </span>
          <span className="text-[10px] text-slate-400">Across your groups</span>
        </Card>

        {/* 12. Average Monthly Spending */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Avg Monthly Spend</span>
            <Calendar className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5 truncate">
            {formatCurrency(summary.averageMonthlySpending)}
          </span>
          <span className="text-[10px] text-slate-400">12-mo average</span>
        </Card>

        {/* 13. Average Monthly Income */}
        <Card className="rounded-2xl border p-3">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-semibold">
            <span>Avg Monthly Income</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <span className="text-base font-extrabold text-emerald-600 block mt-0.5 truncate">
            {formatCurrency(summary.averageMonthlyIncome)}
          </span>
          <span className="text-[10px] text-slate-400">12-mo average</span>
        </Card>
      </div>
    </div>
  );
}
