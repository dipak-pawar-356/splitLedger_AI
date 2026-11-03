"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FinancialIntelligenceData } from "@/actions/financial-intelligence";
import { PeriodFilter, getPeriodDateRange } from "@/lib/financial-period";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
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

export type { PeriodFilter };

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

      {/* CORE OPERATIONAL METRICS (8 CARDS) WITH DYNAMIC REACTIVE COLOR TRANSITIONS */}
      <motion.div
        variants={shouldReduceMotion ? undefined : {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.04 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* 1. Total Income — Emerald Green (#10B981) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-emerald-500/20 bg-card p-4 space-y-2 shadow-2xs hover:shadow-xl hover:shadow-emerald-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
            {/* 1px Emerald Gradient Border */}
            <div className="fin-border-gradient bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-emerald-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/15 blur-xl opacity-30 group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 dark:text-emerald-300">
                Total Income
              </span>
              <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>

            <div className="relative z-10 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums tracking-tight">
              <AnimatedCounter value={formatCurrency(controlCenter.totalIncome)} duration={0.6} />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-emerald-500/15 pt-1.5">
              <span>Verified receipts</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {pctIncome !== null
                  ? `${pctIncome >= 0 ? "+" : ""}${pctIncome}% ${comparisonSubtitle}`
                  : "Verified inflow"}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* 2. Total Expense — Ruby Red (#EF4444) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-rose-500/20 bg-card p-4 space-y-2 shadow-2xs hover:shadow-xl hover:shadow-rose-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
            {/* 1px Ruby -> Crimson Gradient Border */}
            <div className="fin-border-gradient bg-gradient-to-br from-rose-500/40 via-red-500/25 to-rose-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-rose-500/15 blur-xl opacity-30 group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-800 dark:text-rose-300">
                Total Expense
              </span>
              <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>

            <div className="relative z-10 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums tracking-tight">
              <AnimatedCounter value={formatCurrency(controlCenter.totalExpense)} duration={0.6} />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-rose-500/15 pt-1.5">
              <span>Verified outflows</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {pctExpense !== null
                  ? `${pctExpense > 0 ? "+" : ""}${pctExpense}% ${comparisonSubtitle}`
                  : "Verified debits"}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* 3. Net Cash Flow — Dynamic Emerald / Ruby Red */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className={`relative overflow-hidden h-full rounded-2xl border p-4 space-y-2 shadow-2xs hover:shadow-xl active:scale-[0.98] transition-all duration-200 cursor-pointer group ${
            isNetPositive
              ? "border-emerald-500/20 bg-card hover:shadow-emerald-500/10"
              : "border-rose-500/20 bg-card hover:shadow-rose-500/10"
          }`}>
            <div className={`fin-border-gradient opacity-70 group-hover:opacity-100 transition-opacity ${
              isNetPositive
                ? "bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-emerald-700/35"
                : "bg-gradient-to-br from-rose-500/40 via-red-500/25 to-rose-700/35"
            }`} />
            <div className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-xl opacity-30 group-hover:opacity-70 transition-opacity ${
              isNetPositive ? "bg-emerald-500/15" : "bg-rose-500/15"
            }`} />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className={`font-bold uppercase tracking-wider text-[10px] ${
                isNetPositive ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"
              }`}>
                Net Cash Flow
              </span>
              <div className={`p-1.5 rounded-xl border group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs ${
                isNetPositive
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
              }`}>
                <Wallet className="h-4 w-4" />
              </div>
            </div>

            <div className={`relative z-10 text-2xl font-black font-mono tabular-nums tracking-tight ${
              isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              <AnimatedCounter
                value={`${isNetPositive ? "+" : ""}${formatCurrency(controlCenter.netCashFlow)}`}
                duration={0.6}
              />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>Period liquidity</span>
              <span className={`font-bold ${isNetPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {isNetPositive ? "Net surplus" : "Deficit funded"}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* 4. Savings & Savings Rate — DYNAMIC REACTIVE COLOR (Exceeds/Positive = Emerald Green, Negative = Deep Rose) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className={`relative overflow-hidden h-full rounded-2xl border p-4 space-y-2 shadow-2xs hover:shadow-xl active:scale-[0.98] transition-all duration-300 cursor-pointer group ${
            controlCenter.savings >= 0
              ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-emerald-500/15"
              : "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50 hover:shadow-rose-500/15"
          }`}>
            {/* Automatic Color Transition Border: Emerald -> Mint vs Rose -> Crimson */}
            <div className={`fin-border-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300 ${
              controlCenter.savings >= 0
                ? "bg-gradient-to-br from-emerald-500/50 via-teal-400/30 to-emerald-600/40"
                : "bg-gradient-to-br from-rose-500/50 via-red-500/30 to-rose-700/40"
            }`} />
            <div className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-xl opacity-30 group-hover:opacity-70 transition-opacity duration-300 ${
              controlCenter.savings >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"
            }`} />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className={`font-bold uppercase tracking-wider text-[10px] transition-colors duration-300 ${
                controlCenter.savings >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"
              }`}>
                Savings
              </span>
              <div className={`p-1.5 rounded-xl border group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-xs ${
                controlCenter.savings >= 0
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              }`}>
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>

            <div className={`relative z-10 text-2xl font-black font-mono tabular-nums tracking-tight transition-colors duration-300 ${
              controlCenter.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              <AnimatedCounter
                value={`${controlCenter.savings >= 0 ? "+" : ""}${formatCurrency(controlCenter.savings)}`}
                duration={0.6}
              />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>{controlCenter.savings >= 0 ? "Retained surplus" : "Deficit draw"}</span>
              <span className={`font-bold font-mono transition-colors duration-300 ${
                controlCenter.savings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {controlCenter.savingsRate}% rate
              </span>
            </div>
          </Card>
        </motion.div>

        {/* 5. Total Receivable — Royal Sapphire (#2563EB) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-blue-500/20 bg-card p-4 space-y-2 shadow-2xs hover:shadow-xl hover:shadow-blue-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
            {/* 1px Royal Blue -> Sky Blue Gradient */}
            <div className="fin-border-gradient bg-gradient-to-br from-blue-600/40 via-indigo-500/25 to-sky-600/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-blue-500/15 blur-xl opacity-30 group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-blue-800 dark:text-blue-300">
                Total Receivable
              </span>
              <div className="p-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div className="relative z-10 text-2xl font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums tracking-tight">
              <AnimatedCounter value={formatCurrency(controlCenter.receivable)} duration={0.6} />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-blue-500/15 pt-1.5">
              <span>Others owe you</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">Active dues</span>
            </div>
          </Card>
        </motion.div>

        {/* 6. Total Payable — Burnished Gold (#D97706) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-amber-500/20 bg-card p-4 space-y-2 shadow-2xs hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
            {/* 1px Gold -> Amber Gradient */}
            <div className="fin-border-gradient bg-gradient-to-br from-amber-500/40 via-orange-500/25 to-amber-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-500/15 blur-xl opacity-30 group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-300">
                Total Payable
              </span>
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>

            <div className="relative z-10 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums tracking-tight">
              <AnimatedCounter value={formatCurrency(controlCenter.payable)} duration={0.6} />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-amber-500/15 pt-1.5">
              <span>You owe others</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">Unsettled</span>
            </div>
          </Card>
        </motion.div>

        {/* 7. Budget Remaining — Dynamic Capacity 4-tier (Indigo >= 80%, Blue 50-79%, Amber 20-49%, Red < 20%) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className="relative overflow-hidden h-full rounded-2xl border border-indigo-500/20 bg-card p-4 space-y-2 shadow-2xs hover:shadow-xl hover:shadow-indigo-500/10 active:scale-[0.98] transition-all duration-200 cursor-pointer group">
            {/* 1px Indigo -> Lavender Gradient */}
            <div className="fin-border-gradient bg-gradient-to-br from-indigo-500/40 via-purple-500/25 to-indigo-700/35 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-indigo-500/15 blur-xl opacity-30 group-hover:opacity-70 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-800 dark:text-indigo-300">
                Budget Remaining
              </span>
              <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs">
                <Target className="h-4 w-4" />
              </div>
            </div>

            <div className="relative z-10 text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums tracking-tight">
              <AnimatedCounter value={formatCurrency(controlCenter.budgetRemaining)} duration={0.6} />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-indigo-500/15 pt-1.5">
              <span>Active limits</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">Headroom safe</span>
            </div>
          </Card>
        </motion.div>

        {/* 8. Pending Settlements — Dynamic (Sunset Orange if pending > 0, Emerald Green if 0) */}
        <motion.div
          variants={shouldReduceMotion ? undefined : {
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } }
          }}
          whileHover={shouldReduceMotion ? undefined : { y: -4, scale: 1.015 }}
        >
          <Card className={`relative overflow-hidden h-full rounded-2xl border p-4 space-y-2 shadow-2xs hover:shadow-xl active:scale-[0.98] transition-all duration-300 cursor-pointer group ${
            controlCenter.pendingSettlementsCount > 0
              ? "border-orange-500/20 bg-card hover:shadow-orange-500/10"
              : "border-emerald-500/20 bg-card hover:shadow-emerald-500/10"
          }`}>
            <div className={`fin-border-gradient opacity-70 group-hover:opacity-100 transition-opacity duration-300 ${
              controlCenter.pendingSettlementsCount > 0
                ? "bg-gradient-to-br from-orange-500/40 via-amber-500/25 to-orange-700/35"
                : "bg-gradient-to-br from-emerald-500/40 via-teal-500/25 to-emerald-700/35"
            }`} />
            <div className={`pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full blur-xl opacity-30 group-hover:opacity-70 transition-opacity duration-300 ${
              controlCenter.pendingSettlementsCount > 0 ? "bg-orange-500/15" : "bg-emerald-500/15"
            }`} />

            <div className="relative z-10 flex items-center justify-between text-xs">
              <span className={`font-bold uppercase tracking-wider text-[10px] transition-colors duration-300 ${
                controlCenter.pendingSettlementsCount > 0 ? "text-orange-800 dark:text-orange-300" : "text-emerald-800 dark:text-emerald-300"
              }`}>
                Pending Settlements
              </span>
              <div className={`p-1.5 rounded-xl border group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-xs ${
                controlCenter.pendingSettlementsCount > 0
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}>
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div className={`relative z-10 text-2xl font-black font-mono tabular-nums tracking-tight transition-colors duration-300 ${
              controlCenter.pendingSettlementsCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              <AnimatedCounter value={formatCurrency(controlCenter.pendingSettlementsAmount)} duration={0.6} />
            </div>

            <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
              <span>Active records</span>
              <span className={`font-bold transition-colors duration-300 ${
                controlCenter.pendingSettlementsCount > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {controlCenter.pendingSettlementsCount > 0 ? `${controlCenter.pendingSettlementsCount} pending` : "All Settled"}
              </span>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* ANALYTICAL METRICS ROW (6 METRICS) WITH SEMANTIC PALETTES & ANIMATED COUNTERS */}
      <motion.div
        variants={shouldReduceMotion ? undefined : {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.04 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {/* Largest Expense */}
        <Card className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="fin-border-gradient bg-gradient-to-br from-rose-500/30 via-red-500/20 to-rose-700/25 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Largest Expense Entry
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-rose-200 dark:border-rose-900 text-rose-600 bg-rose-500/5">
              {controlCenter.largestExpense?.categoryName || "General"}
            </Badge>
          </div>
          <div className="relative z-10 flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.largestExpense?.title || "No expense logged"}
            </p>
            <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
              {controlCenter.largestExpense ? (
                <AnimatedCounter value={formatCurrency(controlCenter.largestExpense.amount)} />
              ) : "₹0.00"}
            </span>
          </div>
          <p className="relative z-10 text-[10px] text-slate-400">
            {controlCenter.largestExpense
              ? `Logged on ${new Date(controlCenter.largestExpense.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
              : "Zero outflow recorded in this cycle"}
          </p>
        </Card>

        {/* Largest Income */}
        <Card className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="fin-border-gradient bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-emerald-700/25 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Largest Income Entry
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-emerald-200 dark:border-emerald-900 text-emerald-600 bg-emerald-500/5">
              {controlCenter.largestIncome?.categoryName || "Inflow"}
            </Badge>
          </div>
          <div className="relative z-10 flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.largestIncome?.title || "No income logged"}
            </p>
            <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              {controlCenter.largestIncome ? (
                <AnimatedCounter value={formatCurrency(controlCenter.largestIncome.amount)} />
              ) : "₹0.00"}
            </span>
          </div>
          <p className="relative z-10 text-[10px] text-slate-400">
            {controlCenter.largestIncome
              ? `Recorded on ${new Date(controlCenter.largestIncome.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
              : "Zero inflow recorded in this cycle"}
          </p>
        </Card>

        {/* Most Used Category */}
        <Card className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="fin-border-gradient bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-violet-700/25 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Most Used Category
            </span>
            <Badge variant="outline" className="text-[9px] font-mono border-violet-200 dark:border-violet-900 text-violet-600 bg-violet-500/5">
              {controlCenter.mostUsedCategory ? `${controlCenter.mostUsedCategory.percentage}% of Spend` : "None"}
            </Badge>
          </div>
          <div className="relative z-10 flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.mostUsedCategory?.name || "Uncategorized"}
            </p>
            <span className="text-lg font-black font-mono text-violet-600 dark:text-violet-400 tabular-nums shrink-0">
              {controlCenter.mostUsedCategory ? (
                <AnimatedCounter value={formatCurrency(controlCenter.mostUsedCategory.amount)} />
              ) : "₹0.00"}
            </span>
          </div>
          <p className="relative z-10 text-[10px] text-slate-400">
            {controlCenter.mostUsedCategory
              ? `${controlCenter.mostUsedCategory.count} verified transaction(s)`
              : "No categorized expenses recorded"}
          </p>
        </Card>

        {/* Highest Spending Day */}
        <Card className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="fin-border-gradient bg-gradient-to-br from-rose-500/30 via-red-500/20 to-rose-700/25 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Highest Spending Day</span>
            <div className="p-1 rounded-lg bg-rose-500/10 text-rose-500">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="relative z-10 flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.highestSpendingDay ? `${controlCenter.highestSpendingDay.day} (${controlCenter.highestSpendingDay.date})` : "None"}
            </p>
            <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
              {controlCenter.highestSpendingDay ? (
                <AnimatedCounter value={formatCurrency(controlCenter.highestSpendingDay.amount)} />
              ) : "₹0.00"}
            </span>
          </div>
          <p className="relative z-10 text-[10px] text-slate-400">Peak single-day debit velocity</p>
        </Card>

        {/* Highest Income Day */}
        <Card className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="fin-border-gradient bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-emerald-700/25 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Highest Income Day</span>
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Calendar className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="relative z-10 flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.highestIncomeDay ? `${controlCenter.highestIncomeDay.day} (${controlCenter.highestIncomeDay.date})` : "None"}
            </p>
            <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
              {controlCenter.highestIncomeDay ? (
                <AnimatedCounter value={formatCurrency(controlCenter.highestIncomeDay.amount)} />
              ) : "₹0.00"}
            </span>
          </div>
          <p className="relative z-10 text-[10px] text-slate-400">Peak single-day credit receipt</p>
        </Card>

        {/* Daily Spending & Income Run-Rates */}
        <Card className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-card p-4 space-y-1.5 shadow-2xs hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer group">
          <div className="fin-border-gradient bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-amber-700/25 opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Daily Run-Rates</span>
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
              <Zap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-center text-xs">
            <span className="text-slate-400">Avg Spend:</span>
            <span className="font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              <AnimatedCounter value={formatCurrency(controlCenter.averageDailySpending)} />/day
            </span>
          </div>
          <div className="relative z-10 flex justify-between items-center text-xs">
            <span className="text-slate-400">Avg Inflow:</span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              <AnimatedCounter value={formatCurrency(controlCenter.averageDailyIncome)} />/day
            </span>
          </div>
        </Card>
      </motion.div>

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
