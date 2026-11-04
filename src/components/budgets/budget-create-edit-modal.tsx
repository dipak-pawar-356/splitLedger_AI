"use client";

import { useState, useEffect, useMemo } from "react";
import { BudgetRecord, BudgetType, BudgetDurationPreset } from "@/lib/types/budgets";
import { createBudget, updateBudget } from "@/actions/budgets";
import { calculateBudgetDatesFromPreset, parseSafeDate, getSafeIsoDateStr } from "@/lib/budget-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  Hourglass, 
  CheckCircle2, 
  Coins, 
  Info,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  Layers,
  ShieldCheck
} from "lucide-react";

interface BudgetCreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBudget: BudgetRecord | null;
  onBudgetSaved: (savedBudget: BudgetRecord, isNew: boolean) => void;
}

const DURATION_PRESETS: Array<{ id: BudgetDurationPreset; label: string; daysLabel: string }> = [
  { id: "daily", label: "Daily", daysLabel: "1 Day" },
  { id: "weekly", label: "Weekly", daysLabel: "7 Days" },
  { id: "monthly", label: "Monthly", daysLabel: "30 Days" },
  { id: "quarterly", label: "Quarterly", daysLabel: "90 Days" },
  { id: "half_yearly", label: "6 Months", daysLabel: "182 Days" },
  { id: "yearly", label: "Yearly", daysLabel: "365 Days" },
  { id: "custom", label: "Custom", daysLabel: "Range" },
];

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000];

