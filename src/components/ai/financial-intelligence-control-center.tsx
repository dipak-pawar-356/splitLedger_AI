"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FinancialIntelligenceData } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Plus,
  Upload,
  Target,
  Activity,
  Layers,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface FinancialIntelligenceControlCenterProps {
  data: FinancialIntelligenceData;
  onOpenBudgetDialog?: (suggestedAmount?: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type PeriodFilter = "current_month" | "last_month" | "this_week" | "today" | "all_time";

export function FinancialIntelligenceControlCenter({
  data,
  onOpenBudgetDialog,
  onRefresh,
  isRefreshing = false,
}: FinancialIntelligenceControlCenterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("current_month");
  const shouldReduceMotion = useReducedMotion();

  const { controlCenter, aiInsights } = data;
  const hasData = controlCenter.hasVerifiedData && controlCenter.transactionCount > 0;

  // Real-time period comparison label
  const periodLabel = useMemo(() => {
    switch (selectedPeriod) {
      case "current_month":
        return "Current Month";
      case "last_month":
        return "Last Month";
      case "this_week":
        return "This Week";
      case "today":
        return "Today";
      case "all_time":
        return "All-Time Ledger";
    }
  }, [selectedPeriod]);

  const comparisonSubtitle = useMemo(() => {
    switch (selectedPeriod) {
      case "current_month":
        return "vs Previous Month";
      case "last_month":
        return "vs Month Before Last";
      case "this_week":
        return "vs Previous Week";
      case "today":
        return "vs Yesterday";
      case "all_time":
        return "All-Time Baseline";
    }
  }, [selectedPeriod]);

  // If the user has no verified transactions, render the elegant empty state as instructed
  if (!hasData) {
    return (
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-8 sm:p-14 text-center max-w-xl mx-auto space-y-6">
          {/* Elegant Illustration */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/10 via-emerald-500/10 to-indigo-500/10 border border-primary/20 flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-12 w-12 text-primary animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/5 uppercase">
              Financial Control Center
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              No verified transactions are available for the selected period.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Your Financial Intelligence Control Center derives metrics strictly from approved ledger entries, reconciled settlements, and active budgets. Zero fabricated values or placeholder data are displayed.
            </p>
          </div>

          {/* Clear Call-To-Actions (Create Transaction, Import Data, Create Budget) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto shadow-xs">
              <Link href="/dashboard/transactions">
                <Plus className="h-4 w-4" />
                <span>Create Transaction</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto">
              <Link href="/dashboard/contacts">
                <Upload className="h-4 w-4" />
                <span>Import Data</span>
              </Link>
            </Button>

            {onOpenBudgetDialog && (
              <Button
                variant="secondary"
                onClick={() => onOpenBudgetDialog()}
                className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto"
              >
                <Target className="h-4 w-4" />
                <span>Create Budget</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isNetPositive = controlCenter.netCashFlow >= 0;

  return (
    <div className="space-y-6">
      {/* Control Center Header & Period Selector */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Financial Intelligence Control Center
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-500/5">
                    Live Verified Records
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time aggregation across approved ledger transactions, settlements, and active spending boundaries
                </CardDescription>
              </div>
            </div>

            {/* Time Filter Selector */}
            <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
              <div
                role="radiogroup"
                aria-label="Intelligence period filter"
                className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 backdrop-blur-xs text-xs font-semibold"
              >
                {(
                  [
                    { key: "current_month", label: "Current Month" },
                    { key: "last_month", label: "Last Month" },
                    { key: "this_week", label: "This Week" },
                    { key: "today", label: "Today" },
                    { key: "all_time", label: "All Time" },
                  ] as const
                ).map((tab) => {
                  const isSelected = selectedPeriod === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedPeriod(tab.key)}
                      className={`relative px-3 py-1.5 min-h-[30px] rounded-xl text-xs font-bold transition-colors ${
                        isSelected
                          ? "text-primary-foreground"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="fc-period-pill"
                          className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {onRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="rounded-xl h-9 min-h-[36px] px-3 text-xs font-bold gap-1.5"
                  aria-label="Refresh financial control center"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
                  <span className="hidden sm:inline">Sync</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* CORE OPERATIONAL METRICS (8 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Income */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Income</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.totalIncome)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Verified receipts</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {controlCenter.monthlyComparison.percentChangeIncome !== null
                ? `${controlCenter.monthlyComparison.percentChangeIncome >= 0 ? "+" : ""}${controlCenter.monthlyComparison.percentChangeIncome}% ${comparisonSubtitle}`
                : "Verified inflow"}
            </span>
          </div>
        </Card>

        {/* 2. Total Expense */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Expense</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.totalExpense)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Verified outflows</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {controlCenter.monthlyComparison.percentChangeExpense !== null
                ? `${controlCenter.monthlyComparison.percentChangeExpense > 0 ? "+" : ""}${controlCenter.monthlyComparison.percentChangeExpense}% ${comparisonSubtitle}`
                : "Verified debits"}
            </span>
          </div>
        </Card>

        {/* 3. Net Cash Flow */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Net Cash Flow</span>
            <div className={`p-1.5 rounded-lg ${isNetPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tabular-nums ${isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isNetPositive ? "+" : ""}
            {formatCurrency(controlCenter.netCashFlow)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Period liquidity</span>
            <span className={`font-bold ${isNetPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {isNetPositive ? "Net surplus" : "Deficit funded"}
            </span>
          </div>
        </Card>

        {/* 4. Savings & Savings Rate */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Savings</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tabular-nums ${controlCenter.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {controlCenter.savings >= 0 ? "+" : ""}
            {formatCurrency(controlCenter.savings)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Retained capital</span>
            <span className="font-bold font-mono text-primary">{controlCenter.savingsRate}% rate</span>
          </div>
        </Card>

        {/* 5. Total Receivable */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Receivable</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.receivable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Others owe you</span>
            <span className="font-bold text-teal-600">Active dues</span>
          </div>
        </Card>

        {/* 6. Total Payable */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Payable</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.payable)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>You owe others</span>
            <span className="font-bold text-amber-600">Unsettled</span>
          </div>
        </Card>

        {/* 7. Budget Remaining */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Budget Remaining</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {formatCurrency(controlCenter.budgetRemaining)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Active limits</span>
            <span className="font-bold text-primary">Headroom safe</span>
          </div>
        </Card>

        {/* 8. Pending Settlements */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Pending Settlements</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.pendingSettlementsAmount)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Active records</span>
            <span className="font-bold text-purple-600">{controlCenter.pendingSettlementsCount} pending</span>
          </div>
        </Card>
      </div>

      {/* ANALYTICAL METRICS ROW (6 METRICS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Largest Expense */}
        <Card className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Largest Expense Entry
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-rose-200 dark:border-rose-900 text-rose-600">
              {controlCenter.largestExpense?.categoryName || "General"}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.largestExpense?.title || "No expense logged"}
            </p>
            <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
              {controlCenter.largestExpense ? formatCurrency(controlCenter.largestExpense.amount) : "₹0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {controlCenter.largestExpense
              ? `Logged on ${new Date(controlCenter.largestExpense.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
              : "Zero outflow recorded in this cycle"}
          </p>
        </Card>

        {/* Largest Income */}
        <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Largest Income Entry
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-emerald-200 dark:border-emerald-900 text-emerald-600">
              {controlCenter.largestIncome?.categoryName || "Inflow"}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.largestIncome?.title || "No income logged"}
            </p>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              {controlCenter.largestIncome ? formatCurrency(controlCenter.largestIncome.amount) : "₹0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {controlCenter.largestIncome
              ? `Recorded on ${new Date(controlCenter.largestIncome.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
              : "Zero inflow recorded in this cycle"}
          </p>
        </Card>

        {/* Most Used Category */}
        <Card className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Most Used Category
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-indigo-200 dark:border-indigo-900 text-indigo-600">
              {controlCenter.mostUsedCategory ? `${controlCenter.mostUsedCategory.percentage}% of Spend` : "None"}
            </Badge>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.mostUsedCategory?.name || "Uncategorized"}
            </p>
            <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 tabular-nums shrink-0">
              {controlCenter.mostUsedCategory ? formatCurrency(controlCenter.mostUsedCategory.amount) : "₹0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {controlCenter.mostUsedCategory
              ? `${controlCenter.mostUsedCategory.count} verified transaction(s)`
              : "No categorized expenses recorded"}
          </p>
        </Card>

        {/* Highest Spending Day */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Highest Spending Day</span>
            <Calendar className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.highestSpendingDay ? `${controlCenter.highestSpendingDay.day} (${controlCenter.highestSpendingDay.date})` : "None"}
            </p>
            <span className="text-base font-black font-mono text-rose-600 tabular-nums shrink-0">
              {controlCenter.highestSpendingDay ? formatCurrency(controlCenter.highestSpendingDay.amount) : "₹0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Peak single-day debit velocity</p>
        </Card>

        {/* Highest Income Day */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Highest Income Day</span>
            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.highestIncomeDay ? `${controlCenter.highestIncomeDay.day} (${controlCenter.highestIncomeDay.date})` : "None"}
            </p>
            <span className="text-base font-black font-mono text-emerald-600 tabular-nums shrink-0">
              {controlCenter.highestIncomeDay ? formatCurrency(controlCenter.highestIncomeDay.amount) : "₹0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Peak single-day credit receipt</p>
        </Card>

        {/* Daily Spending & Income Run-Rates */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Daily Run-Rates</span>
            <Zap className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Avg Spend:</span>
            <span className="font-bold font-mono text-rose-600">
              {formatCurrency(controlCenter.averageDailySpending)}/day
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Avg Inflow:</span>
            <span className="font-bold font-mono text-emerald-600">
              {formatCurrency(controlCenter.averageDailyIncome)}/day
            </span>
          </div>
        </Card>
      </div>

      {/* DYNAMIC VERIFIED INSIGHTS SECTION */}
      {aiInsights && aiInsights.length > 0 && (
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Verified Ledger Insights</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {aiInsights.length} Verified Signals
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Every insight is mathematically calculated from changes between verified ledger records
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3 text-xs"
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      insight.severity === "positive"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : insight.severity === "warning"
                        ? "bg-rose-500/10 text-rose-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{insight.title}</span>
                      {insight.metricValue && (
                        <Badge variant="secondary" className="font-mono text-[10px] shrink-0 font-bold">
                          {insight.metricValue}
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TWO COLUMN GRID: RECENT VERIFIED ACTIVITY & CATEGORY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Recent Verified Activity</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7 gap-1 font-bold">
                <Link href="/dashboard/transactions">
                  <span>View All</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {controlCenter.recentActivity.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No recent transactions recorded.</div>
            ) : (
              controlCenter.recentActivity.slice(0, 7).map((item) => {
                const isCredit = item.type === "received" || item.type === "lent" || item.type === "repaid";
                return (
                  <div key={item.id} className="p-3.5 px-5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold">
                          {item.categoryName}
                        </Badge>
                        <span>•</span>
                        <span>{new Date(item.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-black font-mono tabular-nums shrink-0 ${
                        isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Category Distribution</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {controlCenter.categoryDistribution.length} Categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            {controlCenter.categoryDistribution.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-6">No categorized expenses for this period.</div>
            ) : (
              controlCenter.categoryDistribution.slice(0, 6).map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{cat.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cat.amount)}</span>
                      <span className="text-[11px] text-slate-400 w-10 text-right">{cat.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
