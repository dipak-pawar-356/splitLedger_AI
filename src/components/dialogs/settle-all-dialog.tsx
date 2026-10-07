"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  ArrowRight,
  AlertCircle,
  History,
  DollarSign,
  Loader2,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Receipt,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateOptimalSettlements } from "@/lib/settlements/calculator";
import {
  createSettlementsBatch,
  getGroupSettlementDetailsAction,
} from "@/actions/settlements";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface SettlementItem {
  id: string;
  fromUserId?: number;
  fromContactId?: number;
  fromName: string;
  fromAvatar?: string | null;
  toUserId?: number;
  toContactId?: number;
  toName: string;
  toAvatar?: string | null;
  amount: number; // in rupees
  currency: string;
}

export interface SettleAllDialogProps {
  trigger?: React.ReactNode;
  groupId?: number | string;
  groupName?: string;
  isOwner?: boolean;
  currentUserId?: number;
  balances?: Array<{
    userId?: number;
    contactId?: number;
    name?: string;
    amount: number; // Positive = receivable, Negative = payable (in rupees or paise)
  }>;
  suggestions?: Array<{
    fromUserId?: number;
    fromContactId?: number;
    fromName: string;
    fromAvatar?: string | null;
    toUserId?: number;
    toContactId?: number;
    toName: string;
    toAvatar?: string | null;
    amount: number; // in rupees
    currency: string;
  }>;
  currency?: string;
  onSuccess?: () => void;
}

