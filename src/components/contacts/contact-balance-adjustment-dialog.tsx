"use client";

import { useState, useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PlusCircle, 
  SlidersHorizontal, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Loader2, 
  Paperclip, 
  CheckCircle2, 
  IndianRupee,
  FileText,
  Calendar as CalendarIcon
} from "lucide-react";
import { createTransaction } from "@/actions/transactions";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

export type AdjustmentType =
  | "credit"
  | "debit"
  | "payment_received"
  | "payment_sent"
  | "opening_balance_adjustment"
  | "manual_adjustment";

interface ContactBalanceAdjustmentDialogProps {
  contactId: number;
  contactPublicId: string;
  contactName: string;
  currency?: string;
  currentBalancePaise: number;
  defaultMode?: "add" | "adjust";
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ContactBalanceAdjustmentDialog({
  contactId,
  contactPublicId,
  contactName,
  currency = "INR",
  currentBalancePaise,
  defaultMode = "add",
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: ContactBalanceAdjustmentDialogProps) {
  const router = useRouter();
  const fileInputId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

  const [amountStr, setAmountStr] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>(
    defaultMode === "adjust" ? "manual_adjustment" : "credit"
  );
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [categoryId, setCategoryId] = useState<string>("other");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive whether this type inherently increases or decreases balance
  const isIncrease = (() => {
    switch (adjustmentType) {
      case "credit":
      case "payment_sent":
        return true;
      case "debit":
      case "payment_received":
        return false;
      case "opening_balance_adjustment":
      case "manual_adjustment":
        return direction === "increase";
    }
  })();

  const numericAmount = Math.max(0, parseFloat(amountStr) || 0);
  const adjustmentPaise = Math.round(numericAmount * 100);
  const newBalancePaise = isIncrease
    ? currentBalancePaise + adjustmentPaise
    : currentBalancePaise - adjustmentPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptUrl: string | undefined = undefined;
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        formData.append("folder", "receipts");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptUrl = uploadData.url;
        } else {
          console.warn("Attachment upload skipped or failed");
        }
      }

      // Map adjustment to transaction attributes
      let txType: "paid" | "received" | "lent" | "borrowed" | "repaid" | "adjustment" = "lent";
      let title = "";

      switch (adjustmentType) {
        case "credit":
          txType = "lent";
          title = `Credit Balance Added: ${contactName}`;
          break;
        case "debit":
          txType = "paid";
          title = `Debit Balance Deducted: ${contactName}`;
          break;
        case "payment_received":
          txType = "repaid";
          title = `Payment Received from ${contactName}`;
          break;
        case "payment_sent":
          txType = "lent";
          title = `Payment Sent to ${contactName}`;
          break;
        case "opening_balance_adjustment":
          txType = isIncrease ? "lent" : "paid";
          title = `Opening Balance Adjustment (${isIncrease ? "+ Credit" : "- Debit"})`;
          break;
        case "manual_adjustment":
        default:
          txType = isIncrease ? "lent" : "paid";
          title = `Manual Ledger Adjustment (${isIncrease ? "+ Credit" : "- Debit"})`;
          break;
      }

      const description = notes.trim()
        ? `${title} - ${notes.trim()}`
        : `${title} for ${contactName}`;

      await createTransaction({
        contactId,
        type: txType,
        amount: numericAmount,
        currency,
        title,
        description,
        date: new Date(date),
        notes: notes.trim() || undefined,
        receiptUrl,
        tags: ["adjustment", adjustmentType, isIncrease ? "credit" : "debit"],
        status: "completed",
      });

