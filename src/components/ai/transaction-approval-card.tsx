"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ProposedTransaction,
} from "@/lib/ai/nlp-transaction-parser";
import {
  approveConversationalTransaction,
  approveBatchConversationalTransactions,
} from "@/actions/ai-assistant";
import { emitFinancialEvent } from "@/lib/events/financial-events";
import {
  CheckCircle2,
  X,
  Edit3,
  AlertTriangle,
  Receipt,
  Calendar,
  CreditCard,
  Tag,
  User,
  Users,
  ArrowRight,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TransactionApprovalCardProps {
  proposal: ProposedTransaction;
  categories?: Array<{ id: number; name: string }>;
  onApproved?: (txId: number, publicId: string) => void;
  onCancelled?: () => void;
}

export function TransactionApprovalCard({
  proposal: initialProposal,
  categories = [],
  onApproved,
  onCancelled,
}: TransactionApprovalCardProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposedTransaction>(initialProposal);
  const [isEditing, setIsEditing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(proposal.status === "approved");
  const [isCancelled, setIsCancelled] = useState(proposal.status === "cancelled");
  const [createdPublicId, setCreatedPublicId] = useState<string | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(proposal.title);
  const [editDescription, setEditDescription] = useState(proposal.description);
  const [editAmount, setEditAmount] = useState(String(proposal.amount));
  const [editType, setEditType] = useState<"paid" | "received" | "lent" | "borrowed">(proposal.type);
  const [editCategoryName, setEditCategoryName] = useState(proposal.categoryName);
  const [editDate, setEditDate] = useState(proposal.date);
  const [editPaymentMethod, setEditPaymentMethod] = useState(proposal.paymentMethod || "UPI");
  const [editNotes, setEditNotes] = useState(proposal.notes || "");

  const handleSaveEdit = () => {
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than ₹0.");
      return;
    }

    const matchedCat = categories.find((c) => c.name.toLowerCase() === editCategoryName.toLowerCase());

    setProposal((prev) => ({
      ...prev,
      title: editTitle.trim() || prev.title,
      description: editDescription.trim() || editTitle.trim(),
      amount: parsedAmount,
      type: editType,
      categoryId: matchedCat ? matchedCat.id : prev.categoryId,
      categoryName: editCategoryName,
      date: editDate,
      paymentMethod: editPaymentMethod,
      notes: editNotes.trim() || null,
    }));

    setIsEditing(false);
    toast.success("Transaction details updated.");
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await approveConversationalTransaction(proposal);
      setIsApproved(true);
      setCreatedPublicId(res.publicId);
      setProposal((prev) => ({ ...prev, status: "approved" }));
      emitFinancialEvent("transaction:created");
      emitFinancialEvent("expense:created");
      toast.success(res.message);
      if (onApproved) onApproved(res.transactionId, res.publicId);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create transaction.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancel = () => {
    setIsCancelled(true);
    setProposal((prev) => ({ ...prev, status: "cancelled" }));
    if (onCancelled) onCancelled();
    toast.info("Transaction proposal discarded (no database changes).");
  };

  const typeColor =
    proposal.type === "received"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
      : proposal.type === "lent"
      ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
      : proposal.type === "borrowed"
      ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-800"
      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800";

  const typeLabel =
    proposal.type === "received"
      ? "Income Receipt"
      : proposal.type === "lent"
      ? "Money Lent / Sent"
      : proposal.type === "borrowed"
      ? "Money Borrowed"
      : "Expense Debit";

  if (isCancelled) {
    return (
      <div className="p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-500 flex items-center justify-between">
        <span className="line-through">
          Proposed {typeLabel}: ₹{proposal.amount.toLocaleString("en-IN")} ({proposal.title})
        </span>
        <Badge variant="outline" className="text-[10px] text-slate-400">
          Discarded
        </Badge>
      </div>
    );
  }

  if (isApproved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent text-slate-900 dark:text-slate-100 space-y-2 shadow-2xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">
              Transaction Approved & Created Successfully
            </span>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
            Live in Ledger
          </Badge>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3 flex-wrap">
          <span>
            Amount: <strong className="font-mono text-slate-900 dark:text-slate-100 font-bold">₹{proposal.amount.toLocaleString("en-IN")}</strong>
          </span>
          <span>•</span>
          <span>Category: <strong className="text-slate-900 dark:text-slate-100">{proposal.categoryName}</strong></span>
          <span>•</span>
          <span>Date: <strong>{proposal.formattedDate}</strong></span>
        </div>

        <div className="pt-1 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            Dashboard balances, budgets, and reports recalculated instantly.
          </span>
          {createdPublicId && (
            <Link
              href={`/dashboard/transactions/${createdPublicId}`}
              className="text-primary hover:underline font-bold inline-flex items-center gap-1 text-xs"
            >
              <span>View in Ledger</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-4 rounded-2xl border border-amber-500/30 dark:border-amber-500/20 bg-card hover:border-amber-500/50 transition-all duration-200 shadow-sm space-y-3 relative overflow-hidden"
    >
      {/* Glow highlight strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                New Transaction Detected
              </span>
              <Badge className={`text-[10px] font-bold py-0 px-1.5 border ${typeColor}`}>
                {typeLabel}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Awaiting your explicit confirmation. Nothing is logged until you approve.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-[10px] font-mono text-amber-600 border-amber-300 dark:border-amber-800 bg-amber-500/5 self-start sm:self-auto">
          Requires Approval
        </Badge>
      </div>

      {/* Duplicate Warning Alert (Requirement 7) */}
      {proposal.isPossibleDuplicate && !duplicateDismissed && proposal.duplicateInfo && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-300 dark:border-rose-900/60 text-slate-800 dark:text-slate-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Possible Duplicate Transaction Found</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            You already recorded a <strong>₹{proposal.duplicateInfo.amount.toLocaleString("en-IN")}</strong> transaction for &ldquo;{proposal.duplicateInfo.title}&rdquo; on {proposal.duplicateInfo.date}.
          </p>
          <div className="flex items-center gap-2 pt-1">
            {proposal.duplicateInfo.publicId && (
              <Link
                href={`/dashboard/transactions/${proposal.duplicateInfo.publicId}`}
                className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 mr-2"
              >
                <span>View Existing</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] font-bold px-2 rounded-lg"
              onClick={() => setDuplicateDismissed(true)}
            >
              Create Anyway
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] text-slate-500 hover:text-slate-800 px-2 rounded-lg"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Readonly Display vs Inline Edit Mode */}
      {!isEditing ? (
        <div className="space-y-3">
          {/* Main Numbers & Title */}
          <div className="flex items-baseline justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Proposed Amount
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tabular-nums">
                ₹{proposal.amount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Category
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 justify-end">
                <Tag className="h-3 w-3 text-primary inline" />
                <span>{proposal.categoryName}</span>
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 font-semibold block">Description</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                {proposal.description || proposal.title}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 font-semibold block">Date & Timing</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                {proposal.formattedDate}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 font-semibold block">Payment Method</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                {proposal.paymentMethod || "UPI"}
              </span>
            </div>

            {proposal.contactName && (
              <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 font-semibold block">Contact</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 truncate block">
                  {proposal.contactName}
                </span>
              </div>
            )}

            {proposal.groupName && (
              <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 font-semibold block">Group</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block">
                  {proposal.groupName}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Inline Edit Form (Requirement 4) */
        <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
            <span className="font-bold text-xs flex items-center gap-1.5">
              <Edit3 className="h-3.5 w-3.5 text-primary" />
              <span>Edit Details Before Approval</span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[11px] px-2"
              onClick={() => setIsEditing(false)}
            >
              Cancel Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Amount (₹ INR) *</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ₹
                </span>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8 pl-6 text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Transaction Type</Label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as any)}
                className="w-full h-8 px-2 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="paid">Expense (Debit)</option>
                <option value="received">Income (Credit)</option>
                <option value="lent">Money Lent to Peer</option>
                <option value="borrowed">Money Borrowed</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Title / Description *</Label>
              <Input
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setEditDescription(e.target.value);
                }}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Category</Label>
              <select
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full h-8 px-2 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="Food & Dining">Food & Dining</option>
                <option value="Travel & Commute">Travel & Commute</option>
                <option value="Bills & Utilities">Bills & Utilities</option>
                <option value="Healthcare & Medical">Healthcare & Medical</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Groceries & Supplies">Groceries & Supplies</option>
                <option value="General">General</option>
                {categories
                  .filter((c) => !["Food & Dining", "Travel & Commute", "Bills & Utilities", "Healthcare & Medical", "Shopping", "Entertainment", "Groceries & Supplies", "General"].includes(c.name))
                  .map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Payment Method</Label>
              <select
                value={editPaymentMethod}
                onChange={(e) => setEditPaymentMethod(e.target.value)}
                className="w-full h-8 px-2 rounded-xl border border-input bg-background font-medium text-xs"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Wallet">Wallet</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs font-bold rounded-xl px-3 bg-primary"
              onClick={handleSaveEdit}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Action Bar (Requirement 3 & 5) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setIsEditing((prev) => !prev)}
            disabled={isApproving}
          >
            <Edit3 className="h-3.5 w-3.5 text-slate-500" />
            <span>{isEditing ? "Done Editing" : "Edit Details"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-xl text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1"
            onClick={handleCancel}
            disabled={isApproving}
          >
            <X className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          className="h-8 rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-500"
          onClick={handleApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Recording...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Approve & Create</span>
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

/**
 * Bulk Approval Container for multiple transactions (Requirements 13 & 14)
 */
export function TransactionApprovalCardGroup({
  proposals,
  categories = [],
  onAllApproved,
}: {
  proposals: ProposedTransaction[];
  categories?: Array<{ id: number; name: string }>;
  onAllApproved?: () => void;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ProposedTransaction[]>(proposals);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [allApproved, setAllApproved] = useState(false);

  const activeDrafts = items.filter((item) => item.status === "draft");
  const totalAmount = activeDrafts.reduce((sum, item) => sum + item.amount, 0);

  const handleApproveAll = async () => {
    setIsBulkApproving(true);
    try {
      await approveBatchConversationalTransactions(activeDrafts);
      setItems((prev) => prev.map((item) => ({ ...item, status: "approved" })));
      setAllApproved(true);
      emitFinancialEvent("transaction:created");
      emitFinancialEvent("expense:created");
      toast.success(`Successfully approved and created all ${activeDrafts.length} transactions!`);
      if (onAllApproved) onAllApproved();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve transactions in bulk.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleDiscardAll = () => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "cancelled" })));
    toast.info("All detected transaction proposals discarded.");
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Bulk Action Strip if more than 1 item and has active drafts */}
      {items.length > 1 && activeDrafts.length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Bulk Transaction Review ({activeDrafts.length} items • ₹{totalAmount.toLocaleString("en-IN")})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs rounded-xl px-2.5 text-slate-500"
              onClick={handleDiscardAll}
              disabled={isBulkApproving}
            >
              Discard All
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs font-bold rounded-xl px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleApproveAll}
              disabled={isBulkApproving}
            >
              {isBulkApproving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  <span>Approving All...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  <span>Approve All ({activeDrafts.length})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Render Individual Cards */}
      <div className="space-y-2.5">
        {items.map((proposal) => (
          <TransactionApprovalCard
            key={proposal.tempId}
            proposal={proposal}
            categories={categories}
            onApproved={() => {
              setItems((prev) =>
                prev.map((p) => (p.tempId === proposal.tempId ? { ...p, status: "approved" } : p))
              );
            }}
            onCancelled={() => {
              setItems((prev) =>
                prev.map((p) => (p.tempId === proposal.tempId ? { ...p, status: "cancelled" } : p))
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}

