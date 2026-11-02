"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import Link from "next/link";
import { subscribeFinancialEvents } from "@/lib/events/financial-events";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Clock, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface DashboardSummaryCardsProps {
  summary: {
    totalReceivable: number;
    totalPayable: number;
    netBalance: number;
    totalIncome?: number;
    totalExpenses?: number;
    lifetimeIncome?: number;
    lifetimeExpenses?: number;
    monthlyContactIncome?: number;
    monthlyContactExpense?: number;
    monthlySpending: number;
    monthlyIncome: number;
    savings: number;
    totalTransactions: number;
    pendingSettlementsAmount: number;
    pendingSettlementsCount: number;
    pendingSettlementsStatus?: "Action Required" | "All Settled";
    myGroupsCount?: number;
    previousMonthIncome?: {
      amount: number;
      priorAmount?: number;
      monthName: string;
      difference: number;
      percentChange: number | null;
    };
    previousMonthExpense?: {
      monthName: string;
      shortMonthName: string;
      priorMonthName: string;
      amount: number;
      percentChange: number | null;
      trend: "up" | "down" | "neutral";
      comparisonText: string;
    };
    currentMonthExpense?: {
      amount: number;
      prevMonthAmount: number;
      difference: number;
      differenceFormatted: string;
      percentChange: number | null;
      trend: "up" | "down" | "neutral";
      trendFormatted: string;
    };
  };
  trends: {
    spendingTrend: number | null;
    incomeTrend: number | null;
    balanceTrend: number | null;
  };
  activePeriod?: string;
}

