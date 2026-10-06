"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from "recharts";
import { Scale, PieChart as PieIcon, TrendingUp } from "lucide-react";

interface DashboardChartsProps {
  charts: {
    incomeVsExpense: Array<{ month: string; income: number; expense: number }>;
    categoryBreakdown: Array<{ name: string; value: number; percentage: number }>;
    cashflowTrend: Array<{ month: string; cashflow: number }>;
  };
}

const CATEGORY_COLORS = [
  "#4f46e5", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Rose
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#64748b", // Slate
];

export function DashboardCharts({ charts }: DashboardChartsProps) {
  const formatYAxis = (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Financial Trends & Distribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical inflow vs outflow, category breakdown, and net cashflow
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Monthly Income vs Expense (2 cols on lg) */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs lg:col-span-2 bg-card">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Income vs Expense
                </CardTitle>
                <CardDescription className="text-xs">
                  Monthly inflow versus spending over past 6 months
                </CardDescription>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Scale className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 w-full">
              {charts.incomeVsExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.incomeVsExpense}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), ""]}
                      contentStyle={{ 
                        borderRadius: "14px", 
                        fontSize: "12px", 
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar 
                      dataKey="income" 
                      name="Income" 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                    <Bar 
                      dataKey="expense" 
                      name="Expense" 
                      fill="#ef4444" 
                      radius={[6, 6, 0, 0]} 
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No historical transaction data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Category Breakdown (1 col on lg) */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs bg-card flex flex-col justify-between">
          <div>
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Category Breakdown
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Current month spending distribution
                  </CardDescription>
                </div>
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <PieIcon className="h-4 w-4" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-44 w-full">
                {charts.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={900}
                        animationEasing="ease-out"
                      >
                        {charts.categoryBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), ""]}
                        contentStyle={{ 
                          borderRadius: "14px", 
                          fontSize: "12px", 
                          border: "1px solid rgba(148, 163, 184, 0.2)",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No categorical expenses this month
                  </div>
                )}
              </div>
            </CardContent>
          </div>

          {/* Category Legend Pills */}
          {charts.categoryBreakdown.length > 0 && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {charts.categoryBreakdown.slice(0, 4).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-1.5 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} 
                    />
                    <span className="truncate text-slate-600 dark:text-slate-300 font-medium">
                      {cat.name} ({cat.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Chart 3: Cashflow Trend (Full width on bottom) */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-1 lg:col-span-3 bg-card">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Cashflow Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Net savings velocity (Income minus Expenses) over time
                </CardDescription>
              </div>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-56 w-full">
              {charts.cashflowTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.cashflowTrend}>
                    <defs>
                      <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Net Cashflow"]}
                      contentStyle={{ 
                        borderRadius: "14px", 
                        fontSize: "12px", 
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cashflow" 
                      name="Net Cashflow" 
                      stroke="#6366f1" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#cashflowGrad)" 
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No cashflow data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