export function SettleAllDialog({
  trigger,
  groupId,
  groupName,
  isOwner = true,
  currentUserId,
  balances = [],
  suggestions = [],
  currency = "INR",
  onSuccess,
}: SettleAllDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settlementItems, setSettlementItems] = useState<SettlementItem[]>([]);
  const [selectedSettlements, setSelectedSettlements] = useState<Set<string>>(
    new Set()
  );
  const [settleMode, setSettleMode] = useState<"completed" | "pending">(
    "completed"
  );
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");

  // Sync state whenever the dialog opens or external props change
  useEffect(() => {
    if (!open) return;

    setError(null);

    const filterByAccess = (items: SettlementItem[]) => {
      if (isOwner) return items;
      if (!currentUserId) return items;
      return items.filter(
        (i) => i.fromUserId === currentUserId || i.toUserId === currentUserId
      );
    };

    const mapSuggestionsToItems = (
      list: NonNullable<SettleAllDialogProps["suggestions"]>
    ): SettlementItem[] => {
      const mapped = list.map((s, idx) => ({
        id: `${s.fromUserId ?? `c${s.fromContactId}`}-${s.toUserId ?? `c${s.toContactId}`}-${idx}`,
        fromUserId: s.fromUserId,
        fromContactId: s.fromContactId,
        fromName: s.fromName || "Member",
        fromAvatar: s.fromAvatar,
        toUserId: s.toUserId,
        toContactId: s.toContactId,
        toName: s.toName || "Member",
        toAvatar: s.toAvatar,
        amount: Math.abs(s.amount),
        currency: s.currency || currency || "INR",
      }));
      return filterByAccess(mapped);
    };

    // 1. If suggestions were explicitly passed and have entries
    if (suggestions && suggestions.length > 0) {
      const items = mapSuggestionsToItems(suggestions);
      setSettlementItems(items);
      setSelectedSettlements(new Set(items.map((i) => i.id)));
      return;
    }

    // 2. If balances array is passed with items
    if (balances && balances.length > 0) {
      const normalizedBalances = balances.map((b) => ({
        userId: b.userId,
        contactId: b.contactId,
        name: b.name,
        // If balance amount looks like paise (> 1000 and has cents) normalize if needed, otherwise use directly
        amount: b.amount,
      }));
      const optimal = calculateOptimalSettlements(normalizedBalances, currency);
      const items: SettlementItem[] = optimal.map((s, idx) => ({
        id: `${s.fromUserId ?? `c${s.fromContactId}`}-${s.toUserId ?? `c${s.toContactId}`}-${idx}`,
        fromUserId: s.fromUserId,
        fromContactId: s.fromContactId,
        fromName: s.fromName || `User #${s.fromUserId}`,
        toUserId: s.toUserId,
        toContactId: s.toContactId,
        toName: s.toName || `User #${s.toUserId}`,
        // In calculator amount is in base currency or paise
        amount: s.amount > 1000 ? s.amount / 100 : s.amount,
        currency: s.currency || currency,
      }));
      const filteredItems = filterByAccess(items);
      setSettlementItems(filteredItems);
      setSelectedSettlements(new Set(filteredItems.map((i) => i.id)));
      return;
    }

    // 3. If groupId is provided, fetch suggestions on-demand dynamically
    if (groupId) {
      setIsFetching(true);
      getGroupSettlementDetailsAction(groupId)
        .then((res) => {
          if (res.success && res.suggestions && res.suggestions.length > 0) {
            const items = mapSuggestionsToItems(res.suggestions);
            setSettlementItems(items);
            setSelectedSettlements(new Set(items.map((i) => i.id)));
          } else {
            setSettlementItems([]);
            setSelectedSettlements(new Set());
          }
        })
        .catch((err) => {
          console.error("Failed to fetch settlement suggestions:", err);
          setError("Failed to load group settlements. Please try again.");
        })
        .finally(() => {
          setIsFetching(false);
        });
      return;
    }

    // 4. Default: No balances
    setSettlementItems([]);
    setSelectedSettlements(new Set());
  }, [open, suggestions, balances, groupId, currency, isOwner, currentUserId]);

  const toggleSettlement = (id: string) => {
    const next = new Set(selectedSettlements);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSettlements(next);
  };

  const selectAll = () => {
    setSelectedSettlements(new Set(settlementItems.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedSettlements(new Set());
  };

  const selectedTotal = useMemo(() => {
    return settlementItems
      .filter((s) => selectedSettlements.has(s.id))
      .reduce((sum, s) => sum + s.amount, 0);
  }, [settlementItems, selectedSettlements]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemsToCreate = settlementItems.filter((s) =>
      selectedSettlements.has(s.id)
    );

    if (itemsToCreate.length === 0) {
      setError("Please select at least one settlement to execute");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const numericGroupId =
        typeof groupId === "number"
          ? groupId
          : groupId && /^\d+$/.test(String(groupId))
          ? Number(groupId)
          : undefined;

      await createSettlementsBatch(
        itemsToCreate.map((st) => ({
          fromUserId: st.fromUserId,
          fromContactId: st.fromContactId,
          toUserId: st.toUserId,
          toContactId: st.toContactId,
          amount: st.amount,
          currency: st.currency || currency || "INR",
          groupId: numericGroupId,
          paymentMethod: settleMode === "completed" ? paymentMethod : undefined,
          notes: notes.trim() || undefined,
          status: settleMode,
        })),
        {
          markAsCompleted: settleMode === "completed",
          paymentMethod,
          notes: notes.trim() || undefined,
        }
      );

      const successMessage =
        settleMode === "completed"
          ? `${itemsToCreate.length} settlement(s) successfully recorded as completed!`
          : `${itemsToCreate.length} pending settlement request(s) created!`;

      toast.success(successMessage);
      setOpen(false);
      setNotes("");
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to execute settlements";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2 font-semibold">
            <DollarSign className="h-4 w-4" />
            <span>Settle Debts</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[650px] max-h-[92vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {isOwner
                  ? (groupName ? `Settle Debts - ${groupName}` : "Settle All Debts")
                  : (groupName ? `Settle Your Debts - ${groupName}` : "Settle Your Debts")}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isOwner
                  ? "Minimal transfer debt simplification powered by the greedy net-flow engine"
                  : "Personal settlement debt transfers involving your account"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isFetching ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs font-semibold">
                Calculating optimal debt simplification...
              </p>
            </div>
          ) : settlementItems.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  All Debts Are Settled!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  No outstanding transfers or balances exist for this group. Everyone is currently even.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl mt-2"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Selected Total
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {formatCurrency(selectedTotal, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Transfers
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 block mt-0.5">
                    {selectedSettlements.size} / {settlementItems.length}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Settlement Mode
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1.5 capitalize">
                    {settleMode === "completed" ? "Paid Offline" : "Pending Request"}
                  </span>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Transfers to Execute ({selectedSettlements.size} selected)
                </Label>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-7 text-xs px-2.5 font-semibold text-primary"
                  >
                    Select All
                  </Button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    className="h-7 text-xs px-2.5 font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Settlement Transfer Items */}
              <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {settlementItems.map((item) => {
                  const isSelected = selectedSettlements.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSettlement(item.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-emerald-500/5 border-emerald-500/40 shadow-xs"
                          : "bg-card border-slate-200/80 dark:border-slate-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      {/* Checkbox & Payer */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 dark:border-slate-700 bg-background"
                          }`}
                        >
                          {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                        </div>

                        {/* Payer Avatar + Name */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8 border border-rose-500/20 shrink-0">
                            <AvatarImage src={item.fromAvatar || undefined} />
                            <AvatarFallback className="text-xs font-bold text-rose-500 bg-rose-500/10">
                              {item.fromName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.fromName}
                            </p>
                            <span className="text-[10px] text-rose-500 font-semibold uppercase">
                              Payer
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Directional Amount Indicator */}
                      <div className="flex flex-col items-center justify-center shrink-0 px-2">
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.amount, item.currency)}
                        </span>
                        <div className="flex items-center gap-1 text-emerald-500">
                          <div className="w-5 h-[1.5px] bg-gradient-to-r from-rose-400 to-emerald-400 rounded-full" />
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>

                      {/* Recipient */}
                      <div className="flex items-center gap-2 min-w-0 text-right justify-end">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.toName}
                          </p>
                          <span className="text-[10px] text-emerald-500 font-semibold uppercase">
                            Recipient
                          </span>
                        </div>
                        <Avatar className="h-8 w-8 border border-emerald-500/20 shrink-0">
                          <AvatarImage src={item.toAvatar || undefined} />
                          <AvatarFallback className="text-xs font-bold text-emerald-500 bg-emerald-500/10">
                            {item.toName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Settlement Configuration: Mode & Payment Method */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Settlement Mode Selection */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Settlement Action
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSettleMode("completed")}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                          settleMode === "completed"
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-card border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                        <div>
                          <p className="font-bold leading-tight">Paid Offline</p>
                          <span className="text-[10px] opacity-75">Mark settled now</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSettleMode("pending")}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all ${
                          settleMode === "pending"
                            ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20"
                            : "bg-card border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <Clock className="h-4 w-4 shrink-0 text-blue-500" />
                        <div>
                          <p className="font-bold leading-tight">Pending Request</p>
                          <span className="text-[10px] opacity-75">Awaiting payment</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selector (if completed mode) */}
                  {settleMode === "completed" ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Payment Method
                      </Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="rounded-xl h-10 text-xs">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="UPI">UPI (Google Pay, PhonePe, Paytm)</SelectItem>
                          <SelectItem value="Cash">Cash Handover</SelectItem>
                          <SelectItem value="Bank Transfer">Bank NEFT / IMPS</SelectItem>
                          <SelectItem value="Credit Card">Credit Card</SelectItem>
                          <SelectItem value="Other">Other Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
                        This creates verified pending requests in the group. Both parties can verify once funds transfer.
                      </p>
                    </div>
                  )}
                </div>

                {/* Optional Settlement Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="settle-notes" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Notes / Remarks (Optional)
                  </Label>
                  <Textarea
                    id="settle-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Summer Trip full account settlement via UPI..."
                    rows={2}
                    className="rounded-xl text-xs resize-none"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || selectedSettlements.size === 0}
                  className="rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[170px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>
                        {settleMode === "completed"
                          ? `Settle ${selectedSettlements.size} (${formatCurrency(selectedTotal, currency)})`
                          : `Create ${selectedSettlements.size} Requests`}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