export function DashboardSummaryCards({ summary, trends, activePeriod = "current_month" }: DashboardSummaryCardsProps) {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = subscribeFinancialEvents((payload) => {
      if (
        payload.type === "transaction:created" ||
        payload.type === "transaction:updated" ||
        payload.type === "transaction:deleted" ||
        payload.type === "expense:created" ||
        payload.type === "expense:updated" ||
        payload.type === "expense:deleted" ||
        payload.type === "income:added" ||
        payload.type === "settlement:completed" ||
        payload.type === "financial:data-changed"
      ) {
        router.refresh();
      }
    });

    return unsubscribe;
  }, [router]);

  const isAllTime = activePeriod === "all_time";
  const displayedIncome = isAllTime ? (summary.lifetimeIncome ?? summary.totalIncome ?? 0) : (summary.totalIncome ?? 0);
  const displayedExpenses = isAllTime ? (summary.lifetimeExpenses ?? summary.totalExpenses ?? 0) : (summary.totalExpenses ?? 0);
  const currentMonthExpenseAmt = summary.currentMonthExpense?.amount ?? summary.monthlySpending ?? 0;
  const savings = displayedIncome - displayedExpenses;
  const isSavingsPositive = savings >= 0;

  const getPeriodComparisonLabel = () => {
    switch (activePeriod) {
      case "all_time":
        return "All-time total";
      case "last_month":
        return "vs Month Before";
      case "this_week":
        return "vs Previous Week";
      case "today":
        return "vs Yesterday";
      case "custom":
        return "vs Prior Period";
      case "current_month":
      default:
        return "vs Previous Month";
    }
  };

  const periodComparisonLabel = getPeriodComparisonLabel();

  const renderTrendBadge = (trendValue: number | null | undefined, isExpense: boolean = false) => {
    if (trendValue === null || trendValue === undefined || isAllTime) {
      return <span className="text-slate-400 font-medium shrink-0 ml-1">—</span>;
    }
    const isPositive = trendValue > 0;
    const isNeutral = trendValue === 0;

    let colorClass = "text-slate-400 font-semibold";
    if (!isNeutral) {
      if (isExpense) {
        colorClass = isPositive ? "text-rose-600 dark:text-rose-400 font-semibold" : "text-emerald-600 dark:text-emerald-400 font-semibold";
      } else {
        colorClass = isPositive ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-600 dark:text-rose-400 font-semibold";
      }
    }

    const sign = isPositive ? "+" : "";
    return (
      <span className={`shrink-0 ml-1 ${colorClass}`}>
        {sign}{trendValue}%
      </span>
    );
  };

  // Income Comparison tooltip details
  const prevIncomeAmt = summary.previousMonthIncome?.priorAmount ?? summary.previousMonthIncome?.amount ?? 0;
  const incomeDiff = displayedIncome - prevIncomeAmt;
  const incomeDiffFormatted = incomeDiff >= 0 
    ? `+₹${incomeDiff.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-₹${Math.abs(incomeDiff).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Expense Comparison tooltip details
  const prevExpAmt = summary.currentMonthExpense?.prevMonthAmount ?? summary.previousMonthExpense?.amount ?? 0;
  const expDiff = displayedExpenses - prevExpAmt;
  const expDiffFormatted = expDiff >= 0
    ? `+₹${expDiff.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-₹${Math.abs(expDiff).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isPendingSettlement = summary.pendingSettlementsCount > 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Financial Summary
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time live aggregation across verified ledger transactions, settlements & groups
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">All amounts in INR (₹)</span>
        </div>

        {/* Row 1: Total Income, Total Expenses, Total Payable, Total Receivable - 4 Columns Balanced Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 lg:gap-4">
          {/* Card 1 — Total Income */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard/transactions?type=received" className="block h-full group touch-card">
                <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-emerald-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Total Income
                      </span>
                      <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
                      <AnimatedCounter value={formatCurrency(displayedIncome)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[9px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">{periodComparisonLabel}</span>
                    {renderTrendBadge(trends.incomeTrend, false)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Approved Income</p>
              <p className="text-[11px] text-slate-300">
                {isAllTime
                  ? "All verified lifetime income entries."
                  : prevIncomeAmt > 0
                  ? `Previous: ₹${prevIncomeAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} • Difference: ${incomeDiffFormatted}`
                  : "No previous period income on record."}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 2 — Total Expenses */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/dashboard/transactions?type=paid" className="block h-full group touch-card">
                <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-rose-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Total Expenses
                      </span>
                      <div className="p-1 sm:p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                        <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                      </div>
                    </div>
                    <div className="text-base sm:text-xl lg:text-2xl font-black text-rose-600 dark:text-rose-400 truncate tracking-tight">
                      <AnimatedCounter value={formatCurrency(displayedExpenses)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[9px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">{periodComparisonLabel}</span>
                    {renderTrendBadge(trends.spendingTrend, true)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Approved Expenses</p>
              <p className="text-[11px] text-slate-300">
                {isAllTime
                  ? "All verified lifetime expense debits."
                  : prevExpAmt > 0
                  ? `Previous: ₹${prevExpAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} • Difference: ${expDiffFormatted}`
                  : "No previous period expenses on record."}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 3 — Total Payable */}
          <Link href="/dashboard/settlements?tab=payable" className="block h-full group touch-card">
            <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-amber-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 truncate pr-1">
                    Total Payable
                  </span>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                    <ArrowDownLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
                <div className="text-base sm:text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight">
                  <AnimatedCounter value={formatCurrency(summary.totalPayable)} />
                </div>
              </div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
                You owe to others
              </p>
            </Card>
          </Link>

          {/* Card 4 — Total Receivable */}
          <Link href="/dashboard/contacts" className="block h-full group touch-card">
            <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-blue-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 truncate pr-1">
                    Total Receivable
                  </span>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                    <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
                <div className="text-base sm:text-xl lg:text-2xl font-black text-blue-600 dark:text-blue-400 truncate tracking-tight">
                  <AnimatedCounter value={formatCurrency(summary.totalReceivable)} />
                </div>
              </div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
                Others owe you
              </p>
            </Card>
          </Link>
        </div>

        {/* Row 2: Month Expense, Savings, Settlements - Clean 3-Column Rebalanced Grid (Total Groups removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3.5 lg:gap-4">
          {/* Card 5 — Month Expense */}
          <Link href="/dashboard/transactions?period=current_month&type=paid" className="block h-full group touch-card">
            <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-purple-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 truncate pr-1">
                    Month Expense
                  </span>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
                <div className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight">
                  <AnimatedCounter value={formatCurrency(currentMonthExpenseAmt)} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[9px] sm:text-[11px] min-w-0">
                <span className="text-slate-400 truncate">
                  Diff: {summary.currentMonthExpense?.differenceFormatted || "₹0.00"}
                </span>
                {summary.currentMonthExpense?.trendFormatted && summary.currentMonthExpense.trendFormatted !== "—" ? (
                  <span className={`font-semibold shrink-0 ml-1 ${
                    summary.currentMonthExpense.trend === "up" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {summary.currentMonthExpense.trendFormatted}
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium shrink-0 ml-1">—</span>
                )}
              </div>
            </Card>
          </Link>

          {/* Card 6 — Savings */}
          <Link href="/dashboard/analytics" className="block h-full group touch-card">
            <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-teal-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 truncate pr-1">
                    Savings
                  </span>
                  <div className={`p-1 sm:p-1.5 rounded-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0 ${
                    isSavingsPositive 
                      ? "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400" 
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  }`}>
                    <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
                <div className={`text-base sm:text-xl lg:text-2xl font-black truncate tracking-tight ${
                  isSavingsPositive ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"
                }`}>
                  <AnimatedCounter value={`${isSavingsPositive ? "+" : ""}${formatCurrency(savings)}`} />
                </div>
              </div>
              <p className="text-[9px] sm:text-[11px] text-slate-400 mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
                {isSavingsPositive ? "Net surplus" : "Net deficit"}
              </p>
            </Card>
          </Link>

          {/* Card 7 — Pending Settlements */}
          <Link href="/dashboard/settlements" className="block h-full group touch-card">
            <Card className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-2.5 sm:p-4 hover:border-amber-500/60 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] transition-all duration-300 bg-card cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 sm:mb-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 truncate pr-1">
                    Settlements
                  </span>
                  <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shrink-0">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
                <div className="text-base sm:text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight">
                  <AnimatedCounter value={formatCurrency(summary.pendingSettlementsAmount)} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[9px] sm:text-[11px] truncate">
                <span className="text-slate-400">
                  <AnimatedCounter value={summary.pendingSettlementsCount} /> active pending
                </span>
                <span className={`font-semibold shrink-0 ml-1 ${isPendingSettlement ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {isPendingSettlement ? "Action Required" : "All Settled"}
                </span>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </TooltipProvider>
  );
}
