"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { FinancialForecast, CashFlowAnalysis } from "@/actions/financial-intelligence";
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Sparkles, 
  ShieldCheck, 
  Scale,
  Calendar,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface FinancialForecastingCardProps {
  forecasts: FinancialForecast[];
  cashFlow: CashFlowAnalysis;
}

export function FinancialForecastingCard({ forecasts, cashFlow }: FinancialForecastingCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"1m" | "1q" | "6m" | "1y">("1m");

  const currentForecast = forecasts.find((f) => f.period === selectedPeriod) || forecasts[0];

  // Calculate flow proportions for visual velocity bar
  const totalFlow = (cashFlow.moneyIn + cashFlow.moneyOut) || 1;
  const inflowRatio = Math.round((cashFlow.moneyIn / totalFlow) * 100);
  const outflowRatio = Math.round((cashFlow.moneyOut / totalFlow) * 100);

  const forecastTotal = (currentForecast.predictedIncome + currentForecast.predictedExpense) || 1;
  const forecastInflowRatio = Math.min(100, Math.max(0, Math.round((currentForecast.predictedIncome / forecastTotal) * 100)));

  return (
    <div className="space-y-6">
      {/* SECTION 7: Predictive Forecasting Model */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-indigo-50/30 to-purple-50/20 dark:from-slate-900/40 dark:via-indigo-950/20 dark:to-purple-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-xs shrink-0">
                <Sparkles className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Predictive Financial Forecasting
                  </CardTitle>
                  <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-bold py-0.5">
                    AI Auto-Tuned
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  AI projections calculated using exponential historical moving averages and seasonal trends
                </CardDescription>
              </div>
            </div>

            {/* Sliding Framer Motion Period Selector */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 self-start sm:self-auto backdrop-blur-xs">
              {forecasts.map((f) => {
                const isSelected = selectedPeriod === f.period;
                return (
                  <button
                    key={f.period}
                    type="button"
                    onClick={() => setSelectedPeriod(f.period)}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="forecast-period-pill"
                        className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{f.period.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-6">
          {/* Subheader info & Confidence rating */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Forecast Projections for {currentForecast.periodLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono font-bold">{currentForecast.confidencePct}% Confidence</span>
              </div>
              <div className="hidden sm:block w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${currentForecast.confidencePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3 Forecast Metric Cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPeriod}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {/* Card 1: Projected Income */}
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.04] to-transparent border border-emerald-500/20 dark:border-emerald-500/30 hover:border-emerald-500/50 shadow-xs transition-all duration-300 group overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Predicted Inflow
                  </span>
                  <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:rotate-45 transition-transform duration-300">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block tracking-tight font-mono">
                    {formatCurrency(currentForecast.predictedIncome)}
                  </span>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/10 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Expected credits & splits</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-500/5">
                      Incoming
                    </Badge>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Projected Expense */}
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className="relative p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-rose-500/[0.04] to-transparent border border-rose-500/20 dark:border-rose-500/30 hover:border-rose-500/50 shadow-xs transition-all duration-300 group overflow-hidden"
              >
                <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Predicted Outflow
                  </span>
                  <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 group-hover:-rotate-45 transition-transform duration-300">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 block tracking-tight font-mono">
                    {formatCurrency(currentForecast.predictedExpense)}
                  </span>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-500/10 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Expected bills & splits</span>
                    <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 dark:border-rose-800 bg-rose-500/5">
                      Debits
                    </Badge>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: Projected Net Savings */}
              <motion.div
                whileHover={{ y: -3, scale: 1.01 }}
                transition={{ duration: 0.2 }}
                className={`relative p-5 rounded-2xl shadow-xs transition-all duration-300 group overflow-hidden ${
                  currentForecast.predictedSavings >= 0
                    ? "bg-gradient-to-br from-indigo-500/10 via-indigo-500/[0.04] to-transparent border border-indigo-500/20 dark:border-indigo-500/30 hover:border-indigo-500/50"
                    : "bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent border border-amber-500/20 dark:border-amber-500/30 hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span className={`flex items-center gap-1.5 ${
                    currentForecast.predictedSavings >= 0
                      ? "text-indigo-700 dark:text-indigo-400"
                      : "text-amber-700 dark:text-amber-400"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      currentForecast.predictedSavings >= 0 ? "bg-indigo-500" : "bg-amber-500"
                    } animate-pulse`} />
                    Projected Savings
                  </span>
                  <div className={`p-1.5 rounded-xl ${
                    currentForecast.predictedSavings >= 0
                      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  } group-hover:scale-110 transition-transform duration-300`}>
                    <PiggyBank className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-3">
                  <span className={`text-2xl sm:text-3xl font-black block tracking-tight font-mono ${
                    currentForecast.predictedSavings >= 0
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {currentForecast.predictedSavings >= 0 ? "+" : ""}
                    {formatCurrency(currentForecast.predictedSavings)}
                  </span>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      {currentForecast.predictedSavings >= 0 ? "Projected cash surplus" : "Projected cash deficit"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        currentForecast.predictedSavings >= 0
                          ? "text-indigo-600 border-indigo-200 dark:border-indigo-800 bg-indigo-500/5"
                          : "text-amber-600 border-amber-200 dark:border-amber-800 bg-amber-500/5"
                      }`}
                    >
                      {currentForecast.predictedSavings >= 0 ? "Surplus" : "Deficit"}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Visual Projected Balance Meter */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-indigo-500" />
                Forecasted Inflow vs Outflow Velocity Ratio
              </span>
              <span className="text-slate-900 dark:text-slate-100 font-mono text-[11px]">
                {forecastInflowRatio}% Inflow / {100 - forecastInflowRatio}% Outflow
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${forecastInflowRatio}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${100 - forecastInflowRatio}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-gradient-to-r from-rose-500 to-pink-500 h-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 8: Live Cash Flow Stream Analysis */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-teal-50/30 to-emerald-50/20 dark:from-slate-900/40 dark:via-teal-950/20 dark:to-emerald-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs shrink-0">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    Live Cash Flow Stream
                  </CardTitle>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                    <span>REALTIME</span>
                  </div>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time Money In, Money Out, and net velocity dynamics in INR (₹)
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Money In */}
            <motion.div
              whileHover={{ y: -2 }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Money In (Credits)
                </span>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1.5 font-mono">
                {formatCurrency(cashFlow.moneyIn)}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
                Avg {formatCurrency(cashFlow.averageMonthlyInflow)}/mo
              </span>
            </motion.div>

            {/* Money Out */}
            <motion.div
              whileHover={{ y: -2 }}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 hover:border-rose-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Money Out (Debits)
                </span>
                <ArrowDownLeft className="h-4 w-4 text-rose-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 block mt-1.5 font-mono">
                {formatCurrency(cashFlow.moneyOut)}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
                Avg {formatCurrency(cashFlow.averageMonthlyOutflow)}/mo
              </span>
            </motion.div>

            {/* Net Liquidity Flow */}
            <motion.div
              whileHover={{ y: -2 }}
              className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border transition-colors ${
                cashFlow.netFlow >= 0
                  ? "border-slate-200/70 dark:border-slate-800 hover:border-emerald-500/40"
                  : "border-slate-200/70 dark:border-slate-800 hover:border-rose-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${cashFlow.netFlow >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                  Net Liquidity Flow
                </span>
                {cashFlow.netFlow >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                )}
              </div>
              <span className={`text-xl sm:text-2xl font-black block mt-1.5 font-mono ${
                cashFlow.netFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}>
                {cashFlow.netFlow >= 0 ? "+" : ""}{formatCurrency(cashFlow.netFlow)}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-1">
                {cashFlow.netFlow >= 0 ? "Positive Cash Reserve" : "Net Outflow Deficit"}
              </span>
            </motion.div>
          </div>

          {/* Real-Time Liquidity Velocity Bar */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-100/80 via-slate-50/50 to-slate-100/80 dark:from-slate-900/60 dark:via-slate-800/40 dark:to-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-teal-500" />
                Live Liquidity Balance Velocity
              </span>
              <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                {inflowRatio}% Inflow vs {outflowRatio}% Outflow
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${inflowRatio}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-emerald-500 h-full rounded-l-full"
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${outflowRatio}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-rose-500 h-full rounded-r-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

