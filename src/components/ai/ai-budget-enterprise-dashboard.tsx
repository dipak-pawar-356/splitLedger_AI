"use client";

import { useMemo, useState } from "react";
import { BudgetProgress } from "@/actions/budgets";
import { FinancialIntelligenceData } from "@/actions/financial-intelligence";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { BudgetCard } from "@/components/budget/budget-card";
import { SmartRecommendationsView } from "@/components/ai/smart-recommendations-view";
import {
  Target,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  Plus,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  Flame,
  Scale,
  CreditCard,
  Tag,
} from "lucide-react";

interface AIBudgetEnterpriseDashboardProps {
  budgets: BudgetProgress[];
  intelligence: FinancialIntelligenceData;
  onOpenBudgetDialog: () => void;
  onEditBudget?: (b: BudgetProgress) => void;
}

export function AIBudgetEnterpriseDashboard({
  budgets,
  intelligence,
  onOpenBudgetDialog,
  onEditBudget,
}: AIBudgetEnterpriseDashboardProps) {
  const [filterType, setFilterType] = useState<"all" | "personal" | "category" | "group">("all");

  const now = new Date();
  const currentDay = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);

  // Active non-archived budgets
  const activeBudgets = useMemo(() => {
    return budgets.filter((b) => b.status !== "archived");
  }, [budgets]);

  // Aggregates
  const totalBudgetAllocated = activeBudgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = activeBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = Math.max(0, totalBudgetAllocated - totalSpent);
  const budgetUtilizationPct = totalBudgetAllocated > 0 ? Math.round((totalSpent / totalBudgetAllocated) * 100) : 0;

  // Real Savings: Money In - Money Out (verified from ledger cashFlow)
  const currentSavings = intelligence.cashFlow.moneyIn - intelligence.cashFlow.moneyOut;
  const isSavingsPositive = currentSavings >= 0;

  // Velocity Metrics
  const dailyAverageSpend = Math.round(totalSpent / Math.max(1, currentDay));
  const monthlyAverageSpend = Math.round(intelligence.cashFlow.averageMonthlyOutflow);
  const projectedMonthEndSpend = Math.round(totalSpent + dailyAverageSpend * daysRemaining);

  // Category extremes
  const categoriesList = intelligence.categoryBreakdown || [];
  const sortedCategories = [...categoriesList].sort((a, b) => b.amount - a.amount);
  const highestCategory = sortedCategories[0] || { name: "None", amount: 0, percentage: 0 };
  const lowestCategory = sortedCategories.length > 1
    ? sortedCategories[sortedCategories.length - 1]
    : { name: "None", amount: 0, percentage: 0 };

  // Upcoming Bills & Commitments
  const upcomingBillsCount = intelligence.recommendations.filter(
    (r) => r.category === "settlement" || r.category === "budget"
  ).length;

  // Dynamic Budget Health Score Calculation (0-100)
  const healthCalculation = useMemo(() => {
    let score = 100;
    const deductions: string[] = [];

    // Utilization deduction
    if (budgetUtilizationPct > 100) {
      score -= 30;
      deductions.push("Overall budget limit exceeded");
    } else if (budgetUtilizationPct >= 80) {
      score -= 15;
      deductions.push("Approaching maximum spending cap");
    }

    // Savings rate check
    if (intelligence.cashFlow.moneyIn > 0) {
      const savingsRate = Math.round((currentSavings / intelligence.cashFlow.moneyIn) * 100);
      if (savingsRate < 10) {
        score -= 20;
        deductions.push("Savings rate below 10% threshold");
      } else if (savingsRate < 20) {
        score -= 10;
        deductions.push("Modest savings margin");
      }
    } else {
      score -= 15;
      deductions.push("No recorded income inflow this month");
    }

    // Overspent categories check
    const overspentCount = activeBudgets.filter((b) => b.spent > b.amount).length;
    if (overspentCount > 0) {
      score -= Math.min(25, overspentCount * 10);
      deductions.push(`${overspentCount} individual category overruns`);
    }

    const finalScore = Math.max(15, Math.min(100, score));

    let grade: "Excellent" | "Good" | "Needs Attention" | "High Risk" | "Critical" = "Good";
    let gradeColor = "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20";

    if (finalScore >= 95) {
      grade = "Excellent";
      gradeColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (finalScore >= 80) {
      grade = "Good";
      gradeColor = "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20";
    } else if (finalScore >= 60) {
      grade = "Needs Attention";
      gradeColor = "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    } else if (finalScore >= 40) {
      grade = "High Risk";
      gradeColor = "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20";
    } else {
      grade = "Critical";
      gradeColor = "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
    }

    return { score: finalScore, grade, gradeColor, deductions };
  }, [budgetUtilizationPct, currentSavings, intelligence.cashFlow.moneyIn, activeBudgets]);

  // Filtered categories
  const filteredBudgets = activeBudgets.filter((b) => {
    if (filterType === "all") return true;
    if (filterType === "group") return Boolean(b.groupId);
    if (filterType === "category") return Boolean(b.categoryId);
    return !b.groupId && !b.categoryId;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/20 to-teal-50/30 dark:from-slate-900/60 dark:via-emerald-950/20 dark:to-slate-900/40 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              <span>Real-Time Personal Budget Planner</span>
            </h2>
            <Badge variant="outline" className="text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Live Ledger Synced
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Spending dynamically decrements budget allocations with zero latency as verified ledger debits occur.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            size="sm"
            onClick={onOpenBudgetDialog}
            className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm min-h-[36px]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Target</span>
          </Button>
        </div>
      </div>

      {/* 2. ROW 1: CORE BUDGET METRICS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1 — Total Budget */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Total Budget
            </span>
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Target className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {formatCurrency(totalBudgetAllocated)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {activeBudgets.length} active allocation targets
          </p>
        </Card>

        {/* Card 2 — Total Spent */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-rose-500/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Total Spent
            </span>
            <div className="p-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(totalSpent)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            Approved ledger debit total
          </p>
        </Card>

        {/* Card 3 — Remaining Budget */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-emerald-500/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Remaining Budget
            </span>
            <div className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(totalRemaining)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            Safe spending margin
          </p>
        </Card>

        {/* Card 4 — Budget Health Score */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-teal-500/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Health Score
            </span>
            <Badge variant="outline" className={`text-[9px] font-bold py-0 px-1.5 ${healthCalculation.gradeColor}`}>
              {healthCalculation.grade}
            </Badge>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {healthCalculation.score}
            </span>
            <span className="text-xs text-slate-400 font-bold">/ 100</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
            Based on velocity & discipline
          </p>
        </Card>
      </div>

      {/* 3. ROW 2: ADVANCED ANALYTICS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 5 — Current Savings */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-teal-500/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Current Savings
            </span>
            <div className={`p-1 rounded-lg ${isSavingsPositive ? "bg-teal-50 text-teal-600" : "bg-rose-50 text-rose-600"} group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
              <PiggyBank className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className={`text-base sm:text-xl font-black tracking-tight ${isSavingsPositive ? "text-teal-600 dark:text-teal-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isSavingsPositive ? "+" : ""}{formatCurrency(currentSavings)}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            Income minus Expenses
          </p>
        </Card>

        {/* Card 6 — Budget Utilization % */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Budget Utilization
            </span>
            <span className={`text-[10px] font-bold ${budgetUtilizationPct >= 100 ? "text-rose-500" : "text-slate-500"}`}>
              {budgetUtilizationPct}%
            </span>
          </div>
          <Progress
            value={Math.min(100, budgetUtilizationPct)}
            className={`h-2.5 rounded-full my-1.5 ${
              budgetUtilizationPct >= 100
                ? "[&>div]:bg-rose-500"
                : budgetUtilizationPct >= 80
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-emerald-500"
            }`}
          />
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            {daysRemaining} days left in month
          </p>
        </Card>

        {/* Card 7 — Daily Average Spend */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-orange-500/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Daily Avg Spend
            </span>
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Flame className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            ₹{dailyAverageSpend.toLocaleString("en-IN")} <span className="text-xs font-normal text-slate-400">/ day</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            Over {currentDay} days elapsed
          </p>
        </Card>

        {/* Card 8 — Highest Spending Category */}
        <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-xs hover:border-indigo-500/50 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] transition-all duration-300 cursor-pointer">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-300">
              Top Category
            </span>
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <Tag className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {highestCategory.name}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80 truncate">
            {formatCurrency(highestCategory.amount)} ({highestCategory.percentage}% of debits)
          </p>
        </Card>
      </div>

      {/* 4. REAL-TIME AI BUDGET VELOCITY INSIGHTS & RECOMMENDATIONS */}
      <Card className="card-lift group rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-card via-slate-50/50 to-primary/[0.03] dark:from-card dark:via-slate-900/30 p-4 sm:p-5 hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] transition-all duration-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Intelligent Budget Velocity Analysis
            </h4>
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
              <p>
                At your current daily run-rate of <strong>₹{dailyAverageSpend.toLocaleString("en-IN")}/day</strong>, your projected month-end outflow is <strong>₹{projectedMonthEndSpend.toLocaleString("en-IN")}</strong>.
                {totalBudgetAllocated > 0 && projectedMonthEndSpend > totalBudgetAllocated ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1">
                    This projects an overrun of ₹{(projectedMonthEndSpend - totalBudgetAllocated).toLocaleString("en-IN")}. Consider trimming discretionary {highestCategory.name} expenses.
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                    Your spending pace is well within safe thresholds for the remaining {daysRemaining} days.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. INTEGRATED SMART ACTION CARDS (Reminders, Settlements & Budget Targets) */}
      {intelligence.recommendations && intelligence.recommendations.length > 0 && (
        <SmartRecommendationsView
          recommendations={intelligence.recommendations}
          onOpenBudgetDialog={onOpenBudgetDialog}
          onEditBudget={onEditBudget}
        />
      )}

      {/* 5. CATEGORY-WISE LIVE BUDGET TRACKING GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Category Spending Targets
            </h3>
            <span className="text-xs text-slate-400">({filteredBudgets.length})</span>
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-1">
            {(["all", "personal", "category", "group"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors ${
                  filterType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {filteredBudgets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBudgets.map((b) => (
              <BudgetCard key={b.id} budget={b} onEdit={onEditBudget} />
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border-2 border-dashed p-8 text-center space-y-3 bg-card/40">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Target className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                No Budgets in this Category
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Set category spending limits for Groceries, Fuel, Shopping, and Bills to automate discipline.
              </p>
            </div>
            <Button
              size="sm"
              onClick={onOpenBudgetDialog}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground min-h-[34px]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Target
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

