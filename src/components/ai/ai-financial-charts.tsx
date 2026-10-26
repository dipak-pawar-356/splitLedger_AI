"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CashFlowAnalysis } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, PieChart, BarChart3, ArrowUpRight, ArrowDownLeft, Calendar, Sparkles } from "lucide-react";

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
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card overflow-hidden transition-all duration-300 hover:shadow-md">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4 bg-gradient-to-r from-slate-50/80 via-indigo-50/20 to-purple-50/20 dark:from-slate-900/40 dark:via-indigo-950/20 dark:to-purple-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span>Financial Trends & Visual Analytics</span>
                <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200 dark:border-indigo-800 bg-indigo-500/5">
                  Dynamic
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Live historical cash flow trajectory and category outflow proportions
              </CardDescription>
            </div>
          </div>

          {/* Framer Motion Sliding Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/40 dark:border-slate-700/60 self-start sm:self-auto backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setActiveChart("trend")}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeChart === "trend"
                  ? "text-primary-foreground"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {activeChart === "trend" && (
                <motion.div
                  layoutId="chart-toggle-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Cash Flow Trend</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChart("categories")}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeChart === "categories"
                  ? "text-primary-foreground"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {activeChart === "categories" && (
                <motion.div
                  layoutId="chart-toggle-pill"
                  className="absolute inset-0 bg-primary rounded-xl shadow-xs"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <PieChart className="h-3.5 w-3.5" />
                <span>Categories Breakdown</span>
              </span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {activeChart === "trend" ? (
            <motion.div
              key="trend"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Trend Legend */}
              <div className="flex items-center gap-5 text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Income Inflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 shadow-xs" />
                  <span className="font-bold text-slate-700 dark:text-slate-300">Expense Outflow</span>
                </div>
              </div>

              {/* Bar Flow Timeline */}
              <div className="space-y-4">
                {flows.map((item, idx) => {
                  const inflowWidth = Math.round((item.inflow / maxFlowVal) * 100);
                  const outflowWidth = Math.round((item.outflow / maxFlowVal) * 100);

                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.005, backgroundColor: "rgba(100, 116, 139, 0.04)" }}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-3 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>{item.month}</span>
                        </span>
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs font-bold ${
                            item.net >= 0
                              ? "text-emerald-700 dark:text-emerald-300 border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40"
                              : "text-rose-700 dark:text-rose-300 border-rose-300 bg-rose-50/50 dark:bg-rose-950/40"
                          }`}
                        >
                          Net: {item.net >= 0 ? "+" : ""}{formatCurrency(item.net, "INR")}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {/* Inflow Bar */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 sm:w-20 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
                            <ArrowUpRight className="h-3 w-3" />
                            <span>Inflow</span>
                          </div>
                          <div className="flex-1 bg-slate-200/80 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, inflowWidth)}%` }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.1 }}
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                            />
                          </div>
                          <span className="w-24 text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatCurrency(item.inflow, "INR")}
                          </span>
                        </div>

                        {/* Outflow Bar */}
                        <div className="flex items-center gap-3">
                          <div className="w-16 sm:w-20 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 shrink-0">
                            <ArrowDownLeft className="h-3 w-3" />
                            <span>Outflow</span>
                          </div>
                          <div className="flex-1 bg-slate-200/80 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, outflowWidth)}%` }}
                              transition={{ duration: 0.7, ease: "easeOut", delay: idx * 0.1 + 0.1 }}
                              className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full"
                            />
                          </div>
                          <span className="w-24 text-right font-mono font-bold text-xs text-rose-500 shrink-0">
                            {formatCurrency(item.outflow, "INR")}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {categoryBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {categoryBreakdown.map((cat, idx) => {
                    const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                    const isTop = idx === 0;

                    return (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.005 }}
                        className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 space-y-2 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shadow-xs shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {cat.name}
                            </span>
                            {isTop && (
                              <Badge className="bg-primary/10 text-primary text-[10px] py-0 px-1.5 font-bold">
                                Highest Spend
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-mono text-[11px] font-semibold">
                              {cat.percentage}%
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(cat.amount, "INR")}
                            </span>
                          </div>
                        </div>

                        {/* Animated Progress Bar */}
                        <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(2, cat.percentage)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                  <PieChart className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    No categorical expenses recorded this month yet
                  </p>
                  <p>Transactions added to groups and personal ledgers will be categorized here automatically.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

