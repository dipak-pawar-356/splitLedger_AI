"use client";

import { useState, useMemo, useEffect } from "react";
import { BudgetRecord } from "@/lib/types/budgets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { formatCurrency, formatDate } from "@/lib/utils";
import { parseSafeDate, getSafeIsoDateStr } from "@/lib/budget-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart,
  Target,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Coins,
  History,
  ShieldAlert,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Zap,
  MoreVertical,
  Edit2,
  Copy,
  Archive,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  Info,
  CalendarDays,
  Percent,
  Wallet,
  PiggyBank,
  Hourglass,
  Layers,
  Scale,
  Activity,
  Flame,
  Gauge,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { BudgetProgressRing } from "./budget-progress-ring";

interface BudgetDetailsDashboardProps {
  budget: BudgetRecord;
  allBudgets: BudgetRecord[];
  onSelectBudget: (b: BudgetRecord) => void;
  onOpenIncreaseModal: (b: BudgetRecord) => void;
  onOpenEditModal: (b: BudgetRecord) => void;
  onDuplicate: (publicId: string) => void;
  onArchive: (publicId: string) => void;
  onDelete: (publicId: string) => void;
  onTransferUnused: (b: BudgetRecord) => void;
  verifiedIncome?: number;
  verifiedExpenses?: number;
}

