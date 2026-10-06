"use client";

import { useState } from "react";
import { BudgetDashboardMetrics, BudgetRecord, SavingsGoal, BudgetType, BudgetPeriod } from "@/lib/types/budgets";
import { 
  createBudget, 
  updateBudget, 
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface BudgetsDashboardViewProps {
  initialMetrics: BudgetDashboardMetrics;
}

export function BudgetsDashboardView({ initialMetrics }: BudgetsDashboardViewProps) {
  const [metrics, setMetrics] = useState<BudgetDashboardMetrics>(initialMetrics);
  const [activeTab, setActiveTab] = useState("category-budgets");

  // Create / Edit Budget Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [budgetName, setBudgetName] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("General");
  const [budgetType, setBudgetType] = useState<BudgetType>("personal");
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>("monthly");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetDescription, setBudgetDescription] = useState("");
  const [isSavingBudget, setIsSavingBudget] = useState(false);

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

  const openCreateModal = () => {
    setEditingBudget(null);
    setBudgetName("");
    setBudgetCategory("General");
    setBudgetType("personal");
    setBudgetPeriod("monthly");
    setBudgetAmount("");
    setBudgetDescription("");
    setIsBudgetModalOpen(true);
  };

  const openEditModal = (b: BudgetRecord) => {
    setEditingBudget(b);
    setBudgetName(b.name);
    setBudgetCategory(b.category);
    setBudgetType(b.budgetType || "personal");
    setBudgetPeriod(b.period);
    setBudgetAmount(b.allocatedAmount.toString());
    setBudgetDescription(b.description || "");
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetName.trim()) {
      toast.error("Please enter a budget name.");
      return;
    }
    const amt = parseFloat(budgetAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid allocated amount.");
      return;
    }

    setIsSavingBudget(true);
    try {
      if (editingBudget) {
        const updated = await updateBudget(editingBudget.id, {
          name: budgetName,
          category: budgetCategory,
          budgetType,
          period: budgetPeriod,
          allocatedAmount: amt,
          amount: amt,
          description: budgetDescription,
        });
        toast.success(`Updated budget '${updated.name}'`);
        setMetrics((prev) => ({
          ...prev,
          budgets: prev.budgets.map((b) => (b.id === updated.id ? updated : b)),
        }));
      } else {
        const created = await createBudget({
          name: budgetName,
          category: budgetCategory,
          budgetType,
          period: budgetPeriod,
          allocatedAmount: amt,
          description: budgetDescription,
        });
        toast.success(`Created budget '${created.name}'`);
        setMetrics((prev) => ({
          ...prev,
          budgets: [...prev.budgets, created],
          totalBudgetAllocated: prev.totalBudgetAllocated + created.allocatedAmount,
          totalRemaining: prev.totalRemaining + created.remainingAmount,
        }));
      }
      setIsBudgetModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save budget.");
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleDuplicate = async (publicId: string) => {
    try {
      const dup = await duplicateBudget(publicId);
      toast.success(`Duplicated budget '${dup.name}'`);
      setMetrics((prev) => ({
        ...prev,
        budgets: [...prev.budgets, dup],
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to duplicate budget.");
    }
  };

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

  const handleDelete = async (publicId: string) => {
    try {
      await deleteBudget(publicId);
      toast.success("Budget deleted.");
      setMetrics((prev) => ({
        ...prev,
        budgets: prev.budgets.filter((b) => b.id !== publicId),
      }));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete budget.");
    }
  };

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
    <div className="space-y-6 pb-12">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Budget Management Center
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-bold">
              ₹ INR
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Plan, monitor, and control personal, category, group, trip, and organization spending in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openCreateModal} className="rounded-xl text-xs font-bold gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Create Budget</span>
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsLimitModalOpen(true)} className="rounded-xl text-xs font-semibold gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Set Limit</span>
          </Button>
        </div>
      </div>

      {/* Forecasting Banner */}
      {metrics.forecast && (
        <Card className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>AI Financial Spend Forecast</span>
              </div>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Projected Spend: {formatCurrency(metrics.forecast.projectedMonthlySpend, "INR")} • Daily Burn: {formatCurrency(metrics.forecast.averageDailyBurn, "INR")}/day
              </p>
              <p className="text-xs text-slate-500">
                Remaining daily allowance to stay on track: <strong className="text-emerald-600">{formatCurrency(metrics.forecast.remainingDailyBudget, "INR")}</strong>
              </p>
            </div>
            {metrics.forecast.exhaustionDate && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 shrink-0 text-xs py-1 px-3">
                Exhaustion Date: {metrics.forecast.exhaustionDate}
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Budget Allocated</span>
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <PieChart className="h-4 w-4 text-primary" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.totalBudgetAllocated, metrics.currency)} />
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-rose-500/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Spent</span>
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <ArrowUpRight className="h-4 w-4 text-rose-500" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.totalSpent, metrics.currency)} />
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-emerald-500/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Total Remaining Budget</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.totalRemaining, metrics.currency)} />
            </p>
          </CardContent>
        </Card>

        <Card className="card-lift group rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm bg-card cursor-pointer hover:border-primary/50 transition-all">
          <CardHeader className="pb-2">
            <p className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">Savings Goals Progress</span>
              <div className="p-1.5 rounded-lg bg-primary/10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                <PiggyBank className="h-4 w-4 text-primary" />
              </div>
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-primary tracking-tight">
              <AnimatedCounter value={formatCurrency(metrics.totalSavedAcrossGoals, metrics.currency)} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap h-auto gap-1">
          <TabsTrigger value="category-budgets" className="rounded-xl text-xs font-semibold">
            <PieChart className="h-3.5 w-3.5 mr-1.5 inline text-primary" />
            Category & Personal ({activeBudgets.filter((b) => !b.groupId && !b.linkedTripId).length})
          </TabsTrigger>
          <TabsTrigger value="group-budgets" className="rounded-xl text-xs font-semibold">
            <Target className="h-3.5 w-3.5 mr-1.5 inline text-indigo-500" />
            Group & Trip Budgets ({activeBudgets.filter((b) => b.groupId || b.linkedTripId).length})
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

        {/* TAB 1: Category & Personal Budgets */}
        <TabsContent value="category-budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBudgets
              .filter((b) => !b.groupId && !b.linkedTripId)
              .map((b) => (
                <Card key={b.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.name}</h2>
                      <p className="text-[11px] text-slate-500">{b.category} • {b.period.toUpperCase()} • Type: {b.budgetType}</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                            Transfer Unused to Savings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(b.id)}>
                            <Archive className="h-3.5 w-3.5 mr-2 text-amber-500" />
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
                      <span className="text-slate-500">Cap: {formatCurrency(b.allocatedAmount, b.currency)}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          b.percentageUsed > 90 ? "bg-rose-500" : b.percentageUsed > 75 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Remaining: <strong className="text-emerald-600">{formatCurrency(b.remainingAmount, b.currency)}</strong>
                    </p>
                  </div>
                </Card>
              ))}
          </div>

          {activeBudgets.filter((b) => !b.groupId && !b.linkedTripId).length === 0 && (
            <div className="py-16 text-center border-2 border-dashed rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
              <PieChart className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">No Personal Budgets Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Set up monthly or category spending caps for groceries, dining out, utilities, or shopping.
              </p>
              <Button size="sm" onClick={openCreateModal} className="rounded-xl text-xs font-bold gap-1.5">
                <Plus className="h-4 w-4" />
                <span>Create Budget</span>
              </Button>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Group & Trip Budgets */}
        <TabsContent value="group-budgets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBudgets
              .filter((b) => b.groupId || b.linkedTripId)
              .map((b) => (
                <Card key={b.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{b.name}</h2>
                      <p className="text-[11px] text-slate-500">
                        {b.groupId ? `Group #${b.groupId}` : `Trip #${b.linkedTripId}`} • {b.budgetType.toUpperCase()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] font-bold">
                      {b.percentageUsed}% POOL USED
                    </Badge>
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

          {activeBudgets.filter((b) => b.groupId || b.linkedTripId).length === 0 && (
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

        {/* TAB 3: Savings Goals */}
        <TabsContent value="savings-goals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.savingsGoals.map((g) => (
              <Card key={g.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{g.name}</h2>
                    <p className="text-[11px] text-slate-500">Target: {g.targetDate} • Priority: {g.priority.toUpperCase()}</p>
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

        {/* TAB 4: Spending Limits */}
        <TabsContent value="spending-limits" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.spendingLimits.map((l) => (
              <Card key={l.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card p-5 space-y-2">
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

      {/* Create / Edit Budget Modal */}
      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-base font-bold">
              {editingBudget ? "Edit Budget" : "Create Financial Budget"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure spending limits and threshold alerts for your accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Budget Name:</label>
                <Input
                  placeholder="e.g. Monthly Dining"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Category:</label>
                <select
                  value={budgetCategory}
                  onChange={(e) => setBudgetCategory(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium"
                >
                  <option value="General">General</option>
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Transport & Fuel">Transport & Fuel</option>
                  <option value="Shopping & Lifestyle">Shopping & Lifestyle</option>
                  <option value="Travel">Travel</option>
                  <option value="Software & Cloud">Software & Cloud</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities & Bills">Utilities & Bills</option>
                  <option value="Rent & Housing">Rent & Housing</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Budget Type:</label>
                <select
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value as BudgetType)}
                  className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium"
                >
                  <option value="personal">Personal</option>
                  <option value="category">Category</option>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                  <option value="trip">Trip</option>
                  <option value="group">Group</option>
                  <option value="organization">Organization</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Allocated Amount (₹):</label>
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="h-9 text-xs rounded-xl font-bold font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Description / Notes:</label>
              <Input
                placeholder="Optional notes or guidelines for this budget"
                value={budgetDescription}
                onChange={(e) => setBudgetDescription(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setIsBudgetModalOpen(false)} className="rounded-xl text-xs h-9">
                Cancel
              </Button>
              <Button size="sm" disabled={isSavingBudget} onClick={handleSaveBudget} className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4">
                {isSavingBudget ? "Saving..." : editingBudget ? "Update Budget" : "Create Budget"}
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
              <Button size="sm" disabled={isTransferring} onClick={handleTransferUnused} className="rounded-xl text-xs h-9 bg-emerald-600 text-white px-4">
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
              <Button size="sm" disabled={isSavingLimit} onClick={handleSaveLimit} className="rounded-xl text-xs h-9 bg-primary text-primary-foreground px-4">
                {isSavingLimit ? "Saving..." : "Set Spending Limit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
