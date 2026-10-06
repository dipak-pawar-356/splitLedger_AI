"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  Layers, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  PiggyBank, 
  Scale 
} from "lucide-react";

interface AnalyticsChartsGridProps {
  charts: {
    monthlyExpenseTrend: Array<{ month: string; expense: number }>;
    monthlyIncomeTrend: Array<{ month: string; income: number }>;
    incomeVsExpense: Array<{ month: string; income: number; expense: number; savings: number }>;
    netSavingsTrend: Array<{ month: string; savings: number }>;
    personalVsGroup: Array<{ month: string; personal: number; group: number }>;
    settlementStatus: Array<{ name: string; value: number; count: number }>;
    groupSpending: Array<{ name: string; value: number }>;
    memberContribution: Array<{ name: string; amount: number; percentage: number }>;
    categorySpending: Array<{ name: string; value: number; count: number; percentage: number }>;
    paymentMethodDistribution: Array<{ name: string; amount: number; count: number }>;
  };
}

const CATEGORY_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];
const SETTLEMENT_COLORS = ["#10b981", "#f59e0b", "#6366f1"];

export function AnalyticsChartsGrid({ charts }: AnalyticsChartsGridProps) {
  const formatYAxis = (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;

  return (
    <div className="space-y-6">
      {/* ROW 1: Income vs Expense & Monthly Expense Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Income vs Expense Comparison */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">1. Income vs Expense Comparison</CardTitle>
                <CardDescription className="text-xs">Month-by-month inflow vs outflow</CardDescription>
              </div>
              <Scale className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {charts.incomeVsExpense.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.incomeVsExpense}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), ""]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">No chart data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 1: Monthly Expense Trend */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">2. Monthly Expense Trend</CardTitle>
                <CardDescription className="text-xs">Spending velocity across historical months</CardDescription>
              </div>
              <TrendingDown className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {charts.monthlyExpenseTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyExpenseTrend}>
                    <defs>
                      <linearGradient id="colorExpAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Total Spent"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpAnalytics)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">No chart data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Net Savings Trend & Personal vs Group Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 4: Net Savings Trend */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">3. Net Savings Trend</CardTitle>
                <CardDescription className="text-xs">Monthly accumulated cash position (Income - Expense)</CardDescription>
              </div>
              <PiggyBank className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {charts.netSavingsTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.netSavingsTrend}>
                    <defs>
                      <linearGradient id="colorSavingsAnalytics" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Net Savings"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="savings" name="Net Savings" stroke="#10b981" fillOpacity={1} fill="url(#colorSavingsAnalytics)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">No savings data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 5: Personal vs Group Expenses */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">4. Personal vs Group Expenses</CardTitle>
                <CardDescription className="text-xs">Monthly personal ledger vs shared group tabs</CardDescription>
              </div>
              <Layers className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {charts.personalVsGroup.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.personalVsGroup}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), ""]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="personal" name="Personal" fill="#4f46e5" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="group" name="Group" fill="#a855f7" stackId="a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">No split data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 3: Category Spending Donut & Settlement Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 9: Category Spending */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">5. Category Spending Breakdown</CardTitle>
                <CardDescription className="text-xs">Expense allocation across categories</CardDescription>
              </div>
              <PieIcon className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full flex items-center justify-center">
              {charts.categorySpending.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.categorySpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts.categorySpending.map((entry, index) => (
                        <Cell key={`cat-cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Spent"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs">No category expenses</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 6: Settlement Status */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">6. Settlement Status Overview</CardTitle>
                <CardDescription className="text-xs">Settled vs Pending settlement debt volume</CardDescription>
              </div>
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full flex items-center justify-center">
              {charts.settlementStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.settlementStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {charts.settlementStatus.map((entry, index) => (
                        <Cell key={`set-cell-${index}`} fill={SETTLEMENT_COLORS[index % SETTLEMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Volume"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs">No settlement records</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Group Spending & Payment Method Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 7: Group Spending */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">7. Group Spending Distribution</CardTitle>
                <CardDescription className="text-xs">Total expenses per active group</CardDescription>
              </div>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              {charts.groupSpending.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.groupSpending} layout="vertical">
                    <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Spent"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar dataKey="value" name="Amount (₹)" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">No group spending</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chart 10: Payment Method Distribution */}
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">8. Payment Method Distribution</CardTitle>
                <CardDescription className="text-xs">UPI, Cash, Card, Bank Transfer usage</CardDescription>
              </div>
              <CreditCard className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              {charts.paymentMethodDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.paymentMethodDistribution}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Amount"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar dataKey="amount" name="Volume (₹)" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">No payment data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
