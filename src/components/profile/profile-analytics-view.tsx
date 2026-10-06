"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  BarChart3, 
  Calendar, 
  Sparkles, 
  Zap, 
  Flame, 
  Award, 
  TrendingUp, 
  ShieldCheck 
} from "lucide-react";

interface ProfileAnalyticsViewProps {
  analytics: {
    daysActive: number;
    averageMonthlyActivity: number;
    topExpenseCategory: string;
    largestExpenseAmount: number;
    largestSettlementAmount: number;
  };
}

export function ProfileAnalyticsView({ analytics }: ProfileAnalyticsViewProps) {
  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span>Profile Analytics & Activity Milestones</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Key usage indicators and lifetime engagement metrics on SplitLedger AI
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Account Lifespan</span>
              <Calendar className="h-4 w-4 text-indigo-500" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 block">
              {analytics.daysActive} Days
            </span>
            <p className="text-[10px] text-slate-400">Total days active on platform</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Top Expense Category</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 block">
              {analytics.topExpenseCategory}
            </span>
            <p className="text-[10px] text-slate-400">Highest transaction density</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Largest Expense</span>
              <Flame className="h-4 w-4 text-rose-500" />
            </div>
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 block">
              {formatCurrency(analytics.largestExpenseAmount)}
            </span>
            <p className="text-[10px] text-slate-400">Single highest expenditure</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Largest Settlement</span>
              <Zap className="h-4 w-4 text-teal-500" />
            </div>
            <span className="text-xl font-black text-teal-600 dark:text-teal-400 block">
              {formatCurrency(analytics.largestSettlementAmount)}
            </span>
            <p className="text-[10px] text-slate-400">Largest single debt cleared</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Monthly Volume</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 block">
              ~{analytics.averageMonthlyActivity} Operations
            </span>
            <p className="text-[10px] text-slate-400">Combined ledger actions</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Security Tier</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
              Enterprise Grade
            </span>
            <p className="text-[10px] text-slate-400">Encrypted via Clerk & Postgres</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
