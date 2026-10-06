"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBudget, updateBudget, BudgetProgress } from "@/actions/budgets";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Target, Calendar, Tag, Users, AlertCircle } from "lucide-react";

interface BudgetDialogProps {
  trigger?: React.ReactNode;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
  budgetToEdit?: BudgetProgress | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BudgetDialog({
  trigger,
  categories,
  groups,
  budgetToEdit,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BudgetDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);

  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [name, setName] = useState(budgetToEdit?.name || "");
  const [description, setDescription] = useState(budgetToEdit?.description || "");
  const [amount, setAmount] = useState(budgetToEdit?.amount ? String(budgetToEdit.amount) : "");
  const [period, setPeriod] = useState(budgetToEdit?.period || "monthly");
  const [categoryId, setCategoryId] = useState(budgetToEdit?.categoryId ? String(budgetToEdit.categoryId) : "all");
  const [groupId, setGroupId] = useState(budgetToEdit?.groupId ? String(budgetToEdit.groupId) : "all");
  const [startDate, setStartDate] = useState(
    budgetToEdit?.startDate ? new Date(budgetToEdit.startDate).toISOString().split("T")[0] : defaultStartDate
  );
  const [endDate, setEndDate] = useState(
    budgetToEdit?.endDate ? new Date(budgetToEdit.endDate).toISOString().split("T")[0] : defaultEndDate
  );
  const [alertThreshold, setAlertThreshold] = useState(
    budgetToEdit?.alertThreshold ? String(budgetToEdit.alertThreshold) : "80"
  );
  const [notes, setNotes] = useState(budgetToEdit?.notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Budget name is required");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid budget amount in ₹");
      return;
    }

    setIsLoading(true);
    try {
      if (budgetToEdit) {
        await updateBudget(budgetToEdit.publicId, {
          name,
          description: description || undefined,
          amount: numAmount,
          period: period as any,
          categoryId: categoryId === "all" ? undefined : Number(categoryId),
          groupId: groupId === "all" ? undefined : Number(groupId),
          startDate,
          endDate,
          alertThreshold: Number(alertThreshold),
          notes: notes || undefined,
        });
        toast.success("Budget updated successfully");
      } else {
        await createBudget({
          name,
          description: description || undefined,
          amount: numAmount,
          currency: "INR",
          period: period as any,
          categoryId: categoryId === "all" ? undefined : Number(categoryId),
          groupId: groupId === "all" ? undefined : Number(groupId),
          startDate,
          endDate,
          alertThreshold: Number(alertThreshold),
          notes: notes || undefined,
        });
        toast.success("Budget created successfully");
      }
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
      <DialogContent className="sm:max-w-[480px] rounded-3xl border shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {budgetToEdit ? "Edit Budget" : "Create New Budget"}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Set a spending limit and receive automated alerts when approaching thresholds
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3 text-xs">
          {/* Budget Name */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-xs">Budget Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Grocery, Trip to Goa, Office Supplies"
              className="rounded-xl h-9 text-xs"
              required
            />
          </div>

          {/* Amount in INR & Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Target Limit (₹ INR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹5,000"
                className="rounded-xl h-9 text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Cadence Period</Label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One-Time Project/Trip</option>
              </select>
            </div>
          </div>

          {/* Category & Group Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Applies to Category</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Applies to Group</Label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="all">Personal + All Groups</option>
                {groups.map((g) => (
                  <option key={g.id} value={String(g.id)}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date & End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Alert Threshold */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="font-semibold text-xs">Alert Warning Threshold</Label>
              <span className="font-mono font-bold text-amber-600">{alertThreshold}%</span>
            </div>
            <select
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-full h-9 px-2.5 rounded-xl border border-input bg-background font-medium text-xs"
            >
              <option value="50">50% of budget reached</option>
              <option value="75">75% of budget reached</option>
              <option value="80">80% of budget reached (Recommended)</option>
              <option value="90">90% of budget reached (Urgent)</option>
              <option value="100">100% (Strict Limit)</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="font-semibold text-xs">Description & Notes (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes on what this budget covers..."
              rows={2}
              className="rounded-xl text-xs resize-none"
            />
          </div>

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
              disabled={isLoading}
              className="rounded-xl text-xs font-semibold bg-primary"
            >
              {isLoading ? "Saving..." : budgetToEdit ? "Update Budget" : "Create Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
