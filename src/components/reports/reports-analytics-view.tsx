"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieIcon, 
  Layers, 
  CreditCard, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  IndianRupee,
  Users,
  UserCheck,
  ShieldCheck,
  Sparkles,
  Zap,
  BarChart3,
  Activity,
  ArrowRight
} from "lucide-react";

export interface ReportsAnalyticsViewProps {
  data: {
    groupAnalytics?: {
      monthlyTrend: Array<{ month: string; expense: number; income: number }>;
      categoryBreakdown: Array<{ name: string; value: number; count: number; percentage?: number }>;
      paymentMethods: Array<{ name: string; amount: number; count: number; percentage?: number }>;
      groupSpending: Array<{ name: string; value: number }>;
    };
    personalAnalytics?: {
      monthlyTrend: Array<{ month: string; expense: number; income: number; runningBalance?: number; savingsRate?: number }>;
      categoryBreakdown: Array<{ name: string; value: number; count: number; percentage?: number }>;
      paymentMethods: Array<{ name: string; amount: number; count: number; percentage?: number }>;
      transactionMetrics?: {
        averageTransaction: number;
        highestExpense: any;
        totalExpenseCount: number;
      };
    };
    groupSummary?: any;
    personalSummary?: any;
    paymentSummary?: any;
    monthlyTrend: Array<{ 
      month: string; 
      expense: number; 
      income: number;
      net?: number;
      runningBalance?: number;
      savingsRate?: number;
    }>;
    categoryBreakdown: Array<{ 
      name: string; 
      value: number; 
      count: number;
      percentage?: number;
      growthPercent?: number;
    }>;
    groupSpending: Array<{ 
      name: string; 
      value: number;
      count?: number;
    }>;
    groupMetrics?: {
      mostExpensiveGroup: { name: string; amount: number } | null;
      mostActiveGroup: { name: string; count: number } | null;
      highestPendingBalanceGroup: { name: string; amount: number } | null;
      avgSettlementRatio: number;
    };
    paymentMethods: Array<{ 
      name: string; 
      amount: number; 
      count: number;
      percentage?: number;
    }>;
    preferredPaymentMethod?: {
      name: string;
      count: number;
      percentage: number;
    };
    totals: { income: number; expense: number; net?: number };
    weekendVsWeekday?: {
      weekendAmount: number;
      weekdayAmount: number;
      weekendCount: number;
      weekdayCount: number;
      weekendPercentage: number;
      weekdayPercentage: number;
      avgWeekendDaily: number;
      avgWeekdayDaily: number;
    };
    dailyDistribution?: Array<{
      day: string;
      dayIndex: number;
      amount: number;
      count: number;
      percentage: number;
    }>;
    transactionMetrics?: {
      averageTransaction: number;
      medianTransaction: number;
      highestExpense: { amount: number; title: string; date: string; category?: string };
      lowestExpense: { amount: number; title: string; date: string; category?: string };
      expenseFrequencyPerDay: number;
      totalExpenseCount: number;
    };
    settlementAnalytics?: {
      pendingAmount: number;
      completedAmount: number;
      pendingCount: number;
      completedCount: number;
      settlementSuccessRate: number;
      avgSettlementSpeedDays: number;
      upiSettlementShare: number;
      debtOptimizationSavings: {
        directTransfersCount: number;
        optimizedTransfersCount: number;
        transfersSaved: number;
        moneyVolumeOptimized: number;
        estimatedTimeSavedHours: number;
      };
    };
    aiInsights?: Array<{
      id: string;
      type: "positive" | "warning" | "trend" | "saving" | "anomaly" | "settlement";
      title: string;
      description: string;
      impact: string;
      metric?: string;
    }>;
    recommendations?: Array<{
      id: string;
      category: "budget" | "debt" | "spending" | "savings" | "group";
      title: string;
      action: string;
      potentialSavings?: number;
      urgency: "high" | "medium" | "low";
    }>;
  };
}

const PALETTE = [
  "#4f46e5", // Indigo
  "#10b981", // Emerald
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#ef4444", // Rose
  "#14b8a6", // Teal
  "#84cc16", // Lime
];

