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
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Coins
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
      <DialogContent className="sm:max-w-xl w-[95vw] h-[88vh] max-h-[720px] flex flex-col rounded-3xl p-0 overflow-hidden bg-card/95 backdrop-blur-xl border border-emerald-500/20 shadow-2xl">
        {/* Sticky Fixed Header */}
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-card/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Increase Active Budget</span>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                  {budget.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Revise spending limit during the active duration while preserving complete audit history.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body with min-h-0 */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 overscroll-contain">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Additional Amount (₹): <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={additionalAmount}
                onChange={(e) => setAdditionalAmount(e.target.value)}
                className="h-10 text-sm font-bold font-mono rounded-xl focus:border-emerald-500 bg-background"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Effective Date:</label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-10 text-xs rounded-xl focus:border-emerald-500 bg-background"
              />
            </div>
          </div>

          {/* Quick Reason Suggestions */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Revision Reason:</label>
            <div className="flex flex-wrap gap-1.5">
              {REASON_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setReason(sug)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors budget-btn-press ${
                    reason === sug
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/40 font-bold"
                      : "bg-background border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or type custom reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs rounded-xl mt-1.5 bg-background"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Notes / Audit Memo:</label>
            <Input
              placeholder="e.g. Approved by management for unexpected logistics"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-xl bg-background"
            />
          </div>

          {/* Real-time Dynamic Revision Impact Intelligence Box */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Dynamic Revision Intelligence
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] font-bold">
                Version {newVersionNumber}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-background border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Budget</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-400 font-mono line-through">
                      {formatCurrency(currentBudgetAmt, budget.currency)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {formatCurrency(updatedTotalBudget, budget.currency)}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  +{formatCurrency(addAmt, budget.currency)}
                </Badge>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Daily Spending Allowance</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-400 font-mono line-through">
                      {formatCurrency(currentDailyAllowance, budget.currency)}/d
                    </span>
                    <ArrowRight className="h-3 w-3 text-cyan-500" />
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold font-mono">
                      {formatCurrency(newDailyAllowance, budget.currency)}/d
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-500/30">
                  +{formatCurrency(Math.max(0, newDailyAllowance - currentDailyAllowance), budget.currency)}/d
                </Badge>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-sky-500/30 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Cumulative Added</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-400 font-mono line-through">
                      {formatCurrency(previousAddedAmt, budget.currency)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-sky-500" />
                    <span className="text-sky-600 dark:text-sky-400 font-bold font-mono">
                      {formatCurrency(newTotalAdded, budget.currency)}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-sky-600 border-sky-500/30">
                  v{newVersionNumber}
                </Badge>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-teal-500/30 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Remaining Budget</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-slate-400 font-mono line-through">
                      {formatCurrency(budget.remainingAmount, budget.currency)}
                    </span>
                    <ArrowRight className="h-3 w-3 text-teal-500" />
                    <span className="text-teal-600 dark:text-teal-400 font-bold font-mono">
                      {formatCurrency(newRemainingBudget, budget.currency)}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-500/30">
                  +{formatCurrency(addAmt, budget.currency)}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-500">
                Revision Date: <strong className="text-slate-900 dark:text-slate-100">{effectiveDate}</strong> • Remaining Days: <strong className="text-slate-900 dark:text-slate-100">{remainingDays} Days</strong>
              </span>
              <span className="text-slate-500">
                Reason: <strong className="text-slate-700 dark:text-slate-300">{reason || "Revision"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Sticky Fixed Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-background/95 backdrop-blur-md flex items-center justify-end gap-2.5 z-10">
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
            className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 shadow-sm gap-1.5 budget-btn-press"
          >
            {isSubmitting ? (
              "Creating Revision..."
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
