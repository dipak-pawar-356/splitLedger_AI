"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FinancialIntelligenceData } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  PieChart,
  Wallet,
  CheckCircle2,
  Sparkles,
  Zap,
  Clock,
  Target,
  Activity,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BusinessIntelligenceCardProps {
  intelligence: FinancialIntelligenceData;
}

export function BusinessIntelligenceCard({ intelligence }: BusinessIntelligenceCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const shouldReduceMotion = useReducedMotion();

  const { cashFlow, savingsMetrics, executiveNarrative, budgets } = intelligence;

  // Multiplier for periods
  const multiplier = selectedPeriod === "quarterly" ? 3 : selectedPeriod === "yearly" ? 12 : 1;
  const displayInflow = cashFlow.moneyIn * multiplier;
  const displayOutflow = cashFlow.moneyOut * multiplier;
  const displayNet = displayInflow - displayOutflow;
  const displayBudget = (budgets.reduce((s, b) => s + b.amount, 0) || displayOutflow) * multiplier;
  const budgetUtilization = displayBudget > 0 ? Math.round((displayOutflow / displayBudget) * 100) : 0;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4 bg-gradient-to-r from-slate-50/80 via-emerald-50/20 to-teal-50/20 dark:from-slate-900/40 dark:via-emerald-950/20 dark:to-teal-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span>Executive Business Intelligence & Risk Analysis</span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-500/5 font-semibold">
                  AI Synthesized
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live AI-evaluated narrative of liquidity, budget variance, and department risk factors in INR (₹)
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {/* Sliding Framer Motion Period Selector */}
            <div
              role="radiogroup"
              aria-label="Executive report timeframe period"
              className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 backdrop-blur-xs"
            >
              {[
                { key: "monthly", label: "Monthly" },
                { key: "quarterly", label: "Quarterly" },
                { key: "yearly", label: "Financial Year" },
              ].map((p) => {
                const isSelected = selectedPeriod === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setSelectedPeriod(p.key as any)}
                    className={`relative px-3 py-1.5 min-h-[32px] rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="bi-period-pill"
                        className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 450, damping: 32 }
                        }
                      />
                    )}
                    <span className="relative z-10">{p.label}</span>
                  </button>
                );
              })}
            </div>

            <Badge
              variant="outline"
              className={`text-xs font-bold px-2.5 py-1 ${
                executiveNarrative.riskScore > 60
                  ? "text-rose-600 border-rose-300 bg-rose-50/50 dark:bg-rose-950/40"
                  : executiveNarrative.riskScore > 30
                  ? "text-amber-600 border-amber-300 bg-amber-50/50 dark:bg-amber-950/40"
                  : "text-emerald-600 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40"
              }`}
            >
              Risk Index: {executiveNarrative.riskScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Dynamic Executive Narrative */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPeriod}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="p-5 rounded-2xl bg-gradient-to-br from-slate-50/90 to-emerald-50/20 dark:from-slate-900/50 dark:to-emerald-950/20 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="uppercase tracking-wider">{selectedPeriod} Executive Summary</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
              During this {selectedPeriod} period, total corporate & personal outflow stands at{" "}
              <strong className="font-mono tabular-nums">{formatCurrency(displayOutflow, "INR")}</strong> against an inflow of{" "}
              <strong className="font-mono tabular-nums">{formatCurrency(displayInflow, "INR")}</strong>, resulting in a net variance of{" "}
              <strong className={`font-mono tabular-nums ${displayNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                {displayNet >= 0 ? "+" : ""}
                {formatCurrency(displayNet, "INR")}
              </strong>{" "}
              ({savingsMetrics.savingsRatePct}% savings rate).
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-200/40 dark:border-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>Recommended Action: {executiveNarrative.recommendedAction}</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <motion.div
            whileHover={shouldReduceMotion ? {} : { y: -2 }}
            className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs hover:border-rose-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Total Outflow</span>
              <TrendingDown className="h-4 w-4 text-rose-500" aria-hidden="true" />
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {formatCurrency(displayOutflow, "INR")}
            </p>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
              {budgets.length} active budgets
            </span>
          </motion.div>

          <motion.div
            whileHover={shouldReduceMotion ? {} : { y: -2 }}
            className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Total Inflow</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            </div>
            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatCurrency(displayInflow, "INR")}
            </p>
            <span className="text-[10px] text-slate-400 block">
              Direct & shared receipts
            </span>
          </motion.div>

          <motion.div
            whileHover={shouldReduceMotion ? {} : { y: -2 }}
            className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs hover:border-blue-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Net Savings</span>
              <Wallet className="h-4 w-4 text-blue-500" aria-hidden="true" />
            </div>
            <p
              className={`text-lg sm:text-xl font-black font-mono tabular-nums ${
                displayNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {displayNet >= 0 ? "+" : ""}
              {formatCurrency(displayNet, "INR")}
            </p>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
              {savingsMetrics.savingsRatePct}% savings velocity
            </span>
          </motion.div>

          <motion.div
            whileHover={shouldReduceMotion ? {} : { y: -2 }}
            className="p-4 rounded-2xl bg-card border border-slate-200/80 dark:border-slate-800 text-xs space-y-1 shadow-2xs hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Budget Usage</span>
              <PieChart className="h-4 w-4 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono tabular-nums">
              {budgetUtilization}%
            </p>
            <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
              Target: {formatCurrency(displayBudget, "INR")}
            </span>
          </motion.div>
        </div>

        {/* Highlights List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {executiveNarrative.keyHighlights.map((hl, idx) => (
            <motion.div
              key={idx}
              whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
              className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 text-xs flex items-center gap-2.5 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{hl}</span>
            </motion.div>
          ))}
        </div>

        {/* Section 12: Advanced AI Financial Metrics & Velocity (Run-rates, collection forecast, velocity) */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              Run-Rates, Velocity & Forecast Intelligence
            </span>
            <Badge variant="outline" className="text-[10px] font-mono">
              AI Quantitative Model
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Daily Inflow Run-Rate */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Avg Daily Inflow
              </span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                {formatCurrency(Math.round(cashFlow.moneyIn / 30), "INR")}/day
              </span>
              <span className="text-[10px] text-slate-400">Run-rate velocity</span>
            </div>

            {/* Daily Outflow Run-Rate */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Avg Daily Outflow
              </span>
              <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 block">
                {formatCurrency(Math.round(cashFlow.moneyOut / 30), "INR")}/day
              </span>
              <span className="text-[10px] text-slate-400">Burn velocity</span>
            </div>

            {/* Payment Velocity */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Payment Velocity
              </span>
              <span className="text-base font-black font-mono text-primary block">
                {intelligence.productivityInsights?.averageSettlementDelayDays ?? 2.4} days
              </span>
              <span className="text-[10px] text-slate-400">Avg settlement lag</span>
            </div>

            {/* Collection Forecast */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                30-Day Forecast
              </span>
              <span className="text-base font-black font-mono text-blue-600 dark:text-blue-400 block">
                {formatCurrency(intelligence.forecasts[0]?.predictedIncome ?? displayInflow, "INR")}
              </span>
              <span className="text-[10px] text-slate-400">
                {intelligence.forecasts[0]?.confidencePct ?? 85}% confidence
              </span>
            </div>
          </div>

          {/* Peak Days Row */}
          {(cashFlow.largestInflow || cashFlow.largestOutflow) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {cashFlow.largestInflow && (
                <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-600 block">Highest Income Entry</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">{cashFlow.largestInflow.title}</span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-600 shrink-0">
                    {formatCurrency(cashFlow.largestInflow.amount, "INR")}
                  </span>
                </div>
              )}
              {cashFlow.largestOutflow && (
                <div className="p-3 rounded-2xl border border-rose-500/20 bg-rose-50/10 dark:bg-rose-950/10 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-rose-600 block">Highest Expense Entry</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">{cashFlow.largestOutflow.title}</span>
                  </div>
                  <span className="text-sm font-black font-mono text-rose-600 shrink-0">
                    {formatCurrency(cashFlow.largestOutflow.amount, "INR")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

