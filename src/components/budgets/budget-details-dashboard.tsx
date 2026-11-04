"use client";

import { useState, useMemo } from "react";
import { BudgetRecord } from "@/lib/types/budgets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { formatCurrency, formatDate } from "@/lib/utils";
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
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";

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
  const [selectedChartTab, setSelectedChartTab] = useState<"trend" | "burn_rate" | "comparison">("trend");
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  // Derived real-time metrics
  const currency = budget.currency || "INR";
  const originalBudget = budget.originalAmount ?? budget.allocatedAmount;
  const currentBudget = budget.allocatedAmount;
  const additionalBudget = budget.additionalAmount ?? Math.max(0, currentBudget - originalBudget);
  const totalSpent = budget.spentAmount;
  const remainingBudget = Math.max(0, currentBudget - totalSpent);
  const utilizationPercent = currentBudget > 0 ? Math.round((totalSpent / currentBudget) * 100) : 0;
  const remainingPercent = Math.max(0, 100 - utilizationPercent);

  const totalDurationDays = budget.totalDurationDays ?? 30;
  const daysPassed = budget.daysPassed ?? 0;
  const daysRemaining = budget.daysRemaining ?? 0;
  const remainingHours = budget.remainingHours ?? 0;
  const remainingWeeks = budget.remainingWeeks ?? Math.floor(daysRemaining / 7);
  const remainingMonths = budget.remainingMonths ?? Number((daysRemaining / 30.4).toFixed(1));
  const timelinePercentage = budget.timelinePercentage ?? Math.min(100, Math.round((daysPassed / Math.max(1, totalDurationDays)) * 100));

  const averageDailySpend = budget.averageDailySpend ?? (daysPassed > 0 ? Math.round(totalSpent / daysPassed) : Math.round(totalSpent));
  const dailyAllowance = budget.dailyAllowance ?? (daysRemaining > 0 ? Math.round(remainingBudget / daysRemaining) : 0);
  const projectedEndSpend = budget.projectedEndSpend ?? Math.round(totalSpent + averageDailySpend * daysRemaining);
  const expectedRemaining = budget.expectedRemaining ?? Math.max(0, currentBudget - projectedEndSpend);
  const growthPercentage = budget.growthPercentage ?? (originalBudget > 0 ? Math.round(((currentBudget - originalBudget) / originalBudget) * 100) : 0);
  const increaseCount = budget.increaseCount ?? (budget.increases?.length || 0);

  // Savings impact
  const actualIncome = verifiedIncome > 0 ? verifiedIncome : currentBudget * 1.5;
  const currentNetSavings = actualIncome - totalSpent;
  const previousExpectedSavings = budget.previousExpectedSavings ?? Math.max(0, actualIncome - originalBudget);
  const updatedExpectedSavings = budget.expectedSavings ?? Math.max(0, actualIncome - currentBudget);
  const savingsImpact = previousExpectedSavings - updatedExpectedSavings; // difference in expected savings
  const savingsRate = actualIncome > 0 ? Math.round((currentNetSavings / actualIncome) * 100) : 0;

  // Status badge styling
  const status = budget.computedStatus || (utilizationPercent >= 100 ? "exceeded" : "active");
  const getStatusBadge = () => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">Active</Badge>;
      case "ending_soon":
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-bold animate-pulse">Ending Soon</Badge>;
      case "exceeded":
        return <Badge className="bg-rose-500/10 text-rose-600 border border-rose-500/20 text-xs font-bold">Exceeded</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 text-xs font-bold">Completed</Badge>;
      case "expired":
        return <Badge className="bg-slate-500/10 text-slate-600 border border-slate-500/20 text-xs font-bold">Expired</Badge>;
      case "upcoming":
        return <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-xs font-bold">Upcoming</Badge>;
      case "paused":
        return <Badge className="bg-slate-500/10 text-slate-500 border border-slate-500/20 text-xs font-bold">Paused</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs font-bold">{status.toUpperCase()}</Badge>;
    }
  };

  // Projected exhaustion date
  const projectedExhaustionDate = useMemo(() => {
    if (averageDailySpend <= 0 || remainingBudget <= 0) return null;
    const daysLeft = Math.floor(remainingBudget / averageDailySpend);
    const d = new Date();
    d.setDate(d.getDate() + daysLeft);
    return d.toISOString().split("T")[0];
  }, [remainingBudget, averageDailySpend]);

  // Chart data: Daily spending & burn rate
  const chartData = useMemo(() => {
    const data: Array<{
      date: string;
      spend: number;
      cumulativeSpend: number;
      idealSpend: number;
      budgetCap: number;
    }> = [];

    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate || new Date());
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const idealDailyRate = currentBudget / totalDays;

    let accumulated = 0;
    const dailyMap = new Map<string, number>();
    if (budget.dailySpending) {
      budget.dailySpending.forEach((d) => dailyMap.set(d.date, d.amount));
    }

    // Build timeline points (e.g. up to 14 points or day-by-day)
    const pointsCount = Math.min(totalDays, 14);
    const step = Math.max(1, Math.floor(totalDays / pointsCount));

    for (let day = 0; day <= totalDays; day += step) {
      const pointDate = new Date(start.getTime() + day * 86400000);
      const dateStr = pointDate.toISOString().split("T")[0];
      const daySpend = dailyMap.get(dateStr) || (day <= daysPassed ? Math.round(totalSpent / Math.max(1, daysPassed)) : 0);

      if (day <= daysPassed) {
        accumulated += daySpend;
      }

      data.push({
        date: pointDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        spend: day <= daysPassed ? daySpend : 0,
        cumulativeSpend: day <= daysPassed ? Math.min(currentBudget * 1.2, accumulated) : 0,
        idealSpend: Math.round(idealDailyRate * day),
        budgetCap: currentBudget,
      });
    }

    return data;
  }, [budget, currentBudget, totalSpent, daysPassed]);

  // Comparison data for Bar Chart
  const comparisonData = [
    { name: "Original Budget", amount: originalBudget, fill: "#2563eb" },
    { name: "Current Budget", amount: currentBudget, fill: "#4f46e5" },
    { name: "Total Spent", amount: totalSpent, fill: "#dc2626" },
    { name: "Remaining", amount: remainingBudget, fill: "#0d9488" },
    { name: "Projected Spend", amount: projectedEndSpend, fill: "#ea580c" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header & Budget Selector Bar */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <PieChart className="h-5 w-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {budget.name}
              </h2>
              {getStatusBadge()}
              <Badge variant="outline" className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {budget.category}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize font-medium text-indigo-600 border-indigo-200">
                {budget.budgetType}
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono bg-slate-100 dark:bg-slate-800">
                {budget.period.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Active Period: <strong>{formatDate(budget.startDate)}</strong> → <strong>{budget.endDate ? formatDate(budget.endDate) : "Ongoing"}</strong> • Duration: <strong>{totalDurationDays} Days</strong> • Last Updated: {budget.updatedAt ? new Date(budget.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Today"}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {allBudgets.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5 h-9">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>Switch Budget ({allBudgets.length})</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                  {allBudgets.map((b) => (
                    <DropdownMenuItem
                      key={b.id}
                      onClick={() => onSelectBudget(b)}
                      className={`text-xs rounded-xl cursor-pointer flex items-center justify-between py-2 ${
                        b.id === budget.id ? "bg-primary/10 font-bold text-primary" : ""
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{formatCurrency(b.allocatedAmount, b.currency)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="sm"
              onClick={() => onOpenIncreaseModal(budget)}
              className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Increase Budget</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl text-xs p-1.5">
                <DropdownMenuItem onClick={() => onOpenEditModal(budget)} className="cursor-pointer">
                  <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-600" />
                  Edit Budget
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(budget.id)} className="cursor-pointer">
                  <Copy className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onTransferUnused(budget)} className="cursor-pointer">
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                  Transfer to Savings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive(budget.id)} className="cursor-pointer text-amber-600">
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(budget.id)} className="cursor-pointer text-rose-600">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 2. Twelve (12) Enterprise Summary Cards with Distinct Financial Identities */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Original Budget (Royal Blue) */}
        <div className="card-premium group rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-blue-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Original Budget</span>
            <div className="p-1.5 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-blue-600 dark:text-blue-400">
              <AnimatedCounter value={formatCurrency(originalBudget, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Initial baseline created</p>
          </div>
        </div>

        {/* Card 2: Additional Budget (Emerald Green) */}
        <div className="card-premium group rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-emerald-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Additional Budget</span>
            <div className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={`+${formatCurrency(additionalBudget, currency)}`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {increaseCount > 0 ? `${increaseCount} revision${increaseCount > 1 ? "s" : ""} added` : "No increases added yet"}
            </p>
          </div>
        </div>

        {/* Card 3: Current Budget (Indigo) */}
        <div className="card-premium group rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-indigo-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Total Budget</span>
            <div className="p-1.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              <AnimatedCounter value={formatCurrency(currentBudget, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Original ({formatCurrency(originalBudget, currency)}) + Added ({formatCurrency(additionalBudget, currency)})
            </p>
          </div>
        </div>

        {/* Card 4: Total Spent (Crimson Red) */}
        <div className="card-premium group rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-rose-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Spent</span>
            <div className="p-1.5 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              <AnimatedCounter value={formatCurrency(totalSpent, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {utilizationPercent}% of current cap consumed
            </p>
          </div>
        </div>

        {/* Card 5: Remaining Budget (Teal) */}
        <div className="card-premium group rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-teal-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Budget</span>
            <div className="p-1.5 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-teal-600 dark:text-teal-400">
              <AnimatedCounter value={formatCurrency(remainingBudget, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {remainingPercent}% available balance
            </p>
          </div>
        </div>

        {/* Card 6: Budget Increase Count (Violet) */}
        <div className="card-premium group rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-violet-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Revision Count</span>
            <div className="p-1.5 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-violet-600 dark:text-violet-400">
              <AnimatedCounter value={`${increaseCount} Time${increaseCount === 1 ? "" : "s"}`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Active audit revisions recorded</p>
          </div>
        </div>

        {/* Card 7: Remaining Timeline (Amber) */}
        <div className="card-premium group rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-amber-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Remaining Timeline</span>
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
              <AnimatedCounter value={budget.countdownText || `${daysRemaining} Days Left`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {daysPassed} days passed of {totalDurationDays} total
            </p>
          </div>
        </div>

        {/* Card 8: Daily Spending Allowance (Cyan) */}
        <div className="card-premium group rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-cyan-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Daily Spending Allowance</span>
            <div className="p-1.5 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-cyan-600 dark:text-cyan-400">
              <AnimatedCounter value={`${formatCurrency(dailyAllowance, currency)}/day`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Remaining budget ÷ remaining {daysRemaining} days
            </p>
          </div>
        </div>

        {/* Card 9: Expected Remaining Budget (Sky Blue) */}
        <div className="card-premium group rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-sky-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Expected Remaining</span>
            <div className="p-1.5 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-sky-600 dark:text-sky-400">
              <AnimatedCounter value={formatCurrency(expectedRemaining, currency)} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Projected end spend: {formatCurrency(projectedEndSpend, currency)}
            </p>
          </div>
        </div>

        {/* Card 10: Projected Budget Exhaustion (Orange) */}
        <div className="card-premium group rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-orange-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Projected Exhaustion</span>
            <div className="p-1.5 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-orange-600 dark:text-orange-400 truncate">
              {projectedExhaustionDate ? formatDate(projectedExhaustionDate) : "Within Cap"}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {projectedExhaustionDate ? "At current burn rate" : "Spending speed on track"}
            </p>
          </div>
        </div>

        {/* Card 11: Budget Growth % (Purple) */}
        <div className="card-premium group rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-background to-transparent p-4 flex flex-col justify-between hover:border-purple-400">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Budget Growth</span>
            <div className="p-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-6 transition-all duration-200">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-purple-600 dark:text-purple-400">
              <AnimatedCounter value={`+${growthPercentage}%`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              (Current − Original) ÷ Original
            </p>
          </div>
        </div>

        {/* Card 12: Savings Impact (Dynamic Emerald or Crimson) */}
        <div className={`card-premium group rounded-2xl border p-4 flex flex-col justify-between ${
          savingsImpact >= 0
            ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-background to-transparent hover:border-emerald-400"
            : "border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-background to-transparent hover:border-rose-400"
        }`}>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Savings Impact</span>
            <div className={`p-1.5 rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-200 ${
              savingsImpact >= 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
            }`}>
              {savingsImpact >= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono tracking-tight ${
              savingsImpact >= 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              <AnimatedCounter value={`-${formatCurrency(additionalBudget, currency)}`} />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Expected savings reduced by added cap
            </p>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Interactive Visual Timeline */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Live Budget Timeline & Validity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks elapsed duration, real-time validity, and revisions from verified ledger data.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono font-bold text-primary border-primary/30">
              {timelinePercentage}% Elapsed
            </Badge>
            <Badge variant="outline" className="text-xs font-mono font-bold text-amber-600 border-amber-500/30">
              {daysRemaining} Days Remaining
            </Badge>
          </div>
        </div>

        {/* Horizontal Timeline Bar */}
        <div className="space-y-3 pt-2">
          <div className="relative w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            {/* Completed Progress Bar */}
            <div
              className="h-full bg-gradient-to-r from-primary via-indigo-500 to-amber-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${timelinePercentage}%` }}
            />
          </div>

          {/* Interactive Milestone Nodes */}
          <div className="relative flex justify-between items-center text-[11px] text-slate-500 px-1 pt-1">
            <div className="flex flex-col items-start">
              <div className="h-2 w-2 rounded-full bg-primary mb-1" />
              <span className="font-bold text-slate-900 dark:text-slate-100">Start</span>
              <span>{formatDate(budget.startDate)}</span>
            </div>

            {budget.increases && budget.increases.length > 0 && (
              <div className="flex flex-col items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="flex flex-col items-center group cursor-pointer"
                    >
                      <div className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 group-hover:scale-125 transition-transform mb-0.5" />
                      <span className="font-bold text-emerald-600">
                        +{formatCurrency(budget.increases[0].addedAmount, currency)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(budget.increases[0].date)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs p-2.5 rounded-xl">
                    <p className="font-bold text-emerald-400">Budget Increased</p>
                    <p className="text-[11px] text-slate-300">Added: {formatCurrency(budget.increases[0].addedAmount, currency)}</p>
                    <p className="text-[10px] text-slate-400">Reason: {budget.increases[0].reason || "General revision"}</p>
                    <p className="text-[10px] text-slate-400">Days Left at revision: {budget.increases[0].remainingDays}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            <div className="flex flex-col items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20 mb-0.5" />
              <span className="font-bold text-amber-600 dark:text-amber-400">Today</span>
              <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>

            <div className="flex flex-col items-end">
              <div className="h-2 w-2 rounded-full bg-slate-400 mb-1" />
              <span className="font-bold text-slate-900 dark:text-slate-100">Expiry</span>
              <span>{budget.endDate ? formatDate(budget.endDate) : "Ongoing"}</span>
            </div>
          </div>

          {/* Remaining Time Analysis Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-400 block text-[10px]">Total Duration</span>
              <strong className="text-slate-800 dark:text-slate-200">{totalDurationDays} Days</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-400 block text-[10px]">Days Passed</span>
              <strong className="text-slate-800 dark:text-slate-200">{daysPassed} Days</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-400 block text-[10px]">Days Remaining</span>
              <strong className="text-emerald-600 dark:text-emerald-400">{daysRemaining} Days</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-400 block text-[10px]">Remaining Weeks</span>
              <strong className="text-slate-800 dark:text-slate-200">{remainingWeeks} Weeks</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-400 block text-[10px]">Remaining Months</span>
              <strong className="text-slate-800 dark:text-slate-200">{remainingMonths} Months</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <span className="text-slate-400 block text-[10px]">Countdown</span>
              <strong className="text-amber-600 dark:text-amber-400">{budget.countdownText || `${daysRemaining} Days Left`}</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* 4. Real-Time Savings Analysis Panel */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-500" />
              Real-Time Savings Analysis & Budget Revision Impact
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified savings updates automatically whenever income, expenses, or budgets change.
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border-0">
            Savings Rate: {savingsRate}%
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
            <span className="text-xs font-semibold text-slate-500">Current Net Savings</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              <AnimatedCounter value={formatCurrency(currentNetSavings, currency)} />
            </div>
            <p className="text-[11px] text-slate-400">Verified Income ({formatCurrency(actualIncome, currency)}) − Verified Outflow ({formatCurrency(totalSpent, currency)})</p>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
            <span className="text-xs font-semibold text-slate-500">Expected End Savings</span>
            <div className="text-xl sm:text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
              <AnimatedCounter value={formatCurrency(updatedExpectedSavings, currency)} />
            </div>
            <p className="text-[11px] text-slate-400">Target savings preserved after complete budget utilization</p>
          </div>

          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent space-y-1">
            <span className="text-xs font-semibold text-slate-500">Budget Revision Impact</span>
            <div className="flex items-center gap-2 text-sm font-bold pt-1">
              <span className="line-through text-slate-400 font-mono">
                {formatCurrency(previousExpectedSavings, currency)}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(updatedExpectedSavings, currency)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              {additionalBudget > 0
                ? `Budget increased by ${formatCurrency(additionalBudget, currency)}, adjusting expected surplus.`
                : "Original budget limits intact. No impact on savings."}
            </p>
          </div>
        </div>
      </Card>

      {/* 5. Real-Time Interactive Charts & AI Insights */}
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
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    selectedChartTab === "trend" ? "bg-card text-primary shadow-xs font-bold" : "text-slate-500"
                  }`}
                >
                  Trend
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChartTab("burn_rate")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    selectedChartTab === "burn_rate" ? "bg-card text-primary shadow-xs font-bold" : "text-slate-500"
                  }`}
                >
                  Burn Rate
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChartTab("comparison")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    selectedChartTab === "comparison" ? "bg-card text-primary shadow-xs font-bold" : "text-slate-500"
                  }`}
                >
                  Cap vs Spend
                </button>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
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
                      stroke="#0d9488"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      fill="none"
                    />
                    <ReferenceLine y={currentBudget} stroke="#4f46e5" strokeDasharray="3 3" label="Cap Limit" />
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
                  Not enough verified spending history.
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

      {/* 6. Budget Revisions & Audit Trail History */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="h-4 w-4 text-violet-500" />
              Budget Increase History & Complete Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every revision is permanently retained with full traceability. Original baseline is never overwritten.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenIncreaseModal(budget)}
            className="rounded-xl text-xs h-8 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Increase</span>
          </Button>
        </div>

        {budget.increases && budget.increases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Revision Date & Time</th>
                  <th className="p-3">Previous Budget</th>
                  <th className="p-3">Added Amount</th>
                  <th className="p-3">Updated Budget</th>
                  <th className="p-3">Remaining Days</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3 rounded-r-xl">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {budget.increases.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 font-medium">
                      <span>{formatDate(inc.date)}</span>
                      <span className="text-[10px] text-slate-400 block">{inc.time}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {formatCurrency(inc.previousBudget, currency)}
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(inc.addedAmount, currency)}
                    </td>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(inc.updatedBudget, currency)}
                    </td>
                    <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                      {inc.remainingDays} Days
                    </td>
                    <td className="p-3 max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                      {inc.reason || "General budget revision"}
                    </td>
                    <td className="p-3 text-slate-500">
                      {inc.performedBy || "You"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No budget increases have been recorded yet. Original budget of {formatCurrency(originalBudget, currency)} remains intact.
          </div>
        )}
      </Card>
    </div>
  );
}
