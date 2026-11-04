"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BudgetDashboardMetrics,
  BudgetRecord,
  SavingsGoal,
  BudgetType,
  BudgetPeriod,
} from "@/lib/types/budgets";
import { 
  deleteBudget, 
  archiveBudget, 
  duplicateBudget,
  createSavingsGoal, 
  contributeToSavingsGoal,
  transferUnusedBudgetToSavingsGoal,
  setSpendingLimit,
  deleteSpendingLimit
} from "@/actions/budgets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PiggyBank,
  PieChart,
  Target,
  AlertTriangle,
  TrendingUp,
  Plus,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Copy,
  Archive,
  Trash2,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  Zap,
  Coins,
  History,
  Hourglass,
  Layers,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { BudgetDetailsDashboard } from "./budget-details-dashboard";
import { BudgetIncreaseModal } from "./budget-increase-modal";
import { BudgetCreateEditModal } from "./budget-create-edit-modal";
import { BudgetSmartFilters, BudgetFilterState } from "./budget-smart-filters";

interface BudgetsDashboardViewProps {
  initialMetrics: BudgetDashboardMetrics;
}

export function BudgetsDashboardView({ initialMetrics }: BudgetsDashboardViewProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<BudgetDashboardMetrics>(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Synchronized with verified ledger records");
    }, 450);
  };

  // Default active tab to overview so arriving users immediately see full budget details
  const [activeTab, setActiveTab] = useState("overview");

  // Selected Budget ID for the Details Panel
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(() => {
    const active = initialMetrics.budgets.find(
      (b) => b.status === "active" && b.computedStatus !== "expired" && b.computedStatus !== "completed"
    );
    return active ? active.id : initialMetrics.budgets[0]?.id || null;
  });

  // Modal States
  const [isIncreaseModalOpen, setIsIncreaseModalOpen] = useState(false);
  const [targetIncreaseBudget, setTargetIncreaseBudget] = useState<BudgetRecord | null>(null);

  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);

  // Contribution Modal State
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [isContributing, setIsContributing] = useState(false);

  // Transfer Unused Budget Modal State
  const [transferBudget, setTransferBudget] = useState<BudgetRecord | null>(null);
  const [transferGoalId, setTransferGoalId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Spending Limit Modal State
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [limitPeriod, setLimitPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitCategory, setLimitCategory] = useState("All");
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  // Smart Filters State
  const [filters, setFilters] = useState<BudgetFilterState>({
    timeRange: "all",
    status: "all",
    category: "all",
    budgetType: "all",
    duration: "all",
    revisionFilter: "all",
    quickTag: "all",
  });

  // Available unique categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    metrics.budgets.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [metrics.budgets]);

  // Filtered Budgets according to Smart Filters
  const filteredBudgets = useMemo(() => {
    return metrics.budgets.filter((b) => {
      // 1. Time range filter
      if (filters.timeRange !== "all") {
        const now = new Date();
        const start = new Date(b.startDate);
        const end = new Date(b.endDate || b.startDate);

        if (filters.timeRange === "today") {
          const todayStr = now.toISOString().split("T")[0];
          const startStr = start.toISOString().split("T")[0];
          const endStr = end.toISOString().split("T")[0];
          if (todayStr < startStr || todayStr > endStr) return false;
        } else if (filters.timeRange === "week") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
          if (end < sevenDaysAgo) return false;
        } else if (filters.timeRange === "month") {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (end < monthStart) return false;
        } else if (filters.timeRange === "quarter") {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
          if (end < ninetyDaysAgo) return false;
        } else if (filters.timeRange === "half_year") {
          const sixMonthsAgo = new Date(now.getTime() - 180 * 86400000);
          if (end < sixMonthsAgo) return false;
        } else if (filters.timeRange === "year") {
          const yearStart = new Date(now.getFullYear(), 0, 1);
          if (end < yearStart) return false;
        } else if (filters.timeRange === "custom") {
          if (filters.customStartDate && new Date(b.startDate) < new Date(filters.customStartDate)) return false;
          if (filters.customEndDate && new Date(b.endDate || b.startDate) > new Date(filters.customEndDate)) return false;
        }
      }

      // 2. Status filter
      if (filters.status !== "all") {
        const computed = b.computedStatus || (b.percentageUsed >= 100 ? "exceeded" : "active");
        if (computed !== filters.status) return false;
      }

      // 3. Category filter
      if (filters.category !== "all" && b.category !== filters.category) {
        return false;
      }

      // 4. Budget Type filter
      if (filters.budgetType !== "all" && b.budgetType !== filters.budgetType) {
        return false;
      }

      // 5. Duration filter
      if (filters.duration !== "all") {
        const dur = b.durationPreset || b.period;
        if (dur !== filters.duration) return false;
      }

      // 6. Revision filter
      if (filters.revisionFilter === "increased" && (!b.increaseCount || b.increaseCount === 0)) {
        return false;
      }
      if (filters.revisionFilter === "not_increased" && (b.increaseCount && b.increaseCount > 0)) {
        return false;
      }

      // 7. Quick Tags
      if (filters.quickTag === "over_budget" && b.spentAmount <= b.allocatedAmount) {
        return false;
      }
      if (filters.quickTag === "ending_soon" && b.computedStatus !== "ending_soon") {
        return false;
      }
      if (filters.quickTag === "expired" && b.computedStatus !== "expired" && b.computedStatus !== "completed") {
        return false;
      }

      return true;
    });
  }, [metrics.budgets, filters]);

  // Active selected budget for details dashboard
  const activeSelectedBudget = useMemo(() => {
    if (!selectedBudgetId) return filteredBudgets[0] || metrics.budgets[0] || null;
    const found = metrics.budgets.find((b) => b.id === selectedBudgetId);
    return found || filteredBudgets[0] || metrics.budgets[0] || null;
  }, [selectedBudgetId, metrics.budgets, filteredBudgets]);

  // Open Create Budget modal
  const openCreateModal = () => {
    setEditingBudget(null);
    setIsCreateEditModalOpen(true);
  };

  // Open Edit Budget modal
  const openEditModal = (b: BudgetRecord) => {
    setEditingBudget(b);
    setIsCreateEditModalOpen(true);
  };

  // Open Increase Budget modal
  const openIncreaseModal = (b: BudgetRecord) => {
    setTargetIncreaseBudget(b);
    setIsIncreaseModalOpen(true);
  };

  // Budget Saved Callback
  const handleBudgetSaved = (savedBudget: BudgetRecord, isNew: boolean) => {
    setMetrics((prev) => {
      let updatedBudgets = prev.budgets;
      if (isNew) {
        updatedBudgets = [savedBudget, ...prev.budgets];
      } else {
        updatedBudgets = prev.budgets.map((b) => (b.id === savedBudget.id ? savedBudget : b));
      }

      const totalBudgetAllocated = updatedBudgets.reduce((s, b) => s + b.allocatedAmount, 0);
      const totalSpent = updatedBudgets.reduce((s, b) => s + b.spentAmount, 0);
      const totalRemaining = Math.max(0, totalBudgetAllocated - totalSpent);

      return {
        ...prev,
        budgets: updatedBudgets,
        totalBudgetAllocated,
        totalSpent,
        totalRemaining,
      };
    });

    setSelectedBudgetId(savedBudget.id);
  };

  // Budget Increased Callback
  const handleBudgetIncreased = (updatedBudget: BudgetRecord) => {
    setMetrics((prev) => {
      const updatedBudgets = prev.budgets.map((b) => (b.id === updatedBudget.id ? updatedBudget : b));
      const totalBudgetAllocated = updatedBudgets.reduce((s, b) => s + b.allocatedAmount, 0);
      const totalSpent = updatedBudgets.reduce((s, b) => s + b.spentAmount, 0);
      const totalRemaining = Math.max(0, totalBudgetAllocated - totalSpent);

      return {
        ...prev,
        budgets: updatedBudgets,
        totalBudgetAllocated,
        totalSpent,
        totalRemaining,
      };
    });

    setSelectedBudgetId(updatedBudget.id);
  };

  // Duplicate Budget
  const handleDuplicate = async (publicId: string) => {
    try {
      const dup = await duplicateBudget(publicId);
      toast.success(`Duplicated budget '${dup.name}'`);
      setMetrics((prev) => ({
        ...prev,
        budgets: [dup, ...prev.budgets],
        totalBudgetAllocated: prev.totalBudgetAllocated + dup.allocatedAmount,
        totalRemaining: prev.totalRemaining + dup.remainingAmount,
      }));
      setSelectedBudgetId(dup.id);
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate budget.");
    }
  };

  // Archive Budget
  const handleArchive = async (publicId: string) => {
    try {
      const arch = await archiveBudget(publicId);
      toast.success(`Archived budget '${arch.name}'`);
      setMetrics((prev) => ({
        ...prev,
        budgets: prev.budgets.map((b) => (b.id === arch.id ? arch : b)),
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive budget.");
    }
  };

  // Delete Budget
  const handleDelete = async (publicId: string) => {
    try {
      await deleteBudget(publicId);
      toast.success("Budget deleted successfully.");
      setMetrics((prev) => {
        const remaining = prev.budgets.filter((b) => b.id !== publicId);
        return {
          ...prev,
          budgets: remaining,
        };
      });
      if (selectedBudgetId === publicId) {
        setSelectedBudgetId(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete budget.");
    }
  };

  // Contribute Funds to Savings Goal
  const handleContribute = async () => {
    if (!selectedGoal || !contributionAmount) return;
    const amt = parseFloat(contributionAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid contribution amount.");
      return;
    }

    setIsContributing(true);
    try {
      const updated = await contributeToSavingsGoal(selectedGoal.id, amt);
      toast.success(`Contributed ₹${amt.toLocaleString("en-IN")} to ${updated.name}!`);

      setMetrics((prev) => ({
        ...prev,
        totalSavedAcrossGoals: prev.totalSavedAcrossGoals + amt,
        savingsGoals: prev.savingsGoals.map((g) => (g.id === updated.id ? updated : g)),
      }));
      setSelectedGoal(null);
      setContributionAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to contribute.");
    } finally {
      setIsContributing(false);
    }
  };

  // Transfer Unused Budget to Goal
  const handleTransferUnused = async () => {
    if (!transferBudget || !transferGoalId || !transferAmount) return;
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid transfer amount.");
      return;
    }

    setIsTransferring(true);
    try {
      const { budget: updatedBud, goal: updatedGoal } = await transferUnusedBudgetToSavingsGoal(
        transferBudget.id,
        transferGoalId,
        amt
      );
      toast.success(`Transferred ₹${amt.toLocaleString("en-IN")} unused budget to ${updatedGoal.name}!`);

      setMetrics((prev) => ({
        ...prev,
        totalSpent: prev.totalSpent + amt,
        totalRemaining: Math.max(0, prev.totalRemaining - amt),
        totalSavedAcrossGoals: prev.totalSavedAcrossGoals + amt,
        budgets: prev.budgets.map((b) => (b.id === updatedBud.id ? updatedBud : b)),
        savingsGoals: prev.savingsGoals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g)),
      }));

      setTransferBudget(null);
      setTransferGoalId("");
      setTransferAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to transfer budget.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Save Spending Limit
  const handleSaveLimit = async () => {
    const amt = parseFloat(limitAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid spending limit amount.");
      return;
    }

    setIsSavingLimit(true);
    try {
      const created = await setSpendingLimit({
        period: limitPeriod,
        limitAmount: amt,
        category: limitCategory === "All" ? undefined : limitCategory,
      });
      toast.success(`Spending limit set to ₹${amt.toLocaleString("en-IN")}`);
      setMetrics((prev) => ({
        ...prev,
        spendingLimits: [...prev.spendingLimits.filter((l) => l.id !== created.id), created],
      }));
      setIsLimitModalOpen(false);
      setLimitAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set limit.");
    } finally {
      setIsSavingLimit(false);
    }
  };

  // Delete Spending Limit
  const handleDeleteLimit = async (limitId: string) => {
    try {
      await deleteSpendingLimit(limitId);
      toast.success("Spending limit removed.");
      setMetrics((prev) => ({
        ...prev,
        spendingLimits: prev.spendingLimits.filter((l) => l.id !== limitId),
      }));
    } catch (err: any) {
      toast.error("Failed to delete limit.");
    }
  };

  const activeBudgets = metrics.budgets.filter((b) => b.status !== "archived");

  return (
    <div className="budget-module-scope space-y-6 pb-12">
      {/* 1. Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Budget Planning & Tracking Center
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-bold">
              ₹ INR
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time duration tracking, dynamic budget revisions, timeline progress, and savings intelligence from verified ledger transactions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl text-xs font-semibold gap-1.5 h-9 budget-btn-press"
            title="Synchronize live from ledger"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-primary ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync Ledger</span>
          </Button>

          {activeSelectedBudget && (
            <Button
              size="sm"
              onClick={() => openIncreaseModal(activeSelectedBudget)}
              className="rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-sm h-9 budget-btn-press"
            >
              <Coins className="h-4 w-4" />
              <span>Budget Revision</span>
            </Button>
          )}
          <Button size="sm" onClick={openCreateModal} className="rounded-xl text-xs font-bold gap-1.5 shadow-sm h-9 bg-primary text-primary-foreground budget-btn-press">
            <Plus className="h-4 w-4" />
            <span>Create Budget</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsLimitModalOpen(true)} className="rounded-xl text-xs font-semibold gap-1.5 h-9 budget-btn-press">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Set Limit</span>
          </Button>
        </div>
      </div>

      {/* 2. Smart Filters Bar */}
      <BudgetSmartFilters
        filters={filters}
        onFilterChange={setFilters}
        availableCategories={availableCategories}
        totalBudgetsCount={metrics.budgets.length}
        filteredBudgetsCount={filteredBudgets.length}
      />

      {/* 3. Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="rounded-xl text-xs font-bold">
            <PieChart className="h-3.5 w-3.5 mr-1.5 inline text-primary" />
            Active Budget Details & Intelligence
          </TabsTrigger>
          <TabsTrigger value="category-budgets" className="rounded-xl text-xs font-semibold">
            <Layers className="h-3.5 w-3.5 mr-1.5 inline text-blue-500" />
            Category & Personal ({activeBudgets.filter((b) => !b.groupId && !b.linkedTripId).length})
          </TabsTrigger>
          <TabsTrigger value="group-budgets" className="rounded-xl text-xs font-semibold">
            <Target className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Group & Trip ({activeBudgets.filter((b) => b.groupId || b.linkedTripId).length})
          </TabsTrigger>
          <TabsTrigger value="savings-goals" className="rounded-xl text-xs font-semibold">
            <PiggyBank className="h-3.5 w-3.5 mr-1.5 inline text-emerald-500" />
            Savings Goals ({metrics.savingsGoals.length})
          </TabsTrigger>
          <TabsTrigger value="spending-limits" className="rounded-xl text-xs font-semibold">
            <ShieldAlert className="h-3.5 w-3.5 mr-1.5 inline text-amber-500" />
            Spending Limits ({metrics.spendingLimits.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Complete Budget Details Dashboard */}
        <TabsContent value="overview" className="space-y-6">
          {activeSelectedBudget ? (
            <BudgetDetailsDashboard
              budget={activeSelectedBudget}
              allBudgets={metrics.budgets}
              onSelectBudget={(b) => setSelectedBudgetId(b.id)}
              onOpenIncreaseModal={openIncreaseModal}
              onOpenEditModal={openEditModal}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onTransferUnused={(b) => setTransferBudget(b)}
              verifiedIncome={metrics.verifiedIncome}
              verifiedExpenses={metrics.verifiedExpenses}
            />
          ) : (
            <div className="py-20 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <PieChart className="h-12 w-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                No Active Budget Configured Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Set up a monthly, weekly, quarterly, or category spending target to unlock real-time timeline tracking, dynamic budget revisions, and verified savings insights.
              </p>
              <Button onClick={openCreateModal} className="rounded-xl text-xs font-bold gap-1.5 h-10 px-5 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>Create Your First Financial Budget</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Category & Personal Budgets Grid */}
        <TabsContent value="category-budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBudgets
              .filter((b) => !b.groupId && !b.linkedTripId)
              .map((b) => {
                const totalDur = b.totalDurationDays ?? 30;
                const daysRem = b.daysRemaining ?? 0;
                const origAmt = b.originalAmount ?? b.allocatedAmount;
                const addAmt = b.additionalAmount ?? 0;
                const isInc = (b.increaseCount || 0) > 0;

                return (
                  <Card
                    key={b.id}
                    onClick={() => {
                      setSelectedBudgetId(b.id);
                      setActiveTab("overview");
                    }}
                    className="budget-card-interactive glow-royal-blue rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                            {b.name}
                          </h2>
                          {isInc && (
                            <Badge className="bg-emerald-500/10 text-emerald-600 text-[9px] font-bold border-0">
                              +{formatCurrency(addAmt, b.currency)} Added
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {b.category} • {b.durationPreset || b.period} • {totalDur} Days ({daysRem} days left)
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            b.percentageUsed > 90
                              ? "bg-rose-500/10 text-rose-600"
                              : b.percentageUsed > 75
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {b.percentageUsed}% USED
                        </Badge>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openIncreaseModal(b)}
                          className="h-7 text-[10px] rounded-lg px-2 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                        >
                          <Coins className="h-3 w-3" />
                          <span>Increase</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl text-xs">
                            <DropdownMenuItem onClick={() => openEditModal(b)}>
                              <Edit2 className="h-3.5 w-3.5 mr-2" />
                              Edit Budget
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(b.id)}>
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTransferBudget(b)}>
                              <ArrowRightLeft className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              Transfer to Savings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(b.id)} className="text-amber-600">
                              <Archive className="h-3.5 w-3.5 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(b.id)} className="text-rose-600">
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Spent: {formatCurrency(b.spentAmount, b.currency)}</span>
                        <span className="text-slate-500 font-mono">
                          Cap: {formatCurrency(b.allocatedAmount, b.currency)}
                          {isInc && <span className="text-[10px] text-slate-400 font-normal"> (Orig: {formatCurrency(origAmt, b.currency)})</span>}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            b.percentageUsed > 90 ? "bg-rose-500" : b.percentageUsed > 75 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>
                          Remaining: <strong className="text-emerald-600 font-bold">{formatCurrency(b.remainingAmount, b.currency)}</strong>
                        </span>
                        <span>{b.countdownText || `${daysRem} Days Left`}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>

          {filteredBudgets.filter((b) => !b.groupId && !b.linkedTripId).length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <PieChart className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Matching Personal Budgets</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Adjust filter criteria or create a new personal budget limit.
              </p>
              <Button size="sm" onClick={openCreateModal} className="rounded-xl text-xs font-bold gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Create Budget</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Group & Trip Budgets */}
        <TabsContent value="group-budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBudgets
              .filter((b) => b.groupId || b.linkedTripId)
              .map((b) => (
                <Card
                  key={b.id}
                  onClick={() => {
                    setSelectedBudgetId(b.id);
                    setActiveTab("overview");
                  }}
                  className="budget-card-interactive glow-indigo rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">
                        {b.name}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        {b.groupId ? `Group #${b.groupId}` : `Trip #${b.linkedTripId}`} • {b.budgetType.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold">
                        {b.percentageUsed}% POOL USED
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openIncreaseModal(b)}
                        className="h-7 text-[10px] rounded-lg px-2 text-emerald-600 border-emerald-500/30 gap-1"
                      >
                        <Coins className="h-3 w-3" />
                        <span>Increase</span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Spent: {formatCurrency(b.spentAmount, b.currency)}</span>
                      <span className="text-slate-500">Total Pool: {formatCurrency(b.allocatedAmount, b.currency)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Remaining in Shared Pool: <strong className="text-emerald-600">{formatCurrency(b.remainingAmount, b.currency)}</strong>
                    </p>
                  </div>
                </Card>
              ))}
          </div>

          {filteredBudgets.filter((b) => b.groupId || b.linkedTripId).length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <Target className="h-10 w-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Group or Trip Budgets</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Allocate group pool budgets for shared house rent, vacations, or team events.
              </p>
              <Button size="sm" onClick={openCreateModal} className="rounded-xl text-xs font-bold gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Create Group Budget</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 4: Savings Goals */}
        <TabsContent value="savings-goals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.savingsGoals.map((g) => (
              <Card key={g.id} className="budget-card-interactive glow-emerald rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{g.name}</h2>
                    <p className="text-[11px] text-slate-500">Target: {formatDate(g.targetDate)} • Priority: {g.priority.toUpperCase()}</p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                    {g.progressPercent}% SAVED
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-600">Saved: {formatCurrency(g.currentSaved, g.currency)}</span>
                    <span className="text-slate-500">Goal: {formatCurrency(g.targetAmount, g.currency)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, g.progressPercent)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400">
                    To Save: <strong>{formatCurrency(g.remainingAmount, g.currency)}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs h-8 gap-1"
                    onClick={() => setSelectedGoal(g)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Funds</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {metrics.savingsGoals.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <PiggyBank className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Savings Goals Set</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Track target savings for tech upgrades, emergency funds, or vacations.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 5: Spending Limits */}
        <TabsContent value="spending-limits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.spendingLimits.map((l) => (
              <Card key={l.id} className="budget-card-interactive glow-amber rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm capitalize">{l.period} Spending Cap</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                      ACTIVE MONITOR
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteLimit(l.id)} className="h-6 w-6 p-0 text-rose-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs pt-2">
                  <span className="text-slate-500">Current Outflow:</span>
                  <strong className="text-sm font-black">{formatCurrency(l.currentSpend, "INR")}</strong>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Configured Cap:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{formatCurrency(l.limitAmount, "INR")}</span>
                </div>
              </Card>
            ))}
          </div>

          {metrics.spendingLimits.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Active Spending Limits</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Set strict daily, weekly, or monthly caps to prevent unexpected overspending.
              </p>
              <Button size="sm" onClick={() => setIsLimitModalOpen(true)} className="rounded-xl text-xs font-bold gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                <span>Configure Limit</span>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Increase Budget Modal */}
      <BudgetIncreaseModal
        isOpen={isIncreaseModalOpen}
        onClose={() => setIsIncreaseModalOpen(false)}
        budget={targetIncreaseBudget}
        onBudgetIncreased={handleBudgetIncreased}
      />

      {/* Create / Edit Budget Modal */}
      <BudgetCreateEditModal
        isOpen={isCreateEditModalOpen}
        onClose={() => setIsCreateEditModalOpen(false)}
        editingBudget={editingBudget}
        onBudgetSaved={handleBudgetSaved}
      />

      {/* Contribute Funds to Savings Goal Modal */}
      <Dialog open={!!selectedGoal} onOpenChange={(open) => !open && setSelectedGoal(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Add Funds to Goal</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Contribute towards &apos;{selectedGoal?.name}&apos; (Target: {formatCurrency(selectedGoal?.targetAmount || 0, "INR")})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Contribution Amount (₹):</label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="h-10 text-sm font-bold font-mono rounded-xl focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setSelectedGoal(null)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" disabled={isContributing} onClick={handleContribute} className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4">
                {isContributing ? "Adding..." : "Add Funds"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Unused Budget Modal */}
      <Dialog open={!!transferBudget} onOpenChange={(open) => !open && setTransferBudget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Transfer Unused Budget to Savings</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Move unspent funds from &apos;{transferBudget?.name}&apos; (Remaining: {formatCurrency(transferBudget?.remainingAmount || 0, "INR")}) to a savings goal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Select Savings Goal:</label>
              <select
                value={transferGoalId}
                onChange={(e) => setTransferGoalId(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium"
              >
                <option value="">Select target goal...</option>
                {metrics.savingsGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (Saved: ₹{g.currentSaved})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Transfer Amount (₹):</label>
              <Input
                type="number"
                placeholder={`Max ₹${transferBudget?.remainingAmount || 0}`}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="h-9 text-xs rounded-xl font-bold font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setTransferBudget(null)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" disabled={isTransferring} onClick={handleTransferUnused} className="rounded-xl text-xs h-9 bg-emerald-600 text-white font-bold px-4">
                {isTransferring ? "Transferring..." : "Confirm Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spending Limit Modal */}
      <Dialog open={isLimitModalOpen} onOpenChange={setIsLimitModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">Configure Spending Limit</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Receive alert notifications when outflows exceed threshold limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Time Period:</label>
                <select
                  value={limitPeriod}
                  onChange={(e) => setLimitPeriod(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Cap Amount (₹):</label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  className="h-9 text-xs rounded-xl font-bold font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setIsLimitModalOpen(false)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" disabled={isSavingLimit} onClick={handleSaveLimit} className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-bold px-4">
                {isSavingLimit ? "Saving..." : "Set Spending Limit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
