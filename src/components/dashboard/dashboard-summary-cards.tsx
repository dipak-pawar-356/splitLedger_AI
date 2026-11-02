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

  // Real-time synchronization across verified financial events
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

  // Comparison labels strictly according to active period filter
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

  // Percentage badge renderer honoring strict financial semantics:
  // Increase: ▲ Green (Red for expense)
  // Decrease: ▼ Red (Green for expense)
  // No Change: ▬ Neutral Gray
  // Unavailable: "No Previous Data"
  const renderTrendBadge = (
    trendValue: number | null | undefined,
    isExpense: boolean = false
  ) => {
    if (isAllTime) {
      return (
        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0 ml-1 text-[10px] sm:text-[11px]">
          N/A
        </span>
      );
    }

    if (trendValue === null || trendValue === undefined) {
      return (
        <span
          className="text-slate-400 dark:text-slate-500 font-medium shrink-0 ml-1 text-[10px] truncate"
          title="No previous period data available"
        >
          No Previous Data
        </span>
      );
    }

    if (trendValue === 0) {
      return (
        <span className="text-slate-400 dark:text-slate-500 font-mono font-bold shrink-0 ml-1 text-[10px] sm:text-[11px]">
          ▬ 0%
        </span>
      );
    }

    const isPositive = trendValue > 0;
    // For expense: spend reduction is favorable (green), spend expansion is unfavorable (red)
    // For income/savings/receivables: positive expansion is favorable (green)
    const isFavorable = isExpense ? !isPositive : isPositive;
    const arrowSymbol = isPositive ? "▲" : "▼";
    const sign = isPositive ? "+" : "";

    return (
      <span
        className={`shrink-0 ml-1 font-mono font-bold text-[10px] sm:text-[11px] inline-flex items-center gap-0.5 ${
          isFavorable
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400"
        }`}
      >
        <span className="text-[9px] leading-none">{arrowSymbol}</span>
        <span>{sign}{trendValue}%</span>
      </span>
    );
  };

  // Settlements dynamic status
  const isPendingSettlement = summary.pendingSettlementsCount > 0;

  // Budget calculations and dynamic status states (Indigo/Blue -> Amber -> Red)
  const remainingBudgetAmt = summary.budget?.remaining ?? 0;
  const budgetUsedPct = summary.budget?.usedPercentage ?? 0;
  const budgetHealth = summary.budget?.health || "On track";

  const isBudgetExceeded = budgetHealth === "Exceeded" || budgetUsedPct > 100 || (summary.budget?.allocated ? remainingBudgetAmt <= 0 : false);
  const isBudgetNearLimit = !isBudgetExceeded && (budgetHealth === "Near limit" || budgetUsedPct >= 80);

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
          {/* Card 1 — Total Income (Emerald Green) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/transactions?type=received"
                className="block h-full group touch-card"
                aria-label="View verified income transactions"
              >
                <Card className="relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border border-emerald-500/25 dark:border-emerald-500/30 shadow-xs hover:border-emerald-500/70 dark:hover:border-emerald-400/80 hover:shadow-xl hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20 hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between">
                  {/* Top Ambient Aura */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                  {/* Luminous Shimmer Border Line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-400/70 dark:via-emerald-400/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Total Income
                      </span>
                      <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-xs group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200">
                      <AnimatedCounter value={formatCurrency(displayedIncome)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">{periodComparisonLabel}</span>
                    {renderTrendBadge(trends.incomeTrend, false)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Total Verified Income</p>
              <p className="text-[11px] text-slate-300">
                Sum of approved received, lent repayments, and verified income entries.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 2 — Total Expenses (Crimson Red) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/transactions?type=paid"
                className="block h-full group touch-card"
                aria-label="View verified expense transactions"
              >
                <Card className="relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border border-rose-500/25 dark:border-rose-500/30 shadow-xs hover:border-rose-500/70 dark:hover:border-rose-400/80 hover:shadow-xl hover:shadow-rose-500/10 dark:hover:shadow-rose-500/20 hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between">
                  {/* Top Ambient Aura */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-rose-500/15 blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                  {/* Luminous Shimmer Border Line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-400/70 dark:via-rose-400/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Total Expenses
                      </span>
                      <div className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-500/20 backdrop-blur-xs group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-200 shrink-0">
                        <TrendingDown className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200">
                      <AnimatedCounter value={formatCurrency(displayedExpenses)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">{periodComparisonLabel}</span>
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

          {/* Card 3 — Total Payable (Warm Amber) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/contacts"
                className="block h-full group touch-card"
                aria-label="View total payables and debts"
              >
                <Card className="relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border border-amber-500/25 dark:border-amber-500/30 shadow-xs hover:border-amber-500/70 dark:hover:border-amber-400/80 hover:shadow-xl hover:shadow-amber-500/10 dark:hover:shadow-amber-500/20 hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between">
                  {/* Top Ambient Aura */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-amber-500/15 blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                  {/* Luminous Shimmer Border Line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 dark:via-amber-400/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Total Payable
                      </span>
                      <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-500/20 backdrop-blur-xs group-hover:-translate-x-0.5 group-hover:translate-y-0.5 group-hover:scale-110 transition-transform duration-200 shrink-0">
                        <ArrowDownLeft className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200">
                      <AnimatedCounter value={formatCurrency(summary.totalPayable)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">You owe to others</span>
                    {renderTrendBadge(trends.payableTrend, true)}
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

          {/* Card 4 — Total Receivable (Royal Blue) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/contacts"
                className="block h-full group touch-card"
                aria-label="View total receivables"
              >
                <Card className="relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border border-blue-500/25 dark:border-blue-500/30 shadow-xs hover:border-blue-500/70 dark:hover:border-blue-400/80 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between">
                  {/* Top Ambient Aura */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-blue-500/15 blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                  {/* Luminous Shimmer Border Line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/70 dark:via-blue-400/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Total Receivable
                      </span>
                      <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-500/20 backdrop-blur-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110 transition-transform duration-200 shrink-0">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200">
                      <AnimatedCounter value={formatCurrency(summary.totalReceivable)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">Others owe you</span>
                    {renderTrendBadge(trends.receivableTrend, false)}
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

          {/* Card 5 — Month Expense (Purple) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/transactions"
                className="block h-full group touch-card"
                aria-label="View month expense history"
              >
                <Card className="relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border border-purple-500/25 dark:border-purple-500/30 shadow-xs hover:border-purple-500/70 dark:hover:border-purple-400/80 hover:shadow-xl hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20 hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between">
                  {/* Top Ambient Aura */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-purple-500/15 blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300" />
                  {/* Luminous Shimmer Border Line */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-400/70 dark:via-purple-400/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Month Expense
                      </span>
                      <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-500/20 backdrop-blur-xs group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-300 truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200">
                      <AnimatedCounter value={formatCurrency(currentMonthExpenseAmt)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px] min-w-0">
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      Diff: {summary.currentMonthExpense?.differenceFormatted || "₹0.00"}
                    </span>
                    {renderTrendBadge(summary.currentMonthExpense?.percentChange, true)}
                  </div>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold text-xs">Monthly Expense Baseline</p>
              <p className="text-[11px] text-slate-300">
                Verified expenses within the active calendar month vs prior month baseline.
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Card 6 — Savings (Teal if surplus, Crimson Red if deficit) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/budgets"
                className="block h-full group touch-card"
                aria-label="View savings and budget planner"
              >
                <Card
                  className={`relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border shadow-xs hover:shadow-xl hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between ${
                    isSavingsPositive
                      ? "border-teal-500/25 dark:border-teal-500/30 hover:border-cyan-400/70 dark:hover:border-cyan-300/80 hover:shadow-teal-500/10 dark:hover:shadow-cyan-500/20"
                      : "border-rose-500/25 dark:border-rose-500/30 hover:border-rose-500/70 dark:hover:border-rose-400/80 hover:shadow-rose-500/10 dark:hover:shadow-rose-500/20"
                  }`}
                >
                  {/* Top Ambient Aura */}
                  <div
                    className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300 ${
                      isSavingsPositive ? "bg-teal-500/15" : "bg-rose-500/15"
                    }`}
                  />
                  {/* Luminous Shimmer Border Line */}
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isSavingsPositive
                        ? "via-cyan-400/70 dark:via-cyan-400/90"
                        : "via-rose-400/70 dark:via-rose-400/90"
                    }`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Savings
                      </span>
                      <div
                        className={`p-1.5 rounded-xl border backdrop-blur-xs group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200 shrink-0 ${
                          isSavingsPositive
                            ? "bg-teal-500/10 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border-teal-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-500/20"
                        }`}
                      >
                        <PiggyBank className="h-4 w-4" />
                      </div>
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-black truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200 ${
                        isSavingsPositive
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      <AnimatedCounter
                        value={`${isSavingsPositive ? "+" : ""}${formatCurrency(savings)}`}
                        duration={0.5}
                      />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">
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

          {/* Card 7 — Settlements (Golden Orange when pending, Emerald Green when all settled) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/groups"
                className="block h-full group touch-card"
                aria-label="View settlement center"
              >
                <Card
                  className={`relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border shadow-xs hover:shadow-xl hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between ${
                    isPendingSettlement
                      ? "border-orange-500/25 dark:border-orange-500/30 hover:border-amber-400/70 dark:hover:border-amber-300/80 hover:shadow-orange-500/10 dark:hover:shadow-amber-500/20"
                      : "border-emerald-500/25 dark:border-emerald-500/30 hover:border-emerald-500/70 dark:hover:border-emerald-400/80 hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20"
                  }`}
                >
                  {/* Top Ambient Aura */}
                  <div
                    className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300 ${
                      isPendingSettlement ? "bg-orange-500/15" : "bg-emerald-500/15"
                    }`}
                  />
                  {/* Luminous Shimmer Border Line */}
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isPendingSettlement
                        ? "via-amber-400/70 dark:via-amber-400/90"
                        : "via-emerald-400/70 dark:via-emerald-400/90"
                    }`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Settlements
                      </span>
                      <div
                        className={`p-1.5 rounded-xl border backdrop-blur-xs transition-transform duration-200 shrink-0 ${
                          isPendingSettlement
                            ? "bg-orange-500/10 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400 border-orange-500/20 group-hover:rotate-45"
                            : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-500/20 group-hover:scale-110"
                        }`}
                      >
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-black truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200 ${
                        isPendingSettlement
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <AnimatedCounter value={formatCurrency(summary.pendingSettlementsAmount)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px] truncate">
                    <span className="text-slate-500 dark:text-slate-400">
                      <AnimatedCounter value={summary.pendingSettlementsCount} duration={0.5} /> active pending
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

          {/* Card 8 — Remaining Budget (Indigo -> Amber -> Red based on budget health) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/budgets"
                className="block h-full group touch-card"
                aria-label="View budget tracker"
              >
                <Card
                  className={`relative overflow-hidden h-full min-h-[135px] sm:min-h-[145px] rounded-2xl border shadow-xs hover:shadow-xl hover:-translate-y-1.5 md:hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] active:duration-75 transition-all duration-200 ease-out transform-gpu cursor-pointer select-none p-3.5 sm:p-4 backdrop-blur-md bg-white/90 dark:bg-slate-900/85 flex flex-col justify-between ${
                    isBudgetExceeded
                      ? "border-rose-500/25 dark:border-rose-500/30 hover:border-rose-500/70 dark:hover:border-rose-400/80 hover:shadow-rose-500/10 dark:hover:shadow-rose-500/20"
                      : isBudgetNearLimit
                      ? "border-amber-500/25 dark:border-amber-500/30 hover:border-amber-500/70 dark:hover:border-amber-400/80 hover:shadow-amber-500/10 dark:hover:shadow-amber-500/20"
                      : "border-indigo-500/25 dark:border-indigo-500/30 hover:border-indigo-500/70 dark:hover:border-indigo-400/80 hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20"
                  }`}
                >
                  {/* Top Ambient Aura */}
                  <div
                    className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-300 ${
                      isBudgetExceeded
                        ? "bg-rose-500/15"
                        : isBudgetNearLimit
                        ? "bg-amber-500/15"
                        : "bg-indigo-500/15"
                    }`}
                  />
                  {/* Luminous Shimmer Border Line */}
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isBudgetExceeded
                        ? "via-rose-400/70 dark:via-rose-400/90"
                        : isBudgetNearLimit
                        ? "via-amber-400/70 dark:via-amber-400/90"
                        : "via-indigo-400/70 dark:via-indigo-400/90"
                    }`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-xs mb-1.5 sm:mb-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-[11px] text-slate-700 dark:text-slate-300 truncate pr-1">
                        Remaining Budget
                      </span>
                      <div
                        className={`p-1.5 rounded-xl border backdrop-blur-xs group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200 shrink-0 ${
                          isBudgetExceeded
                            ? "bg-rose-500/10 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-500/20"
                            : isBudgetNearLimit
                            ? "bg-amber-500/10 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-500/20"
                            : "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-500/20"
                        }`}
                      >
                        <Target className="h-4 w-4" />
                      </div>
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-black truncate tracking-tight font-mono group-hover:brightness-110 transition-[filter] duration-200 ${
                        isBudgetExceeded
                          ? "text-rose-600 dark:text-rose-400"
                          : isBudgetNearLimit
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-indigo-600 dark:text-indigo-400"
                      }`}
                    >
                      <AnimatedCounter value={formatCurrency(remainingBudgetAmt)} duration={0.5} />
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] sm:text-[11px] truncate">
                    <span className="text-slate-500 dark:text-slate-400">{budgetUsedPct}% used</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span
                        className={`font-semibold ${
                          isBudgetExceeded
                            ? "text-rose-600 dark:text-rose-400"
                            : isBudgetNearLimit
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-indigo-600 dark:text-indigo-400"
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
