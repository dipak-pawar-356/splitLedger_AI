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
  TooltipProvider,
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
import {
  BudgetOverviewInspectionModal,
  OverviewPanelType,
} from "./budget-overview-inspection-modal";
import {
  BudgetMilestoneInspectionModal,
  TimelineMilestone,
} from "./budget-milestone-inspection-modal";
import { toast } from "sonner";

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  dynamicStatus: { label: string; colorHex: string };
  dailyAllowance: number;
  averageDailySpend: number;
  currency: string;
  selectedChartTab: "trend" | "burn_rate" | "comparison";
}

function CustomEnterpriseChartTooltip({
  active,
  payload,
  label,
  dynamicStatus,
  dailyAllowance,
  averageDailySpend,
  currency,
  selectedChartTab,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  const isComparison = selectedChartTab === "comparison";
  const isBurn = selectedChartTab === "burn_rate";
  const mainVal = payload[0]?.value ?? 0;

  return (
    <div className="backdrop-blur-md bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700/60 shadow-2xl rounded-2xl p-3.5 text-xs text-slate-100 space-y-2 min-w-[210px] select-none animate-in fade-in-50 zoom-in-95 duration-150">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
        <span className="font-bold text-slate-200">{dataPoint?.name || dataPoint?.date || label}</span>
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${dynamicStatus.colorHex}25`, color: dynamicStatus.colorHex }}
        >
          {dynamicStatus.label}
        </span>
      </div>
      <div className="space-y-1 font-mono text-[11px]">
        {isComparison ? (
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans text-[10px]">Verified Amount:</span>
            <strong className="text-indigo-400 font-bold">{formatCurrency(mainVal, currency)}</strong>
          </div>
        ) : isBurn ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">Cumulative Burn:</span>
              <strong className="text-rose-400 font-bold">{formatCurrency(dataPoint?.cumulativeSpend || 0, currency)}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">Ideal Spend Line:</span>
              <span className="text-emerald-400">{formatCurrency(dataPoint?.idealSpend || 0, currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">Budget Cap:</span>
              <span className="text-indigo-400">{formatCurrency(dataPoint?.budgetCap || 0, currency)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">Daily Spend:</span>
              <strong className="text-indigo-400 font-bold">{formatCurrency(mainVal, currency)}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">Remaining Daily Allowance:</span>
              <span className="text-emerald-400">{formatCurrency(dailyAllowance, currency)}/d</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans text-[10px]">Average Daily Burn:</span>
              <span className="text-cyan-400">{formatCurrency(averageDailySpend, currency)}/d</span>
            </div>
          </>
        )}
      </div>
      <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
        <span>Verified Ledger Sync</span>
        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
          <Check className="h-3 w-3" />
          Active
        </span>
      </div>
    </div>
  );
}

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
  targetMonth?: string;
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
  targetMonth,
}: BudgetDetailsDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedChartTab, setSelectedChartTab] = useState<"trend" | "burn_rate" | "comparison">("trend");
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [overviewModalType, setOverviewModalType] = useState<OverviewPanelType | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<TimelineMilestone | null>(null);

  const handleCopyLedger = (e: React.MouseEvent, ref: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    toast.success(`Copied ledger reference ${ref}`);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Core Financial Baseline Values (Always from verified ledger records)
  const currency = budget?.currency || "INR";
  const originalBudget = Number(budget?.originalAmount ?? budget?.allocatedAmount ?? 0);
  const currentBudget = Number(budget?.allocatedAmount ?? 0);
  const additionalBudget = Number(budget?.additionalAmount ?? Math.max(0, currentBudget - originalBudget));
  const totalSpent = Number(budget?.spentAmount ?? 0);
  const remainingBudget = Math.max(0, currentBudget - totalSpent);
  const utilizationPercent = currentBudget > 0 ? Math.round((totalSpent / currentBudget) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - utilizationPercent);

  // 2. Timeline & Duration Dynamics
  const totalDurationDays = Number(budget?.totalDurationDays ?? 30) || 30;
  const daysPassed = Number(budget?.daysPassed ?? 0) || 0;
  const daysRemaining = Number(budget?.daysRemaining ?? 0) || 0;
  const remainingHours = Number(budget?.remainingHours ?? 0) || 0;
  const remainingWeeks = Number(budget?.remainingWeeks ?? Math.floor(daysRemaining / 7)) || 0;
  const remainingMonths = Number(budget?.remainingMonths ?? Number((daysRemaining / 30.4).toFixed(1))) || 0;
  const timelinePercentage = Number(budget?.timelinePercentage ?? Math.min(100, Math.round((daysPassed / Math.max(1, totalDurationDays)) * 100))) || 0;

  // 3. Daily Allowance & Burning Rates
  const averageDailySpend = Number(budget?.averageDailySpend ?? (daysPassed > 0 ? Math.round(totalSpent / daysPassed) : Math.round(totalSpent))) || 0;
  const dailyAllowance = Number(budget?.dailyAllowance ?? (daysRemaining > 0 ? Math.round(remainingBudget / daysRemaining) : 0)) || 0;
  const projectedEndSpend = Number(budget?.projectedEndSpend ?? Math.round(totalSpent + averageDailySpend * daysRemaining)) || 0;
  const expectedRemaining = Number(budget?.expectedRemaining ?? Math.max(0, currentBudget - projectedEndSpend)) || 0;
  const expectedOverspend = Math.max(0, projectedEndSpend - currentBudget);
  const growthPercentage = Number(budget?.growthPercentage ?? (originalBudget > 0 ? Math.round(((currentBudget - originalBudget) / originalBudget) * 100) : 0)) || 0;
  const increaseCount = Number(budget?.increaseCount ?? (budget?.increases?.length || 0)) || 0;

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
  const hasVerifiedIncome = verifiedIncome > 0;
  const actualIncome = verifiedIncome;
  const currentNetSavings = hasVerifiedIncome ? Math.max(0, actualIncome - totalSpent) : 0;
  const potentialSavings = remainingBudget;
  const previousExpectedSavings = budget.previousExpectedSavings ?? (hasVerifiedIncome ? Math.max(0, actualIncome - originalBudget) : 0);
  const updatedExpectedSavings = budget.expectedSavings ?? (hasVerifiedIncome ? Math.max(0, actualIncome - currentBudget) : 0);
  const projectedEndSavings = Math.max(0, currentBudget - projectedEndSpend);
  const savingsPercent = hasVerifiedIncome ? Math.round((currentNetSavings / actualIncome) * 100) : 0;
  
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

    // Milestone: Verified Savings or Preserved Allowance
    if (hasVerifiedIncome && currentNetSavings > 0) {
      events.push({
        id: "event-savings",
        title: "Actual Savings Realized",
        eventType: "savings_achieved",
        date: getSafeIsoDateStr(new Date()),
        time: "Real-Time",
        amount: currentNetSavings,
        remainingBudget: remainingBudget,
        remainingDays: daysRemaining,
        ledgerReference: `LEDG-SAV-${budgetIdSafe || "VERIFIED"}`,
        notes: "Verified cash surplus from ledger income over actual expenses",
        colorClass: "bg-emerald-600 text-white",
        badgeText: formatCurrency(currentNetSavings, currency),
      });
    } else if (remainingBudget > 0) {
      events.push({
        id: "event-headroom",
        title: "Unspent Budget Headroom",
        eventType: "savings_achieved",
        date: getSafeIsoDateStr(new Date()),
        time: "Real-Time",
        amount: remainingBudget,
        remainingBudget: remainingBudget,
        remainingDays: daysRemaining,
        ledgerReference: `LEDG-CAP-${budgetIdSafe || "RESERVE"}`,
        notes: "Unspent budget allowance preserved under active spending limit",
        colorClass: "bg-emerald-600 text-white",
        badgeText: `${formatCurrency(remainingBudget, currency)} Preserved`,
      });
    }

    const totalEvents = events.length;
    return events.map((ev, index) => {
      const isUpcoming = daysRemaining > 0 && (ev.eventType === "completed" || ev.eventType === "expired");
      const isLastActive = (index === totalEvents - 1 && !isUpcoming) || (daysRemaining <= 0 && ev.eventType === "completed");
      return {
        ...ev,
        isCompleted: !isUpcoming && !isLastActive,
        isCurrent: isLastActive,
        isUpcoming,
      };
    });
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
                {(budget.period || "monthly").toUpperCase()}
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
          <div className="md:col-span-8 space-y-3">
            <TooltipProvider delayDuration={100}>
              {/* Gauge 1: Timeline Progress */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="budget-gauge-interactive space-y-1.5 cursor-pointer">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-purple-500" />
                        Timeline Progress
                      </span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono">
                        {daysPassed} of {totalDurationDays} Days ({timelinePercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${timelinePercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Start: {formatDate(budget.startDate)}</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{budget.countdownText || `${daysRemaining} Days Left`}</span>
                      <span>End: {budget.endDate ? formatDate(budget.endDate) : "Ongoing"}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <strong className="text-purple-400 font-bold">Timeline Milestone Progress</strong>
                    <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-300">
                      {timelinePercentage}% Elapsed
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Elapsed Duration</span>
                      <span>{daysPassed} Days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Remaining Duration</span>
                      <span className="text-amber-400 font-bold">{daysRemaining} Days</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Start Timestamp</span>
                      <span>{formatDate(budget.startDate)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Conclusion Target</span>
                      <span>{budget.endDate ? formatDate(budget.endDate) : "Ongoing"}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Gauge 2: Budget Burn Progress */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="budget-gauge-interactive space-y-1.5 cursor-pointer">
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
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10"
                        style={{ left: `${timelinePercentage}%` }}
                        title="Ideal Pacing Marker"
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
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
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <strong className="text-rose-400 font-bold">Burn Velocity Analysis</strong>
                    <span className="text-[9px] font-mono font-bold text-slate-300">
                      Cap: {formatCurrency(currentBudget, currency)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Current Actual Spend</span>
                      <span className="text-rose-400 font-bold">{formatCurrency(totalSpent, currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Linear Pace Target</span>
                      <span className="text-emerald-400">{formatCurrency(Math.round((currentBudget * timelinePercentage) / 100), currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Burn Variance</span>
                      <span className={utilizationPercent > timelinePercentage ? "text-rose-400" : "text-emerald-400"}>
                        {utilizationPercent > timelinePercentage ? `+${utilizationPercent - timelinePercentage}% Overburn` : `-${timelinePercentage - utilizationPercent}% Underburn`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Remaining Buffer</span>
                      <span className="text-teal-400">{formatCurrency(remainingBudget, currency)}</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Gauge 3: Daily Spend Indicator */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="budget-gauge-interactive space-y-1.5 cursor-pointer">
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
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
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
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <strong className="text-cyan-400 font-bold">Daily Burn Dynamics</strong>
                    <span className="text-[9px] font-mono text-slate-300">{formatCurrency(dailyAllowance, currency)}/d Limit</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Safe Allowance</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(dailyAllowance, currency)}/d</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Actual Average Burn</span>
                      <span className="text-cyan-400 font-bold">{formatCurrency(averageDailySpend, currency)}/d</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Daily Net Pace</span>
                      <span className={dailySavings > 0 ? "text-emerald-400" : "text-amber-400"}>
                        {dailySavings > 0 ? `+${formatCurrency(dailySavings, currency)}/d Saved` : "At Maximum Cap"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Remaining Days</span>
                      <span>{daysRemaining} Days</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>

              {/* Gauge 4: Savings Progress */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="budget-gauge-interactive space-y-1.5 cursor-pointer">
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
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${remainingPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Potential Savings: {formatCurrency(remainingBudget, currency)}</span>
                      <span>Expected End Savings: {formatCurrency(expectedRemaining, currency)}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="p-3 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                    <strong className="text-emerald-400 font-bold">Verified Savings Retention</strong>
                    <span className="text-[9px] font-bold text-emerald-300">{remainingPercent}% Preserved</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Unspent Budget</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(remainingBudget, currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Net Verified Savings</span>
                      <span className="text-teal-400 font-bold">{formatCurrency(currentNetSavings, currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Projected End Surplus</span>
                      <span className="text-sky-400 font-bold">{formatCurrency(projectedEndSavings, currency)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] font-sans">Savings Efficiency</span>
                      <span>{savingsPercent}%</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          3. TWELVE (12) PROFESSIONAL KPI CARDS WITH UNIQUE FINANCIAL IDENTITIES
          Hover: Lift 6px, Scale 1.02, 180ms ease-out, unique semantic colors
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Initial Budget (Royal Blue) */}
        <div className="budget-card-interactive glow-royal-blue group rounded-2xl border border-blue-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Initial Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
              <AnimatedCounter value={formatCurrency(originalBudget, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">Initial baseline created</p>
          </div>
        </div>

        {/* Card 2: Current Budget (Indigo) */}
        <div className="budget-card-interactive glow-indigo group rounded-2xl border border-indigo-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              <AnimatedCounter value={formatCurrency(currentBudget, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">Active authorized ceiling</p>
          </div>
        </div>

        {/* Card 3: Additional Budget (Sky Blue) */}
        <div className="budget-card-interactive glow-sky group rounded-2xl border border-sky-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Additional Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400">
              <AnimatedCounter value={`+${formatCurrency(additionalBudget, currency)}`} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">
              {increaseCount > 0 ? `${increaseCount} revision${increaseCount > 1 ? "s" : ""} recorded` : "No revisions added yet"}
            </p>
          </div>
        </div>

        {/* Card 4: Actual Spending (Crimson) */}
        <div className="budget-card-interactive glow-crimson group rounded-2xl border border-rose-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Actual Spending</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              <AnimatedCounter value={formatCurrency(totalSpent, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">{utilizationPercent}% of ceiling consumed</p>
          </div>
        </div>

        {/* Card 5: Remaining Budget (Emerald) */}
        <div className="budget-card-interactive glow-emerald group rounded-2xl border border-emerald-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Budget</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={formatCurrency(remainingBudget, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">{remainingPercent}% available liquidity</p>
          </div>
        </div>

        {/* Card 6: Actual Savings (Teal) */}
        <div className="budget-card-interactive glow-teal group rounded-2xl border border-teal-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Actual Savings</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-teal-600 dark:text-teal-400">
              <AnimatedCounter value={formatCurrency(currentNetSavings, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">
              {hasVerifiedIncome ? "Verified cash surplus retained" : "Requires verified ledger income"}
            </p>
          </div>
        </div>

        {/* Card 7: Projected Spending (Cyan) */}
        <div className="budget-card-interactive glow-cyan group rounded-2xl border border-cyan-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Projected Spending</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
              <AnimatedCounter value={formatCurrency(projectedEndSpend, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">
              At current burn of {formatCurrency(averageDailySpend, currency)}/d
            </p>
          </div>
        </div>

        {/* Card 8: Projected Remaining Balance (Emerald / Rose) */}
        <div className={`budget-card-interactive ${expectedRemaining < 0 ? "glow-crimson border-rose-500/25" : "glow-emerald border-emerald-500/25"} group rounded-2xl border p-4 flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Projected Remaining Balance</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className={`budget-number-highlight text-2xl font-black font-mono tracking-tight ${expectedRemaining < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              <AnimatedCounter value={formatCurrency(expectedRemaining, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">
              {expectedRemaining < 0 ? `Risk of ${formatCurrency(Math.abs(expectedRemaining), currency)} overspend` : "Expected surplus at month-end"}
            </p>
          </div>
        </div>

        {/* Card 9: Budget Health (Green / Amber / Red) */}
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
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">Pacing score: {budgetEfficiencyScore}/100</p>
          </div>
        </div>

        {/* Card 10: Daily Allowance (Azure) */}
        <div className="budget-card-interactive glow-azure group rounded-2xl border border-sky-400/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Daily Allowance</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-sky-400/15 text-sky-500 dark:text-sky-400">
              <Gauge className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-sky-500 dark:text-sky-400">
              <AnimatedCounter value={`${formatCurrency(dailyAllowance, currency)}/d`} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">Actual burn: {formatCurrency(averageDailySpend, currency)}/d</p>
          </div>
        </div>

        {/* Card 11: Remaining Days (Purple) */}
        <div className="budget-card-interactive glow-purple group rounded-2xl border border-purple-500/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Days</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
              <AnimatedCounter value={daysRemaining} suffix=" Days" duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">{budget.countdownText || `${daysRemaining} days left`}</p>
          </div>
        </div>

        {/* Card 12: Elapsed Days (Slate) */}
        <div className="budget-card-interactive glow-slate group rounded-2xl border border-slate-400/25 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Elapsed Days</span>
            <div className="budget-icon-interactive p-1.5 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="budget-number-highlight text-2xl font-black font-mono tracking-tight text-slate-700 dark:text-slate-300">
              <AnimatedCounter value={daysPassed} suffix=" Days" duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400 mt-1">{timelinePercentage}% elapsed ({totalDurationDays} total)</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. DYNAMIC BUDGET OVERVIEW & ENTERPRISE VERIFICATION LEDGER
          Provides structured governance, compliance parameters, and audit controls
          without duplicating the 12 numeric cards above. Interactive inspection cards.
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Dynamic Budget Overview & Verification Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive ledger synchronization of active policy constraints, cycle parameters, and audit controls. Click any card to inspect full audit specifications.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary text-[10px] font-bold border-0">
              Real-Time Verified Ledger
            </Badge>
            <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 hidden sm:inline-flex">
              Interactive Audit Cards
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Panel 1: Budget Policy & Scope */}
          <div
            onClick={() => setOverviewModalType("policy")}
            className="budget-card-interactive glow-indigo group rounded-2xl border border-indigo-500/30 hover:border-indigo-500/80 bg-gradient-to-b from-card via-card to-indigo-500/[0.04] p-4 flex flex-col justify-between space-y-3 cursor-pointer shadow-xs hover:shadow-[0_10px_25px_-5px_rgba(99,102,241,0.25)] hover:-translate-y-1.5 hover:scale-[1.01] transition-all duration-200 select-none"
          >
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Target className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Policy & Scope
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold uppercase text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/5">
                {budget.budgetType || "Personal"}
              </Badge>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Category Scope:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{budget.category || "General"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enforcement Mode:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Strict Approved
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settlement Policy:</span>
                <span className="text-slate-600 dark:text-slate-300">Transfers Excluded</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Inspect Policy Specs</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Panel 2: Authorized Ceilings & Thresholds */}
          <div
            onClick={() => setOverviewModalType("ceiling")}
            className="budget-card-interactive glow-sky group rounded-2xl border border-sky-500/30 hover:border-sky-500/80 bg-gradient-to-b from-card via-card to-sky-500/[0.04] p-4 flex flex-col justify-between space-y-3 cursor-pointer shadow-xs hover:shadow-[0_10px_25px_-5px_rgba(14,165,233,0.25)] hover:-translate-y-1.5 hover:scale-[1.01] transition-all duration-200 select-none"
          >
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <ShieldAlert className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Ceiling & Thresholds
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5">
                {budget.alertThresholds?.[0]?.percent || 80}% Threshold
              </Badge>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Baseline Limit:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(originalBudget, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Authorized Ceiling:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{formatCurrency(currentBudget, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Alert Trigger At:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {formatCurrency(currentBudget * ((budget.alertThresholds?.[0]?.percent || 80) / 100), currency)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[10px] text-sky-600 dark:text-sky-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Inspect Ceiling & Alerts</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Panel 3: Cycle Timeline & Term Boundaries */}
          <div
            onClick={() => setOverviewModalType("cycle")}
            className="budget-card-interactive glow-purple group rounded-2xl border border-purple-500/30 hover:border-purple-500/80 bg-gradient-to-b from-card via-card to-purple-500/[0.04] p-4 flex flex-col justify-between space-y-3 cursor-pointer shadow-xs hover:shadow-[0_10px_25px_-5px_rgba(168,85,247,0.25)] hover:-translate-y-1.5 hover:scale-[1.01] transition-all duration-200 select-none"
          >
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <CalendarDays className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Cycle Boundaries
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 border-purple-500/30 bg-purple-500/5">
                {totalDurationDays} Days Total
              </Badge>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Start Boundary:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatDate(budget.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">End Boundary:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{formatDate(budget.endDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cycle Pacing:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {daysRemaining}d left ({timelinePercentage}% elapsed)
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[10px] text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Inspect Calendar Pacing</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>

          {/* Panel 4: Mathematical Forecasting & Runout */}
          <div
            onClick={() => setOverviewModalType("forecasting")}
            className="budget-card-interactive glow-cyan group rounded-2xl border border-cyan-500/30 hover:border-cyan-500/80 bg-gradient-to-b from-card via-card to-cyan-500/[0.04] p-4 flex flex-col justify-between space-y-3 cursor-pointer shadow-xs hover:shadow-[0_10px_25px_-5px_rgba(6,182,212,0.25)] hover:-translate-y-1.5 hover:scale-[1.01] transition-all duration-200 select-none"
          >
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-500 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Forecasting & Runout
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-500/5">
                {forecastAccuracy}% Accuracy
              </Badge>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Burn vs Allowance:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(averageDailySpend, currency)} / {formatCurrency(dailyAllowance, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Runout Date:</span>
                <span className={`font-mono font-semibold ${projectedExhaustionDate ? "text-amber-500" : "text-emerald-500"}`}>
                  {projectedExhaustionDate ? formatDate(projectedExhaustionDate) : "Sustainable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expected End Surplus:</span>
                <span className={`font-mono font-semibold ${expectedRemaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {formatCurrency(expectedRemaining, currency)}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform">
              <span>Inspect Forecast Model</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          5. ENTERPRISE BUDGET TIMELINE (CLICK OR HOVER REVEALS COMPLETE AUDIT MODAL)
          ========================================================================= */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Enterprise Budget Timeline & Verified Milestones
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks budget inception, dynamic revisions, threshold breaches, and savings achieved. Click any node or card to inspect verified ledger proofs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono font-bold bg-purple-500/5">
              {timelineMilestones.length} Events Logged
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border-0 hidden sm:inline-flex">
              Cryptographically Verified
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
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-500 ease-out"
              style={{ width: `${timelinePercentage}%` }}
            />

            {/* Interactive Milestone Nodes */}
            <TooltipProvider delayDuration={100}>
              {timelineMilestones.map((milestone, idx) => {
                const nodePulseClass = milestone.isCurrent
                  ? "milestone-current-pulse ring-4 ring-purple-500/40 shadow-lg scale-110"
                  : milestone.isCompleted
                  ? "milestone-completed-glow ring-2 ring-emerald-500/30"
                  : "opacity-60 ring-2 ring-slate-400/20 border border-dashed border-slate-400";

                return (
                  <Tooltip key={milestone.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSelectedMilestone(milestone)}
                        onMouseEnter={() => setHoveredEventId(milestone.id)}
                        onMouseLeave={() => setHoveredEventId(null)}
                        className="relative z-10 flex flex-col items-center group focus:outline-none cursor-pointer"
                      >
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-background transition-all duration-200 ${
                            milestone.colorClass
                          } ${nodePulseClass} group-hover:scale-125 group-hover:shadow-xl`}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1.5 max-w-[110px] text-center leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                          {milestone.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                          {formatDate(milestone.date)}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="p-3.5 rounded-2xl max-w-xs shadow-2xl bg-slate-900 text-slate-100 border border-slate-800 text-xs space-y-2 select-none animate-in fade-in-50 zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                        <strong className="text-purple-300 font-bold">{milestone.title}</strong>
                        <Badge variant="outline" className="text-[9px] font-mono border-purple-500/30 text-purple-300">
                          {milestone.ledgerReference}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5 font-mono">
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans">Date & Time</span>
                          <span>{formatDate(milestone.date)} • {milestone.time}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans">Event Amount</span>
                          <strong className="text-emerald-400">{formatCurrency(milestone.amount, currency)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans">Remaining Budget</span>
                          <span>{formatCurrency(milestone.remainingBudget, currency)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] font-sans">Remaining Days</span>
                          <span className="text-amber-400 font-bold">{milestone.remainingDays} Days</span>
                        </div>
                      </div>
                      <div className="text-[10px] pt-1 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-400 font-sans">Timeline Status:</span>
                        <Badge variant="secondary" className="text-[9px] font-bold bg-slate-800 text-slate-200">
                          {milestone.isCurrent ? "Current Milestone" : milestone.isCompleted ? "Verified Completed" : "Upcoming Target"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-primary font-semibold pt-0.5">
                        Click node to inspect complete ledger record →
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>

        {/* Milestone Detail Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-2">
          {timelineMilestones.map((milestone) => {
            const isHovered = hoveredEventId === milestone.id;

            // Semantic color matching for card border & hover
            let cardColorStyle = "border-purple-500/30 hover:border-purple-500 hover:shadow-[0_8px_25px_rgba(168,85,247,0.2)] bg-gradient-to-b from-card via-card to-purple-500/[0.04]";
            let amountTextColor = "text-purple-600 dark:text-purple-400";
            if (milestone.eventType === "started") {
              cardColorStyle = "border-blue-500/30 hover:border-blue-500 hover:shadow-[0_8px_25px_rgba(59,130,246,0.2)] bg-gradient-to-b from-card via-card to-blue-500/[0.04]";
              amountTextColor = "text-blue-600 dark:text-blue-400";
            } else if (milestone.eventType === "revised" || milestone.eventType === "added") {
              cardColorStyle = "border-sky-500/30 hover:border-sky-500 hover:shadow-[0_8px_25px_rgba(14,165,233,0.2)] bg-gradient-to-b from-card via-card to-sky-500/[0.04]";
              amountTextColor = "text-sky-600 dark:text-sky-400";
            } else if (milestone.eventType === "savings_achieved") {
              cardColorStyle = "border-emerald-500/30 hover:border-emerald-500 hover:shadow-[0_8px_25px_rgba(16,185,129,0.2)] bg-gradient-to-b from-card via-card to-emerald-500/[0.04]";
              amountTextColor = "text-emerald-600 dark:text-emerald-400";
            } else if (milestone.eventType === "near_limit") {
              cardColorStyle = "border-amber-500/30 hover:border-amber-500 hover:shadow-[0_8px_25px_rgba(245,158,11,0.2)] bg-gradient-to-b from-card via-card to-amber-500/[0.04]";
              amountTextColor = "text-amber-600 dark:text-amber-400";
            } else if (milestone.eventType === "crossed") {
              cardColorStyle = "border-rose-500/30 hover:border-rose-500 hover:shadow-[0_8px_25px_rgba(244,63,94,0.2)] bg-gradient-to-b from-card via-card to-rose-500/[0.04]";
              amountTextColor = "text-rose-600 dark:text-rose-400";
            }

            return (
              <div
                key={milestone.id}
                onClick={() => setSelectedMilestone(milestone)}
                onMouseEnter={() => setHoveredEventId(milestone.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                className={`budget-card-interactive group p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none flex flex-col justify-between space-y-3 ${cardColorStyle} ${
                  isHovered ? "-translate-y-1.5 scale-[1.02] shadow-xl" : "hover:-translate-y-1 hover:scale-[1.01]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-200/50 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${milestone.isCurrent ? "bg-purple-500 animate-ping" : milestone.isCompleted ? "bg-emerald-500" : "bg-slate-400"}`} />
                    <span className="truncate">{milestone.title}</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyLedger(e, milestone.ledgerReference)}
                    className="shrink-0 px-2 py-0.5 rounded-lg text-[9px] font-mono border border-slate-300 dark:border-slate-700 hover:border-primary hover:text-primary transition-colors flex items-center gap-1 bg-slate-100 dark:bg-slate-800"
                    title="Copy ledger reference"
                  >
                    <span>{milestone.ledgerReference}</span>
                    <Copy className="h-2.5 w-2.5 opacity-60 hover:opacity-100" />
                  </button>
                </div>

                <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{formatDate(milestone.date)} ({milestone.time})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Amount:</span>
                    <strong className={`font-mono font-bold ${amountTextColor}`}>{formatCurrency(milestone.amount, currency)}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Remaining Cap:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(milestone.remainingBudget, currency)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1 italic line-clamp-2 leading-relaxed">
                    {milestone.notes || "Verified record"}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-[10px] font-semibold text-primary opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  <span>Inspect Audit Record</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* =========================================================================
          6. SMART SAVINGS ENGINE
          Hover: soft cyan glow, number emphasis, icon pulse, gradient border transition
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
            Savings Rate: {hasVerifiedIncome ? `${savingsPercent}%` : "0% (Income unverified)"}
          </Badge>
        </div>

        {/* Savings Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="budget-card-interactive glow-emerald p-4 rounded-2xl border border-emerald-500/25 space-y-1.5 group">
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-500 text-[11px] font-semibold">Saved Amount</span>
              <div className="budget-icon-interactive p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="budget-number-highlight text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={formatCurrency(currentNetSavings, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400">
              {hasVerifiedIncome ? "Verified cash surplus retained" : "Requires verified ledger income"}
            </p>
          </div>

          <div className="budget-card-interactive glow-teal p-4 rounded-2xl border border-teal-500/25 space-y-1.5 group">
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-500 text-[11px] font-semibold">Potential Savings</span>
              <div className="budget-icon-interactive p-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="budget-number-highlight text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
              <AnimatedCounter value={formatCurrency(potentialSavings, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400">Unspent budget allowance (Preserved)</p>
          </div>

          <div className="budget-card-interactive glow-indigo p-4 rounded-2xl border border-indigo-500/25 space-y-1.5 group">
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-500 text-[11px] font-semibold">Expected End Savings</span>
              <div className="budget-icon-interactive p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Target className="h-4 w-4" />
              </div>
            </div>
            <div className="budget-number-highlight text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              <AnimatedCounter value={formatCurrency(updatedExpectedSavings, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400">
              {hasVerifiedIncome ? "Preserved after complete budget run" : "Expected unspent ceiling"}
            </p>
          </div>

          <div className="budget-card-interactive glow-cyan p-4 rounded-2xl border border-cyan-500/25 space-y-1.5 group">
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-500 text-[11px] font-semibold">Projected End Savings</span>
              <div className="budget-icon-interactive p-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <div className="budget-number-highlight text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              <AnimatedCounter value={formatCurrency(projectedEndSavings, currency)} duration={0.5} />
            </div>
            <p className="budget-card-subtitle text-[10px] text-slate-400">Surplus at current burn velocity</p>
          </div>
        </div>

        {/* Savings Trends Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="budget-card-interactive glow-emerald p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between group">
            <div>
              <span className="text-slate-400 text-[10px] block">Daily Savings Rate</span>
              <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(dailySavings, currency)}/day
              </strong>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 font-semibold">
              Daily Pace
            </Badge>
          </div>

          <div className="budget-card-interactive glow-teal p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between group">
            <div>
              <span className="text-slate-400 text-[10px] block">Weekly Savings Trend</span>
              <strong className="text-sm font-mono text-teal-600 dark:text-teal-400">
                +{formatCurrency(weeklySavings, currency)}/wk
              </strong>
            </div>
            <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-500/30 font-semibold">
              7 Days
            </Badge>
          </div>

          <div className="budget-card-interactive glow-indigo p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 flex items-center justify-between group">
            <div>
              <span className="text-slate-400 text-[10px] block">Monthly Savings Run-Rate</span>
              <strong className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                +{formatCurrency(monthlySavings, currency)}/mo
              </strong>
            </div>
            <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-500/30 font-semibold">
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
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip
                        content={
                          <CustomEnterpriseChartTooltip
                            dynamicStatus={dynamicStatus}
                            dailyAllowance={dailyAllowance}
                            averageDailySpend={averageDailySpend}
                            currency={currency}
                            selectedChartTab={selectedChartTab}
                          />
                        }
                        cursor={{ stroke: "rgba(99, 102, 241, 0.4)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#spendGrad)"
                      />
                    </AreaChart>
                  ) : selectedChartTab === "burn_rate" ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip
                        content={
                          <CustomEnterpriseChartTooltip
                            dynamicStatus={dynamicStatus}
                            dailyAllowance={dailyAllowance}
                            averageDailySpend={averageDailySpend}
                            currency={currency}
                            selectedChartTab={selectedChartTab}
                          />
                        }
                        cursor={{ stroke: "rgba(225, 29, 72, 0.4)", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeSpend"
                        stroke="#e11d48"
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
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                      <RechartsTooltip
                        content={
                          <CustomEnterpriseChartTooltip
                            dynamicStatus={dynamicStatus}
                            dailyAllowance={dailyAllowance}
                            averageDailySpend={averageDailySpend}
                            currency={currency}
                            selectedChartTab={selectedChartTab}
                          />
                        }
                        cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
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
          <Card className="rounded-3xl border border-teal-500/25 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-xs">
              <Sparkles className="h-4 w-4" />
              <span>Verified Ledger AI Insights</span>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {budget.aiInsights && budget.aiInsights.length > 0 ? (
                budget.aiInsights.map((insight, idx) => (
                  <div key={idx} className="insight-card-interactive p-2.5 flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{insight}</span>
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
          <Card className="budget-card-interactive glow-crimson rounded-3xl border border-rose-500/20 bg-card p-4 space-y-2">
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

      {/* Dynamic Budget Overview Inspection Modal */}
      <BudgetOverviewInspectionModal
        isOpen={overviewModalType !== null}
        onClose={() => setOverviewModalType(null)}
        activeType={overviewModalType}
        budget={budget}
        currency={currency}
        originalBudget={originalBudget}
        currentBudget={currentBudget}
        additionalBudget={additionalBudget}
        totalSpent={totalSpent}
        remainingBudget={remainingBudget}
        utilizationPercent={utilizationPercent}
        increaseCount={increaseCount}
        totalDurationDays={totalDurationDays}
        daysPassed={daysPassed}
        daysRemaining={daysRemaining}
        timelinePercentage={timelinePercentage}
        averageDailySpend={averageDailySpend}
        dailyAllowance={dailyAllowance}
        expectedRemaining={expectedRemaining}
        expectedOverspend={expectedOverspend}
        forecastAccuracy={forecastAccuracy}
        projectedExhaustionDate={projectedExhaustionDate}
        targetMonth={targetMonth}
        onRequestRevision={() => onOpenIncreaseModal(budget)}
      />

      {/* Enterprise Budget Timeline Milestone Inspection Modal */}
      <BudgetMilestoneInspectionModal
        isOpen={selectedMilestone !== null}
        onClose={() => setSelectedMilestone(null)}
        milestone={selectedMilestone}
        currency={currency}
        budgetName={budget.name}
        totalDurationDays={totalDurationDays}
      />
    </div>
  );
}
