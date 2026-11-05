"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  Receipt, 
  PieChart, 
  Award, 
  Activity, 
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Maximize2
} from "lucide-react";
import { GroupExpenseInsightsModal, type InsightModalType } from "./group-expense-insights-modal";

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
  const [modalType, setModalType] = useState<InsightModalType | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 8: Group Expense Summary */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 hover:scale-[1.005] hover:border-purple-500/50 transition-all duration-300 relative group/summary bg-card">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 opacity-80 group-hover/summary:opacity-100 transition-opacity" />
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-xs">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Group Expense Summary
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Spending velocity, averages, and category distribution (Click tiles to inspect)
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">
                Live Ledger Sync
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Top 3 Stat Tiles */}
            <div className="grid grid-cols-3 gap-3">
              <div 
                onClick={() => setModalType("today")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-indigo-500/60 hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/tile relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                  <span>Today</span>
                  <Maximize2 className="h-3 w-3 opacity-0 group-hover/tile:opacity-100 text-indigo-500 transition-opacity" />
                </div>
                <span className="text-base font-black text-slate-900 dark:text-slate-100 block mt-1 tracking-tight">
                  {formatCurrency(expenseSummary.todayExpense)}
                </span>
                <span className="text-[9.5px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5 block">
                  Click to inspect →
                </span>
              </div>

              <div 
                onClick={() => setModalType("month")}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 hover:border-indigo-500/60 hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/tile relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase">
                  <span>This Month</span>
                  <Maximize2 className="h-3 w-3 opacity-0 group-hover/tile:opacity-100 text-indigo-500 transition-opacity" />
                </div>
                <span className="text-base font-black text-slate-900 dark:text-slate-100 block mt-1 tracking-tight">
                  {formatCurrency(expenseSummary.thisMonthExpense)}
                </span>
                <span className="text-[9.5px] text-indigo-500 dark:text-indigo-400 font-medium mt-0.5 block">
                  Click to inspect →
                </span>
              </div>

              <div 
                onClick={() => setModalType("average")}
                className="p-3.5 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 hover:border-purple-500/60 hover:shadow-lg hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/tile relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-400 font-semibold uppercase">
                  <span>Avg / Member</span>
                  <Maximize2 className="h-3 w-3 opacity-0 group-hover/tile:opacity-100 text-purple-500 transition-opacity" />
                </div>
                <span className="text-base font-black text-purple-600 dark:text-purple-400 block mt-1 tracking-tight">
                  {formatCurrency(expenseSummary.averagePerMember)}
                </span>
                <span className="text-[9.5px] text-purple-500 dark:text-purple-400 font-medium mt-0.5 block">
                  Per active head →
                </span>
              </div>
            </div>

            {/* Highest vs Lowest Expense */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {expenseSummary.highestExpense && (
                <div 
                  onClick={() => setModalType("highest_expense")}
                  className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 hover:border-emerald-500/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/tile relative"
                >
                  <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                    <span>Highest Expense</span>
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1 group-hover/tile:text-emerald-500 transition-colors">
                    {expenseSummary.highestExpense.title}
                  </p>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {formatCurrency(expenseSummary.highestExpense.amount)}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate">By {expenseSummary.highestExpense.paidBy}</span>
                    <ChevronRight className="h-3 w-3 text-emerald-500 shrink-0" />
                  </div>
                </div>
              )}

              {expenseSummary.lowestExpense && (
                <div 
                  onClick={() => setModalType("lowest_expense")}
                  className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/tile relative"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Lowest Expense</span>
                    <TrendingDown className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                    {expenseSummary.lowestExpense.title}
                  </p>
                  <span className="text-base font-black text-slate-700 dark:text-slate-300 block mt-0.5">
                    {formatCurrency(expenseSummary.lowestExpense.amount)}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span className="truncate">By {expenseSummary.lowestExpense.paidBy}</span>
                    <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
                  </div>
                </div>
              )}
            </div>

            {/* Category Breakdown Badges */}
            {expenseSummary.categoryBreakdown.length > 0 && (
              <div 
                onClick={() => setModalType("categories")}
                className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 cursor-pointer group/cat"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 group-hover/cat:text-purple-500 transition-colors">
                    Top Spending Categories
                  </span>
                  <span className="text-[10px] text-purple-500 flex items-center gap-0.5 font-medium">
                    View Breakdown <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {expenseSummary.categoryBreakdown.slice(0, 5).map((cat, i) => (
                    <Badge 
                      key={i} 
                      variant="outline" 
                      className="text-xs py-1 px-2.5 rounded-xl font-medium border-slate-200 dark:border-slate-700 hover:border-purple-500/60 hover:bg-purple-500/10 hover:scale-105 transition-all cursor-pointer"
                    >
                      {cat.name}: <strong className="ml-1 text-slate-900 dark:text-slate-100">{formatCurrency(cat.amount)}</strong>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 12: Group Insights */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 hover:scale-[1.005] hover:border-amber-500/50 transition-all duration-300 relative group/insights bg-card">
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 opacity-80 group-hover/insights:opacity-100 transition-opacity" />
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Group Intelligence & Liquidity
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Key contributor analysis and total group debt volume
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">
                AI Barometer
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Highest Contributor */}
              {insights.highestContributor ? (
                <div 
                  onClick={() => setModalType("contributors")}
                  className="p-3.5 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 hover:border-amber-500/70 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/contrib relative"
                >
                  <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">
                    <span>Top Contributor</span>
                    <Award className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1 group-hover/contrib:text-amber-500 transition-colors">
                    {insights.highestContributor.name}
                  </p>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                    {formatCurrency(insights.highestContributor.amount)}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
                    <span>{insights.highestContributor.percentage}% share</span>
                    <ChevronRight className="h-3 w-3 text-amber-500" />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border text-xs text-slate-400">
                  No contributions yet
                </div>
              )}

              {/* Most Active Member */}
              {insights.mostActiveMember ? (
                <div 
                  onClick={() => setModalType("contributors")}
                  className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 hover:border-indigo-500/70 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:-translate-y-1 hover:scale-105 transition-all duration-200 cursor-pointer group/active relative"
                >
                  <div className="flex items-center justify-between text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold uppercase">
                    <span>Most Active</span>
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-1 group-hover/active:text-indigo-500 transition-colors">
                    {insights.mostActiveMember.name}
                  </p>
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                    {insights.mostActiveMember.count} Expenses
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
                    <span>Recorded</span>
                    <ChevronRight className="h-3 w-3 text-indigo-500" />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border text-xs text-slate-400">
                  No active member data
                </div>
              )}
            </div>

            {/* Group Debt Pool */}
            <div 
              onClick={() => setModalType("liquidity")}
              className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
            >
              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-500/5 hover:-translate-y-1 hover:scale-105 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    <span>Receivables</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-emerald-500" />
                </div>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {formatCurrency(insights.totalReceivableInGroup)}
                </span>
                <span className="text-[9.5px] text-slate-400 mt-0.5 block">Group total credit</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/60 hover:bg-rose-500/5 hover:-translate-y-1 hover:scale-105 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase">
                  <div className="flex items-center gap-1">
                    <ArrowDownLeft className="h-3 w-3 text-rose-500" />
                    <span>Payables</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-rose-500" />
                </div>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1 block">
                  {formatCurrency(insights.totalPayableInGroup)}
                </span>
                <span className="text-[9.5px] text-slate-400 mt-0.5 block">Group total debt</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Render Pop-up Inspection Modal */}
      <GroupExpenseInsightsModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType}
        expenseSummary={expenseSummary}
        insights={insights}
      />
    </>
  );
}
