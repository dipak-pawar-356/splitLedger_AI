"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Users, User, TrendingUp, TrendingDown, PiggyBank, Mail, ShieldAlert, Layers } from "lucide-react";

interface DashboardStatisticsBreakdownProps {
  groupStats: {
    totalGroups: number;
    totalGroupExpenses: number;
    totalGroupMembers: number;
    pendingInvitations: number;
    activeInvitations: number;
    groupBalance: number;
  };
  personalStats: {
    personalTransactionsCount: number;
    personalIncome: number;
    personalExpense: number;
    netSavings: number;
    pendingPersonalPayments: number;
  };
}

export function DashboardStatisticsBreakdown({
  groupStats,
  personalStats,
}: DashboardStatisticsBreakdownProps) {
  const isGroupNetPositive = groupStats.groupBalance >= 0;
  const isSavingsPositive = personalStats.netSavings >= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Group Financial Statistics (Section 6) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Group Expense Analytics</CardTitle>
                <CardDescription className="text-xs">
                  Aggregated statistics across all your active groups
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {groupStats.totalGroups} Active Groups
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Total Group Expenses */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Total Group Spending
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                {formatCurrency(groupStats.totalGroupExpenses)}
              </span>
            </div>

            {/* Total Unique Members */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Total Group Members
              </span>
              <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block">
                {groupStats.totalGroupMembers} members
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Invitations Status */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Group Invitations
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold text-amber-600">
                  {groupStats.pendingInvitations} pending
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-emerald-600">
                  {groupStats.activeInvitations} active
                </span>
              </div>
            </div>

            {/* Net Group Settlement Balance */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Net Group Position
              </span>
              <span className={`text-base font-extrabold mt-0.5 block ${
                isGroupNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {formatCurrency(groupStats.groupBalance)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Financial Statistics (Section 7) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Personal Ledger & Savings</CardTitle>
                <CardDescription className="text-xs">
                  Your individual income, expenses, and personal debt records
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {personalStats.personalTransactionsCount} Records
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Personal Income */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Personal Income
              </span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {formatCurrency(personalStats.personalIncome)}
              </span>
            </div>

            {/* Personal Expense */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Personal Expenses
              </span>
              <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 block">
                {formatCurrency(personalStats.personalExpense)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Net Savings */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Net Personal Savings
              </span>
              <span className={`text-base font-extrabold mt-0.5 block ${
                isSavingsPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {formatCurrency(personalStats.netSavings)}
              </span>
            </div>

            {/* Pending Personal Payments */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                Pending Personal Debts
              </span>
              <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                {formatCurrency(personalStats.pendingPersonalPayments)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
