"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Calendar
} from "lucide-react";

interface FinancialForecastingCardProps {
  forecasts: FinancialForecast[];
  cashFlow: CashFlowAnalysis;
}

export function FinancialForecastingCard({ forecasts, cashFlow }: FinancialForecastingCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"1m" | "1q" | "6m" | "1y">("1m");

  const currentForecast = forecasts.find((f) => f.period === selectedPeriod) || forecasts[0];

  return (
    <div className="space-y-6">
      {/* SECTION 7: Predictive Forecasting Model */}
      <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Predictive Financial Forecasting</CardTitle>
                <CardDescription className="text-xs">
                  AI projections calculated using exponential historical moving averages and seasonal trends
                </CardDescription>
              </div>
            </div>

            {/* Period Selector Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {forecasts.map((f) => (
                <Button
                  key={f.period}
                  type="button"
                  variant={selectedPeriod === f.period ? "default" : "ghost"}
                  size="sm"
                  className="rounded-lg text-xs h-7 px-2.5 font-semibold"
                  onClick={() => setSelectedPeriod(f.period)}
                >
                  {f.period.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Forecast for {currentForecast.periodLabel}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-600 border-emerald-300">
              <ShieldCheck className="h-3 w-3 mr-1 inline" />
              {currentForecast.confidencePct}% Confidence
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Projected Income */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                <span>Predicted Inflow</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">
                {formatCurrency(currentForecast.predictedIncome)}
              </span>
              <span className="text-[10px] text-slate-500">Expected credits</span>
            </div>

            {/* Projected Expense */}
            <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center justify-between text-[10px] text-rose-700 dark:text-rose-400 font-semibold uppercase">
                <span>Predicted Outflow</span>
                <ArrowDownLeft className="h-3.5 w-3.5" />
              </div>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 block mt-1">
                {formatCurrency(currentForecast.predictedExpense)}
              </span>
              <span className="text-[10px] text-slate-500">Expected bills & splits</span>
            </div>

            {/* Projected Net Savings */}
            <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center justify-between text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold uppercase">
                <span>Projected Savings</span>
                <PiggyBank className="h-3.5 w-3.5" />
              </div>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 block mt-1">
                {formatCurrency(currentForecast.predictedSavings)}
              </span>
              <span className="text-[10px] text-slate-500">Projected cash surplus</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 8: Cash Flow Analysis */}
      <Card className="rounded-3xl border shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Live Cash Flow Stream</CardTitle>
              <CardDescription className="text-xs">
                Real-time Money In, Money Out, and net velocity dynamics in INR (₹)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Money In (Credits)</span>
              <span className="text-lg font-black text-emerald-600 block mt-0.5">
                {formatCurrency(cashFlow.moneyIn)}
              </span>
              <span className="text-[10px] text-slate-400">Avg {formatCurrency(cashFlow.averageMonthlyInflow)}/mo</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Money Out (Debits)</span>
              <span className="text-lg font-black text-rose-600 block mt-0.5">
                {formatCurrency(cashFlow.moneyOut)}
              </span>
              <span className="text-[10px] text-slate-400">Avg {formatCurrency(cashFlow.averageMonthlyOutflow)}/mo</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Liquidity Flow</span>
              <span className={`text-lg font-black block mt-0.5 ${
                cashFlow.netFlow >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}>
                {cashFlow.netFlow >= 0 ? "+" : ""}{formatCurrency(cashFlow.netFlow)}
              </span>
              <span className="text-[10px] text-slate-400">Inflow minus Outflow</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
