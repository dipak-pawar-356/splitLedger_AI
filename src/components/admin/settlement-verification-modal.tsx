"use client";

import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { verifySettlement } from "@/actions/admin-settlements";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  CreditCard,
} from "lucide-react";

interface SettlementVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number | string;
  settlementId?: number;
  fromUserId?: number;
  fromContactId?: number;
  fromName: string;
  fromAvatar?: string | null;
  toUserId?: number;
  toContactId?: number;
  toName: string;
  toAvatar?: string | null;
  amount: number; // in rupees
  adminName: string;
  onSuccess?: () => void;
}

const REASON_PRESETS = [
  "Paid personally",
  "Paid by cash",
  "UPI settlement completed",
  "Bank transfer completed",
  "Google Pay completed",
  "PhonePe completed",
];

export function SettlementVerificationModal({
  open,
  onOpenChange,
  groupId,
  settlementId,
  fromUserId,
  fromContactId,
  fromName,
  fromAvatar,
  toUserId,
  toContactId,
  toName,
  toAvatar,
  amount,
  adminName,
  onSuccess,
}: SettlementVerificationModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionReference, setTransactionReference] = useState("");
  const [reason, setReason] = useState("Paid personally");
  const [notes, setNotes] = useState("");

  const currentTimeStr = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason || reason.trim() === "") {
      toast.error("Reason is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifySettlement({
        groupId,
        settlementId,
        fromUserId,
        fromContactId,
        toUserId,
        toContactId,
        amount,
        paymentDate: new Date(paymentDate),
        paymentMethod,
        transactionReference: transactionReference.trim() || undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Settlement of ${formatCurrency(amount)} from ${fromName} to ${toName} marked as verified!`
      );
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify settlement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] rounded-3xl p-0 overflow-hidden border-slate-200/80 dark:border-slate-800 bg-card">
        {/* Modal Header */}
        <div className="bg-slate-50/80 dark:bg-slate-900/60 p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight">
                Admin Settlement Approval
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Confirm offline payment between group members and update balance ledger
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Transfer Participant Visualizer */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            {/* Sender (From) */}
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-10 w-10 border-2 border-rose-500/30 ring-2 ring-rose-500/10 shrink-0">
                <AvatarImage src={fromAvatar || undefined} />
                <AvatarFallback className="text-xs font-bold text-rose-500 bg-slate-200 dark:bg-slate-800">
                  {fromName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider block">
                  Payer (Sender)
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {fromName}
                </p>
              </div>
            </div>

            {/* Amount Badge */}
            <div className="flex flex-col items-center px-2">
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {formatCurrency(amount)}
              </span>
              <div className="flex items-center gap-1 text-emerald-500 mt-0.5">
                <div className="w-4 h-[2px] bg-emerald-500 rounded-full" />
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>

            {/* Receiver (To) */}
            <div className="flex items-center gap-3 min-w-0 text-right justify-end">
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider block">
                  Recipient (Receiver)
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {toName}
                </p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-emerald-500/30 ring-2 ring-emerald-500/10 shrink-0">
                <AvatarImage src={toAvatar || undefined} />
                <AvatarFallback className="text-xs font-bold text-emerald-500 bg-slate-200 dark:bg-slate-800">
                  {toName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentDate" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Payment Date
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="rounded-xl text-xs h-9"
                required
              />
            </div>

            {/* Payment Method Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod" className="text-xs font-semibold flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod" className="rounded-xl text-xs h-9">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="PhonePe">PhonePe</SelectItem>
                  <SelectItem value="Google Pay">Google Pay</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transaction Reference Number */}
          <div className="space-y-1.5">
            <Label htmlFor="reference" className="text-xs font-semibold">
              Transaction Reference / UTR (Optional)
            </Label>
            <Input
              id="reference"
              placeholder="e.g. UPI Ref #428910248291 or Cash receipt"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="rounded-xl text-xs h-9"
            />
          </div>

          {/* Reason (Required) with Quick Pills */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs font-semibold flex items-center justify-between">
              <span>Reason for Verification *</span>
              <span className="text-[10px] text-slate-400 font-normal">Required</span>
            </Label>
            <Input
              id="reason"
              placeholder="Reason for offline settlement confirmation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl text-xs h-9"
              required
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REASON_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                    reason === p
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold"
                      : "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any details for group audit trail..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl text-xs resize-none min-h-[60px]"
            />
          </div>

          {/* Admin Metadata Footer */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Verifying Admin: <strong className="text-slate-700 dark:text-slate-300">{adminName}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{currentTimeStr}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-9"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl text-xs h-9 font-semibold gap-1.5 bg-[#0F9D58] hover:bg-[#0d874b] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Confirm & Mark as Settled</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
