"use client";

import { useState } from "react";
import { FinancialIntelligenceData } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  ArrowUpRight,
  PieChart,
  Wallet,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BusinessIntelligenceCardProps {
  intelligence: FinancialIntelligenceData;
}

export function BusinessIntelligenceCard({ intelligence }: BusinessIntelligenceCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  const { cashFlow, healthScore, savingsMetrics, executiveNarrative, budgets } = intelligence;

  // Multiplier for periods
  const multiplier = selectedPeriod === "quarterly" ? 3 : selectedPeriod === "yearly" ? 12 : 1;
  const displayInflow = cashFlow.moneyIn * multiplier;
  const displayOutflow = cashFlow.moneyOut * multiplier;
  const displayNet = displayInflow - displayOutflow;
  const displayBudget = (budgets.reduce((s, b) => s + b.amount, 0) || displayOutflow) * multiplier;
  const budgetUtilization = displayBudget > 0 ? Math.round((displayOutflow / displayBudget) * 100) : 0;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <span>Executive Business Intelligence & Risk Analysis</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Live AI-evaluated narrative of liquidity, budget variance, and department risk factors in INR (₹)
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {/* Period Filters */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { key: "monthly", label: "Monthly" },
                { key: "quarterly", label: "Quarterly" },
                { key: "yearly", label: "Financial Year" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedPeriod(p.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedPeriod === p.key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <Badge
              variant="outline"
              className={`text-xs font-bold ${
                executiveNarrative.riskScore > 60
                  ? "text-rose-600 border-rose-200"
                  : executiveNarrative.riskScore > 30
                  ? "text-amber-600 border-amber-200"
                  : "text-emerald-600 border-emerald-200"
              }`}
            >
              Risk Index: {executiveNarrative.riskScore}/100
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Dynamic Executive Narrative */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span>{selectedPeriod.toUpperCase()} EXECUTIVE SUMMARY</span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            During this {selectedPeriod} period, total corporate & personal outflow stands at{" "}
            <strong>{formatCurrency(displayOutflow, "INR")}</strong> against an inflow of{" "}
            <strong>{formatCurrency(displayInflow, "INR")}</strong>, resulting in a net variance of{" "}
            <strong className={displayNet >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {displayNet >= 0 ? "+" : ""}
              {formatCurrency(displayNet, "INR")}
            </strong>{" "}
            ({savingsMetrics.savingsRatePct}% savings rate).
          </p>
          <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Recommended Action: {executiveNarrative.recommendedAction}</span>
          </div>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-background border text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Total Outflow</span>
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-base font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(displayOutflow, "INR")}
            </p>
            <span className="text-[10px] text-slate-400 block">
              {budgets.length} active budgets
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Total Inflow</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-base font-black text-emerald-600">
              {formatCurrency(displayInflow, "INR")}
            </p>
            <span className="text-[10px] text-slate-400 block">
              Direct & shared receipts
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Net Savings</span>
              <Wallet className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p
              className={`text-base font-black ${
                displayNet >= 0 ? "text-slate-900 dark:text-slate-100" : "text-rose-600"
              }`}
            >
              {displayNet >= 0 ? "+" : ""}
              {formatCurrency(displayNet, "INR")}
            </p>
            <span className="text-[10px] text-slate-400 block">
              {savingsMetrics.savingsRatePct}% savings velocity
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-background border text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-[11px]">Budget Usage</span>
              <PieChart className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-base font-black text-slate-900 dark:text-slate-100">
              {budgetUtilization}%
            </p>
            <span className="text-[10px] text-slate-400 block">
              Target: {formatCurrency(displayBudget, "INR")}
            </span>
          </div>
        </div>

        {/* Highlights List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {executiveNarrative.keyHighlights.map((hl, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">{hl}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
