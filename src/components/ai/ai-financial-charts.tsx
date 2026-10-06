"use client";

import { useState } from "react";
import { CashFlowAnalysis } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, PieChart, BarChart3, ArrowUpRight, Calendar } from "lucide-react";

interface AIFinancialChartsProps {
  cashFlow: CashFlowAnalysis;
  categoryBreakdown: Array<{ name: string; amount: number; percentage: number }>;
}

const CATEGORY_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#14b8a6", // Teal
  "#64748b", // Slate
];

export function AIFinancialCharts({ cashFlow, categoryBreakdown }: AIFinancialChartsProps) {
  const [activeChart, setActiveChart] = useState<"trend" | "categories">("trend");

  const flows = cashFlow.monthlyFlows.length > 0 ? cashFlow.monthlyFlows : [
    { month: "Current Month", inflow: cashFlow.moneyIn, outflow: cashFlow.moneyOut, net: cashFlow.netFlow }
  ];

  const maxFlowVal = Math.max(
    1,
    ...flows.map((f) => Math.max(f.inflow, f.outflow))
  );

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span>Financial Trends & Visual Analytics</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Live historical cash flow trajectory and category outflow proportions
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveChart("trend")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeChart === "trend"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Cash Flow Trend
            </button>
            <button
              type="button"
              onClick={() => setActiveChart("categories")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeChart === "categories"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Categories Breakdown
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {activeChart === "trend" ? (
          <div className="space-y-6">
            {/* Trend Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Income Inflow</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Expense Outflow</span>
              </div>
            </div>

            {/* SVG / Bar Flow Timeline */}
            <div className="space-y-4">
              {flows.map((item, idx) => {
                const inflowWidth = Math.round((item.inflow / maxFlowVal) * 100);
                const outflowWidth = Math.round((item.outflow / maxFlowVal) * 100);

                return (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.month}</span>
                      </span>
                      <span className={`font-bold ${item.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        Net: {item.net >= 0 ? "+" : ""}{formatCurrency(item.net, "INR")}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Inflow Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, inflowWidth)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-bold text-[11px] text-emerald-600">
                          {formatCurrency(item.inflow, "INR")}
                        </span>
                      </div>

                      {/* Outflow Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, outflowWidth)}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-bold text-[11px] text-rose-500">
                          {formatCurrency(item.outflow, "INR")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat, idx) => {
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px]">{cat.percentage}%</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatCurrency(cat.amount, "INR")}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(2, cat.percentage)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No categorical expenses recorded this month yet.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
