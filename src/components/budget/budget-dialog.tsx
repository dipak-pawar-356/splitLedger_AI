"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createBudget,
  updateBudget,
  getIntelligentBudgetAnalysis,
  getBudgetHistory,
  BudgetProgress,
  IntelligentBudgetAnalysis,
  BudgetHistoryItem,
} from "@/actions/budgets";
import { emitFinancialEvent } from "@/lib/events/financial-events";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Target,
  Sparkles,
  History,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  IndianRupee,
  ShieldCheck,
  Zap,
  TrendingDown,
  Info,
  Tag,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

interface BudgetDialogProps {
  trigger?: React.ReactNode;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
  budgetToEdit?: BudgetProgress | null;
  initialAmount?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BudgetDialog({
  trigger,
  categories,
  groups,
  budgetToEdit,
  initialAmount,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BudgetDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const [activeTab, setActiveTab] = useState<"configure" | "history">("configure");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IntelligentBudgetAnalysis | null>(null);
  const [historyItems, setHistoryItems] = useState<BudgetHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [name, setName] = useState(budgetToEdit?.name || "Monthly General Budget");
  const [description, setDescription] = useState(budgetToEdit?.description || "");
  const [amount, setAmount] = useState(
    budgetToEdit?.amount
      ? String(budgetToEdit.amount)
      : initialAmount
      ? String(initialAmount)
      : ""
  );
  const [period, setPeriod] = useState<"monthly" | "weekly" | "custom">(
    (budgetToEdit?.period as any) || "monthly"
  );
  const [categoryId, setCategoryId] = useState(
    budgetToEdit?.categoryId ? String(budgetToEdit.categoryId) : "all"
  );
  const [groupId, setGroupId] = useState(
    budgetToEdit?.groupId ? String(budgetToEdit.groupId) : "all"
  );
  const [startDate, setStartDate] = useState(
    budgetToEdit?.startDate
      ? new Date(budgetToEdit.startDate).toISOString().split("T")[0]
      : defaultStartDate
  );
  const [endDate, setEndDate] = useState(
    budgetToEdit?.endDate
      ? new Date(budgetToEdit.endDate).toISOString().split("T")[0]
      : defaultEndDate
  );
  const [alertThreshold, setAlertThreshold] = useState(
    budgetToEdit?.alertThreshold ? String(budgetToEdit.alertThreshold) : "80"
  );
  const [notes, setNotes] = useState(budgetToEdit?.notes || "");

  // Fetch intelligent budget analysis and history when dialog opens
  useEffect(() => {
    if (open) {
      if (budgetToEdit) {
        setName(budgetToEdit.name);
        setDescription(budgetToEdit.description || "");
        setAmount(String(budgetToEdit.amount));
        setPeriod((budgetToEdit.period as any) || "monthly");
        setCategoryId(budgetToEdit.categoryId ? String(budgetToEdit.categoryId) : "all");
        setGroupId(budgetToEdit.groupId ? String(budgetToEdit.groupId) : "all");
        setStartDate(new Date(budgetToEdit.startDate).toISOString().split("T")[0]);
        setEndDate(new Date(budgetToEdit.endDate).toISOString().split("T")[0]);
        setAlertThreshold(budgetToEdit.alertThreshold ? String(budgetToEdit.alertThreshold) : "80");
        setNotes(budgetToEdit.notes || "");
      } else if (initialAmount && !amount) {
        setAmount(String(initialAmount));
      }

      // Load intelligent analysis
      setIsAnalyzing(true);
      getIntelligentBudgetAnalysis()
        .then((res) => {
          setAnalysis(res);
          if (!amount && !budgetToEdit && res.suggestedBudget > 0) {
            setAmount(String(res.suggestedBudget));
          }
        })
        .catch((err) => console.warn("Failed to fetch budget analysis:", err))
        .finally(() => setIsAnalyzing(false));

      // Load history
      setIsLoadingHistory(true);
      getBudgetHistory()
        .then((items) => setHistoryItems(items))
        .catch((err) => console.warn("Failed to fetch budget history:", err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [open, budgetToEdit, initialAmount]);

  // Adjust dates automatically when changing period
  const handlePeriodChange = (newPeriod: "monthly" | "weekly" | "custom") => {
    setPeriod(newPeriod);
    const curr = new Date();
    if (newPeriod === "monthly") {
      setStartDate(new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split("T")[0]);
      setEndDate(new Date(curr.getFullYear(), curr.getMonth() + 1, 0).toISOString().split("T")[0]);
    } else if (newPeriod === "weekly") {
      const day = curr.getDay();
      const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(curr.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split("T")[0]);
      setEndDate(sunday.toISOString().split("T")[0]);
    }
  };

  // Live calculations for Smart Preview
  const numAmount = parseFloat(amount) || 0;
  const estimatedSpend = analysis?.currentMonthExpenses || 0;
  const estimatedRemaining = Math.max(0, numAmount - estimatedSpend);
  const utilizationPct = numAmount > 0 ? Math.round((estimatedSpend / numAmount) * 100) : 0;
  const estimatedSavings = analysis?.currentIncome
    ? Math.max(0, analysis.currentIncome - numAmount)
    : Math.max(0, numAmount * 0.2);

  // Risk Level
  const riskLevel: { label: string; color: string; badgeClass: string } = useMemo(() => {
    if (numAmount <= 0) return { label: "Unset", color: "text-slate-400", badgeClass: "bg-slate-100 text-slate-600" };
    if (utilizationPct >= 95) return { label: "High Risk (Likely Exceeded)", color: "text-rose-600", badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300" };
    if (utilizationPct >= 75) return { label: "Moderate Risk (Watchful)", color: "text-amber-600", badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300" };
    return { label: "Low Risk (Healthy)", color: "text-emerald-600", badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300" };
  }, [numAmount, utilizationPct]);

  // Validation
  const validationError = useMemo(() => {
    if (!name.trim()) return "Budget name is required.";
    if (numAmount <= 0) return "Budget limit must be greater than ₹0.";
    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      return "End date cannot be earlier than start date.";
    }
    return null;
  }, [name, numAmount, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsLoading(true);
    try {
      if (budgetToEdit) {
        await updateBudget(budgetToEdit.publicId, {
          name: name.trim(),
          description: description.trim() || undefined,
          amount: numAmount,
          period: period as any,
          categoryId: categoryId === "all" ? undefined : Number(categoryId),
          groupId: groupId === "all" ? undefined : Number(groupId),
          startDate,
          endDate,
          alertThreshold: Number(alertThreshold),
          notes: notes.trim() || undefined,
        });
        toast.success("Budget updated successfully");
      } else {
        await createBudget({
          name: name.trim(),
          description: description.trim() || undefined,
          amount: numAmount,
          currency: "INR",
          period: period as any,
          categoryId: categoryId === "all" ? undefined : Number(categoryId),
          groupId: groupId === "all" ? undefined : Number(groupId),
          startDate,
          endDate,
          alertThreshold: Number(alertThreshold),
          notes: notes.trim() || undefined,
        });
        toast.success("Monthly budget established successfully");
      }

      emitFinancialEvent("budget:changed");
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to save budget");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 bg-card">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {budgetToEdit ? "Adjust Monthly Budget" : "Set Up Intelligent Monthly Budget"}
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dynamic spending guardrails powered by live transactions and automated health scores
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 h-9 p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl">
                <TabsTrigger
                  value="configure"
                  className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
                >
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span>Configure Budget</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs"
                >
                  <History className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Budget History ({historyItems.length})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {activeTab === "configure" ? (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
            {/* Dynamic AI Analysis Banner */}
            {analysis && (
              <div className="p-3 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent text-slate-800 dark:text-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-start gap-2 min-w-0">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        AI Recommended Target: ₹{analysis.suggestedBudget.toLocaleString("en-IN")}
                      </span>
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] py-0 px-1 font-bold">
                        Calculated
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                      {analysis.rationale}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs font-semibold h-7 px-2.5 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 shrink-0"
                  onClick={() => setAmount(String(analysis.suggestedBudget))}
                >
                  Apply ₹{analysis.suggestedBudget.toLocaleString("en-IN")}
                </Button>
              </div>
            )}

            {/* Budget Amount in INR & Quick Preset Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-xs flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5 text-primary" />
                  <span>Target Budget Limit (₹ INR) *</span>
                </Label>
                <span className="text-[11px] text-slate-500">Live INR Value</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₹
                </span>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="rounded-xl h-10 pl-8 text-sm font-mono font-bold border-slate-200 dark:border-slate-800"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-slate-400 font-medium mr-0.5">Presets:</span>
                {[5000, 10000, 15000, 25000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-colors border ${
                      numAmount === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-primary/40"
                    }`}
                  >
                    ₹{(preset / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Budget Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly General, Food & Dining"
                  className="rounded-xl h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Category Scope</Label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (e.target.value === "all") {
                      if (!budgetToEdit) setName("Monthly General Budget");
                    } else {
                      const cat = categories.find((c) => String(c.id) === e.target.value);
                      if (cat && !budgetToEdit) setName(`Monthly ${cat.name} Budget`);
                    }
                  }}
                  className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">General (All Categories)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Period Cadence</Label>
                <select
                  value={period}
                  onChange={(e) => handlePeriodChange(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Applies to Group & Alert Warning Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-xs">Group Isolation (Optional)</Label>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
                >
                  <option value="all">Personal + All Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={String(g.id)}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="font-semibold text-xs">Warning Alert Threshold</Label>
                  <span className="font-mono font-bold text-amber-600">{alertThreshold}%</span>
                </div>
                <select
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
                >
                  <option value="50">50% reached</option>
                  <option value="75">75% reached</option>
                  <option value="80">80% reached (Recommended)</option>
                  <option value="90">90% reached (Urgent)</option>
                  <option value="100">100% (Strict Limit)</option>
                </select>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Optional Notes & Purpose</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes on what this budget covers..."
                rows={2}
                className="rounded-xl text-xs resize-none"
              />
            </div>

            {/* SMART LIVE PREVIEW CARD (Requirement 4) */}
            <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Smart Live Calculation Preview</span>
                </div>
                <Badge className={`text-[10px] font-bold py-0.5 px-2 border ${riskLevel.badgeClass}`}>
                  {riskLevel.label}
                </Badge>
              </div>

              {/* 4 Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Budget</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                    ₹{numAmount.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Spent</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                    ₹{estimatedSpend.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Remaining</span>
                  <span className={`text-xs sm:text-sm font-black font-mono ${estimatedRemaining > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                    ₹{estimatedRemaining.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. Savings</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                    ₹{estimatedSavings.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Dynamic Utilization Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className="text-slate-500">Utilization Rate</span>
                  <span className={`font-mono font-bold ${utilizationPct >= 100 ? "text-rose-600" : utilizationPct >= 75 ? "text-amber-600" : "text-emerald-600"}`}>
                    {utilizationPct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      utilizationPct >= 100
                        ? "bg-rose-500"
                        : utilizationPct >= 90
                        ? "bg-orange-500"
                        : utilizationPct >= 75
                        ? "bg-yellow-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, utilizationPct)}%` }}
                  />
                </div>
              </div>

              {/* Health Score Impact Chip */}
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Impact: +12 pts boost to overall Financial Health Score when maintained.</span>
              </div>
            </div>

            {/* Inline Validation Warning */}
            {validationError && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-900/40">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || Boolean(validationError)}
                className="rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              >
                {isLoading ? "Saving..." : budgetToEdit ? "Update Budget" : "Save Budget"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* BUDGET HISTORY TAB (Requirement 12) */
          <div className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Completed & Past Budgets
                </h3>
                <p className="text-[11px] text-slate-500">
                  Historical performance tracking of budget targets and success rates
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {historyItems.length} Budgets
              </Badge>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-slate-400 animate-pulse space-y-2">
                <Clock className="h-6 w-6 mx-auto animate-spin text-primary" />
                <p className="text-xs">Loading budget records from database...</p>
              </div>
            ) : historyItems.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden bg-card">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold py-0 px-1.5 capitalize ${
                            item.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : item.status === "exceeded"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                              : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          }`}
                        >
                          {item.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {item.categoryName} • {item.startDate} to {item.endDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <span>
                          Target: <strong className="font-mono text-slate-900 dark:text-slate-100">₹{item.amount.toLocaleString("en-IN")}</strong>
                        </span>
                        <span>
                          Spent: <strong className="font-mono text-slate-900 dark:text-slate-100">₹{item.spent.toLocaleString("en-IN")}</strong>
                        </span>
                        <span>
                          Remaining: <strong className={`font-mono ${item.remaining > 0 ? "text-emerald-600" : "text-rose-600"}`}>₹{item.remaining.toLocaleString("en-IN")}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Success</span>
                        <span className={`text-xs font-mono font-bold ${item.successRate >= 100 ? "text-emerald-600" : "text-amber-600"}`}>
                          {item.successRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl space-y-2">
                <Target className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Past Budgets Yet</p>
                <p className="text-[11px] max-w-xs mx-auto">
                  Create your first monthly target to build an auditable financial history.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={() => setActiveTab("configure")}
              >
                Back to Configure
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
