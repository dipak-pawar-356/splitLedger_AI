"use client";

import { useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FinancialIntelligenceData } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Wallet,
  PiggyBank,
  Scale,
  Target,
  Download,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Zap,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface FinancialForecastingEnterpriseViewProps {
  data: FinancialIntelligenceData;
  onOpenBudgetDialog?: () => void;
}

type ForecastPeriod = "1m" | "1q" | "6m" | "1y";

const CATEGORY_PALETTE = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#64748b", // Slate
];

// Custom Tooltip with ₹ INR formatting
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-background/95 backdrop-blur-md p-3 shadow-lg text-xs space-y-1.5 min-w-[160px]">
        <p className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 font-mono">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 capitalize">{entry.name}:</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function FinancialForecastingEnterpriseView({
  data,
  onOpenBudgetDialog,
}: FinancialForecastingEnterpriseViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<ForecastPeriod>("1m");
  const [activeChartTab, setActiveChartTab] = useState<"cashflow" | "running_balance" | "categories" | "daily">("cashflow");
  const shouldReduceMotion = useReducedMotion();

  const { forecasts, cashFlow, controlCenter, categoryBreakdown } = data;
  const hasHistoricalData = controlCenter.hasVerifiedData && (cashFlow.monthlyFlows.length > 0 || controlCenter.transactionCount > 0);

  // Current forecast based on selected period multiplier
  const multiplier = useMemo(() => {
    switch (selectedPeriod) {
      case "1m":
        return 1;
      case "1q":
        return 3;
      case "6m":
        return 6;
      case "1y":
        return 12;
    }
  }, [selectedPeriod]);

  const periodLabel = useMemo(() => {
    switch (selectedPeriod) {
      case "1m":
        return "Next Month (30 Days)";
      case "1q":
        return "Next Quarter (3 Months)";
      case "6m":
        return "Next Half-Year (6 Months)";
      case "1y":
        return "Next Year (12 Months)";
    }
  }, [selectedPeriod]);

  // Forecast calculation derived strictly from verified mathematical monthly averages
  const baseMonthlyExp = cashFlow.averageMonthlyOutflow > 0 ? cashFlow.averageMonthlyOutflow : controlCenter.totalExpense;
  const baseMonthlyInc = cashFlow.averageMonthlyInflow > 0 ? cashFlow.averageMonthlyInflow : controlCenter.totalIncome;

  const expectedIncome = Math.round(baseMonthlyInc * multiplier);
  const expectedExpense = Math.round(baseMonthlyExp * multiplier);
  const projectedSavings = expectedIncome - expectedExpense;
  const projectedSavingsRate = expectedIncome > 0 ? Math.round((projectedSavings / expectedIncome) * 100) : 0;
  const isProjectedPositive = projectedSavings >= 0;

  // Chart data formatting
  const chartFlowData = useMemo(() => {
    if (cashFlow.monthlyFlows.length > 0) {
      return cashFlow.monthlyFlows.map((m) => ({
        month: m.month,
        Inflow: m.inflow,
        Outflow: m.outflow,
        Net: m.net,
      }));
    }
    return [
      {
        month: "Current",
        Inflow: controlCenter.totalIncome,
        Outflow: controlCenter.totalExpense,
        Net: controlCenter.netCashFlow,
      },
    ];
  }, [cashFlow.monthlyFlows, controlCenter]);

  const runningBalanceData = useMemo(() => {
    return controlCenter.runningBalanceHistory.length > 0
      ? controlCenter.runningBalanceHistory.map((r) => ({
          month: r.date,
          Balance: r.balance,
          Income: r.income,
          Expense: r.expense,
        }))
      : chartFlowData.map((c) => ({
          month: c.month,
          Balance: c.Net,
          Income: c.Inflow,
          Expense: c.Outflow,
        }));
  }, [controlCenter.runningBalanceHistory, chartFlowData]);

  const categoryPieData = useMemo(() => {
    return categoryBreakdown.slice(0, 8).map((cat, idx) => ({
      name: cat.name,
      value: cat.amount,
      percentage: cat.percentage,
      color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
    }));
  }, [categoryBreakdown]);

  // Export forecast CSV
  const handleExportProjections = () => {
    const csvRows = [
      ["SplitLedger AI - Mathematical Financial Projections"],
      ["Generated At", new Date().toISOString()],
      ["Forecast Period", periodLabel],
      ["Expected Inflow (INR)", expectedIncome],
      ["Expected Outflow (INR)", expectedExpense],
      ["Projected Net Savings (INR)", projectedSavings],
      ["Projected Savings Rate", `${projectedSavingsRate}%`],
      [],
      ["Month", "Inflow (INR)", "Outflow (INR)", "Net Liquidity (INR)"],
      ...chartFlowData.map((row) => [row.month, row.Inflow, row.Outflow, row.Net]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SplitLedger_Projections_${selectedPeriod}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Forecast report exported to CSV");
  };

  // If no historical data exists, display elegant empty chart state as instructed
  if (!hasHistoricalData) {
    return (
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-8 sm:p-14 text-center max-w-xl mx-auto space-y-6">
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-center shadow-inner">
            <BarChart3 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="text-xs font-bold text-blue-600 border-blue-300 dark:border-blue-800 bg-blue-500/5 uppercase">
              Mathematical Forecasting
            </Badge>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              No historical ledger data available to compute projections.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
              Projections require at least one verified historical transaction. Every prediction is mathematically calculated from approved ledger entries and recurring commitments. Zero fabricated graphs or dummy charts are displayed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button asChild className="rounded-xl text-xs font-bold gap-2 h-10 px-4 w-full sm:w-auto shadow-xs">
              <Link href="/dashboard/transactions">
                <Plus className="h-4 w-4" />
                <span>Create Transaction</span>
              </Link>
            </Button>

            {onOpenBudgetDialog && (
              <Button
                variant="outline"
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

  return (
    <div className="space-y-6">
      {/* Forecasting Control Header */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-xs shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Predictive Forecasting & Analytics
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-bold text-blue-600 border-blue-300 dark:border-blue-800 bg-blue-500/5">
                    Mathematical Model
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Projections derived strictly from verified historical moving averages, recurring ledger entries, and active budgets
                </CardDescription>
              </div>
            </div>

            {/* Timeframe Period Selector & Export */}
            <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
              <div
                role="radiogroup"
                aria-label="Forecast timeframe period"
                className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 backdrop-blur-xs text-xs font-semibold"
              >
                {(
                  [
                    { key: "1m", label: "1M (Next Month)" },
                    { key: "1q", label: "1Q (Quarter)" },
                    { key: "6m", label: "6M (Half Year)" },
                    { key: "1y", label: "1Y (Annual)" },
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
                          layoutId="forecast-period-pill"
                          className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                          transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportProjections}
                className="rounded-xl h-9 min-h-[36px] px-3 text-xs font-bold gap-1.5"
                aria-label="Export forecast projections as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 4 CORE MATHEMATICAL FORECAST CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Expected Income */}
        <Card className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Expected Income</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {formatCurrency(expectedIncome)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-emerald-500/10 pt-1.5">
            <span>Forecasted inflow</span>
            <span className="font-bold text-emerald-600">{periodLabel.split(" ")[0]} estimate</span>
          </div>
        </Card>

        {/* 2. Expected Expense */}
        <Card className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400">
            <span className="font-bold uppercase tracking-wider text-[10px]">Expected Expense</span>
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-600">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {formatCurrency(expectedExpense)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-rose-500/10 pt-1.5">
            <span>Forecasted outflow</span>
            <span className="font-bold text-rose-600">{periodLabel.split(" ")[0]} estimate</span>
          </div>
        </Card>

        {/* 3. Projected Savings */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Projected Savings</span>
            <div className={`p-1.5 rounded-lg ${isProjectedPositive ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tabular-nums ${isProjectedPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isProjectedPositive ? "+" : ""}
            {formatCurrency(projectedSavings)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Projected surplus</span>
            <span className="font-bold font-mono text-primary">{projectedSavingsRate}% rate</span>
          </div>
        </Card>

        {/* 4. Expected Cash Flow Velocity */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[10px]">Expected Cash Flow</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tabular-nums ${isProjectedPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isProjectedPositive ? "+" : ""}
            {formatCurrency(projectedSavings)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            <span>Net liquidity trajectory</span>
            <span className={`font-bold ${isProjectedPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {isProjectedPositive ? "Solvent" : "Deficit burn"}
            </span>
          </div>
        </Card>
      </div>

      {/* TRAJECTORY & CATEGORY VELOCITY INDICATORS (6 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Largest Growing Category */}
        <Card className="rounded-2xl border border-rose-500/20 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Largest Growing Category</span>
            <TrendingUp className="h-4 w-4 text-rose-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.categoryGrowth.largestGrowingCategory?.name || "None"}
            </p>
            <span className="text-sm font-bold font-mono text-rose-600 tabular-nums shrink-0">
              {controlCenter.categoryGrowth.largestGrowingCategory
                ? `+₹${controlCenter.categoryGrowth.largestGrowingCategory.diff.toLocaleString("en-IN")} (+${controlCenter.categoryGrowth.largestGrowingCategory.percentage}%)`
                : "Stable"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Highest month-over-month expansion</p>
        </Card>

        {/* Largest Declining Category */}
        <Card className="rounded-2xl border border-emerald-500/20 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Largest Declining Category</span>
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.categoryGrowth.largestDecliningCategory?.name || "None"}
            </p>
            <span className="text-sm font-bold font-mono text-emerald-600 tabular-nums shrink-0">
              {controlCenter.categoryGrowth.largestDecliningCategory
                ? `-₹${controlCenter.categoryGrowth.largestDecliningCategory.diff.toLocaleString("en-IN")} (-${controlCenter.categoryGrowth.largestDecliningCategory.percentage}%)`
                : "Stable"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Greatest month-over-month cost reduction</p>
        </Card>

        {/* Top Spending Category */}
        <Card className="rounded-2xl border border-indigo-500/20 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Top Spending Category</span>
            <PieIcon className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {controlCenter.categoryGrowth.topCategory?.name || "Uncategorized"}
            </p>
            <span className="text-sm font-bold font-mono text-indigo-600 tabular-nums shrink-0">
              {controlCenter.categoryGrowth.topCategory ? formatCurrency(controlCenter.categoryGrowth.topCategory.amount) : "₹0.00"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            {controlCenter.categoryGrowth.topCategory ? `${controlCenter.categoryGrowth.topCategory.percentage}% of verified spend` : "No expenses recorded"}
          </p>
        </Card>

        {/* Monthly Growth % */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Expense Growth</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Verified MoM Delta</p>
            <span
              className={`text-base font-black font-mono tabular-nums shrink-0 ${
                controlCenter.categoryGrowth.monthlyGrowthPct !== null
                  ? controlCenter.categoryGrowth.monthlyGrowthPct > 0
                    ? "text-rose-600"
                    : "text-emerald-600"
                  : "text-slate-400"
              }`}
            >
              {controlCenter.categoryGrowth.monthlyGrowthPct !== null
                ? `${controlCenter.categoryGrowth.monthlyGrowthPct > 0 ? "+" : ""}${controlCenter.categoryGrowth.monthlyGrowthPct}%`
                : "—"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Calculated strictly against prior month baseline</p>
        </Card>

        {/* Budget Forecast */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Budget Forecast</span>
            <Target className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Projected Headroom</p>
            <span className="text-base font-black font-mono text-emerald-600 tabular-nums shrink-0">
              {formatCurrency(controlCenter.budgetRemaining)}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Remaining spendable allowance under active targets</p>
        </Card>

        {/* Settlement Forecast */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Settlement Forecast</span>
            <Scale className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Net Expected Recovery</p>
            <span className="text-base font-black font-mono text-purple-600 tabular-nums shrink-0">
              {formatCurrency(Math.max(0, controlCenter.receivable - controlCenter.payable))}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">Net inflow anticipated upon counterparty settlement</p>
        </Card>
      </div>

      {/* INTERACTIVE ENTERPRISE CHARTS SUITE */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Interactive Financial Analytics & Cash Flow Stream</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time responsive time-series with hover tooltips, touch pan, and verified ledger baselines
              </CardDescription>
            </div>

            {/* Chart View Toggle */}
            <div
              role="radiogroup"
              aria-label="Chart mode"
              className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 self-start sm:self-auto text-xs font-semibold"
            >
              {[
                { key: "cashflow", label: "Cash Flow Stream" },
                { key: "running_balance", label: "Running Balance" },
                { key: "categories", label: "Category Distribution" },
                { key: "daily", label: "Daily Intensity" },
              ].map((tab) => {
                const isSelected = activeChartTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setActiveChartTab(tab.key as any)}
                    className={`relative px-3 py-1 min-h-[28px] rounded-xl text-xs font-bold transition-colors ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-chart-pill"
                        className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                        transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          {/* Chart 1: Cash Flow Stream (Monthly Inflow vs Outflow vs Net) */}
          {activeChartTab === "cashflow" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">Verified Monthly Cash Flow (Recent 6 Months)</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Inflow
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Outflow
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Net Flow
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area type="monotone" dataKey="Inflow" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#inflowGrad)" />
                    <Area type="monotone" dataKey="Outflow" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#outflowGrad)" />
                    <Line type="monotone" dataKey="Net" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Cumulative Running Balance */}
          {activeChartTab === "running_balance" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">Cumulative Net Liquidity Trajectory</span>
                <span className="font-mono text-[11px] text-primary">Cumulative Timeline</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={runningBalanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Area type="monotone" dataKey="Balance" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#balanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 3: Category Outflow Distribution (Donut Chart) */}
          {activeChartTab === "categories" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Category Spend Breakdown
                </span>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {categoryPieData.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-bold text-slate-900 dark:text-slate-100">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(cat.value)}</span>
                        <span className="text-[11px] text-slate-400">({cat.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chart 4: Daily Spending Intensity (Bar Chart) */}
          {activeChartTab === "daily" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold">Daily Spending Intensity (Last 30 Days)</span>
                <span className="font-mono text-[11px] text-rose-600">Daily Outflows</span>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={controlCenter.dailySpendingHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(d) => d.slice(8)} // show day of month (e.g. 01, 15)
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="amount" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Spending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