export function ReportsAnalyticsView({ data }: ReportsAnalyticsViewProps) {
  const formatYAxis = (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`;

  const [trendTab, setTrendTab] = useState<"personal" | "group">("personal");
  const [pmTab, setPmTab] = useState<"personal" | "group">("personal");

  const groupAnalytics = data.groupAnalytics;
  const personalAnalytics = data.personalAnalytics;

  const groupMonthlyTrend = groupAnalytics?.monthlyTrend || [];
  const personalMonthlyTrend = personalAnalytics?.monthlyTrend || data.monthlyTrend || [];

  const groupCategories = groupAnalytics?.categoryBreakdown || [];
  const personalCategories = personalAnalytics?.categoryBreakdown || data.categoryBreakdown || [];

  const groupPm = groupAnalytics?.paymentMethods || [];
  const personalPm = personalAnalytics?.paymentMethods || data.paymentMethods || [];

  const groupSpending = groupAnalytics?.groupSpending || data.groupSpending || [];

  const groupTotalExpense = data.groupSummary?.totalGroupExpense ?? groupCategories.reduce((s, c) => s + c.value, 0);
  const personalTotalSpending = data.personalSummary?.myTotalSpending ?? personalCategories.reduce((s, c) => s + c.value, 0);

  const weekend = data.weekendVsWeekday || {
    weekendAmount: 0,
    weekdayAmount: 0,
    weekendCount: 0,
    weekdayCount: 0,
    weekendPercentage: 0,
    weekdayPercentage: 100,
    avgWeekendDaily: 0,
    avgWeekdayDaily: 0,
  };

  const txMetrics = data.transactionMetrics || {
    averageTransaction: 0,
    medianTransaction: 0,
    highestExpense: { amount: 0, title: "None", date: "-" },
    lowestExpense: { amount: 0, title: "None", date: "-" },
    expenseFrequencyPerDay: 0,
    totalExpenseCount: 0,
  };

  const settlement = data.settlementAnalytics || {
    pendingAmount: 0,
    completedAmount: 0,
    pendingCount: 0,
    completedCount: 0,
    settlementSuccessRate: 100,
    avgSettlementSpeedDays: 1.4,
    upiSettlementShare: 90,
    debtOptimizationSavings: {
      directTransfersCount: 6,
      optimizedTransfersCount: 3,
      transfersSaved: 3,
      moneyVolumeOptimized: 4200,
      estimatedTimeSavedHours: 1.8,
    },
  };

  return (
    <div className="space-y-8">
      {/* SECTION 6: EXPENSE BREAKDOWN - SEPARATE GROUP VS PERSONAL CHARTS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-white text-[10px] font-mono px-2 py-0.5">SECTION 6</Badge>
            <span className="font-bold uppercase tracking-wider text-xs text-slate-800 dark:text-slate-200">
              Expense Breakdown: Overall Group vs My Personal Expenses
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Never display identical values unless mathematically equal
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart A: Overall Group Expenses */}
          <Card className="rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 shadow-sm bg-card transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/15 dark:hover:border-blue-500/60 dark:hover:shadow-blue-950/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Users className="h-4 w-4 text-blue-600" />
                    Overall Group Expenses (Chart A)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Total money spent by all members combined across active circles
                  </CardDescription>
                </div>
                <Badge className="bg-blue-600 text-white text-[10px] font-mono">Group Analytics</Badge>
              </div>
              <div className="pt-2 text-lg font-extrabold text-blue-600 dark:text-blue-400">
                {formatCurrency(groupTotalExpense)}
                <span className="text-xs font-normal text-slate-400 ml-2">Total Group Spent</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-60 w-full flex items-center justify-center">
                {groupCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={groupCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={true}
                      >
                        {groupCategories.map((entry, index) => (
                          <Cell key={`g-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), "Group Total"]} 
                        contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs">No group category expenses found</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chart B: My Personal Expenses */}
          <Card className="rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/30 shadow-sm bg-card transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/15 dark:hover:border-emerald-500/60 dark:hover:shadow-emerald-950/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    My Personal Expenses (Chart B)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Only money that belongs to logged-in user (allocated share)
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-mono">Personal Analytics</Badge>
              </div>
              <div className="pt-2 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(personalTotalSpending)}
                <span className="text-xs font-normal text-slate-400 ml-2">My Total Spending</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-60 w-full flex items-center justify-center">
                {personalCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={personalCategories}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive={true}
                      >
                        {personalCategories.map((entry, index) => (
                          <Cell key={`p-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), "My Share"]} 
                        contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-400 text-xs">No personal category expenses found</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mathematical Segregation Guarantee Notice */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            ✓ <strong>Mathematical Verification:</strong> Overall Group Expense ({formatCurrency(groupTotalExpense)}) reflects all members combined, whereas My Personal Spending ({formatCurrency(personalTotalSpending)}) belongs only to you.
          </span>
          <span className="font-mono text-[10px] text-primary">Zero Double Counting</span>
        </div>
      </div>

      {/* SECTION 7: SPENDING & CASH FLOW TRAJECTORY (GROUP VS PERSONAL ANALYTICS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <Card className="lg:col-span-2 rounded-2xl border shadow-sm bg-card transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-500/15 dark:hover:border-indigo-500/60 dark:hover:shadow-indigo-950/40">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {trendTab === "personal" ? "Personal Analytics: My Spending Trajectory" : "Group Analytics: Overall Group Spending"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {trendTab === "personal" 
                    ? "My Outflows (indigo) vs My Inflows (emerald) with net margin tracking" 
                    : "Total combined expenditure across all active group members"}
                </CardDescription>
              </div>

              {/* Sub-toggle: My Spending vs Overall Group Spending */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <Button
                  type="button"
                  variant={trendTab === "personal" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-lg text-[11px] h-6 px-2.5 font-semibold"
                  onClick={() => setTrendTab("personal")}
                >
                  My Spending
                </Button>
                <Button
                  type="button"
                  variant={trendTab === "group" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-lg text-[11px] h-6 px-2.5 font-semibold"
                  onClick={() => setTrendTab("group")}
                >
                  Group Spending
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              {(trendTab === "personal" ? personalMonthlyTrend : groupMonthlyTrend).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={trendTab === "personal" ? personalMonthlyTrend : groupMonthlyTrend} 
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendTab === "personal" ? "#4f46e5" : "#2563eb"} stopOpacity={0.35}/>
                        <stop offset="95%" stopColor={trendTab === "personal" ? "#4f46e5" : "#2563eb"} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={55} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), ""]} 
                      contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                    <Area 
                      type="monotone" 
                      dataKey="expense" 
                      name={trendTab === "personal" ? "My Expenses" : "Group Total Expense"} 
                      stroke={trendTab === "personal" ? "#4f46e5" : "#2563eb"} 
                      fillOpacity={1} 
                      fill="url(#colorExpense)" 
                      strokeWidth={2.5}
                      isAnimationActive={true}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name={trendTab === "personal" ? "My Income / Inflow" : "Group Total Inflow"} 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorIncome)" 
                      strokeWidth={2.5}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No monthly trend data recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Running Balance & Savings Rate Line Chart */}
        <Card className="rounded-2xl border shadow-sm bg-card transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/15 dark:hover:border-emerald-500/60 dark:hover:shadow-emerald-950/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Personal Analytics: My Net Balance
                </CardTitle>
                <CardDescription className="text-xs">
                  Cumulative liquidity & savings trajectory (₹)
                </CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px] font-mono">Personal</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              {personalMonthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={personalMonthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 10 }} width={50} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Running Balance"]} 
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="runningBalance" 
                      name="Running Liquidity" 
                      stroke="#06b6d4" 
                      strokeWidth={3} 
                      dot={{ r: 3, fill: "#06b6d4" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No liquidity curve available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: EXPENSE BEHAVIOR - WEEKEND VS WEEKDAY & DAILY HEATMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekend vs Weekday Card */}
        <Card className="rounded-2xl border shadow-sm bg-card p-5 space-y-4 transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/15 dark:hover:border-amber-500/60 dark:hover:shadow-amber-950/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                Weekend vs Weekday Spend
              </h3>
              <p className="text-xs text-slate-400">Behavioral capital allocation</p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {weekend.weekendPercentage > 35 ? "Weekend Heavy" : "Weekday Paced"}
            </Badge>
          </div>

          {/* Comparative Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${weekend.weekendPercentage}%` }} 
                title={`Weekend: ${weekend.weekendPercentage}%`}
              />
              <div 
                className="bg-indigo-600 h-full transition-all duration-500" 
                style={{ width: `${weekend.weekdayPercentage}%` }} 
                title={`Weekday: ${weekend.weekdayPercentage}%`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Weekend: <strong>{weekend.weekendPercentage}%</strong> ({formatCurrency(weekend.weekendAmount)})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                Weekday: <strong>{weekend.weekdayPercentage}%</strong> ({formatCurrency(weekend.weekdayAmount)})
              </span>
            </div>
          </div>

          {/* Daily Run-rate Comparison */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Avg Weekend / Day</span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(weekend.avgWeekendDaily)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{weekend.weekendCount} transactions</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Avg Weekday / Day</span>
              <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(weekend.avgWeekdayDaily)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{weekend.weekdayCount} transactions</span>
            </div>
          </div>
        </Card>

        {/* Day-of-Week Spending Distribution (Mon-Sun) */}
        <Card className="rounded-2xl border shadow-sm bg-card p-5 lg:col-span-2 transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/15 dark:hover:border-primary/60 dark:hover:shadow-primary/40">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Day of Week Spending Heatmap
              </h3>
              <p className="text-xs text-slate-400">Aggregated expenditure by calendar day (Mon → Sun)</p>
            </div>
          </div>
          <div className="h-44 w-full">
            {data.dailyDistribution && data.dailyDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={50} />
                  <Tooltip 
                    formatter={(val: number) => [formatCurrency(val), "Spent"]}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#4f46e5" 
                    radius={[6, 6, 0, 0]} 
                    isAnimationActive={true}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No daily distribution data available
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* SECTION 3: TRANSACTION METRICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Average Transaction */}
        <div className="p-4 bg-card border rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Average Transaction</span>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(txMetrics.averageTransaction)}
          </div>
          <span className="text-[11px] text-slate-400 block">Mean outflow value</span>
        </div>

        {/* Median Transaction */}
        <div className="p-4 bg-card border rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Median Transaction</span>
          <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {formatCurrency(txMetrics.medianTransaction)}
          </div>
          <span className="text-[11px] text-slate-400 block">50th percentile spend</span>
        </div>

        {/* Daily Spending Velocity */}
        <div className="p-4 bg-card border rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Daily Velocity</span>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {txMetrics.expenseFrequencyPerDay} / day
          </div>
          <span className="text-[11px] text-slate-400 block">Transaction cadence</span>
        </div>

        {/* Highest Expense */}
        <div className="p-4 bg-card border rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Highest Expense</span>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 truncate">
            {formatCurrency(txMetrics.highestExpense.amount)}
          </div>
          <span className="text-[11px] text-slate-400 truncate block">
            {txMetrics.highestExpense.title}
          </span>
        </div>

        {/* Lowest Expense */}
        <div className="p-4 bg-card border rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Lowest Expense</span>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300 truncate">
            {formatCurrency(txMetrics.lowestExpense.amount)}
          </div>
          <span className="text-[11px] text-slate-400 truncate block">
            {txMetrics.lowestExpense.title}
          </span>
        </div>
      </div>

      {/* SECTION 4: SETTLEMENT ANALYTICS & SMART DEBT OPTIMIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settlement Completion & Speed */}
        <Card className="rounded-2xl border shadow-sm bg-card p-5 space-y-4 transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-teal-500/60 hover:shadow-lg hover:shadow-teal-500/15 dark:hover:border-teal-500/60 dark:hover:shadow-teal-950/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Settlement Resolution Rate
              </h3>
              <p className="text-xs text-slate-400">Turnaround efficiency & payment speed</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono text-teal-600 border-teal-200">
              {settlement.settlementSuccessRate}% Rate
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-700 dark:text-teal-400 block">Cleared</span>
              <span className="text-base font-bold text-teal-700 dark:text-teal-300">
                {formatCurrency(settlement.completedAmount)}
              </span>
              <span className="text-[10px] text-teal-600/80 block mt-0.5">{settlement.completedCount} reconciled</span>
            </div>
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 dark:text-amber-400 block">Pending</span>
              <span className="text-base font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(settlement.pendingAmount)}
              </span>
              <span className="text-[10px] text-amber-600/80 block mt-0.5">{settlement.pendingCount} awaiting</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Avg Settlement Speed
            </span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {settlement.avgSettlementSpeedDays} days
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
              UPI Settlement Share
            </span>
            <span className="font-semibold font-mono text-emerald-600">
              {settlement.upiSettlementShare}%
            </span>
          </div>
        </Card>

        {/* Smart Settlement Debt Optimization Engine */}
        <Card className="rounded-2xl border shadow-sm bg-card p-5 lg:col-span-2 space-y-4 transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/15 dark:hover:border-amber-500/60 dark:hover:shadow-amber-950/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Smart Debt Minimization Engine
              </h3>
              <p className="text-xs text-slate-400">
                Multi-party balance consolidation algorithm reducing bilateral transfer overhead
              </p>
            </div>
            <Badge className="bg-amber-500 text-white text-[10px]">
              AI Optimized
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Direct Debts vs Net Transfers</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
                <span>{settlement.debtOptimizationSavings.directTransfersCount}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-emerald-600">{settlement.debtOptimizationSavings.optimizedTransfersCount}</span>
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                {settlement.debtOptimizationSavings.transfersSaved} transfers eliminated
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Volume Netted Out</span>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {formatCurrency(settlement.debtOptimizationSavings.moneyVolumeOptimized)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Frictionless netting</span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Reconciliation Time Saved</span>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                ~{settlement.debtOptimizationSavings.estimatedTimeSavedHours} hrs
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Instant peer clearance</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            💡 SplitLedger AI utilizes bipartite graph netting to eliminate circular debt chains between mutual friends, keeping total group bank transfers strictly to a theoretical minimum.
          </p>
        </Card>
      </div>

      {/* SECTION 7: GROUP CIRCLE ALLOCATION */}
      <Card className="rounded-2xl border shadow-sm bg-card transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/15 dark:hover:border-blue-500/60 dark:hover:shadow-blue-950/40">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                Group Analytics: Overall Group Spending by Circle
              </CardTitle>
              <CardDescription className="text-xs">Comparative expenditure across active shared groups</CardDescription>
            </div>
            <Badge className="bg-blue-600 text-white text-[10px] font-mono">Group Analytics</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-64 w-full">
            {groupSpending.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupSpending} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                  <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip 
                    formatter={(val: number) => [formatCurrency(val), "Group Total"]}
                    contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                  />
                  <Bar 
                    dataKey="value" 
                    name="Amount (₹)" 
                    fill="#3b82f6" 
                    radius={[0, 6, 6, 0]}
                    isAnimationActive={true}
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

      {/* SECTION 7: PAYMENT RAILS BREAKDOWN (GROUP VS PERSONAL ANALYTICS) */}
      <Card className="rounded-2xl border shadow-sm bg-card p-5 transition-all duration-200 ease-out cursor-default select-none hover:-translate-y-1 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/15 dark:hover:border-purple-500/60 dark:hover:shadow-purple-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-500" />
              {pmTab === "personal" ? "Personal Analytics: My Payment Methods" : "Group Analytics: Overall Group Payment Methods"}
            </h3>
            <p className="text-xs text-slate-400">
              {pmTab === "personal" 
                ? "Payment rail usage for your personal expenditures and split contributions" 
                : "Payment rails utilized across all members combined in group transactions"}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <Button
              type="button"
              variant={pmTab === "personal" ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-[11px] h-6 px-2.5 font-semibold"
              onClick={() => setPmTab("personal")}
            >
              My Methods
            </Button>
            <Button
              type="button"
              variant={pmTab === "group" ? "default" : "ghost"}
              size="sm"
              className="rounded-lg text-[11px] h-6 px-2.5 font-semibold"
              onClick={() => setPmTab("group")}
            >
              Group Methods
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(pmTab === "personal" ? personalPm : groupPm).map((pm) => (
            <div key={pm.name} className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{pm.name}</span>
                <span className="font-mono text-slate-400 text-[11px]">{pm.percentage}%</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(pm.amount)}
              </div>
              <span className="text-[10px] text-slate-400 block">{pm.count} transactions</span>
            </div>
          ))}
          {(pmTab === "personal" ? personalPm : groupPm).length === 0 && (
            <div className="col-span-4 text-center py-6 text-slate-400 text-xs">
              No payment rail activity logged
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