export function BudgetCreateEditModal({
  isOpen,
  onClose,
  editingBudget,
  onBudgetSaved,
}: BudgetCreateEditModalProps) {
  const [budgetName, setBudgetName] = useState("");
  const [budgetCategory, setBudgetCategory] = useState("General");
  const [budgetType, setBudgetType] = useState<BudgetType>("personal");
  const [durationPreset, setDurationPreset] = useState<BudgetDurationPreset>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetDescription, setBudgetDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (editingBudget) {
      setBudgetName(editingBudget.name);
      setBudgetCategory(editingBudget.category || "General");
      setBudgetType(editingBudget.budgetType || "personal");
      const preset = (editingBudget.durationPreset as BudgetDurationPreset) || (editingBudget.period as any) || "monthly";
      setDurationPreset(preset);
      setStartDate(editingBudget.startDate ? getSafeIsoDateStr(editingBudget.startDate) : "");
      setEndDate(editingBudget.endDate ? getSafeIsoDateStr(editingBudget.endDate) : "");
      setBudgetAmount(editingBudget.allocatedAmount ? editingBudget.allocatedAmount.toString() : "");
      setBudgetDescription(editingBudget.description || editingBudget.notes || "");
    } else {
      setBudgetName("");
      setBudgetCategory("General");
      setBudgetType("personal");
      setDurationPreset("monthly");
      const { startDate: dStart, endDate: dEnd } = calculateBudgetDatesFromPreset("monthly");
      setStartDate(getSafeIsoDateStr(dStart));
      setEndDate(getSafeIsoDateStr(dEnd));
      setBudgetAmount("");
      setBudgetDescription("");
    }
  }, [editingBudget, isOpen]);

  // When duration preset changes (except custom), automatically calculate start & end dates
  const handleDurationPresetChange = (preset: BudgetDurationPreset) => {
    setDurationPreset(preset);
    if (preset !== "custom") {
      const { startDate: dStart, endDate: dEnd } = calculateBudgetDatesFromPreset(preset);
      setStartDate(getSafeIsoDateStr(dStart));
      setEndDate(getSafeIsoDateStr(dEnd));
    }
  };

  // Quick Amount increment/selection
  const handleQuickAmount = (val: number) => {
    const current = parseFloat(budgetAmount) || 0;
    setBudgetAmount((current + val).toString());
  };

  // Real-time automatic timeline calculations
  const durationMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    const now = new Date();
    const start = parseSafeDate(startDate);
    const end = parseSafeDate(endDate);

    const totalDurationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const daysCompleted = Math.max(0, Math.min(totalDurationDays, Math.ceil((now.getTime() - start.getTime()) / 86400000)));
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    const percentageCompleted = Math.min(100, Math.max(0, Math.round((daysCompleted / totalDurationDays) * 100)));

    const parsedAmt = parseFloat(budgetAmount) || 0;
    const dailyCap = totalDurationDays > 0 && parsedAmt > 0 ? Math.round(parsedAmt / totalDurationDays) : 0;
    const remainingHours = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 3600000));

    // Live status deduction strictly from financial date state
    const isPast = now.getTime() > end.getTime();
    const isFuture = now.getTime() < start.getTime();
    const isEndingSoon = daysRemaining <= 3 && daysRemaining > 0;
    let statusText = "Active";
    let statusBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    let statusPillHex = "#16a34a";
    
    if (isFuture) {
      statusText = "Upcoming";
      statusBadgeClass = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
      statusPillHex = "#4f46e5";
    } else if (isPast) {
      statusText = "Expired";
      statusBadgeClass = "bg-slate-500/10 text-slate-500 border-slate-500/30";
      statusPillHex = "#64748b";
    } else if (isEndingSoon) {
      statusText = "Ending Soon";
      statusBadgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 animate-pulse";
      statusPillHex = "#d97706";
    }

    return {
      totalDurationDays,
      daysCompleted,
      daysRemaining,
      remainingHours,
      percentageCompleted,
      expiryDate: endDate,
      dailyCap,
      statusText,
      statusBadgeClass,
      statusPillHex,
    };
  }, [startDate, endDate, budgetAmount]);

  const handleSave = async () => {
    if (!budgetName.trim()) {
      toast.error("Please enter a budget name.");
      return;
    }
    const amt = parseFloat(budgetAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid allocated amount greater than ₹0.");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please provide both start date and end date.");
      return;
    }

    if (parseSafeDate(endDate).getTime() < parseSafeDate(startDate).getTime()) {
      toast.error("End date cannot be earlier than start date.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingBudget) {
        const updated = await updateBudget(editingBudget.id, {
          name: budgetName,
          category: budgetCategory,
          budgetType,
          period: (durationPreset === "quarterly" || durationPreset === "half_yearly" ? "custom" : durationPreset) as any,
          allocatedAmount: amt,
          amount: amt,
          description: budgetDescription,
          startDate,
          endDate,
        });
        toast.success(`Updated budget '${updated.name}'`);
        onBudgetSaved(updated, false);
      } else {
        const created = await createBudget({
          name: budgetName,
          category: budgetCategory,
          budgetType,
          period: durationPreset === "quarterly" || durationPreset === "half_yearly" ? "custom" : durationPreset,
          durationPreset,
          allocatedAmount: amt,
          description: budgetDescription,
          startDate,
          endDate,
        });
        toast.success(`Created budget '${created.name}'`);
        onBudgetSaved(created, true);
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save budget.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[92vh] flex flex-col rounded-3xl p-0 overflow-hidden bg-card/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl transition-all">
        {/* Sticky Fixed Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-primary/15 to-indigo-500/15 text-primary border border-primary/20 shadow-xs">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{editingBudget ? "Edit Financial Budget" : "Create Financial Budget"}</span>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                  Live Ledger
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Define spending limits, duration timeline, and automatic ledger tracking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body with min-h-0 and custom scrollbar */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-5 text-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 hover:scrollbar-thumb-primary/40 scrollbar-track-transparent overscroll-contain">
          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Budget Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Monthly Dining, Fuel Cap"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="h-10 text-xs rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Category</label>
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-background px-3 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                <option value="Health & Medical">Health & Medical</option>
                <option value="Groceries">Groceries</option>
                <option value="Investments">Investments</option>
                <option value="Education">Education</option>
              </select>
            </div>
          </div>

          {/* Row 2: Budget Type & Duration Preset Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Budget Duration Preset <span className="text-primary">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Select pre-calculated interval</span>
            </div>

            {/* Visual Interactive Preset Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
              {DURATION_PRESETS.map((p) => {
                const isSelected = durationPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDurationPresetChange(p.id)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all duration-180 budget-btn-press ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold scale-[1.02]"
                        : "bg-background border-slate-200/80 dark:border-slate-800 hover:border-primary/40 text-slate-700 dark:text-slate-300 font-medium"
                    }`}
                  >
                    <span className="block text-[11px] font-bold leading-tight">{p.label}</span>
                    <span className={`block text-[9px] mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-slate-400"}`}>
                      {p.daysLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Budget Type & Date Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Budget Type</label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as BudgetType)}
                className="w-full h-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-background px-3 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="personal">Personal</option>
                <option value="category">Category</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="trip">Trip</option>
                <option value="group">Group Pool</option>
                <option value="organization">Organization</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDurationPreset("custom");
                }}
                className="h-10 text-xs rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">End Date (Expiry)</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDurationPreset("custom");
                }}
                className="h-10 text-xs rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
              />
            </div>
          </div>

          {/* Row 4: Allocated Amount with Currency Symbol & Quick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Allocated Budget Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Total expenditure limit</span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">₹</span>
              <Input
                type="number"
                placeholder="15000"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="h-11 pl-8 text-base font-bold font-mono rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
              />
            </div>

            {/* Quick Amount Helper Chips */}
            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
              <span className="text-[10px] text-slate-400">Quick add:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors budget-btn-press"
                >
                  +₹{amt.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
          </div>

          {/* Real-Time Calculated Duration & Timeline Analytics Preview */}
          {durationMetrics && (
            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Calculated Duration & Timeline Metrics
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 ${durationMetrics.statusBadgeClass}`}>
                    {durationMetrics.statusText}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold hidden sm:inline-flex">
                    Live Verified
                  </Badge>
                </div>
              </div>

              {/* Timeline Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                  <span>Timeline Completion</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {durationMetrics.percentageCompleted}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${durationMetrics.percentageCompleted}%` }}
                  />
                </div>
              </div>

              {/* 6 Metric KPI Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                {/* 1. Total Duration */}
                <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-xs border border-blue-500/30">
                  <span className="text-blue-600 dark:text-blue-400 block text-[10px] font-semibold">Total Duration</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                    {durationMetrics.totalDurationDays} Days
                  </strong>
                </div>

                {/* 2. Days Elapsed */}
                <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-xs border border-indigo-500/30">
                  <span className="text-indigo-600 dark:text-indigo-400 block text-[10px] font-semibold">Days Completed</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-mono text-xs">
                    {durationMetrics.daysCompleted} Days
                  </strong>
                </div>

                {/* 3. Days Remaining */}
                <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-xs border border-emerald-500/30">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] font-semibold">Days Remaining</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                    {durationMetrics.daysRemaining} Days {durationPreset === "daily" && `(${durationMetrics.remainingHours}h)`}
                  </strong>
                </div>

                {/* 4. Expiry Date */}
                <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-xs border border-amber-500/30">
                  <span className="text-amber-600 dark:text-amber-400 block text-[10px] font-semibold">Budget Expiry Date</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-mono text-[11px]">
                    {formatDate(durationMetrics.expiryDate)}
                  </strong>
                </div>

                {/* 5. Daily Spending Allowance */}
                <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-xs border border-cyan-500/30">
                  <span className="text-cyan-600 dark:text-cyan-400 block text-[10px] font-semibold">Daily Spending Cap</span>
                  <strong className="text-cyan-600 dark:text-cyan-400 font-mono text-xs">
                    ₹{durationMetrics.dailyCap.toLocaleString("en-IN")}/d
                  </strong>
                </div>

                {/* 6. Current Budget Status */}
                <div className="p-2.5 rounded-xl bg-background/80 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold">Current Budget Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: durationMetrics.statusPillHex }} />
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                      {durationMetrics.statusText}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                Budget expires on <strong>{formatDate(durationMetrics.expiryDate)}</strong>. Timeline progress and remaining allowance recalculate continuously from verified ledger records.
              </p>
            </div>
          )}

          {/* Description / Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Description / Notes (Optional)
            </label>
            <Input
              placeholder="e.g. Monthly dining budget for weekends and takeaways"
              value={budgetDescription}
              onChange={(e) => setBudgetDescription(e.target.value)}
              className="h-10 text-xs rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-background"
            />
          </div>
        </div>

        {/* Sticky Fixed Footer */}
        <DialogHeader className="sr-only">
          <DialogTitle>Budget Settings</DialogTitle>
          <DialogDescription>Configure and save budget limits and durations</DialogDescription>
        </DialogHeader>
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between z-10">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            {budgetAmount ? (
              <span>
                Configuring: <strong className="text-slate-900 dark:text-slate-100">₹{Number(budgetAmount).toLocaleString("en-IN")}</strong> • {durationMetrics?.totalDurationDays || 30} Days • <strong className="text-cyan-600 dark:text-cyan-400">₹{durationMetrics?.dailyCap || 0}/day</strong>
              </span>
            ) : (
              <span>Enter budget parameters above</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl text-xs h-9 px-4 budget-btn-press"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl text-xs h-9 bg-primary text-primary-foreground font-bold px-5 shadow-sm budget-btn-press"
            >
              {isSaving ? "Saving..." : editingBudget ? "Update Budget" : "Create Budget"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
