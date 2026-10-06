"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  PieChart, 
  Award, 
  Activity, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";

interface GroupExpenseInsightsProps {
  expenseSummary: {
    totalExpense: number;
    todayExpense: number;
    thisMonthExpense: number;
    averagePerMember: number;
    highestExpense: { title: string; amount: number; paidBy: string } | null;
    lowestExpense: { title: string; amount: number; paidBy: string } | null;
    categoryBreakdown: Array<{ name: string; amount: number; count: number }>;
  };
  insights: {
    highestContributor: { name: string; amount: number; percentage: number } | null;
    lowestContributor: { name: string; amount: number; percentage: number } | null;
    mostActiveMember: { name: string; count: number } | null;
    largestExpense: { title: string; amount: number; date: Date | string } | null;
    totalReceivableInGroup: number;
    totalPayableInGroup: number;
  };
}

export function GroupExpenseInsights({
  expenseSummary,
  insights,
}: GroupExpenseInsightsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* SECTION 8: Group Expense Summary */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Group Expense Summary</CardTitle>
              <CardDescription className="text-xs">
                Spending velocity, averages, and category distribution
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Top 3 Stat Tiles */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Today</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                {formatCurrency(expenseSummary.todayExpense)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">This Month</span>
              <span className="text-base font-black text-slate-900 dark:text-slate-100 block mt-0.5">
                {formatCurrency(expenseSummary.thisMonthExpense)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Avg / Member</span>
              <span className="text-base font-black text-primary block mt-0.5">
                {formatCurrency(expenseSummary.averagePerMember)}
              </span>
            </div>
          </div>

          {/* Highest vs Lowest Expense */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {expenseSummary.highestExpense && (
              <div className="p-3 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                  <span>Highest Expense</span>
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                  {expenseSummary.highestExpense.title}
                </p>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {formatCurrency(expenseSummary.highestExpense.amount)}
                </span>
                <span className="text-[10px] text-slate-400">Paid by {expenseSummary.highestExpense.paidBy}</span>
              </div>
            )}

            {expenseSummary.lowestExpense && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                  <span>Lowest Expense</span>
                  <TrendingDown className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                  {expenseSummary.lowestExpense.title}
                </p>
                <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 block mt-0.5">
                  {formatCurrency(expenseSummary.lowestExpense.amount)}
                </span>
                <span className="text-[10px] text-slate-400">Paid by {expenseSummary.lowestExpense.paidBy}</span>
              </div>
            )}
          </div>

          {/* Category Breakdown Badges */}
          {expenseSummary.categoryBreakdown.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                Top Categories
              </span>
              <div className="flex flex-wrap gap-1.5">
                {expenseSummary.categoryBreakdown.slice(0, 5).map((cat, i) => (
                  <Badge key={i} variant="outline" className="text-xs py-1 px-2.5 rounded-xl font-medium">
                    {cat.name}: <strong className="ml-1 text-slate-900 dark:text-slate-100">{formatCurrency(cat.amount)}</strong>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 12: Group Insights */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Group Insights</CardTitle>
              <CardDescription className="text-xs">
                Key contributor analysis and total group debt volume
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Highest Contributor */}
            {insights.highestContributor ? (
              <div className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">
                  <span>Top Contributor</span>
                  <Award className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                  {insights.highestContributor.name}
                </p>
                <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 block mt-0.5">
                  {formatCurrency(insights.highestContributor.amount)}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {insights.highestContributor.percentage}% of total expenses
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border text-xs text-slate-400">
                No contributions yet
              </div>
            )}

            {/* Most Active Member */}
            {insights.mostActiveMember ? (
              <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40">
                <div className="flex items-center justify-between text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold uppercase">
                  <span>Most Active</span>
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                  {insights.mostActiveMember.name}
                </p>
                <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                  {insights.mostActiveMember.count} Expenses
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Recorded in this group</span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border text-xs text-slate-400">
                No active member data
              </div>
            )}
          </div>

          {/* Group Debt Pool */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                <span>Group Receivables</span>
              </div>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {formatCurrency(insights.totalReceivableInGroup)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold uppercase">
                <ArrowDownLeft className="h-3 w-3 text-rose-500" />
                <span>Group Payables</span>
              </div>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
                {formatCurrency(insights.totalPayableInGroup)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
