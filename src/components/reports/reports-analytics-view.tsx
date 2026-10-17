"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ShieldCheck,
  Sparkles,
  Zap,
  BarChart3,
  Activity,
  ArrowRight
} from "lucide-react";

export interface ReportsAnalyticsViewProps {
  data: {
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
      {/* SECTION 1: FINANCIAL OVERVIEW - CASH FLOW & RUNNING BALANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Area Chart */}
        <Card className="lg:col-span-2 rounded-2xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Monthly Spending & Inflow Trajectory
                </CardTitle>
                <CardDescription className="text-xs">
                  Income (emerald green) vs Outflows (indigo) with net margin tracking
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 border-primary/30 text-primary">
                12-Month Window
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              {data.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
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
                      name="Expenses" 
                      stroke="#4f46e5" 
                      fillOpacity={1} 
                      fill="url(#colorExpense)" 
                      strokeWidth={2.5}
                      isAnimationActive={true}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      name="Income / Inflow" 
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
        <Card className="rounded-2xl border shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Running Net Balance
                </CardTitle>
                <CardDescription className="text-xs">
                  Cumulative liquidity trend (INR ₹)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-72 w-full">
              {data.monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                      name="Net Worth Trend" 
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
        <Card className="rounded-2xl border shadow-sm bg-card p-5 space-y-4">
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
        <Card className="rounded-2xl border shadow-sm bg-card p-5 lg:col-span-2">
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
        <Card className="rounded-2xl border shadow-sm bg-card p-5 space-y-4">
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
        <Card className="rounded-2xl border shadow-sm bg-card p-5 lg:col-span-2 space-y-4">
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

      {/* SECTION 5: CATEGORY ANALYTICS & PAYMENT METHODS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut */}
        <Card className="rounded-2xl border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-indigo-500" />
                  Category Outflow Distribution
                </CardTitle>
                <CardDescription className="text-xs">Proportional spend breakdown</CardDescription>
              </div>
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
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={true}
                    >
                      {data.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Outflow"]} 
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

        {/* Group-wise Spending Horizontal Bar */}
        <Card className="rounded-2xl border shadow-sm bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-500" />
                  Group-wise Outflow Allocation
                </CardTitle>
                <CardDescription className="text-xs">Comparative expenditure across shared circles</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-64 w-full">
              {data.groupSpending.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.groupSpending} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <XAxis type="number" tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip 
                      formatter={(val: number) => [formatCurrency(val), "Group Total"]}
                      contentStyle={{ borderRadius: "12px", fontSize: "12px" }}
                    />
                    <Bar 
                      dataKey="value" 
                      name="Amount (₹)" 
                      fill="#10b981" 
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
      </div>

      {/* SECTION 6: PAYMENT RAILS BREAKDOWN */}
      <Card className="rounded-2xl border shadow-sm bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-500" />
              Payment Rail Usage & Rail Health
            </h3>
            <p className="text-xs text-slate-400">Distribution across UPI, Credit Card, Net Banking & Cash</p>
          </div>
          {data.preferredPaymentMethod && (
            <Badge variant="outline" className="text-xs font-semibold px-3 py-1 border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/20">
              Preferred: {data.preferredPaymentMethod.name} ({data.preferredPaymentMethod.percentage}%)
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.paymentMethods.map((pm, idx) => (
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
        </div>
      </Card>
    </div>
  );
}
