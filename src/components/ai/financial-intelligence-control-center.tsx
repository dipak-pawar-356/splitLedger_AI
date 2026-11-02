"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FinancialIntelligenceData, getPeriodDateRange } from "@/actions/financial-intelligence";
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
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Calendar,
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
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

export type PeriodFilter =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "current_month"
  | "last_month"
  | "current_quarter"
  | "last_quarter"
  | "current_year"
  | "last_year"
  | "all_time"
  | "custom";

interface FinancialIntelligenceControlCenterProps {
  data: FinancialIntelligenceData;
  onOpenBudgetDialog?: (suggestedAmount?: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  selectedPeriod?: PeriodFilter;
  onSelectPeriod?: (period: PeriodFilter, customStart?: string, customEnd?: string) => void;
  isPeriodLoading?: boolean;
}

const PRIMARY_PERIODS = [
  { key: "current_month" as PeriodFilter, label: "Current Month" },
  { key: "last_month" as PeriodFilter, label: "Last Month" },
  { key: "this_week" as PeriodFilter, label: "This Week" },
  { key: "today" as PeriodFilter, label: "Today" },
  { key: "all_time" as PeriodFilter, label: "All Time" },
];

const EXTENDED_PERIODS = [
  { key: "yesterday" as PeriodFilter, label: "Yesterday" },
  { key: "last_week" as PeriodFilter, label: "Last Week" },
  { key: "current_quarter" as PeriodFilter, label: "Current Quarter" },
  { key: "last_quarter" as PeriodFilter, label: "Last Quarter" },
  { key: "current_year" as PeriodFilter, label: "Current Year" },
  { key: "last_year" as PeriodFilter, label: "Last Year" },
];

export function FinancialIntelligenceControlCenter({
  data,
  onOpenBudgetDialog,
  onRefresh,
  isRefreshing = false,
  selectedPeriod = "current_month",
  onSelectPeriod,
  isPeriodLoading = false,
}: FinancialIntelligenceControlCenterProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const { controlCenter, aiInsights } = data;
  const hasTransactionsInPeriod = controlCenter.transactionCount > 0;

  // Comparison labels
  const periodLabel = useMemo(() => {
    if (controlCenter.periodLabel) return controlCenter.periodLabel;
    const all = [...PRIMARY_PERIODS, ...EXTENDED_PERIODS];
    const match = all.find((p) => p.key === selectedPeriod);
    return match ? match.label : "Current Month";
  }, [controlCenter.periodLabel, selectedPeriod]);

  const comparisonSubtitle = useMemo(() => {
    if (controlCenter.periodComparison?.comparisonLabel) {
      return controlCenter.periodComparison.comparisonLabel;
    }
    if (controlCenter.comparisonLabel) return controlCenter.comparisonLabel;
    switch (selectedPeriod) {
      case "today":
        return "vs Yesterday";
      case "yesterday":
        return "vs Day Before Yesterday";
      case "this_week":
        return "vs Previous Week";
      case "last_week":
        return "vs Week Before Last";
      case "current_month":
        return "vs Previous Month";
      case "last_month":
        return "vs Month Before Last";
      case "current_quarter":
        return "vs Previous Quarter";
      case "last_quarter":
        return "vs Quarter Before Last";
      case "current_year":
        return "vs Previous Year";
      case "last_year":
        return "vs Year Before Last";
      default:
        return "All-Time Baseline";
    }
  }, [controlCenter.periodComparison, controlCenter.comparisonLabel, selectedPeriod]);

  const handlePeriodClick = (p: PeriodFilter) => {
    setIsDropdownOpen(false);
    if (onSelectPeriod) {
      onSelectPeriod(p);
    }
  };

  const isNetPositive = controlCenter.netCashFlow >= 0;
  const isExtendedSelected = EXTENDED_PERIODS.some((p) => p.key === selectedPeriod);
  const extendedSelectedLabel = EXTENDED_PERIODS.find((p) => p.key === selectedPeriod)?.label;

  const pctIncome = controlCenter.periodComparison?.percentChangeIncome ?? controlCenter.monthlyComparison?.percentChangeIncome;
  const pctExpense = controlCenter.periodComparison?.percentChangeExpense ?? controlCenter.monthlyComparison?.percentChangeExpense;

  return (
    <div className="space-y-6">
      {/* Control Center Header & Responsive Period Selector */}
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
                  {isPeriodLoading && (
                    <Badge variant="secondary" className="text-[10px] font-mono text-primary animate-pulse">
                      Calculating...
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time aggregation across approved ledger transactions, settlements, and active spending boundaries
                </CardDescription>
              </div>
            </div>

            {/* Comprehensive Period Selector Engine */}
            <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
              <div
                role="radiogroup"
                aria-label="Intelligence period filter"
                className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 backdrop-blur-xs text-xs font-semibold overflow-x-auto max-w-full"
              >
                {PRIMARY_PERIODS.map((tab) => {
                  const isSelected = selectedPeriod === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handlePeriodClick(tab.key)}
                      className={`relative px-3 py-1.5 min-h-[32px] rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isSelected
                          ? "text-primary-foreground shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="fc-period-pill"
                          className="absolute inset-0 bg-primary rounded-xl"
                          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}

                {/* More Periods Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    className={`relative px-2.5 py-1.5 min-h-[32px] rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                      isExtendedSelected
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                    aria-expanded={isDropdownOpen}
                    aria-label="More period filters"
                  >
                    <span>{isExtendedSelected ? extendedSelectedLabel : "More"}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-background/95 backdrop-blur-md shadow-xl p-1.5 z-50 space-y-0.5">
                      {EXTENDED_PERIODS.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handlePeriodClick(item.key)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                            selectedPeriod === item.key
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>{item.label}</span>
                          {selectedPeriod === item.key && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {onRefresh && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRefresh}
                  disabled={isRefreshing || isPeriodLoading}
                  className="rounded-xl h-9 min-h-[36px] px-3 text-xs font-bold gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all"
                  aria-label="Refresh financial control center"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isPeriodLoading ? "animate-spin text-primary" : ""}`} />
                  <span className="hidden sm:inline">Sync</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ZERO VERIFIED DATA BANNER (Rendered conditionally while preserving header) */}
      {!hasTransactionsInPeriod && (
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5">
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 via-emerald-500/10 to-indigo-500/10 border border-primary/20 flex items-center justify-center shadow-inner">
              <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
            </div>

            <div className="space-y-2">
              <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30 bg-primary/5 uppercase">
                {periodLabel}
              </Badge>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                No approved transactions recorded for {periodLabel}.
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                Your Financial Intelligence Control Center derives every calculation exclusively from verified ledger entries, active budgets, and completed settlements. No placeholder or guessed data are fabricated.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto shadow-xs active:scale-[0.98] transition-all">
                <Link href="/dashboard/transactions">
                  <Plus className="h-4 w-4" />
                  <span>Create Transaction</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto active:scale-[0.98] transition-all">
                <Link href="/dashboard/contacts">
                  <Upload className="h-4 w-4" />
                  <span>Import Data</span>
                </Link>
              </Button>

              {onOpenBudgetDialog && (
                <Button
                  variant="secondary"
                  onClick={() => onOpenBudgetDialog()}
                  className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto active:scale-[0.98] transition-all"
                >
                  <Target className="h-4 w-4" />
                  <span>Create Budget</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CORE OPERATIONAL METRICS (8 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Income */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-emerald-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Income</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.totalIncome)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Verified receipts</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {pctIncome !== null
                ? `${pctIncome >= 0 ? "+" : ""}${pctIncome}% ${comparisonSubtitle}`
                : "Verified inflow"}
            </span>
          </div>
        </Card>

        {/* 2. Total Expense */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-rose-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Expense</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {formatCurrency(controlCenter.totalExpense)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Verified outflows</span>
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {pctExpense !== null
                ? `${pctExpense > 0 ? "+" : ""}${pctExpense}% ${comparisonSubtitle}`
                : "Verified debits"}
            </span>
          </div>
        </Card>

        {/* 3. Net Cash Flow */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-indigo-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Net Cash Flow</span>
            <div className={`p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform ${isNetPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-indigo-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Savings</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-teal-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Receivable</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-amber-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Payable</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-indigo-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Budget Remaining</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-purple-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Pending Settlements</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
        <Card className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
        <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
        <Card className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
          {aiInsights && aiInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 flex items-start gap-3 text-xs hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200"
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
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 space-y-1">
              <p className="font-bold text-slate-600 dark:text-slate-300">
                Not enough verified history for {periodLabel} to generate comparative insights.
              </p>
              <p className="text-slate-400">
                Insights require verified transactions across current and baseline periods to calculate statistical variances. Zero placeholder or fabricated trends are displayed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
