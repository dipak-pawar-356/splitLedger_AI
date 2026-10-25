"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowRightLeft,
  UserCheck,
  Plus,
  Trash2,
  RefreshCw,
  History,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  createReceiverAssignmentAction,
  deleteReceiverAssignmentAction,
  resetReceiverAssignmentsAction,
  getReceiverAssignmentsAction,
} from "@/actions/group-split-config";

export interface ReceiverAssignmentDialogProps {
  groupId: number;
  groupPublicId: string;
  debtor: {
    userId?: number | null;
    contactId?: number | null;
    name: string;
    avatar?: string | null;
    totalPaid: number;      // ₹ in expenses
    ownShare: number;       // ₹ target payable
    needToPay: number;      // ₹ net liability
  };
  eligibleReceivers: Array<{
    userId?: number | null;
    contactId?: number | null;
    name: string;
    avatar?: string | null;
    willReceive: number;    // ₹ net receivable
  }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ReceiverAssignmentDialog({
  groupId,
  groupPublicId,
  debtor,
  eligibleReceivers,
  trigger,
  onSuccess,
}: ReceiverAssignmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"assign" | "history">("assign");

  // Form states
  const [selectedReceiverKey, setSelectedReceiverKey] = useState<string>("");
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Existing assignments state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const loadAssignments = async () => {
    try {
      const res = await getReceiverAssignmentsAction(groupId);
      // Filter active assignments for this debtor
      const debtorAssignments = res.active.filter(
        (a: any) =>
          (debtor.userId && a.fromUserId === debtor.userId) ||
          (debtor.contactId && a.fromContactId === debtor.contactId)
      );
      setAssignments(debtorAssignments);
      setHistory(res.history);
    } catch (err) {
      console.error("Failed to load receiver assignments:", err);
    }
  };

  useEffect(() => {
    if (open) {
      loadAssignments();
    }
  }, [open, groupId]);

  // Target share representing debtor's liability
  const targetShare = debtor.ownShare > 0 ? debtor.ownShare : debtor.needToPay;

  // Total assigned so far in rupees = sum(receiver allocations)
  const assignedTotalRupees = assignments.reduce(
    (sum, a) => sum + Number(a.amount) / 100,
    0
  );

  // Remaining liability = Target Share - Assigned Total
  const remainingLiabilityRupees = Math.max(
    0,
    targetShare - assignedTotalRupees
  );

  // Selected receiver details
  const selectedReceiver = eligibleReceivers.find((r) => {
    const key = r.userId ? `user-${r.userId}` : `contact-${r.contactId}`;
    return key === selectedReceiverKey;
  });

  // Calculate receiver already assigned in rupees across this group
  const receiverAssignedSoFar = assignments
    .filter((a) =>
      selectedReceiver?.userId
        ? a.toUserId === selectedReceiver.userId
        : a.toContactId === selectedReceiver?.contactId
    )
    .reduce((sum, a) => sum + Number(a.amount) / 100, 0);

  const receiverAvailableRupees = selectedReceiver
    ? Math.max(0, selectedReceiver.willReceive - receiverAssignedSoFar)
    : 0;

  // Handle setting default amount when receiver is selected
  const handleSelectReceiver = (val: string) => {
    setSelectedReceiverKey(val);
    const rec = eligibleReceivers.find((r) => {
      const key = r.userId ? `user-${r.userId}` : `contact-${r.contactId}`;
      return key === val;
    });

    if (rec) {
      const available = Math.max(0, rec.willReceive);
      const suggestedAmount = Math.min(remainingLiabilityRupees, available);
      if (suggestedAmount > 0) {
        setAmountRupees(suggestedAmount.toFixed(2));
      }
    }
  };

  // Add Assignment
  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceiver) {
      toast.error("Please select an eligible receiver.");
      return;
    }

