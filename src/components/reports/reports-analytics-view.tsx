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
import { TrendingUp, PieChart as PieIcon, Layers, CreditCard } from "lucide-react";

interface ReportsAnalyticsViewProps {
  data: {
    monthlyTrend: Array<{ month: string; expense: number; income: number }>;
    categoryBreakdown: Array<{ name: string; value: number; count: number }>;
    groupSpending: Array<{ name: string; value: number }>;
    paymentMethods: Array<{ name: string; amount: number; count: number }>;
    totals: { income: number; expense: number };
  };
}

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export function ReportsAnalyticsView({ data }: ReportsAnalyticsViewProps) {
  const formatYAxis = (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;

  return (
    <div className="space-y-6">
      {/* Top Row: Monthly Trend & Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <Card className="lg:col-span-2 rounded-2xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Monthly Spending & Income Trend</CardTitle>
                <CardDescription className="text-xs">Income (green) vs Expenses (indigo) over time</CardDescription>
              </div>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {data.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), ""]} 
                      contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      name="Expense" 
                      stroke="#4f46e5" 
                      fillOpacity={1} 
                      fill="url(#colorExpense)" 
                      strokeWidth={2}
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name="Income" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorIncome)" 
                      strokeWidth={2}
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No monthly trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown Donut */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Expense by Category</CardTitle>
                <CardDescription className="text-xs">Top spending categories</CardDescription>
              </div>
              <PieIcon className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full flex items-center justify-center">
              {data.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    >
                      {data.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Amount"]} 
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-400 text-xs">No category expenses found</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Group Distribution & Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Distribution Bar Chart */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Group-wise Spending</CardTitle>
                <CardDescription className="text-xs">Expenses grouped by active group</CardDescription>
              </div>
              <Layers className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              {data.groupSpending.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.groupSpending} layout="vertical">
                    <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Total Spent"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Amount (₹)" 
                      fill="#10b981" 
                      radius={[0, 6, 6, 0]}
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No group expenses recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Payment Methods</CardTitle>
                <CardDescription className="text-xs">Usage breakdown across UPI, Card, Cash</CardDescription>
              </div>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              {data.paymentMethods.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.paymentMethods}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Amount"]} 
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar 
                      dataKey="amount" 
                      name="Total (₹)" 
                      fill="#8b5cf6" 
                      radius={[6, 6, 0, 0]} 
                      isAnimationActive={true}
                      animationDuration={900}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No payment method data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
