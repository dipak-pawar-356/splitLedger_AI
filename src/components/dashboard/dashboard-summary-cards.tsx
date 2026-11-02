"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
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
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Clock, 
  Calendar,
  Target
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
    completedSettlementsCount?: number;
    pendingSettlementsStatus?: "Action Required" | "All Settled";
    myGroupsCount?: number;
    budget?: {
      allocated: number;
      spent: number;
      remaining: number;
      usedPercentage: number;
      health: string;
      prevMonthComparison?: string;
    };
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
    payableTrend?: number | null;
    receivableTrend?: number | null;
    budgetTrend?: number | null;
  };
  activePeriod?: string;
}

export function DashboardSummaryCards({
  summary,
  trends,
  activePeriod = "current_month",
}: DashboardSummaryCardsProps) {
  const router = useRouter();

  // Real-time synchronization across events
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
  const displayedIncome = isAllTime
    ? (summary.lifetimeIncome ?? summary.totalIncome ?? 0)
    : (summary.totalIncome ?? 0);
  const displayedExpenses = isAllTime
    ? (summary.lifetimeExpenses ?? summary.totalExpenses ?? 0)
    : (summary.totalExpenses ?? 0);
  const currentMonthExpenseAmt =
    summary.currentMonthExpense?.amount ?? summary.monthlySpending ?? 0;
  const savings = displayedIncome - displayedExpenses;
  const isSavingsPositive = savings >= 0;

  // Comparison labels strictly according to active filter
  const getPeriodComparisonLabel = () => {
    switch (activePeriod) {
      case "today":
        return "vs Yesterday";
      case "this_week":
        return "vs Previous Week";
      case "current_month":
        return "vs Previous Month";
      case "last_month":
        return "vs Month Before Last";
      case "this_year":
      case "year":
        return "vs Previous Year";
      case "all_time":
        return "All Time Total";
      case "custom":
        return "vs Prior Period";
      default:
        return "vs Previous Month";
    }
  };

  const periodComparisonLabel = getPeriodComparisonLabel();

  // Trend badge with zero-division protection and strict accuracy
  const renderTrendBadge = (
    trendValue: number | null | undefined,
    isExpense: boolean = false,
    emptyFallbackText: string = "—"
  ) => {
    if (isAllTime) {
      return <span className="text-slate-400 font-medium shrink-0 ml-1">N/A</span>;
    }
    if (trendValue === null || trendValue === undefined) {
      return (
        <span
          className="text-slate-400 font-medium shrink-0 ml-1 truncate"
          title="No previous comparison available"
        >
          {emptyFallbackText}
        </span>
      );
    }
    const isPositive = trendValue > 0;
    const isNeutral = trendValue === 0;

    let colorClass = "text-slate-400 font-semibold";
    if (!isNeutral) {
      if (isExpense) {
        colorClass = isPositive
          ? "text-rose-600 dark:text-rose-400 font-semibold"
          : "text-emerald-600 dark:text-emerald-400 font-semibold";
      } else {
        colorClass = isPositive
          ? "text-emerald-600 dark:text-emerald-400 font-semibold"
          : "text-rose-600 dark:text-rose-400 font-semibold";
      }
    }

    const sign = isPositive ? "+" : "";
    return (
      <span className={`shrink-0 ml-1 font-mono font-bold ${colorClass}`}>
        {sign}{trendValue}%
      </span>
    );
  };

  const isPendingSettlement = summary.pendingSettlementsCount > 0;
  const remainingBudgetAmt = summary.budget?.remaining ?? 0;
  const budgetUsedPct = summary.budget?.usedPercentage ?? 0;
  const budgetHealth = summary.budget?.health || "On track";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Header Label */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Financial Summary
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Real-time live aggregation across verified ledger transactions, settlements & groups
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            All amounts in INR (₹)
          </span>
        </div>

        {/* 8 CARDS BALANCED GRID: 4 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-4.5">
          {/* Card 1 — Total Income */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/transactions?type=received"
                className="block h-full group touch-card"
                aria-label="View verified income transactions"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-emerald-500/60 dark:hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Total Income
                      </span>
                      <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(displayedIncome)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">{periodComparisonLabel}</span>
                    {renderTrendBadge(trends.incomeTrend, false)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Verified Income</p>
              <p className="text-[11px] text-slate-300">
                Sum of approved received, lent repayments, and income transactions.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 2 — Total Expenses */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/transactions?type=paid"
                className="block h-full group touch-card"
                aria-label="View verified expense transactions"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-rose-500/60 dark:hover:border-rose-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-rose-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Total Expenses
                      </span>
                      <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(displayedExpenses)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">{periodComparisonLabel}</span>
                    {renderTrendBadge(trends.spendingTrend, true)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Verified Expenses</p>
              <p className="text-[11px] text-slate-300">
                Sum of approved paid and borrowed outflow entries.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 3 — Total Payable */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/contacts"
                className="block h-full group touch-card"
                aria-label="View total payables and debts"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-amber-500/60 dark:hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-amber-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Total Payable
                      </span>
                      <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <ArrowDownLeft className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(summary.totalPayable)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">You owe to others</span>
                    {renderTrendBadge(trends.payableTrend, true, "—")}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Outstanding Payable</p>
              <p className="text-[11px] text-slate-300">
                Current outstanding debts owed to contacts and group members.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 4 — Total Receivable */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/contacts"
                className="block h-full group touch-card"
                aria-label="View total receivables"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-blue-500/60 dark:hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Total Receivable
                      </span>
                      <div className="p-1.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(summary.totalReceivable)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">Others owe you</span>
                    {renderTrendBadge(trends.receivableTrend, false, "—")}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Outstanding Receivable</p>
              <p className="text-[11px] text-slate-300">
                Verified outstanding balances awaiting collection from peers.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 5 — Month Expense */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/transactions"
                className="block h-full group touch-card"
                aria-label="View month expense history"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-purple-500/60 dark:hover:border-purple-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-purple-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Month Expense
                      </span>
                      <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(currentMonthExpenseAmt)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px] min-w-0">
                    <span className="text-slate-400 truncate">
                      Diff: {summary.currentMonthExpense?.differenceFormatted || "₹0.00"}
                    </span>
                    {summary.currentMonthExpense?.trendFormatted &&
                    summary.currentMonthExpense.trendFormatted !== "—" ? (
                      <span
                        className={`font-semibold font-mono shrink-0 ml-1 ${
                          summary.currentMonthExpense.trend === "up"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {summary.currentMonthExpense.trendFormatted}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium shrink-0 ml-1">No comparison</span>
                    )}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Monthly Expense Baseline</p>
              <p className="text-[11px] text-slate-300">
                Verified expenses within the active calendar month vs prior month.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 6 — Savings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/budgets"
                className="block h-full group touch-card"
                aria-label="View savings and budget planner"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-teal-500/60 dark:hover:border-teal-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-teal-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Savings
                      </span>
                      <div
                        className={`p-1.5 rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0 ${
                          isSavingsPositive
                            ? "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                        }`}
                      >
                        <PiggyBank className="h-4 w-4" />
                      </div>
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-black truncate tracking-tight font-mono ${
                        isSavingsPositive
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <AnimatedCounter
                        value={`${isSavingsPositive ? "+" : ""}${formatCurrency(savings)}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-400 truncate">
                      {isSavingsPositive ? "Net surplus" : "Net deficit"}
                    </span>
                    {renderTrendBadge(trends.balanceTrend, false)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Real Net Savings</p>
              <p className="text-[11px] text-slate-300">
                Formula: Total Verified Income − Total Verified Expenses.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 7 — Settlements */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/groups"
                className="block h-full group touch-card"
                aria-label="View settlement center"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-amber-500/60 dark:hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-amber-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Settlements
                      </span>
                      <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(summary.pendingSettlementsAmount)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px] truncate">
                    <span className="text-slate-400">
                      <AnimatedCounter value={summary.pendingSettlementsCount} /> active pending
                    </span>
                    <span
                      className={`font-semibold shrink-0 ml-1 ${
                        isPendingSettlement
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isPendingSettlement ? "Action Required" : "All Settled"}
                    </span>
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Pending Group & Peer Settlements</p>
              <p className="text-[11px] text-slate-300">
                {summary.completedSettlementsCount !== undefined
                  ? `${summary.completedSettlementsCount} completed settlements recorded.`
                  : "Tracks all pending group settlement obligations."}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 8 — Remaining Budget */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/budgets"
                className="block h-full group touch-card"
                aria-label="View budget tracker"
              >
                <Card className="h-full min-h-[125px] sm:min-h-[140px] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-3.5 sm:p-4 hover:border-emerald-500/60 dark:hover:border-emerald-500/40 hover:-translate-y-1 hover:shadow-md hover:shadow-emerald-500/5 active:scale-[0.98] transition-all duration-200 ease-out bg-card cursor-pointer flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-200 truncate pr-1">
                        Remaining Budget
                      </span>
                      <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <Target className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight font-mono">
                      <AnimatedCounter value={formatCurrency(remainingBudgetAmt)} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px] truncate">
                    <span className="text-slate-400">{budgetUsedPct}% used</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span
                        className={`font-semibold ${
                          budgetHealth === "Exceeded"
                            ? "text-rose-600 dark:text-rose-400"
                            : budgetHealth === "Near limit"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {budgetHealth}
                      </span>
                      {trends.budgetTrend !== null && trends.budgetTrend !== undefined && (
                        renderTrendBadge(trends.budgetTrend, true)
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Remaining Budget Allowance</p>
              <p className="text-[11px] text-slate-300">
                Formula: Allocated Budget − Approved Expenses (
                {summary.budget?.allocated
                  ? `Allocated: ₹${summary.budget.allocated.toLocaleString("en-IN")}`
                  : "No active target set"}
                ).
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
