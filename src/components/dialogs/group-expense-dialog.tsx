"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, User, Users, DollarSign, Calculator, Check, AlertCircle } from "lucide-react";
import { createTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface GroupMember {
  id: number;
  userId?: number;
  contactId?: number;
  userName?: string;
  contactName?: string;
  isAdmin: boolean;
  isGuest: boolean;
  nickname?: string;
}

interface GroupExpenseDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  groupId: number | string;
  groupCurrency?: string;
  members: GroupMember[];
  currentUserId: number;
  isAdmin: boolean;
  preselectedMemberId?: number;
}

type SplitMethod = "equal" | "exact" | "percentage" | "shares";

export function GroupExpenseDialog({ 
  trigger, 
  onSuccess, 
  groupId, 
  groupCurrency = "INR", 
  members, 
  currentUserId,
  isAdmin,
  preselectedMemberId
}: GroupExpenseDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  
  // Payer state: format "user:12" or "contact:4"
  const defaultPayer = useMemo(() => {
    const userMember = members.find((m) => m.userId === currentUserId);
    if (userMember?.userId) return `user:${userMember.userId}`;
    if (members[0]?.userId) return `user:${members[0].userId}`;
    if (members[0]?.contactId) return `contact:${members[0].contactId}`;
    return "";
  }, [members, currentUserId]);

  const [selectedPayer, setSelectedPayer] = useState<string>(defaultPayer);

  // Split Method & Participants State
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  
  // Participant configuration map: key = member.id
  // Stores { included: boolean, exactAmount: number, percentage: number, shares: number }
  const [participantState, setParticipantState] = useState<Record<number, {
    included: boolean;
    exactAmount: string;
    percentage: string;
    shares: string;
  }>>({});

  // Initialize participant state whenever dialog opens or members change
  useEffect(() => {
    if (open) {
      const initial: Record<number, any> = {};
      members.forEach((m) => {
        initial[m.id] = {
          included: true,
          exactAmount: "",
          percentage: members.length > 0 ? (100 / members.length).toFixed(1) : "0",
          shares: "1",
        };
      });
      setParticipantState(initial);
      if (defaultPayer) {
        setSelectedPayer((prev) => prev || defaultPayer);
      }
    }
  }, [open, members, defaultPayer]);

  const totalAmountNum = parseFloat(amount) || 0;
  const includedMembers = members.filter((m) => participantState[m.id]?.included);

  // Calculate live split preview
  const calculatedSplits = useMemo(() => {
    if (totalAmountNum <= 0 || includedMembers.length === 0) return [];

    if (splitMethod === "equal") {
      const perPerson = totalAmountNum / includedMembers.length;
      return includedMembers.map((m) => ({
        member: m,
        amount: perPerson,
        display: formatCurrency(perPerson),
      }));
    }

    if (splitMethod === "exact") {
      return includedMembers.map((m) => {
        const val = parseFloat(participantState[m.id]?.exactAmount) || 0;
        return {
          member: m,
          amount: val,
          display: formatCurrency(val),
        };
      });
    }

    if (splitMethod === "percentage") {
      return includedMembers.map((m) => {
        const pct = parseFloat(participantState[m.id]?.percentage) || 0;
        const val = (totalAmountNum * pct) / 100;
        return {
          member: m,
          amount: val,
          percentage: pct,
          display: `${formatCurrency(val)} (${pct}%)`,
        };
      });
    }

    if (splitMethod === "shares") {
      const totalShares = includedMembers.reduce((sum, m) => {
        return sum + (parseFloat(participantState[m.id]?.shares) || 1);
      }, 0);

      return includedMembers.map((m) => {
        const share = parseFloat(participantState[m.id]?.shares) || 1;
        const val = totalShares > 0 ? (totalAmountNum * share) / totalShares : 0;
        return {
          member: m,
          amount: val,
          shares: share,
          display: `${formatCurrency(val)} (${share} share${share > 1 ? 's' : ''})`,
        };
      });
    }

    return [];
  }, [totalAmountNum, includedMembers, splitMethod, participantState]);

  // Validation for custom splits
  const splitValidationError = useMemo(() => {
    if (totalAmountNum <= 0) return null;
    if (includedMembers.length === 0) return "Please select at least one participant.";

    if (splitMethod === "exact") {
      const sum = calculatedSplits.reduce((s, c) => s + c.amount, 0);
      const diff = Math.abs(sum - totalAmountNum);
      if (diff > 0.05) {
        return `Exact split sum (${formatCurrency(sum)}) must equal total amount (${formatCurrency(totalAmountNum)}). Difference: ${formatCurrency(Math.abs(sum - totalAmountNum))}`;
      }
    }

    if (splitMethod === "percentage") {
      const totalPct = includedMembers.reduce((s, m) => s + (parseFloat(participantState[m.id]?.percentage) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        return `Total percentages (${totalPct.toFixed(1)}%) must equal 100%.`;
      }
    }

    return null;
  }, [totalAmountNum, includedMembers, splitMethod, calculatedSplits, participantState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please provide a description");
      return;
    }

    if (totalAmountNum <= 0) {
      setError("Amount must be greater than 0");
      return;
    }

    if (splitValidationError) {
      setError(splitValidationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Parse payer
      let paidBy: number | undefined = undefined;
      let paidByContact: number | undefined = undefined;

      if (selectedPayer.startsWith("user:")) {
        paidBy = parseInt(selectedPayer.replace("user:", ""), 10);
      } else if (selectedPayer.startsWith("contact:")) {
        paidByContact = parseInt(selectedPayer.replace("contact:", ""), 10);
      } else {
        paidBy = currentUserId;
      }

      // Build splits array
      const splits = calculatedSplits.map((item) => ({
        userId: item.member.userId,
        contactId: item.member.contactId,
        splitMethod,
        amount: item.amount,
        percentage: (item as any).percentage,
        shares: (item as any).shares,
        isExcluded: false,
      }));

      await createTransaction({
        type: "paid",
        amount: totalAmountNum,
        currency: "INR",
        description: description.trim(),
        date: date ? new Date(date) : new Date(),
        groupId: typeof groupId === "number" ? groupId : undefined,
        paymentMethod: paymentMethod || undefined,
        status: "completed",
        receiptUrl: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        paidBy,
        paidByContact,
        splits,
      });

      toast.success("Group expense added successfully!");
      setOpen(false);
      resetForm();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add expense";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setNotes("");
    setReceiptUrl("");
    setSplitMethod("equal");
    setError(null);
  };

  const getMemberDisplayName = (m: GroupMember) => {
    return m.nickname || m.userName || m.contactName || (m.userId ? "Registered User" : "Guest Contact");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-5 w-5 text-primary" />
            Add Group Expense
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="desc" className="text-sm font-medium">Description *</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Dinner, Villa Booking, Fuel"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amt" className="text-sm font-medium">Total Amount (₹ INR) *</Label>
              <Input
                id="amt"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payerSelect" className="text-sm font-medium">Paid By *</Label>
              <Select value={selectedPayer} onValueChange={setSelectedPayer} disabled={isLoading}>
                <SelectTrigger id="payerSelect">
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => {
                    const val = m.userId ? `user:${m.userId}` : `contact:${m.contactId}`;
                    return (
                      <SelectItem key={m.id} value={val}>
                        {getMemberDisplayName(m)} {m.userId === currentUserId ? "(You)" : ""} {m.isGuest ? "[Guest]" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expDate" className="text-sm font-medium">Date</Label>
              <Input
                id="expDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Split Method Selector */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-primary" />
                Split Method
              </Label>
              <span className="text-xs text-slate-500">
                {includedMembers.length} of {members.length} participating
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-lg">
              {(["equal", "exact", "percentage", "shares"] as SplitMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSplitMethod(m)}
                  className={`py-1.5 text-xs font-semibold rounded-md capitalize transition-all ${
                    splitMethod === m
                      ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Participants Table */}
          <div className="space-y-2 border rounded-xl p-3 bg-slate-50/50 dark:bg-slate-900/50">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Participants & Share Breakdown
            </p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {members.map((m) => {
                const isIncluded = participantState[m.id]?.included ?? true;
                const splitItem = calculatedSplits.find((s) => s.member.id === m.id);

                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                      isIncluded
                        ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        : "bg-slate-100/60 dark:bg-slate-900/30 border-transparent opacity-60"
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-medium min-w-0">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={(e) => {
                          setParticipantState((prev) => ({
                            ...prev,
                            [m.id]: {
                              ...prev[m.id],
                              included: e.target.checked,
                            },
                          }));
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                      />
                      <span className="truncate">{getMemberDisplayName(m)}</span>
                    </label>

                    <div className="flex items-center gap-2">
                      {isIncluded && splitMethod === "exact" && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={participantState[m.id]?.exactAmount || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setParticipantState((prev) => ({
                                ...prev,
                                [m.id]: { ...prev[m.id], exactAmount: val },
                              }));
                            }}
                            className="h-7 w-24 text-xs font-mono text-right"
                          />
                        </div>
                      )}

                      {isIncluded && splitMethod === "percentage" && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            value={participantState[m.id]?.percentage || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setParticipantState((prev) => ({
                                ...prev,
                                [m.id]: { ...prev[m.id], percentage: val },
                              }));
                            }}
                            className="h-7 w-16 text-xs font-mono text-right"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      )}

                      {isIncluded && splitMethod === "shares" && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="1"
                            min="1"
                            placeholder="1"
                            value={participantState[m.id]?.shares || "1"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setParticipantState((prev) => ({
                                ...prev,
                                [m.id]: { ...prev[m.id], shares: val },
                              }));
                            }}
                            className="h-7 w-16 text-xs font-mono text-right"
                          />
                          <span className="text-xs text-slate-500">shr</span>
                        </div>
                      )}

                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[70px] text-right font-mono">
                        {isIncluded && splitItem ? splitItem.display : "Excluded"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payMethod" className="text-sm font-medium">Payment Mode</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isLoading}>
                <SelectTrigger id="payMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPI">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Bank Transfer">Net Banking / Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rcptUrl" className="text-sm font-medium">Receipt Image URL (Optional)</Label>
              <Input
                id="rcptUrl"
                type="url"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://..."
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expNotes" className="text-sm font-medium">Notes (Optional)</Label>
            <Textarea
              id="expNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional expense notes..."
              rows={2}
              disabled={isLoading}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || totalAmountNum <= 0 || !!splitValidationError}>
              {isLoading ? "Saving Expense..." : "Add Group Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
