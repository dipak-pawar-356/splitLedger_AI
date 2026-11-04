"use client";

import { useState } from "react";
import { BudgetRecord } from "@/lib/types/budgets";
import { increaseBudget } from "@/actions/budgets";
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
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { 
  TrendingUp, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Coins,
  Plus,
  ArrowUpRight,
  Clock,
  FileText,
  ShieldCheck,
  Zap
} from "lucide-react";

interface BudgetIncreaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: BudgetRecord | null;
  onBudgetIncreased: (updatedBudget: BudgetRecord) => void;
}

export function BudgetIncreaseModal({
  isOpen,
  onClose,
  budget,
  onBudgetIncreased,
}: BudgetIncreaseModalProps) {
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!budget) return null;

  const currentBudgetAmt = budget.allocatedAmount;
  const originalBudgetAmt = budget.originalAmount ?? currentBudgetAmt;
  const previousAddedAmt = budget.additionalAmount ?? 0;
  const addAmt = parseFloat(additionalAmount) || 0;
  const updatedTotalBudget = currentBudgetAmt + addAmt;
  const newTotalAdded = previousAddedAmt + addAmt;
  const remainingDays = Math.max(1, budget.daysRemaining ?? 1);
  const currentSpent = budget.spentAmount;
  const newRemainingBudget = Math.max(0, updatedTotalBudget - currentSpent);
  const newDailyAllowance = Math.round(newRemainingBudget / remainingDays);
  const currentDailyAllowance = Math.round(budget.remainingAmount / remainingDays);
  const allowanceDelta = Math.max(0, newDailyAllowance - currentDailyAllowance);
  const currentVersionNumber = (budget.increases?.length || 0) + 1;
  const newVersionNumber = currentVersionNumber + 1;

  const REASON_SUGGESTIONS = [
    "Unforeseen expenditure",
    "Scope expansion",
    "Weekend trip adjustment",
    "Emergency maintenance",
    "Higher seasonal pricing",
    "Monthly revision",
  ];

  const QUICK_INCREMENTS = [500, 1000, 2000, 5000, 10000];

  const handleQuickAdd = (amt: number) => {
    const current = parseFloat(additionalAmount) || 0;
    setAdditionalAmount((current + amt).toString());
  };

  const handleQuickSet = (amt: number) => {
    setAdditionalAmount(amt.toString());
  };

  const handleSubmit = async () => {
    if (addAmt <= 0) {
      toast.error("Please enter a valid additional amount greater than ₹0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await increaseBudget({
        budgetId: budget.id,
        additionalAmount: addAmt,
        effectiveDate,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Budget '${budget.name}' successfully increased by ₹${addAmt.toLocaleString("en-IN")}!`
      );
      onBudgetIncreased(updated);
      setAdditionalAmount("");
      setReason("");
      setNotes("");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to increase budget.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[92vh] flex flex-col rounded-3xl p-0 overflow-hidden bg-card/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl transition-all">
        {/* Sticky Fixed Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>Increase Active Budget</span>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold px-2 py-0.5">
                  {budget.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Revise spending limit during active duration while preserving complete audit history.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
          {/* Top Inputs: Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Additional Amount (7 Cols) */}
            <div className="sm:col-span-7 space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between text-xs">
                <span>
                  Additional Amount (₹) <span className="text-rose-500">*</span>
                </span>
                {addAmt > 0 && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    +{formatCurrency(addAmt, budget.currency)}
                  </span>
                )}
              </label>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 select-none">
                  ₹
                </span>
                <Input
                  type="number"
                  min="1"
                  step="100"
                  placeholder="e.g. 2000"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                  className="h-10 pl-7 text-sm font-black font-mono tracking-tight rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>

              {/* Quick Increment Shortcut Pills */}
              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Quick add:</span>
                {QUICK_INCREMENTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickSet(q)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500/40 transition-colors budget-btn-press"
                  >
                    +₹{q.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
            </div>

            {/* Effective Date (5 Cols) */}
            <div className="sm:col-span-5 space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Effective Date</span>
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-10 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              />
              <p className="text-[10px] text-slate-400">Timestamp logged to ledger</p>
            </div>
          </div>

          {/* Quick Reason Suggestions */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                Revision Reason:
              </label>
              {reason && (
                <button
                  type="button"
                  onClick={() => setReason("")}
                  className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Clear reason
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {REASON_SUGGESTIONS.map((sug) => {
                const isSelected = reason === sug;

                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setReason(isSelected ? "" : sug)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition-all duration-150 budget-btn-press ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs scale-[1.02]"
                        : "bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {sug}
                  </button>
                );
              })}
            </div>

            <Input
              placeholder="Or type custom reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs rounded-xl mt-1.5 bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:border-emerald-500"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Notes / Audit Memo (Optional):</span>
            </label>
            <Input
              placeholder="e.g. Approved by management for unexpected logistics"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:border-emerald-500"
            />
          </div>

          {/* Real-time Dynamic Revision Impact Intelligence Box */}
          <div className="rounded-2xl border border-emerald-500/30 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 sm:p-4.5 space-y-3.5 shadow-xs backdrop-blur-md">
            {/* Intelligence Header */}
            <div className="flex items-center justify-between pb-1 border-b border-emerald-500/15">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Dynamic Revision Intelligence</span>
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                Version {newVersionNumber}
              </Badge>
            </div>

            {/* 4 Clean Micro-Cards with Separated Badge & Non-Crammed Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Micro-Card 1: Total Budget */}
              <div className="p-3 rounded-xl bg-card/90 dark:bg-slate-950/80 border border-emerald-500/25 flex flex-col justify-between gap-1 shadow-xs hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                    Total Budget
                  </span>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30 px-1.5 py-0">
                    +{formatCurrency(addAmt, budget.currency)}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-sm sm:text-base font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {formatCurrency(updatedTotalBudget, budget.currency)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 line-through">
                    {formatCurrency(currentBudgetAmt, budget.currency)}
                  </span>
                </div>
              </div>

              {/* Micro-Card 2: Daily Spending Allowance */}
              <div className="p-3 rounded-xl bg-card/90 dark:bg-slate-950/80 border border-cyan-500/25 flex flex-col justify-between gap-1 shadow-xs hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                    Daily Allowance
                  </span>
                  <Badge className="bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono font-bold border border-cyan-500/30 px-1.5 py-0">
                    +{formatCurrency(allowanceDelta, budget.currency)}/d
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-sm sm:text-base font-black font-mono text-cyan-600 dark:text-cyan-400 tracking-tight">
                    {formatCurrency(newDailyAllowance, budget.currency)}/d
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 line-through">
                    {formatCurrency(currentDailyAllowance, budget.currency)}/d
                  </span>
                </div>
              </div>

              {/* Micro-Card 3: Total Cumulative Added */}
              <div className="p-3 rounded-xl bg-card/90 dark:bg-slate-950/80 border border-sky-500/25 flex flex-col justify-between gap-1 shadow-xs hover:border-sky-500/40 transition-colors">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                    Cumulative Added
                  </span>
                  <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[10px] font-mono font-bold border border-sky-500/30 px-1.5 py-0">
                    v{newVersionNumber}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-sm sm:text-base font-black font-mono text-sky-600 dark:text-sky-400 tracking-tight">
                    +{formatCurrency(newTotalAdded, budget.currency)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 line-through">
                    {formatCurrency(previousAddedAmt, budget.currency)}
                  </span>
                </div>
              </div>

              {/* Micro-Card 4: Remaining Budget */}
              <div className="p-3 rounded-xl bg-card/90 dark:bg-slate-950/80 border border-teal-500/25 flex flex-col justify-between gap-1 shadow-xs hover:border-teal-500/40 transition-colors">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                    Remaining Buffer
                  </span>
                  <Badge className="bg-teal-500/15 text-teal-600 dark:text-teal-400 text-[10px] font-mono font-bold border border-teal-500/30 px-1.5 py-0">
                    +{formatCurrency(addAmt, budget.currency)}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between gap-2 pt-0.5">
                  <span className="text-sm sm:text-base font-black font-mono text-teal-600 dark:text-teal-400 tracking-tight">
                    {formatCurrency(newRemainingBudget, budget.currency)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 line-through">
                    {formatCurrency(budget.remainingAmount, budget.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Intelligence Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-emerald-500/15 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  Date: <strong className="text-slate-800 dark:text-slate-200 font-mono">{effectiveDate}</strong>
                </span>
                <span>•</span>
                <span>
                  Remaining: <strong className="text-slate-800 dark:text-slate-200 font-mono">{remainingDays} Days</strong>
                </span>
              </div>
              <div>
                Reason: <strong className="text-emerald-600 dark:text-emerald-400 font-medium">{reason || "Standard Revision"}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Fixed Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-end gap-2.5 z-10">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl text-xs h-9 px-4 budget-btn-press"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || addAmt <= 0}
            className="rounded-xl text-xs h-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-5 shadow-md shadow-emerald-500/20 gap-1.5 budget-btn-press transition-all"
          >
            {isSubmitting ? (
              "Applying Revision..."
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Budget Revision (v{newVersionNumber})</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
