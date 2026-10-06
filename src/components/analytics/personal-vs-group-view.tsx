"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { User, Users, Scale, ArrowRight, Layers, PieChart } from "lucide-react";

interface PersonalVsGroupViewProps {
  data: {
    totalPersonalExpenses: number;
    totalGroupExpenses: number;
    personalIncome: number;
    groupContributions: number;
    averagePersonalExpense: number;
    averageGroupExpense: number;
    mostActiveGroup: string | null;
    mostActivePersonalCategory: string | null;
    contributionRatio: number;
  };
}

export function PersonalVsGroupView({ data }: PersonalVsGroupViewProps) {
  const totalCombined = data.totalPersonalExpenses + data.totalGroupExpenses;
  const personalPct = totalCombined > 0 ? Math.round((data.totalPersonalExpenses / totalCombined) * 100) : 0;
  const groupPct = totalCombined > 0 ? Math.round((data.totalGroupExpenses / totalCombined) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Ledger Side */}
        <Card className="rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40 shadow-sm bg-gradient-to-br from-indigo-50/20 via-card to-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <User className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Personal Ledger</CardTitle>
                <CardDescription className="text-xs">Individual expenses & income</CardDescription>
              </div>
            </div>
            <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 font-bold text-xs">
              {personalPct}% of Spend
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Personal Expenses
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                {formatCurrency(data.totalPersonalExpenses)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Personal Income</span>
                <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                  {formatCurrency(data.personalIncome)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg / Personal Tx</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(data.averagePersonalExpense)}
                </span>
              </div>
            </div>

            {data.mostActivePersonalCategory && (
              <p className="text-xs text-slate-500">
                Top personal category: <strong className="text-slate-800 dark:text-slate-200">{data.mostActivePersonalCategory}</strong>
              </p>
            )}
          </div>
        </Card>

        {/* Group Expenses Side */}
        <Card className="rounded-3xl border border-purple-200/60 dark:border-purple-900/40 shadow-sm bg-gradient-to-br from-purple-50/20 via-card to-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Group Expenses</CardTitle>
                <CardDescription className="text-xs">Shared group tabs & splits</CardDescription>
              </div>
            </div>
            <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 font-bold text-xs">
              {groupPct}% of Spend
            </Badge>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Group Expenses
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                {formatCurrency(data.totalGroupExpenses)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Group Inflow</span>
                <span className="text-sm font-bold text-emerald-600 mt-0.5 block">
                  {formatCurrency(data.groupContributions)}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Avg / Group Tx</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                  {formatCurrency(data.averageGroupExpense)}
                </span>
              </div>
            </div>

            {data.mostActiveGroup && (
              <p className="text-xs text-slate-500">
                Most active group: <strong className="text-slate-800 dark:text-slate-200">{data.mostActiveGroup}</strong>
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Contribution Ratio Progress Bar */}
      <Card className="rounded-3xl border shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-300">
            Personal vs Group Spending Distribution
          </span>
          <span className="text-slate-900 dark:text-slate-100 font-mono">
            {personalPct}% Personal • {groupPct}% Group
          </span>
        </div>

        <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-indigo-500 h-full transition-all"
            style={{ width: `${personalPct}%` }}
            title={`Personal: ${personalPct}%`}
          />
          <div
            className="bg-purple-500 h-full transition-all"
            style={{ width: `${groupPct}%` }}
            title={`Group: ${groupPct}%`}
          />
        </div>
      </Card>
    </div>
  );
}