      toast.success(
        `Balance adjusted successfully! New balance: ${formatCurrency(newBalancePaise / 100, currency)}`
      );
      setIsOpen?.(false);
      setAmountStr("");
      setNotes("");
      setReceiptFile(null);
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      console.error("Adjustment error:", err);
      toast.error(err?.message || "Failed to adjust balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <div onClick={() => setIsOpen?.(true)} className="inline-block">
          {trigger}
        </div>
      )}

      <DialogContent className="sm:max-w-[540px] rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              {defaultMode === "adjust" ? (
                <SlidersHorizontal className="h-5 w-5" />
              ) : (
                <PlusCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {defaultMode === "adjust" ? "Adjust Contact Balance" : "Add Balance Entry"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Record a transaction-backed financial adjustment for{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{contactName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Amount input with Currency Symbol */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-amount" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Adjustment Amount ({currency}) <span className="text-rose-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                ₹
              </span>
              <Input
                id="adj-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                required
                className="pl-8 text-base font-bold font-mono rounded-xl h-11 border-slate-200 dark:border-slate-800 focus-visible:ring-primary/30"
              />
            </div>
          </div>

          {/* Transaction Type Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-type" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Adjustment Type <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={adjustmentType}
              onValueChange={(val) => setAdjustmentType(val as AdjustmentType)}
            >
              <SelectTrigger id="adj-type" className="h-10 rounded-xl text-xs font-semibold">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="credit" className="text-xs font-medium">
                  Credit (+ Contact Owes You More)
                </SelectItem>
                <SelectItem value="debit" className="text-xs font-medium">
                  Debit (- You Owe Contact / Balance Deducted)
                </SelectItem>
                <SelectItem value="payment_received" className="text-xs font-medium">
                  Payment Received (Contact Paid You)
                </SelectItem>
                <SelectItem value="payment_sent" className="text-xs font-medium">
                  Payment Sent (You Paid Contact)
                </SelectItem>
                <SelectItem value="opening_balance_adjustment" className="text-xs font-medium">
                  Opening Balance Adjustment
                </SelectItem>
                <SelectItem value="manual_adjustment" className="text-xs font-medium">
                  Manual Reconciliation Adjustment
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Direction toggle if manual or opening balance */}
          {(adjustmentType === "opening_balance_adjustment" ||
            adjustmentType === "manual_adjustment") && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Adjustment Impact
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={direction === "increase" ? "default" : "outline"}
                  onClick={() => setDirection("increase")}
                  className={`rounded-xl text-xs font-bold h-9 gap-1.5 ${
                    direction === "increase"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "hover:border-emerald-500/50"
                  }`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Increase (+ Credit)</span>
                </Button>
                <Button
                  type="button"
                  variant={direction === "decrease" ? "default" : "outline"}
                  onClick={() => setDirection("decrease")}
                  className={`rounded-xl text-xs font-bold h-9 gap-1.5 ${
                    direction === "decrease"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "hover:border-rose-500/50"
                  }`}
                >
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span>Decrease (- Debit)</span>
                </Button>
              </div>
            </div>
          )}

          {/* Date and Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adj-date" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Adjustment Date
              </Label>
              <Input
                id="adj-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl h-10 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-category" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Category (Optional)
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="adj-category" className="h-10 rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-56">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="adj-notes" className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Reason / Notes (Optional)
            </Label>
            <Textarea
              id="adj-notes"
              placeholder="e.g. Reconciliation for previous cash exchange, invoice discount..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-xl text-xs resize-none"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Receipt or Document (Optional)
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id={fileInputId}
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(fileInputId)?.click()}
                className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>{receiptFile ? "Change File" : "Attach File"}</span>
              </Button>
              {receiptFile && (
                <span className="text-xs text-slate-600 dark:text-slate-400 truncate font-mono">
                  {receiptFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Live Balance Calculation Preview
            </span>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-medium block">Previous</span>
                <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                  {formatCurrency(currentBalancePaise / 100, currency)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-medium block">Adjustment</span>
                <span
                  className={`font-mono font-bold text-xs ${
                    numericAmount === 0
                      ? "text-slate-400"
                      : isIncrease
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {numericAmount > 0 ? (isIncrease ? "+" : "-") : ""}
                  {formatCurrency(numericAmount, currency)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-card border border-slate-200/60 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 font-medium block">New Balance</span>
                <span
                  className={`font-mono font-bold text-xs ${
                    newBalancePaise > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : newBalancePaise < 0
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {formatCurrency(newBalancePaise / 100, currency)}
                </span>
              </div>
            </div>
            <div className="text-[11px] text-center text-slate-500 font-medium pt-1">
              Result:{" "}
              {newBalancePaise > 0 ? (
                <span className="text-emerald-600 font-bold">They Owe You</span>
              ) : newBalancePaise < 0 ? (
                <span className="text-rose-600 font-bold">You Owe Them</span>
              ) : (
                <span className="text-slate-500 font-bold">All Settled (₹0.00)</span>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen?.(false)}
              className="rounded-xl text-xs font-semibold h-10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || numericAmount <= 0}
              className="rounded-xl text-xs font-bold h-10 gap-1.5 bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Recording Transaction...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Adjustment</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

