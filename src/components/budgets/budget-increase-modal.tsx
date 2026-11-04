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
      <DialogContent className="sm:max-w-xl rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Increase Active Budget
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600">
                  {budget.name}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Revise spending limit during the active duration while preserving complete audit history.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
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
                className="h-10 text-sm font-bold font-mono rounded-xl focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Effective Date:
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-10 text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Reason for Increase (Audit Trail):
            </label>
            <Input
              placeholder="e.g. Additional travel costs or weekend grocery run"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REASON_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setReason(sug)}
                  className="text-[10px] py-0.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Optional Notes / Guidelines:
            </label>
            <Input
              placeholder="Internal notes regarding this revision"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs rounded-xl"
            />
          </div>

          {/* Live Preview Section */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Live Revision Preview
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border-0">
                Audit Trail Recorded
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-[11px]">
              <div className="p-2.5 rounded-xl bg-background border border-slate-200/60 dark:border-slate-800">
                <p className="text-slate-500 text-[10px] font-medium">Original Budget</p>
                <p className="font-bold font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(originalBudgetAmt, budget.currency)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-emerald-500/30">
                <p className="text-emerald-600 text-[10px] font-medium">+ Additional Added</p>
                <p className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(addAmt, budget.currency)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-indigo-500/30">
                <p className="text-indigo-600 text-[10px] font-medium">Updated Total</p>
                <p className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(updatedTotalBudget, budget.currency)}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-cyan-500/30">
                <p className="text-cyan-600 text-[10px] font-medium">New Daily Cap</p>
                <p className="font-bold font-mono text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(newDailyAllowance, budget.currency)}/d
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-500">
                Remaining Days: <strong className="text-slate-900 dark:text-slate-100">{remainingDays} Days</strong> • Current Spend: <strong className="text-rose-500">{formatCurrency(currentSpent, budget.currency)}</strong>
              </span>
              <span className="text-slate-500">
                New Remaining: <strong className="text-emerald-600 font-bold">{formatCurrency(newRemainingBudget, budget.currency)}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs h-9 px-4"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || addAmt <= 0}
              className="rounded-xl text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 shadow-sm gap-1.5"
            >
              {isSubmitting ? (
                "Updating..."
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Budget Increase</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

