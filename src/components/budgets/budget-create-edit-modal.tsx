"use client";

import { useState, useEffect, useMemo } from "react";
import { BudgetRecord, BudgetType, BudgetPeriod, BudgetDurationPreset } from "@/lib/types/budgets";
import { createBudget, updateBudget } from "@/actions/budgets";
import { calculateBudgetDatesFromPreset } from "@/lib/budget-utils";
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
  CalendarDays
} from "lucide-react";

interface BudgetCreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBudget: BudgetRecord | null;
  onBudgetSaved: (savedBudget: BudgetRecord, isNew: boolean) => void;
}

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
      setBudgetCategory(editingBudget.category);
      setBudgetType(editingBudget.budgetType || "personal");
      setDurationPreset((editingBudget.durationPreset as BudgetDurationPreset) || (editingBudget.period as any) || "monthly");
      setStartDate(editingBudget.startDate ? new Date(editingBudget.startDate).toISOString().split("T")[0] : "");
      setEndDate(editingBudget.endDate ? new Date(editingBudget.endDate).toISOString().split("T")[0] : "");
      setBudgetAmount(editingBudget.allocatedAmount.toString());
      setBudgetDescription(editingBudget.description || editingBudget.notes || "");
    } else {
      setBudgetName("");
      setBudgetCategory("General");
      setBudgetType("personal");
      setDurationPreset("monthly");
      const { startDate: dStart, endDate: dEnd } = calculateBudgetDatesFromPreset("monthly");
      setStartDate(dStart.toISOString().split("T")[0]);
      setEndDate(dEnd.toISOString().split("T")[0]);
      setBudgetAmount("");
      setBudgetDescription("");
    }
  }, [editingBudget, isOpen]);

  // When duration preset changes (except custom), automatically calculate start & end dates
  const handleDurationPresetChange = (preset: BudgetDurationPreset) => {
    setDurationPreset(preset);
    if (preset !== "custom") {
      const { startDate: dStart, endDate: dEnd } = calculateBudgetDatesFromPreset(preset);
      setStartDate(dStart.toISOString().split("T")[0]);
      setEndDate(dEnd.toISOString().split("T")[0]);
    }
  };

  // Real-time automatic timeline calculations
  const durationMetrics = useMemo(() => {
    if (!startDate || !endDate) return null;
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const totalDurationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const daysCompleted = Math.max(0, Math.min(totalDurationDays, Math.ceil((now.getTime() - start.getTime()) / 86400000)));
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    const percentageCompleted = Math.min(100, Math.max(0, Math.round((daysCompleted / totalDurationDays) * 100)));

    const parsedAmt = parseFloat(budgetAmount) || 0;
    const dailyCap = totalDurationDays > 0 && parsedAmt > 0 ? Math.round(parsedAmt / totalDurationDays) : 0;
    const remainingHours = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 3600000));

    // Live status deduction
    const isPast = now.getTime() > end.getTime();
    const isFuture = now.getTime() < start.getTime();
    const isEndingSoon = daysRemaining <= 3 && daysRemaining > 0;
    let statusText = "Active";
    let statusBadgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    
    if (isFuture) {
      statusText = "Upcoming";
      statusBadgeClass = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    } else if (isPast) {
      statusText = "Expired";
      statusBadgeClass = "bg-slate-500/10 text-slate-500 border-slate-500/20";
    } else if (isEndingSoon) {
      statusText = "Ending Soon";
      statusBadgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
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

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
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
      <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingBudget ? "Edit Financial Budget" : "Create Financial Budget"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Define spending limits, duration timeline, and automatic ledger tracking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Row 1: Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Budget Name: <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Monthly Dining, Fuel Cap"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                className="h-9 text-xs rounded-xl"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Category:</label>
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium cursor-pointer"
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
              </select>
            </div>
          </div>

          {/* Row 2: Budget Type & Duration Preset */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Budget Type:</label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as BudgetType)}
                className="w-full h-9 text-xs rounded-xl border bg-background px-3 font-medium cursor-pointer"
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
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Budget Duration: <span className="text-primary">*</span>
              </label>
              <select
                value={durationPreset}
                onChange={(e) => handleDurationPresetChange(e.target.value as BudgetDurationPreset)}
                className="w-full h-9 text-xs rounded-xl border border-primary/40 bg-background px-3 font-bold text-primary cursor-pointer"
              >
                <option value="daily">Daily (Today)</option>
                <option value="weekly">Weekly (7 Days)</option>
                <option value="monthly">Monthly (Calendar Month)</option>
                <option value="quarterly">Quarterly (3 Months / 90 Days)</option>
                <option value="half_yearly">Half-Yearly (6 Months / 182 Days)</option>
                <option value="yearly">Yearly (1 Year / 365 Days)</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Row 3: Start Date & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Start Date:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDurationPreset("custom");
                }}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">End Date (Expiry):</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDurationPreset("custom");
                }}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Row 4: Allocated Amount */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Allocated Budget Amount (₹): <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="e.g. 15000"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              className="h-10 text-sm font-bold font-mono rounded-xl focus:border-primary"
            />
          </div>

          {/* Real-Time Calculated Duration Analytics Preview */}
          {durationMetrics && (
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-indigo-500/5 to-transparent p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Calculated Duration & Timeline Metrics
                </span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 ${durationMetrics.statusBadgeClass}`}>
                    {durationMetrics.statusText}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-bold hidden sm:inline-flex">
                    Live Sync
                  </Badge>
                </div>
              </div>

              {/* Mini Timeline Progress Indicator */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                  <span>Timeline Completion</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    {durationMetrics.percentageCompleted}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${durationMetrics.percentageCompleted}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded-xl bg-background border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Total Duration</span>
                  <strong className="text-slate-900 dark:text-slate-100 font-mono">
                    {durationMetrics.totalDurationDays} Days
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-background border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Days Completed</span>
                  <strong className="text-slate-700 dark:text-slate-300 font-mono">
                    {durationMetrics.daysCompleted} Days
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-background border border-emerald-500/30">
                  <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">Days Remaining</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {durationMetrics.daysRemaining} Days {durationPreset === "daily" && `(${durationMetrics.remainingHours}h)`}
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-background border border-amber-500/30">
                  <span className="text-amber-600 dark:text-amber-400 block text-[10px]">Budget End Date</span>
                  <strong className="text-amber-600 dark:text-amber-400 font-mono text-[10px]">
                    {formatDate(durationMetrics.expiryDate)}
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-background border border-cyan-500/30">
                  <span className="text-cyan-600 dark:text-cyan-400 block text-[10px]">Daily Spending Allowance</span>
                  <strong className="text-cyan-600 dark:text-cyan-400 font-mono">
                    ₹{durationMetrics.dailyCap.toLocaleString("en-IN")}/d
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-background border border-indigo-500/30">
                  <span className="text-indigo-600 dark:text-indigo-400 block text-[10px]">Timeline Completed %</span>
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {durationMetrics.percentageCompleted}%
                  </strong>
                </div>

                <div className="p-2 rounded-xl bg-background border border-slate-200/60 dark:border-slate-800 sm:col-span-2">
                  <span className="text-slate-400 block text-[10px]">Current Budget Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                      {durationMetrics.statusText} • Live Verified
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 pt-0.5">
                Budget expires on <strong>{formatDate(durationMetrics.expiryDate)}</strong>. Timeline progress advances every midnight based on ledger date.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Description / Notes (Optional):
            </label>
            <Input
              placeholder="e.g. Monthly dining budget for weekends and takeaways"
              value={budgetDescription}
              onChange={(e) => setBudgetDescription(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
