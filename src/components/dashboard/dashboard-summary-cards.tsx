"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Clock, 
  Users 
} from "lucide-react";

interface DashboardSummaryCardsProps {
  summary: {
    totalReceivable: number;
    totalPayable: number;
    netBalance: number;
    monthlySpending: number;
    monthlyIncome: number;
    savings: number;
    totalTransactions: number;
    pendingSettlementsAmount: number;
    pendingSettlementsCount: number;
    myGroupsCount: number;
  };
  trends: {
    spendingTrend: number;
    incomeTrend: number;
    balanceTrend: number;
  };
}

export function DashboardSummaryCards({ summary, trends }: DashboardSummaryCardsProps) {
  const isNetPositive = summary.netBalance >= 0;
  const isSavingsPositive = summary.savings >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Financial Summary
        </h3>
        <span className="text-xs text-slate-400">All amounts in INR (₹)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Receivable */}
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

        {/* Card 2: Total Payable */}
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

        {/* Card 3: Net Position */}
        <Card className={`card-lift group rounded-2xl border shadow-xs p-4 transition-all cursor-pointer ${
          isNetPositive 
            ? "border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-500/60" 
            : "border-rose-200/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-500/60"
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Net Position
            </span>
            <div className={`p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${isNetPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"}`}>
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black truncate tracking-tight ${isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            <AnimatedCounter value={`${isNetPositive ? "+" : ""}${formatCurrency(summary.netBalance)}`} />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isNetPositive ? "Net positive across peers" : "Net negative obligations"}
          </p>
        </Card>

        {/* Card 4: Monthly Income */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-emerald-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Monthly Income
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summary.monthlyIncome)} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            <span className={trends.incomeTrend >= 0 ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
              {trends.incomeTrend >= 0 ? `+${trends.incomeTrend}%` : `${trends.incomeTrend}%`}
            </span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </Card>

        {/* Card 5: Monthly Expense */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-purple-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Monthly Expense
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
            <AnimatedCounter value={formatCurrency(summary.monthlySpending)} />
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px]">
            <span className={trends.spendingTrend > 0 ? "text-rose-600 font-semibold" : "text-emerald-600 font-semibold"}>
              {trends.spendingTrend > 0 ? `+${trends.spendingTrend}%` : `${trends.spendingTrend}%`}
            </span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </Card>

        {/* Card 6: Savings */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-teal-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Savings
            </span>
            <div className={`p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 ${isSavingsPositive ? "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"}`}>
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black truncate tracking-tight ${isSavingsPositive ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"}`}>
            <AnimatedCounter value={`${isSavingsPositive ? "+" : ""}${formatCurrency(summary.savings)}`} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isSavingsPositive ? "Net savings this month" : "Deficit this month"}
          </p>
        </Card>

        {/* Card 7: Pending Settlements */}
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

        {/* Card 8: Total Groups */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 hover:border-indigo-500/50 transition-all bg-card cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
              Total Groups
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
            <AnimatedCounter value={summary.myGroupsCount} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active group ledgers</p>
        </Card>
      </div>
    </div>
  );
}
