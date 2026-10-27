"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  IndianRupee,
  Loader2,
  Sparkles,
  ShieldCheck,
  Clock,
  RefreshCw,
  Layers,
  Building2,
  Tag,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Check,
  Copy,
  Receipt,
  Wallet,
  CheckSquare,
  Square,
  ChevronRight,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getUserPendingSettlementsAction,
  executeSettlementBatchAction,
  type UserPendingSettlementItem,
  type UserPendingSettlementOverview,
} from "@/actions/settlements";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface SettleAllDialogProps {
  trigger?: React.ReactNode;
  groupId?: number | string;
  groupName?: string;
  balances?: Array<{
    userId?: number;
    contactId?: number;
    name?: string;
    amount: number;
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
    amount: number;
    currency: string;
  }>;
  currency?: string;
  onSuccess?: () => void;
}

export function SettleAllDialog({
  trigger,
  groupId,
  groupName,
  currency = "INR",
  onSuccess,
}: SettleAllDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"review" | "confirm" | "success">("review");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settlement items state
  const [overview, setOverview] = useState<UserPendingSettlementOverview>({
    totalPendingAmount: 0,
    totalPayableAmount: 0,
    totalReceivableAmount: 0,
    pendingCount: 0,
    groupsInvolvedCount: 0,
    estimatedTransfers: 0,
    items: [],
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(true);

  // Confirmation form state
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [settlementNotes, setSettlementNotes] = useState("");
  const [executionResult, setExecutionResult] = useState<{
    settledCount: number;
    totalSettledRupees: number;
  } | null>(null);

  // Fetch live settlements for the currently logged-in user
  const fetchLiveSettlements = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const data = await getUserPendingSettlementsAction(groupId);
      setOverview(data);
      // Select all pending settlements by default
      setSelectedIds(new Set(data.items.map((i) => i.id)));
    } catch (err) {
      console.error("Failed to load user pending settlements:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load pending settlements. Please try again."
      );
    } finally {
      setIsFetching(false);
    }
  }, [groupId]);

  // Load data whenever dialog opens
  useEffect(() => {
    if (open) {
      setStep("review");
      setExecutionResult(null);
      fetchLiveSettlements();
    }
  }, [open, fetchLiveSettlements]);

  // Selected items calculation
  const selectedItems = useMemo(() => {
    return overview.items.filter((item) => selectedIds.has(item.id));
  }, [overview.items, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.amount, 0);
  }, [selectedItems]);

  // Selection toggle handlers
  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(overview.items.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Action: Settle individually
  const handleSettleIndividually = (item: UserPendingSettlementItem) => {
    setSelectedIds(new Set([item.id]));
    setStep("confirm");
  };

  // Action: Proceed to confirmation for selected items
  const handleProceedToConfirmation = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one settlement to execute");
      return;
    }
    setStep("confirm");
  };

  // Action: Execute settlement batch after confirmation
  const handleConfirmAndExecute = async () => {
    if (selectedItems.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload = selectedItems.map((item) => ({
        id: item.id,
        databaseId: item.databaseId,
        publicId: item.publicId,
        amount: item.amount,
        currency: item.currency,
        fromUserId: item.fromUserId,
        fromContactId: item.fromContactId,
        toUserId: item.toUserId,
        toContactId: item.toContactId,
        groupId: item.groupId,
        notes: settlementNotes.trim() || item.reason,
      }));

      const res = await executeSettlementBatchAction(payload, {
        paymentMethod,
        notes: settlementNotes.trim() || undefined,
      });

      setExecutionResult({
        settledCount: res.settledCount,
        totalSettledRupees: res.totalSettledRupees,
      });

      toast.success(
        `Successfully settled ${formatCurrency(res.totalSettledRupees, "INR")} across ${res.settledCount} transfer(s)!`
      );

      setStep("success");

      // Dispatch global events for instant reactive UI updates
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("settlement:completed"));
        window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      }

      onSuccess?.();
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to execute settlements";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2 font-semibold">
            <IndianRupee className="h-4 w-4" />
            <span>Settle All Debts</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {step === "confirm"
                    ? "Confirm Settlement Execution"
                    : step === "success"
                    ? "Settlement Completed"
                    : groupName
                    ? `Settle Debts — ${groupName}`
                    : "Settle All Debts"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {step === "confirm"
                    ? "Review verified transfer details and select payment method"
                    : step === "success"
                    ? "Balances and transaction ledgers updated across all groups"
                    : "Review all pending settlements related to your profile before execution"}
                </DialogDescription>
              </div>
            </div>

            {step === "review" && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchLiveSettlements}
                disabled={isFetching}
                className="rounded-xl text-xs font-semibold gap-1.5 h-8 shrink-0 hover:border-emerald-500/40 hover:text-emerald-600"
                title="Refresh live database data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh Live</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Error Notice */}
        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Settlement Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: REVIEW WORKFLOW */}
        {step === "review" && (
          <div className="space-y-6 pt-4">
            {/* 4 Stat Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total Pending
                </span>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(overview.totalPendingAmount, currency)}
                </div>
                <span className="text-[10px] text-slate-400">Across your ledger</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Pending Transfers
                </span>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  {overview.pendingCount}
                </div>
                <span className="text-[10px] text-slate-400">Awaiting clearance</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Groups Involved
                </span>
                <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                  {overview.groupsInvolvedCount}
                </div>
                <span className="text-[10px] text-slate-400">Active group ledgers</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Est. Transfers
                </span>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {overview.estimatedTransfers}
                </div>
                <span className="text-[10px] text-slate-400">Optimized minimum</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectedIds.size === overview.items.length ? deselectAll : selectAll}
                  disabled={overview.items.length === 0}
                  className="rounded-xl text-xs h-8 gap-1.5 font-semibold"
                >
                  {selectedIds.size === overview.items.length && overview.items.length > 0 ? (
                    <>
                      <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <Square className="h-3.5 w-3.5 text-slate-400" />
                      <span>Select All ({overview.items.length})</span>
                    </>
                  )}
                </Button>

                <Badge variant="secondary" className="px-2 py-0.5 text-[11px] font-bold">
                  {selectedIds.size} Selected • {formatCurrency(selectedTotalAmount, currency)}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={selectedIds.size === 0 || isFetching}
                  onClick={handleProceedToConfirmation}
                  className="rounded-xl text-xs h-8 gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <span>Settle Selected ({selectedIds.size})</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* List of Pending Settlements */}
            {isFetching ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                <p className="text-xs font-semibold">
                  Fetching live pending settlements for your profile...
                </p>
              </div>
            ) : overview.items.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    No Pending Settlements
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    All debts related to your profile are currently settled and even. No outstanding payments require your action.
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
              <div className="space-y-3.5">
                {overview.items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isYouPaying = item.payerIsCurrentUser;
                  const isYouReceiving = item.receiverIsCurrentUser;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelectOne(item.id)}
                      className={`p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-slate-50/90 dark:bg-slate-900/70 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
                          : "bg-card border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Checkbox + Payer -> Receiver Flow */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="pt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectOne(item.id);
                            }}
                          >
                            <Checkbox checked={isSelected} className="rounded-md" />
                          </div>

                          <div className="min-w-0 space-y-1.5">
                            {/* Payer and Receiver Badge Pair */}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={item.payerAvatar || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {item.payerName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{item.payerName}</span>
                                {isYouPaying && (
                                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[9px] px-1.5 py-0 font-bold">
                                    You Pay
                                  </Badge>
                                )}
                              </div>

                              <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

                              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={item.receiverAvatar || undefined} />
                                  <AvatarFallback className="text-[10px]">
                                    {item.receiverName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{item.receiverName}</span>
                                {isYouReceiving && (
                                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-bold">
                                    You Receive
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Reason & Group Information */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {item.reason}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-slate-400" />
                                <span>{item.groupName}</span>
                              </span>
                              <span>•</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                {item.groupCategory}
                              </Badge>
                              <span>•</span>
                              <span className="capitalize">{item.splitMethod} split</span>
                            </div>

                            {/* Metadata Pills */}
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              {/* Due Status Chip */}
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-2 py-0.5 ${
                                  item.dueStatus === "Overdue"
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                    : item.dueStatus === "Due Today"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                }`}
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{item.dueStatus}</span>
                              </Badge>

                              {/* Payment Status */}
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase font-mono px-2 py-0.5 text-slate-600 dark:text-slate-400"
                              >
                                {item.paymentStatus}
                              </Badge>

                              {/* Created Date */}
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.createdAt)}</span>
                              </span>

                              {/* Reference */}
                              {item.transactionReference && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(item.transactionReference);
                                    toast.success(`Copied: ${item.transactionReference}`);
                                  }}
                                  className="text-[10px] font-mono text-slate-400 hover:text-primary flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                                >
                                  <span>{item.transactionReference}</span>
                                  <Copy className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Individual Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="text-right">
                            <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                            <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                              Settlement Amount
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSettleIndividually(item);
                            }}
                            className="rounded-xl text-xs h-7 px-2.5 font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-400 dark:hover:bg-emerald-950/40"
                          >
                            <span>Settle Now</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CONFIRMATION WORKFLOW */}
        {step === "confirm" && (
          <div className="space-y-6 pt-4">
            {/* Prominent Confirmation Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                    You are about to settle {formatCurrency(selectedTotalAmount, currency)} across {selectedItems.length} transfer{selectedItems.length > 1 ? "s" : ""}.
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    This execution will record immutable completed settlement records, balance updates, and audit trail events across all affected ledgers.
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Transfers Summary Box */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Transfers Included In This Settlement
              </span>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/30">
                {selectedItems.map((item) => (
                  <div key={item.id} className="py-2.5 px-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.payerName}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.receiverName}
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        • {item.groupName}
                      </span>
                    </div>

                    <span className="font-black font-mono text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                      {formatCurrency(item.amount, item.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method Used
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="rounded-xl text-xs h-10 border-slate-200/80 dark:border-slate-800">
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="UPI">UPI (Google Pay, PhonePe, Paytm)</SelectItem>
                    <SelectItem value="Bank Transfer">Direct Bank Transfer / IMPS / NEFT</SelectItem>
                    <SelectItem value="Cash">Cash in Hand</SelectItem>
                    <SelectItem value="Credit/Debit Card">Card Payment</SelectItem>
                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Optional Settlement Notes
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. Paid via UPI ref #987213..."
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  className="rounded-xl text-xs h-10 border-slate-200/80 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Confirmation Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("review")}
                disabled={isLoading}
                className="rounded-xl text-xs font-semibold h-10"
              >
                Back to Review
              </Button>

              <Button
                type="button"
                onClick={handleConfirmAndExecute}
                disabled={isLoading}
                className="rounded-xl text-xs font-bold h-10 px-5 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing Settlement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirm & Execute Settlement</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS WORKFLOW */}
        {step === "success" && executionResult && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Check className="h-8 w-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                Settlement Completed Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recorded {formatCurrency(executionResult.totalSettledRupees, currency)} across {executionResult.settledCount} transfer(s). Group balances, Who Pays Who, financial health scores, and analytics have been updated.
              </p>
            </div>

            <div className="pt-4 flex justify-center">
              <Button
                type="button"
                onClick={handleFinish}
                className="rounded-xl font-bold text-xs h-10 px-6 bg-primary text-primary-foreground shadow-md"
              >
                Done & View Dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