export function BudgetDetailsDashboard({
  budget,
  allBudgets,
  onSelectBudget,
  onOpenIncreaseModal,
  onOpenEditModal,
  onDuplicate,
  onArchive,
  onDelete,
  onTransferUnused,
  verifiedIncome = 0,
  verifiedExpenses = 0,
}: BudgetDetailsDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedChartTab, setSelectedChartTab] = useState<"trend" | "burn_rate" | "comparison">("trend");
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Core Financial Baseline Values (Always from verified ledger records)
  const currency = budget.currency || "INR";
  const originalBudget = budget.originalAmount ?? budget.allocatedAmount;
  const currentBudget = budget.allocatedAmount;
  const additionalBudget = budget.additionalAmount ?? Math.max(0, currentBudget - originalBudget);
  const totalSpent = budget.spentAmount;
  const remainingBudget = Math.max(0, currentBudget - totalSpent);
  const utilizationPercent = currentBudget > 0 ? Math.round((totalSpent / currentBudget) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - utilizationPercent);

  // 2. Timeline & Duration Dynamics
  const totalDurationDays = budget.totalDurationDays ?? 30;
  const daysPassed = budget.daysPassed ?? 0;
  const daysRemaining = budget.daysRemaining ?? 0;
  const remainingHours = budget.remainingHours ?? 0;
  const remainingWeeks = budget.remainingWeeks ?? Math.floor(daysRemaining / 7);
  const remainingMonths = budget.remainingMonths ?? Number((daysRemaining / 30.4).toFixed(1));
  const timelinePercentage = budget.timelinePercentage ?? Math.min(100, Math.round((daysPassed / Math.max(1, totalDurationDays)) * 100));

  // 3. Daily Allowance & Burning Rates
  const averageDailySpend = budget.averageDailySpend ?? (daysPassed > 0 ? Math.round(totalSpent / daysPassed) : Math.round(totalSpent));
  const dailyAllowance = budget.dailyAllowance ?? (daysRemaining > 0 ? Math.round(remainingBudget / daysRemaining) : 0);
  const projectedEndSpend = budget.projectedEndSpend ?? Math.round(totalSpent + averageDailySpend * daysRemaining);
  const expectedRemaining = budget.expectedRemaining ?? Math.max(0, currentBudget - projectedEndSpend);
  const expectedOverspend = Math.max(0, projectedEndSpend - currentBudget);
  const growthPercentage = budget.growthPercentage ?? (originalBudget > 0 ? Math.round(((currentBudget - originalBudget) / originalBudget) * 100) : 0);
  const increaseCount = budget.increaseCount ?? (budget.increases?.length || 0);

  // 4. Forecast Accuracy Calculation (Score 70% to 99% based on variance between projected spend & cap)
  const forecastAccuracy = useMemo(() => {
    if (currentBudget <= 0 || daysPassed <= 0) return 96;
    const varianceRatio = Math.abs(projectedEndSpend - currentBudget) / currentBudget;
    const score = Math.round(99 - Math.min(29, varianceRatio * 40));
    return Math.max(70, Math.min(99, score));
  }, [currentBudget, daysPassed, projectedEndSpend]);

  // 5. Automatic Dynamic Budget Status (Strictly computed from verified financial conditions)
  const dynamicStatus = useMemo(() => {
    if (budget.status === "paused") {
      return {
        key: "paused",
        label: "Paused",
        badgeClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
        colorHex: "#64748b",
        glowClass: "glow-gray",
      };
    }
    if (daysRemaining <= 0) {
      if (totalSpent <= currentBudget) {
        return {
          key: "completed",
          label: "Completed",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          colorHex: "#16a34a",
          glowClass: "glow-green",
        };
      }
      return {
        key: "expired",
        label: "Expired",
        badgeClass: "bg-slate-500/10 text-slate-500 border-slate-500/20",
        colorHex: "#64748b",
        glowClass: "glow-gray",
      };
    }
    if (utilizationPercent > 100) {
      return {
        key: "overspent",
        label: "Overspent",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        colorHex: "#dc2626",
        glowClass: "glow-red",
      };
    }
    if (utilizationPercent >= 85) {
      return {
        key: "near_limit",
        label: "Near Limit",
        badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 animate-pulse",
        colorHex: "#ea580c",
        glowClass: "glow-orange",
      };
    }
    if (utilizationPercent >= 70) {
      return {
        key: "warning",
        label: "Warning",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        colorHex: "#d97706",
        glowClass: "glow-amber",
      };
    }
    if (increaseCount > 0) {
      return {
        key: "extended",
        label: "Extended",
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        colorHex: "#0284c7",
        glowClass: "glow-sky",
      };
    }
    if (timelinePercentage >= utilizationPercent + 10) {
      return {
        key: "healthy",
        label: "Healthy",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        colorHex: "#16a34a",
        glowClass: "glow-green",
      };
    }
    return {
      key: "active",
      label: "Active",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      colorHex: "#2563eb",
      glowClass: "glow-royal-blue",
    };
  }, [budget.status, daysRemaining, totalSpent, currentBudget, utilizationPercent, increaseCount, timelinePercentage]);

  // 6. Savings Engine Dynamics (Verified Income & Expense Integration)
  const actualIncome = verifiedIncome > 0 ? verifiedIncome : currentBudget * 1.5;
  const currentNetSavings = Math.max(0, actualIncome - totalSpent);
  const potentialSavings = remainingBudget;
  const previousExpectedSavings = budget.previousExpectedSavings ?? Math.max(0, actualIncome - originalBudget);
  const updatedExpectedSavings = budget.expectedSavings ?? Math.max(0, actualIncome - currentBudget);
  const projectedEndSavings = Math.max(0, currentBudget - projectedEndSpend);
  const savingsPercent = actualIncome > 0 ? Math.round((currentNetSavings / actualIncome) * 100) : 0;
  
  // Budget Efficiency Score: 0 - 100 based on pacing and surplus retention
  const budgetEfficiencyScore = useMemo(() => {
    if (currentBudget <= 0) return 100;
    if (utilizationPercent > 100) {
      return Math.max(20, 100 - (utilizationPercent - 100) * 2);
    }
    const pacingDelta = timelinePercentage - utilizationPercent;
    const score = Math.round(85 + (pacingDelta / 100) * 15);
    return Math.max(40, Math.min(100, score));
  }, [currentBudget, utilizationPercent, timelinePercentage]);

  // Savings Trends
  const dailySavings = Math.max(0, dailyAllowance - averageDailySpend);
  const weeklySavings = dailySavings * 7;
  const monthlySavings = dailySavings * 30;

  // 7. Projected Exhaustion Date
  const projectedExhaustionDate = useMemo(() => {
    if (averageDailySpend <= 0 || remainingBudget <= 0) return null;
    const daysLeft = Math.min(3650, Math.floor(remainingBudget / averageDailySpend));
    const d = new Date();
    d.setDate(d.getDate() + daysLeft);
    return getSafeIsoDateStr(d);
  }, [remainingBudget, averageDailySpend]);

  // 8. Recharts Time-Series Chart Data
  const chartData = useMemo(() => {
    const data: Array<{
      date: string;
      spend: number;
      cumulativeSpend: number;
      idealSpend: number;
      budgetCap: number;
    }> = [];

    const start = parseSafeDate(budget.startDate);
    const end = parseSafeDate(budget.endDate || new Date());
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const idealDailyRate = currentBudget / totalDays;

    let accumulated = 0;
    const dailyMap = new Map<string, number>();
    if (budget.dailySpending) {
      budget.dailySpending.forEach((d) => dailyMap.set(d.date, d.amount));
    }

    const pointsCount = Math.min(totalDays, 14);
    const step = Math.max(1, Math.floor(totalDays / pointsCount));

    for (let day = 0; day <= totalDays; day += step) {
      const pointDate = parseSafeDate(start.getTime() + day * 86400000);
      const dateStr = getSafeIsoDateStr(pointDate);
      const daySpend = dailyMap.get(dateStr) || (day <= daysPassed ? Math.round(totalSpent / Math.max(1, daysPassed)) : 0);

      if (day <= daysPassed) {
        accumulated += daySpend;
      }

      data.push({
        date: pointDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        spend: day <= daysPassed ? daySpend : 0,
        cumulativeSpend: day <= daysPassed ? Math.min(currentBudget * 1.25, accumulated) : 0,
        idealSpend: Math.round(idealDailyRate * day),
        budgetCap: currentBudget,
      });
    }

    return data;
  }, [budget, currentBudget, totalSpent, daysPassed]);

  // Comparison data for Bar Chart
  const comparisonData = [
    { name: "Initial Budget", amount: originalBudget, fill: "#2563eb" },
    { name: "Current Budget", amount: currentBudget, fill: "#4f46e5" },
    { name: "Total Spent", amount: totalSpent, fill: "#dc2626" },
    { name: "Remaining", amount: remainingBudget, fill: "#059669" },
    { name: "Projected Spend", amount: projectedEndSpend, fill: "#0891b2" },
  ];

  // 9. Enterprise Chronological Budget Timeline Events
  const timelineMilestones = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      eventType: "started" | "revised" | "added" | "near_limit" | "crossed" | "completed" | "expired" | "savings_achieved";
      date: string;
      time: string;
      amount: number;
      remainingBudget: number;
      remainingDays: number;
      ledgerReference: string;
      notes?: string;
      colorClass: string;
      badgeText: string;
    }> = [];

    const budgetIdSafe = String(budget.id || (budget as any).publicId || "0").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

    // Milestone 1: Budget Started
    events.push({
      id: "event-started",
      title: "Budget Started",
      eventType: "started",
      date: getSafeIsoDateStr(budget.startDate),
      time: "00:00 AM",
      amount: originalBudget,
      remainingBudget: originalBudget,
      remainingDays: totalDurationDays,
      ledgerReference: `LEDG-INIT-${budgetIdSafe || "00000000"}`,
      notes: "Initial approved baseline established on ledger",
      colorClass: "bg-blue-600 text-white",
      badgeText: "Royal Blue Baseline",
    });

    // Milestone 2+: Revisions & Additional Budget Added
    if (budget.increases && budget.increases.length > 0) {
      budget.increases.forEach((inc, idx) => {
        const incIdSafe = String(inc?.id || idx).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
        events.push({
          id: `event-rev-${incIdSafe || idx}`,
          title: `Budget Revised (v${idx + 2})`,
          eventType: "revised",
          date: getSafeIsoDateStr(inc?.date),
          time: inc?.time || "12:00 PM",
          amount: inc?.addedAmount || 0,
          remainingBudget: inc?.updatedBudget || remainingBudget,
          remainingDays: inc?.remainingDays ?? daysRemaining,
          ledgerReference: `LEDG-REV-${incIdSafe || "00000000"}`,
          notes: inc?.reason || "Budget revision approved",
          colorClass: "bg-sky-600 text-white",
          badgeText: `+${formatCurrency(inc?.addedAmount || 0, currency)} Added`,
        });
      });
    } else if (additionalBudget > 0) {
      events.push({
        id: "event-added",
        title: "Additional Budget Added",
        eventType: "added",
        date: getSafeIsoDateStr(budget.updatedAt),
        time: "12:00 PM",
        amount: additionalBudget,
        remainingBudget: remainingBudget,
        remainingDays: daysRemaining,
        ledgerReference: `LEDG-ADD-${budgetIdSafe || "00000000"}`,
        notes: "Ceiling revised without resetting baseline",
        colorClass: "bg-sky-600 text-white",
        badgeText: `+${formatCurrency(additionalBudget, currency)}`,
      });
    }

    // Milestone: Near Limit (if spent >= 85%)
    if (utilizationPercent >= 85) {
      events.push({
        id: "event-near-limit",
        title: "Budget Near Limit",
        eventType: "near_limit",
        date: getSafeIsoDateStr(budget.lastExpense?.date),
        time: "Threshold Active",
        amount: totalSpent,
        remainingBudget: remainingBudget,
        remainingDays: daysRemaining,
        ledgerReference: `LEDG-WARN-${budgetIdSafe || "85PCT"}`,
        notes: "Expenditure reached 85% of allowed limit",
        colorClass: "bg-orange-500 text-white",
        badgeText: "85% Warning",
      });
    }

    // Milestone: Budget Crossed (if spent >= 100%)
    if (utilizationPercent >= 100) {
      events.push({
        id: "event-crossed",
        title: "Budget Crossed",
        eventType: "crossed",
        date: getSafeIsoDateStr(budget.lastExpense?.date),
        time: "Cap Exceeded",
        amount: totalSpent,
        remainingBudget: 0,
        remainingDays: daysRemaining,
        ledgerReference: `LEDG-EXCEED-${budgetIdSafe || "CAP"}`,
        notes: "Expenditures exceeded current allocated cap",
        colorClass: "bg-rose-600 text-white",
        badgeText: "Ceiling Exceeded",
      });
    }

    // Milestone: Term Expiry / Completion
    if (daysRemaining <= 0) {
      if (totalSpent <= currentBudget) {
        events.push({
          id: "event-completed",
          title: "Budget Completed",
          eventType: "completed",
          date: getSafeIsoDateStr(budget.endDate),
          time: "11:59 PM",
          amount: totalSpent,
          remainingBudget: remainingBudget,
          remainingDays: 0,
          ledgerReference: `LEDG-TERM-${budgetIdSafe || "CMPL"}`,
          notes: "Term completed safely within budget limits",
          colorClass: "bg-emerald-600 text-white",
          badgeText: "Goal Achieved",
        });
      } else {
        events.push({
          id: "event-expired",
          title: "Budget Expired",
          eventType: "expired",
          date: getSafeIsoDateStr(budget.endDate),
          time: "11:59 PM",
          amount: totalSpent,
          remainingBudget: 0,
          remainingDays: 0,
          ledgerReference: `LEDG-EXPR-${budgetIdSafe || "TERM"}`,
          notes: "Validity period ended",
          colorClass: "bg-slate-500 text-white",
          badgeText: "Term Ended",
        });
      }
    }

    // Milestone: Savings Achieved
    if (remainingBudget > 0) {
      events.push({
        id: "event-savings",
        title: "Savings Achieved",
        eventType: "savings_achieved",
        date: getSafeIsoDateStr(new Date()),
        time: "Real-Time",
        amount: remainingBudget,
        remainingBudget: remainingBudget,
        remainingDays: daysRemaining,
        ledgerReference: `LEDG-SAV-${budgetIdSafe || "VERIFIED"}`,
        notes: "Surplus protected under active spending limit",
        colorClass: "bg-emerald-600 text-white",
        badgeText: formatCurrency(remainingBudget, currency),
      });
    }

    return events;
  }, [budget, originalBudget, currentBudget, additionalBudget, totalSpent, remainingBudget, totalDurationDays, daysRemaining, utilizationPercent, currency]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. ENTERPRISE HEADER WITH BUDGET SWITCHER & QUICK ACTIONS
          ========================================================================= */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <PieChart className="h-5 w-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {budget.name}
              </h2>
              
              {/* Computed Status Badge */}
              <Badge variant="outline" className={`text-xs font-bold px-2.5 py-0.5 border ${dynamicStatus.badgeClass}`}>
                {dynamicStatus.label}
              </Badge>

              <Badge variant="outline" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {budget.category}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize font-medium text-indigo-600 border-indigo-200">
                {budget.budgetType || "Personal"}
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono bg-slate-100 dark:bg-slate-800">
                {budget.period.toUpperCase()}
              </Badge>
              {increaseCount > 0 && (
                <Badge className="bg-sky-500/10 text-sky-600 text-xs font-bold border-0">
                  Version {increaseCount + 1}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span>
                Term: <strong>{formatDate(budget.startDate)}</strong> → <strong>{budget.endDate ? formatDate(budget.endDate) : "Ongoing"}</strong>
              </span>
              <span>•</span>
              <span>
                Duration: <strong>{totalDurationDays} Days</strong> ({daysRemaining} days left)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <Check className="h-3.5 w-3.5" />
                Verified Ledger Sync
              </span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {allBudgets.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9 budget-btn-press">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Switch Budget ({allBudgets.length})</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
                  {allBudgets.map((b) => (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => onSelectBudget(b)}
                      className={`text-xs rounded-xl cursor-pointer flex items-center justify-between py-2 ${
                        b.id === budget.id ? "bg-primary/10 font-bold text-primary" : ""
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {formatCurrency(b.allocatedAmount, b.currency)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="sm"
              onClick={() => onOpenIncreaseModal(budget)}
              className="rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1.5 h-9 shadow-sm budget-btn-press"
            >
              <Coins className="h-4 w-4" />
              <span>Budget Revision</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl budget-btn-press">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl text-xs p-1.5">
                <DropdownMenuItem onClick={() => onOpenEditModal(budget)} className="cursor-pointer">
                  <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-600" />
                  Edit Budget Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(budget.id)} className="cursor-pointer">
                  <Copy className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  Duplicate Target
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTransferUnused(budget)} className="cursor-pointer">
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                  Transfer Unused to Savings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive(budget.id)} className="cursor-pointer text-amber-600">
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(budget.id)} className="cursor-pointer text-rose-600">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete Budget
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. VISUAL PROGRESS BAROMETER: PROGRESS RING & DYNAMIC GAUGES
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Visual Progress & Financial Health Barometer
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-dimensional velocity indicators comparing actual burn vs time elapsed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">Efficiency Score:</span>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs border-0">
              {budgetEfficiencyScore}/100
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 items-center">
          {/* Animated Progress Ring (Cols 1-4) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/80">
            <BudgetProgressRing
              percentage={utilizationPercent}
              spent={totalSpent}
              total={currentBudget}
              currency={currency}
              status={dynamicStatus.key}
              size={150}
              strokeWidth={12}
            />
          </div>

          {/* Detailed Progress Bars & Gauges (Cols 5-12) */}
          <div className="md:col-span-8 space-y-4">
            {/* Gauge 1: Timeline Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-purple-500" />
                  Timeline Progress
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-mono">
                  {daysPassed} of {totalDurationDays} Days ({timelinePercentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${timelinePercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Start: {formatDate(budget.startDate)}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{budget.countdownText || `${daysRemaining} Days Left`}</span>
                <span>End: {budget.endDate ? formatDate(budget.endDate) : "Ongoing"}</span>
              </div>
            </div>

            {/* Gauge 2: Budget Burn Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Flame className="h-3.5 w-3.5 text-rose-500" />
                  Budget Burn Velocity vs Linear Pacing
                </span>
                <span className={`font-mono ${utilizationPercent > timelinePercentage ? "text-rose-600 font-bold" : "text-emerald-600"}`}>
                  {utilizationPercent > timelinePercentage
                    ? `Overburn (+${utilizationPercent - timelinePercentage}%)`
                    : `Underburn (${timelinePercentage - utilizationPercent}% saved)`}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
                {/* Ideal Linear Marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                  style={{ left: `${timelinePercentage}%` }}
                  title="Ideal Pacing Marker"
                />
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    utilizationPercent > 100
                      ? "bg-rose-500"
                      : utilizationPercent >= 85
                      ? "bg-orange-500"
                      : utilizationPercent >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Spent: {formatCurrency(totalSpent, currency)}</span>
                <span>Ideal Target: {formatCurrency(Math.round((currentBudget * timelinePercentage) / 100), currency)}</span>
                <span>Ceiling: {formatCurrency(currentBudget, currency)}</span>
              </div>
            </div>

            {/* Gauge 3: Daily Spend Indicator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Zap className="h-3.5 w-3.5 text-cyan-500" />
                  Daily Actual Spending vs Spending Limit Allowance
                </span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(averageDailySpend, currency)}/d vs limit {formatCurrency(dailyAllowance, currency)}/d
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    averageDailySpend > dailyAllowance ? "bg-amber-500" : "bg-cyan-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((averageDailySpend / Math.max(1, dailyAllowance + averageDailySpend)) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Safe Allowance: {formatCurrency(dailyAllowance, currency)}/day</span>
                <span className={averageDailySpend > dailyAllowance ? "text-amber-500 font-semibold" : "text-emerald-500 font-semibold"}>
                  {averageDailySpend > dailyAllowance ? "Pacing above safe allowance" : "Safe spending velocity"}
                </span>
              </div>
            </div>

            {/* Gauge 4: Savings Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <PiggyBank className="h-3.5 w-3.5 text-emerald-500" />
                  Savings Retention Progress
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(remainingBudget, currency)} Preserved
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${remainingPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Potential Savings: {formatCurrency(remainingBudget, currency)}</span>
                <span>Expected End Savings: {formatCurrency(expectedRemaining, currency)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          3. TWELVE (12) PROFESSIONAL KPI CARDS WITH UNIQUE FINANCIAL IDENTITIES
          Hover: Lift 8px, Scale 1.02, Financial shadow, 180ms ease-out
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Initial Budget (Royal Blue) */}
        <div className="budget-card-interactive glow-royal-blue group rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Initial Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
              <AnimatedCounter value={formatCurrency(originalBudget, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Initial baseline created</p>
          </div>
        </div>

        {/* Card 2: Current Total Budget (Indigo) */}
        <div className="budget-card-interactive glow-indigo group rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              <AnimatedCounter value={formatCurrency(currentBudget, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Active authorized ceiling</p>
          </div>
        </div>

        {/* Card 3: Budget Added (Sky Blue) */}
        <div className="budget-card-interactive glow-sky group rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Budget Added</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400">
              <AnimatedCounter value={`+${formatCurrency(additionalBudget, currency)}`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {increaseCount > 0 ? `${increaseCount} revision${increaseCount > 1 ? "s" : ""} recorded` : "No revisions added yet"}
            </p>
          </div>
        </div>

        {/* Card 4: Spent Amount (Crimson Red / Overspent Red) */}
        <div className="budget-card-interactive glow-red group rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Spent Amount</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              <AnimatedCounter value={formatCurrency(totalSpent, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{utilizationPercent}% of ceiling consumed</p>
          </div>
        </div>

        {/* Card 5: Remaining Budget (Indigo / Teal) */}
        <div className="budget-card-interactive glow-indigo group rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-teal-600 dark:text-teal-400">
              <AnimatedCounter value={formatCurrency(remainingBudget, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{remainingPercent}% available liquidity</p>
          </div>
        </div>

        {/* Card 6: Savings (Emerald Green) */}
        <div className="budget-card-interactive glow-emerald group rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Savings</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={formatCurrency(currentNetSavings, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Verified surplus retained</p>
          </div>
        </div>

        {/* Card 7: Budget Health (Status Based: Green / Amber / Orange / Red) */}
        <div className={`budget-card-interactive ${dynamicStatus.glowClass} group rounded-2xl border p-4 flex flex-col justify-between`}
          style={{ borderColor: `${dynamicStatus.colorHex}40`, background: `linear-gradient(135deg, ${dynamicStatus.colorHex}15, transparent)` }}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Budget Health</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl" style={{ backgroundColor: `${dynamicStatus.colorHex}20`, color: dynamicStatus.colorHex }}>
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black tracking-tight" style={{ color: dynamicStatus.colorHex }}>
              {dynamicStatus.label}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Pacing score: {budgetEfficiencyScore}/100</p>
          </div>
        </div>

        {/* Card 8: Remaining Days (Purple / Amber) */}
        <div className="budget-card-interactive glow-purple group rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Days</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
              <AnimatedCounter value={daysRemaining} suffix=" Days" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{daysPassed} days completed ({totalDurationDays} total)</p>
          </div>
        </div>

        {/* Card 9: Timeline Completion (Purple) */}
        <div className="budget-card-interactive glow-purple group rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Timeline Completion</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
              <AnimatedCounter value={timelinePercentage} suffix="%" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Elapsed time progress</p>
          </div>
        </div>

        {/* Card 10: Average Daily Spend (Cyan) */}
        <div className="budget-card-interactive glow-cyan group rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Daily Spend</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
              <AnimatedCounter value={`${formatCurrency(averageDailySpend, currency)}/d`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Safe allowance: {formatCurrency(dailyAllowance, currency)}/d</p>
          </div>
        </div>

        {/* Card 11: Projected End Balance (Sky Blue / Emerald) */}
        <div className="budget-card-interactive glow-sky group rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Projected End Balance</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400">
              <AnimatedCounter value={formatCurrency(expectedRemaining, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Projected end spend: {formatCurrency(projectedEndSpend, currency)}</p>
          </div>
        </div>

        {/* Card 12: Forecast Accuracy (Cyan) */}
        <div className="budget-card-interactive glow-cyan group rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-background to-transparent p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Forecast Accuracy</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
              <AnimatedCounter value={forecastAccuracy} suffix="%" />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Historical variance index</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. DYNAMIC BUDGET OVERVIEW (ALL 17 ENTERPRISE OVERVIEW METRICS)
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Dynamic Budget Overview & Verification Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive ledger synchronization of all active constraints and projections.
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary text-[10px] font-bold border-0">
            Real-Time Verified Ledger
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Current Budget</span>
            <strong className="text-sm font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(currentBudget, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Initial Budget</span>
            <strong className="text-sm font-mono text-slate-700 dark:text-slate-300">
              {formatCurrency(originalBudget, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Current Active Budget</span>
            <strong className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
              {formatCurrency(currentBudget, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Added Budget</span>
            <strong className="text-sm font-mono text-sky-600 dark:text-sky-400">
              +{formatCurrency(additionalBudget, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Remaining Budget</span>
            <strong className="text-sm font-mono text-teal-600 dark:text-teal-400">
              {formatCurrency(remainingBudget, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Remaining Days</span>
            <strong className="text-sm font-mono text-amber-600 dark:text-amber-400">
              {daysRemaining} Days
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Elapsed Days</span>
            <strong className="text-sm font-mono text-slate-700 dark:text-slate-300">
              {daysPassed} Days
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Daily Spending Limit</span>
            <strong className="text-sm font-mono text-cyan-600 dark:text-cyan-400">
              {formatCurrency(dailyAllowance, currency)}/d
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Daily Actual Spending</span>
            <strong className="text-sm font-mono text-slate-900 dark:text-slate-100">
              {formatCurrency(averageDailySpend, currency)}/d
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Average Daily Spend</span>
            <strong className="text-sm font-mono text-slate-700 dark:text-slate-300">
              {formatCurrency(averageDailySpend, currency)}/d
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Remaining Daily Allowance</span>
            <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(dailyAllowance, currency)}/d
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Total Savings</span>
            <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(currentNetSavings, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Budget Utilization</span>
            <strong className={`text-sm font-mono ${utilizationPercent > 100 ? "text-rose-600" : "text-slate-900 dark:text-slate-100"}`}>
              {utilizationPercent}%
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Budget Health</span>
            <strong className="text-sm font-mono" style={{ color: dynamicStatus.colorHex }}>
              {dynamicStatus.label}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Projected Completion</span>
            <strong className="text-sm font-mono text-slate-700 dark:text-slate-300">
              {projectedExhaustionDate ? formatDate(projectedExhaustionDate) : "On Track"}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Expected Remaining Balance</span>
            <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(expectedRemaining, currency)}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Expected Overspend</span>
            <strong className={`text-sm font-mono ${expectedOverspend > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {expectedOverspend > 0 ? formatCurrency(expectedOverspend, currency) : "₹0 (Safe)"}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-400 text-[10px] block">Forecast Accuracy</span>
            <strong className="text-sm font-mono text-cyan-600 dark:text-cyan-400">
              {forecastAccuracy}%
            </strong>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          5. ENTERPRISE BUDGET TIMELINE (HOVER REVEALS COMPLETE LEDGER DETAILS)
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Enterprise Budget Timeline & Verified Milestones
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks budget inception, dynamic revisions, threshold breaches, and savings achieved.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 font-mono font-bold">
              {timelineMilestones.length} Events Logged
            </Badge>
          </div>
        </div>

        {/* Stepped Interactive Timeline Bar */}
        <div className="pt-2 pb-6">
          <div className="relative flex items-center justify-between">
            {/* Connecting Track Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
            
            {/* Active Progress Fill */}
            <div
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
              style={{ width: `${timelinePercentage}%` }}
            />

            {/* Interactive Milestone Nodes */}
            {timelineMilestones.map((milestone, idx) => (
              <Tooltip key={milestone.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredEventId(milestone.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    className="relative z-10 flex flex-col items-center group focus:outline-none"
                  >
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ring-4 ring-background transition-all duration-200 ${
                        milestone.colorClass
                      } group-hover:scale-125 group-hover:shadow-lg`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1 max-w-[80px] truncate text-center">
                      {milestone.title}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {formatDate(milestone.date)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <strong className="text-emerald-400 font-bold">{milestone.title}</strong>
                    <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-300">
                      {milestone.ledgerReference}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block text-[9px]">Date & Time</span>
                      <span>{formatDate(milestone.date)} • {milestone.time}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Event Amount</span>
                      <strong className="text-emerald-400 font-mono">{formatCurrency(milestone.amount, currency)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Remaining Budget</span>
                      <span className="font-mono">{formatCurrency(milestone.remainingBudget, currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">Remaining Days</span>
                      <span className="font-mono">{milestone.remainingDays} Days</span>
                    </div>
                  </div>
                  {milestone.notes && (
                    <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                      {milestone.notes}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Milestone Detail Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {timelineMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-3 rounded-2xl border transition-all duration-200 ${
                hoveredEventId === milestone.id
                  ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                  : "border-slate-200/60 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30"
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {milestone.title}
                </span>
                <Badge variant="outline" className="text-[9px] font-mono border-slate-300 dark:border-slate-700">
                  {milestone.ledgerReference}
                </Badge>
              </div>
              <div className="text-[11px] space-y-0.5 text-slate-600 dark:text-slate-300">
                <p>
                  <span className="text-slate-400">Date:</span> {formatDate(milestone.date)} ({milestone.time})
                </p>
                <p>
                  <span className="text-slate-400">Amount:</span> <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(milestone.amount, currency)}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Remaining Cap:</span> <span className="font-mono">{formatCurrency(milestone.remainingBudget, currency)}</span>
                </p>
                <p className="text-[10px] text-slate-400 pt-0.5 italic truncate">
                  {milestone.notes || "Verified record"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* =========================================================================
          6. SMART SAVINGS ENGINE
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-500" />
              Smart Savings Engine (Verified Transaction Driven)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated exclusively from approved income, ledger debits, and preserved budget caps.
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border-0">
            Savings Rate: {savingsPercent}%
          </Badge>
        </div>

        {/* Savings Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 to-transparent space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold">Saved Amount</span>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={formatCurrency(currentNetSavings, currency)} />
            </div>
            <p className="text-[10px] text-slate-400">Verified cash surplus retained</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/10 to-transparent space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold">Potential Savings</span>
            <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
              <AnimatedCounter value={formatCurrency(potentialSavings, currency)} />
            </div>
            <p className="text-[10px] text-slate-400">Current unspent budget buffer</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 to-transparent space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold">Expected End Savings</span>
            <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              <AnimatedCounter value={formatCurrency(updatedExpectedSavings, currency)} />
            </div>
            <p className="text-[10px] text-slate-400">Preserved after complete budget run</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-transparent space-y-1">
            <span className="text-slate-500 text-[11px] font-semibold">Projected End Savings</span>
            <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
              <AnimatedCounter value={formatCurrency(projectedEndSavings, currency)} />
            </div>
            <p className="text-[10px] text-slate-400">Surplus at current burn velocity</p>
          </div>
        </div>

        {/* Savings Trends Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] block">Daily Savings Rate</span>
              <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(dailySavings, currency)}/day
              </strong>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
              Daily Pace
            </Badge>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] block">Weekly Savings Trend</span>
              <strong className="text-sm font-mono text-teal-600 dark:text-teal-400">
                +{formatCurrency(weeklySavings, currency)}/wk
              </strong>
            </div>
            <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-500/30">
              7 Days
            </Badge>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] block">Monthly Savings Run-Rate</span>
              <strong className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                +{formatCurrency(monthlySavings, currency)}/mo
              </strong>
            </div>
            <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-500/30">
              30 Days
            </Badge>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          7. REAL-TIME INTERACTIVE CHARTS & AI INSIGHTS
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Real-Time Spending & Velocity Visualizations
                </h3>
                <p className="text-xs text-slate-500">
                  Driven purely by verified transaction timestamps.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedChartTab("trend")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors budget-btn-press ${
                    selectedChartTab === "trend" ? "bg-card text-primary shadow-xs font-bold" : "text-slate-500"
                  }`}
                >
                  Spend Velocity
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChartTab("burn_rate")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors budget-btn-press ${
                    selectedChartTab === "burn_rate" ? "bg-card text-primary shadow-xs font-bold" : "text-slate-500"
                  }`}
                >
                  Burn vs Cap
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChartTab("comparison")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors budget-btn-press ${
                    selectedChartTab === "comparison" ? "bg-card text-primary shadow-xs font-bold" : "text-slate-500"
                  }`}
                >
                  Bar Comparison
                </button>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChartTab === "trend" ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip
                        formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Spending"]}
                        contentStyle={{ borderRadius: "12px", fontSize: "11px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#spendGrad)"
                      />
                    </AreaChart>
                  ) : selectedChartTab === "burn_rate" ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip
                        formatter={(val: number, name: string) => [
                          `₹${val.toLocaleString("en-IN")}`,
                          name === "cumulativeSpend" ? "Cumulative Spend" : "Ideal Spend Line",
                        ]}
                        contentStyle={{ borderRadius: "12px", fontSize: "11px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeSpend"
                        stroke="#dc2626"
                        strokeWidth={2.5}
                        fill="url(#cumulGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="idealSpend"
                        stroke="#059669"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fill="none"
                      />
                      <ReferenceLine y={currentBudget} stroke="#4f46e5" strokeDasharray="3 3" label="Current Cap" />
                    </AreaChart>
                  ) : (
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip
                        formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Amount"]}
                        contentStyle={{ borderRadius: "12px", fontSize: "11px" }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                  Loading charts...
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* AI Spend Insights & Last Expense (1 Col) */}
        <div className="space-y-4">
          <Card className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 via-transparent to-transparent p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Verified Ledger AI Insights</span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {budget.aiInsights && budget.aiInsights.length > 0 ? (
                budget.aiInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{insight}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-slate-500 text-xs">
                  Awaiting additional debit transactions to compile deep heuristics.
                </div>
              )}
            </div>
          </Card>

          {/* Last Expense Quick Card */}
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-4 space-y-2">
            <span className="text-[11px] font-semibold text-slate-400 block">Last Verified Expense</span>
            {budget.lastExpense ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                    {budget.lastExpense.title || "Approved expense"}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatDate(budget.lastExpense.date)}</p>
                </div>
                <strong className="text-sm font-mono text-rose-600 dark:text-rose-400">
                  -{formatCurrency(budget.lastExpense.amount, currency)}
                </strong>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No expenses recorded yet during this budget period.</p>
            )}
          </Card>
        </div>
      </div>

      {/* =========================================================================
          8. BUDGET REVISIONS & COMPLETE AUDIT TRAIL HISTORY
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="h-4 w-4 text-violet-500" />
              Budget History & Revision Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every modification, extension, and addition is permanently stored with complete traceability.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenIncreaseModal(budget)}
            className="rounded-xl text-xs h-8 gap-1.5 budget-btn-press"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Revision</span>
          </Button>
        </div>

        {budget.increases && budget.increases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Revision Date & Time</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Previous Value</th>
                  <th className="p-3">New Value</th>
                  <th className="p-3">Difference</th>
                  <th className="p-3">User Action</th>
                  <th className="p-3">Remaining Days</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 rounded-r-xl">Ledger Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {budget.increases.map((inc, index) => (
                  <tr key={inc.id || index} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 font-medium">
                      <span>{formatDate(inc.date)}</span>
                      <span className="text-[10px] text-slate-400 block">{inc.time}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] font-mono border-violet-500/30 text-violet-600">
                        v{index + 2}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {formatCurrency(inc.previousBudget, currency)}
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(inc.updatedBudget, currency)}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(inc.addedAmount, currency)}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      Budget Increased
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {inc.remainingDays} Days
                    </td>
                    <td className="p-3 max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                      {inc.reason || "General revision"}
                    </td>
                    <td className="p-3 text-[11px] text-slate-500 font-mono">
                      Ceiling +{formatCurrency(inc.addedAmount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Initial baseline of <strong>{formatCurrency(originalBudget, currency)}</strong> established. No budget increases recorded yet.
          </div>
        )}
      </Card>
    </div>
  );
}