    const numAmount = parseFloat(amountRupees);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than ₹0.00.");
      return;
    }

    if (numAmount > remainingLiabilityRupees + 0.01) {
      toast.error(
        `Amount (₹${numAmount.toFixed(2)}) cannot exceed remaining liability (₹${remainingLiabilityRupees.toFixed(2)}).`
      );
      return;
    }

    setIsLoading(true);
    try {
      const amountPaise = Math.round(numAmount * 100);
      await createReceiverAssignmentAction({
        groupIdOrPublicId: groupPublicId,
        fromUserId: debtor.userId || undefined,
        fromContactId: debtor.contactId || undefined,
        fromName: debtor.name,
        toUserId: selectedReceiver.userId || undefined,
        toContactId: selectedReceiver.contactId || undefined,
        toName: selectedReceiver.name,
        amountPaise,
        notes: notes.trim() || undefined,
      });

      toast.success(
        `Assigned ₹${numAmount.toFixed(2)} to ${selectedReceiver.name}! Live recalculation synchronized.`
      );

      setSelectedReceiverKey("");
      setAmountRupees("");
      setNotes("");
      await loadAssignments();
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to create assignment");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (assignmentId: number, receiverName: string) => {
    if (!confirm(`Cancel assignment of ₹... to ${receiverName}?`)) return;

    setIsLoading(true);
    try {
      await deleteReceiverAssignmentAction(assignmentId, groupPublicId);
      toast.success(`Assignment cancelled.`);
      await loadAssignments();
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel assignment");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all assignments for group
  const handleResetToAuto = async () => {
    if (!confirm("Reset all manual receiver assignments in this group to automatic minimal transfer smart netting?")) {
      return;
    }

    setIsLoading(true);
    try {
      await resetReceiverAssignmentsAction(groupPublicId);
      toast.success("Reset to automatic smart netting.");
      await loadAssignments();
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset assignments");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2.5 font-bold rounded-xl gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-xs"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Assign Receivers</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-0 rounded-3xl">
        <DialogHeader className="p-6 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <ArrowRightLeft className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Assign Receivers for {debtor.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Custom creditor allocation engine for Exact, Percentage & Shares splits
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/30"
            >
              Enterprise Engine
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Debtor Financial Liability Status Card */}
          <div className="p-4 rounded-2xl border-2 border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-rose-400">
                  <AvatarImage src={debtor.avatar || undefined} />
                  <AvatarFallback className="font-bold bg-rose-500 text-white text-sm">
                    {debtor.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {debtor.name}
                  </h4>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                    Net Liability: {formatCurrency(targetShare)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Remaining Unassigned
                </span>
                <span
                  className={`text-base font-black tracking-tight ${
                    remainingLiabilityRupees > 0.01
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {remainingLiabilityRupees > 0.01
                    ? formatCurrency(remainingLiabilityRupees)
                    : "Fully Assigned (₹0.00)"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-200/50 dark:border-rose-900/40 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Share</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(targetShare)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Paid in Expenses</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(debtor.totalPaid)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Assigned Total</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(assignedTotalRupees)}</span>
              </div>
            </div>
          </div>

          {/* Tab Selection: Assign vs Audit History */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("assign")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                activeTab === "assign"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Assign Receivers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-primary text-white shadow-xs"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit History ({history.length})</span>
            </button>
          </div>

          {activeTab === "assign" ? (
            <div className="space-y-4">
              {/* Form to add receiver assignment */}
              {remainingLiabilityRupees > 0.01 ? (
                <form
                  onSubmit={handleAddAssignment}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-primary" />
                      Add New Receiver Allocation
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Step-by-step receiver mapping
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Select Eligible Creditor / Receiver</Label>
                    <Select
                      value={selectedReceiverKey}
                      onValueChange={handleSelectReceiver}
                    >
                      <SelectTrigger className="text-xs h-9 rounded-xl">
                        <SelectValue placeholder="Choose a member to receive payment..." />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleReceivers
                          .filter((r) => {
                            // Don't allow assigning to self
                            if (debtor.userId && r.userId === debtor.userId) return false;
                            if (debtor.contactId && r.contactId === debtor.contactId) return false;
                            return r.willReceive > 0.01;
                          })
                          .map((r) => {
                            const key = r.userId ? `user-${r.userId}` : `contact-${r.contactId}`;
                            return (
                              <SelectItem key={key} value={key} className="text-xs">
                                <div className="flex items-center justify-between w-full gap-4">
                                  <span className="font-semibold">{r.name}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                    Eligible to receive: {formatCurrency(r.willReceive)}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Amount to Pay (₹ INR)</Label>
                        {selectedReceiver && (
                          <button
                            type="button"
                            onClick={() => {
                              const maxPossible = Math.min(
                                remainingLiabilityRupees,
                                selectedReceiver.willReceive
                              );
                              setAmountRupees(maxPossible.toFixed(2));
                            }}
                            className="text-[10px] text-primary hover:underline font-bold"
                          >
                            Max (₹{Math.min(remainingLiabilityRupees, selectedReceiver.willReceive).toFixed(2)})
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remainingLiabilityRupees}
                          value={amountRupees}
                          onChange={(e) => setAmountRupees(e.target.value)}
                          placeholder="0.00"
                          className="pl-7 text-xs font-bold h-9 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Notes (Optional)</Label>
                      <Input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Hotel advance share"
                        className="text-xs h-9 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Live Calculation Preview */}
                  {amountRupees && parseFloat(amountRupees) > 0 && (
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-400">
                        Remaining unassigned after this allocation:
                      </span>
                      <span className="font-bold text-primary font-mono">
                        {formatCurrency(
                          Math.max(
                            0,
                            remainingLiabilityRupees - (parseFloat(amountRupees) || 0)
                          )
                        )}
                      </span>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isLoading || !selectedReceiver || !amountRupees}
                    className="w-full text-xs font-bold h-9 rounded-xl gap-1.5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {isLoading ? "Saving Assignment..." : "Assign Receiver Amount"}
                  </Button>
                </form>
              ) : (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-1.5">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    Liability Fully Allocated
                  </h4>
                  <p className="text-xs text-slate-500">
                    All of {debtor.name}&apos;s payable debt ({formatCurrency(debtor.needToPay)}) has been matched to receivers!
                  </p>
                </div>
              )}

              {/* Active Assignments List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Active Assigned Receiver Transits ({assignments.length})
                  </h4>
                  {assignments.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetToAuto}
                      disabled={isLoading}
                      className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reset to Auto Netting
                    </button>
                  )}
                </div>

                {assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-slate-50/50 dark:hover:bg-slate-900/40 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <QrCode className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                Pay {a.toName}
                              </span>
                              <Badge className="text-[9px] py-0 px-1.5 font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                Active Receiver
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {a.notes ? a.notes : "Assigned by admin"} • {formatCurrency(Number(a.amount) / 100)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
                            {formatCurrency(Number(a.amount) / 100)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAssignment(a.id, a.toName)}
                            disabled={isLoading}
                            className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                            title="Remove assignment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-2xl">
                    No custom receiver allocations created yet.
                    <br />
                    System is currently using automatic minimal transfer smart netting.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Audit History View */
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Receiver Assignment Audit Trail
              </h4>
              {history.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1 bg-slate-50/30 dark:bg-slate-900/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {h.fromName} → {h.toName}
                        </span>
                        <span className="font-mono font-bold text-primary">
                          {formatCurrency(Number(h.amount) / 100)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Status: <strong className="capitalize">{h.status}</strong></span>
                        <span>{new Date(h.createdAt).toLocaleDateString()} {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No audit records found.</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Live sync with QR payments & Who Pays Whom
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs rounded-xl"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
