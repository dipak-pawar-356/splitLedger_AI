"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  UtensilsCrossed,
  Bus,
  Zap,
  HeartPulse,
  ShoppingBag,
  Film,
  ShoppingCart,
} from "lucide-react";
import { SplitLedgerAiIcon } from "@/components/ai/split-ledger-ai-icon";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TransactionApprovalCardProps {
  proposal: ProposedTransaction;
  categories?: Array<{ id: number; name: string }>;
  onApproved?: (txId: number, publicId: string) => void;
  onCancelled?: () => void;
  onUndoCancel?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (selected: boolean) => void;
  showSelection?: boolean;
  forceEdit?: boolean;
  onUpdate?: (updatedProposal: ProposedTransaction) => void;
}

export interface PendingTransactionDraft {
  id: string;
  selected: boolean;
  values: ProposedTransaction;
  originalExtraction: ProposedTransaction;
  status: "draft" | "approved" | "cancelled";
  createdPublicId?: string | null;
}

export interface ApprovalSummaryTotals {
  selectedCount: number;
  approvalCount: number;
  selectedAmount: number;
  expenseTotal: number;
  incomeTotal: number;
  receivableTotal: number;
  payableTotal: number;
  netCashflow: number;
  categoryCount: number;
}

/**
 * Pure calculation engine for transaction approval selection.
 * Always calculates strictly from the currently selected active drafts.
 */
export function calculateApprovalSummary(
  drafts: PendingTransactionDraft[]
): ApprovalSummaryTotals {
  const selectedDrafts = drafts.filter(
    (d) => d.status === "draft" && d.selected
  );

  let selectedAmount = 0;
  let expenseTotal = 0;
  let incomeTotal = 0;
  let receivableTotal = 0;
  let payableTotal = 0;
  const categoriesSet = new Set<string>();

  for (const draft of selectedDrafts) {
    const amt =
      typeof draft.values.amount === "number" && !isNaN(draft.values.amount)
        ? draft.values.amount
        : 0;
    selectedAmount += amt;

    const type = draft.values.type;
    if (type === "received") {
      incomeTotal += amt;
    } else if (type === "lent") {
      receivableTotal += amt;
    } else if (type === "borrowed") {
      payableTotal += amt;
    } else {
      expenseTotal += amt;
    }

    if (draft.values.categoryName && draft.values.categoryName.trim()) {
      categoriesSet.add(draft.values.categoryName.trim());
    }
  }

  const netCashflow = incomeTotal - expenseTotal;

  return {
    selectedCount: selectedDrafts.length,
    approvalCount: selectedDrafts.length,
    selectedAmount,
    expenseTotal,
    incomeTotal,
    receivableTotal,
    payableTotal,
    netCashflow,
    categoryCount: categoriesSet.size,
  };
}

function getCategoryIcon(categoryName: string) {
  const lower = (categoryName || "").toLowerCase();
  if (lower.includes("food") || lower.includes("dining") || lower.includes("drink") || lower.includes("tea") || lower.includes("coffee") || lower.includes("lunch") || lower.includes("dinner")) {
    return <UtensilsCrossed className="h-4 w-4 text-amber-500 shrink-0" />;
  }
  if (lower.includes("travel") || lower.includes("transport") || lower.includes("commute") || lower.includes("bus") || lower.includes("cab") || lower.includes("fuel") || lower.includes("metro")) {
    return <Bus className="h-4 w-4 text-blue-500 shrink-0" />;
  }
  if (lower.includes("bill") || lower.includes("util") || lower.includes("electric") || lower.includes("recharge")) {
    return <Zap className="h-4 w-4 text-yellow-500 shrink-0" />;
  }
  if (lower.includes("health") || lower.includes("medic") || lower.includes("doctor")) {
    return <HeartPulse className="h-4 w-4 text-rose-500 shrink-0" />;
  }
  if (lower.includes("shop") || lower.includes("cloth") || lower.includes("retail")) {
    return <ShoppingBag className="h-4 w-4 text-purple-500 shrink-0" />;
  }
  if (lower.includes("entertain") || lower.includes("movie") || lower.includes("game")) {
    return <Film className="h-4 w-4 text-pink-500 shrink-0" />;
  }
  if (lower.includes("grocer") || lower.includes("suppl") || lower.includes("market")) {
    return <ShoppingCart className="h-4 w-4 text-emerald-500 shrink-0" />;
  }
  return <Receipt className="h-4 w-4 text-primary shrink-0" />;
}

export function TransactionApprovalCard({
  proposal: initialProposal,
  categories = [],
  onApproved,
  onCancelled,
  onUndoCancel,
  isSelected = true,
  onToggleSelect,
  showSelection = false,
  forceEdit,
  onUpdate,
}: TransactionApprovalCardProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposedTransaction>(initialProposal);
  const [isEditing, setIsEditing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(initialProposal.status === "approved");
  const [isCancelled, setIsCancelled] = useState(initialProposal.status === "cancelled");
  const [createdPublicId, setCreatedPublicId] = useState<string | null>(
    initialProposal.createdPublicId || initialProposal.duplicateInfo?.publicId || null
  );
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

  // Sync state reactively with props so bulk approval or external updates immediately switch this card
  useEffect(() => {
    setProposal(initialProposal);
    if (initialProposal.status === "approved") {
      setIsApproved(true);
      if (initialProposal.createdPublicId) {
        setCreatedPublicId(initialProposal.createdPublicId);
      }
    } else if (initialProposal.status === "cancelled") {
      setIsCancelled(true);
    } else if (initialProposal.status === "draft") {
      setIsApproved(false);
      setIsCancelled(false);
    }
  }, [initialProposal]);

  useEffect(() => {
    if (forceEdit !== undefined) {
      setIsEditing(forceEdit);
    }
  }, [forceEdit]);

  // Edit form state
  const [editTitle, setEditTitle] = useState(proposal.title);
  const [editDescription, setEditDescription] = useState(proposal.description);
  const [editAmount, setEditAmount] = useState(String(proposal.amount));
  const [editType, setEditType] = useState<"paid" | "received" | "lent" | "borrowed">(proposal.type);
  const [editCategoryName, setEditCategoryName] = useState(proposal.categoryName);
  const [editDate, setEditDate] = useState(proposal.date);
  const [editPaymentMethod, setEditPaymentMethod] = useState(proposal.paymentMethod || "UPI");
  const [editNotes, setEditNotes] = useState(proposal.notes || "");

  // Sync local edit state when proposal prop changes and not currently user-editing
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(proposal.title);
      setEditDescription(proposal.description);
      setEditAmount(String(proposal.amount));
      setEditType(proposal.type);
      setEditCategoryName(proposal.categoryName);
      setEditDate(proposal.date);
      setEditPaymentMethod(proposal.paymentMethod || "UPI");
      setEditNotes(proposal.notes || "");
    }
  }, [proposal, isEditing]);

  const handleAmountChange = (val: string) => {
    setEditAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdate?.({
        ...proposal,
        amount: parsed,
      });
    }
  };

  const handleTypeChange = (newType: "paid" | "received" | "lent" | "borrowed") => {
    setEditType(newType);
    onUpdate?.({
      ...proposal,
      type: newType,
    });
  };

  const handleCategoryChange = (newCatName: string) => {
    setEditCategoryName(newCatName);
    const matched = categories.find((c) => c.name.toLowerCase() === newCatName.toLowerCase());
    onUpdate?.({
      ...proposal,
      categoryName: newCatName,
      categoryId: matched ? matched.id : proposal.categoryId,
    });
  };

  const handleTitleChange = (val: string) => {
    setEditTitle(val);
    setEditDescription(val);
    onUpdate?.({
      ...proposal,
      title: val.trim() || proposal.title,
      description: val.trim() || proposal.title,
    });
  };

  const handleDateChange = (val: string) => {
    setEditDate(val);
    onUpdate?.({
      ...proposal,
      date: val,
    });
  };

  const handlePaymentMethodChange = (val: string) => {
    setEditPaymentMethod(val);
    onUpdate?.({
      ...proposal,
      paymentMethod: val,
    });
  };

  const handleNotesChange = (val: string) => {
    setEditNotes(val);
    onUpdate?.({
      ...proposal,
      notes: val.trim() || null,
    });
  };

  const handleSaveEdit = () => {
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than ₹0.");
      return;
    }

    const matchedCat = categories.find((c) => c.name.toLowerCase() === editCategoryName.toLowerCase());

    const updated: ProposedTransaction = {
      ...proposal,
      title: editTitle.trim() || proposal.title,
      description: editDescription.trim() || editTitle.trim(),
      amount: parsedAmount,
      type: editType,
      categoryId: matchedCat ? matchedCat.id : proposal.categoryId,
      categoryName: editCategoryName,
      date: editDate,
      paymentMethod: editPaymentMethod,
      notes: editNotes.trim() || null,
    };

    setProposal(updated);
    onUpdate?.(updated);
    setIsEditing(false);
    toast.success("Transaction details updated.");
  };

  const handleCancelEdit = () => {
    setEditTitle(proposal.title);
    setEditDescription(proposal.description);
    setEditAmount(String(proposal.amount));
    setEditType(proposal.type);
    setEditCategoryName(proposal.categoryName);
    setEditDate(proposal.date);
    setEditPaymentMethod(proposal.paymentMethod || "UPI");
    setEditNotes(proposal.notes || "");
    onUpdate?.(proposal);
    setIsEditing(false);
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await approveConversationalTransaction(proposal);
      setIsApproved(true);
      setCreatedPublicId(res.publicId);
      setProposal((prev) => ({ ...prev, status: "approved", createdPublicId: res.publicId }));
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
    toast.info("Transaction proposal cancelled (no database changes).");
  };

  const handleUndoCancel = () => {
    setIsCancelled(false);
    setProposal((prev) => ({ ...prev, status: "draft" }));
    if (onUndoCancel) onUndoCancel();
    toast.info("Transaction proposal restored.");
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
      ? "Income"
      : proposal.type === "lent"
        ? "Receivable"
        : proposal.type === "borrowed"
          ? "Payable"
          : "Expense";

  const isCardApproved = isApproved || proposal.status === "approved" || initialProposal.status === "approved";
  const isCardCancelled = isCancelled || proposal.status === "cancelled" || initialProposal.status === "cancelled";
  const effectivePublicId = createdPublicId || proposal.createdPublicId || initialProposal.createdPublicId;

  if (isCardCancelled) {
    return (
      <div className="p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs text-slate-500 flex items-center justify-between">
        <span className="line-through">
          Proposed {typeLabel}: ₹{proposal.amount.toLocaleString("en-IN")} ({proposal.title || proposal.description})
        </span>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px] text-slate-400">
            Cancelled
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] font-semibold text-primary hover:underline px-2 cursor-pointer"
            onClick={handleUndoCancel}
          >
            Undo Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (isCardApproved) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-slate-50/50 dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-slate-900/60 text-slate-900 dark:text-slate-100 space-y-3 shadow-xs relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />

        {/* Header with Icon, Title and Amount */}
        <div className="flex items-start justify-between gap-3 pt-0.5">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Approved & Added to Ledger
                </span>
                <span className="text-slate-400 text-[10px]">•</span>
                <span className="text-[10px] text-slate-500 font-medium">{proposal.formattedDate}</span>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words leading-tight">
                {proposal.title || proposal.description}
              </h4>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <Badge variant="outline" className="text-[10px] font-semibold py-0 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  {proposal.categoryName}
                </Badge>
                <Badge className={`text-[10px] font-semibold py-0 px-2 border ${typeColor}`}>
                  {typeLabel}
                </Badge>
                {proposal.paymentMethod && (
                  <span className="text-[10px] font-medium text-slate-500 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                    {proposal.paymentMethod}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="font-mono text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹{proposal.amount.toLocaleString("en-IN")}
            </div>
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9.5px] font-bold px-2 py-0 shadow-2xs">
              Live in Ledger
            </Badge>
          </div>
        </div>

        {/* Footer with Instant Sync Confirmation & Link */}
        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Balances, reports & budgets updated</span>
          </span>
          <Link
            href={effectivePublicId ? `/dashboard/transactions/${effectivePublicId}` : `/dashboard/transactions`}
            className="text-primary hover:text-primary/80 font-bold inline-flex items-center gap-1 text-xs shrink-0 hover:underline cursor-pointer transition-colors"
          >
            <span>View in Ledger</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-2xs space-y-3 ${
        showSelection && !isSelected
          ? "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 opacity-75"
          : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 hover:border-primary/50 hover:shadow-md"
      }`}
    >
      {/* Glow highlight strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />

      {/* Main Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pt-0.5">
        <div className="flex items-start gap-2.5 min-w-0">
          {showSelection && !isApproved && !isCancelled && (
            <div className="pt-1 shrink-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(val) => onToggleSelect?.(!!val)}
                className="h-4 w-4 rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer transition-transform active:scale-90"
                aria-label={`Select ${proposal.title || proposal.description}`}
              />
            </div>
          )}

          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0 mt-0.5 shadow-2xs">
            {getCategoryIcon(proposal.categoryName)}
          </div>

          <div className="min-w-0 space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words leading-tight">
              {proposal.title || proposal.description}
            </h4>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] font-semibold py-0 px-2 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                {proposal.categoryName}
              </Badge>
              <Badge className={`text-[10px] font-semibold py-0 px-2 border ${typeColor}`}>
                {typeLabel}
              </Badge>
              <span className="text-[11px] text-slate-400 font-medium">
                • {proposal.formattedDate}
              </span>
            </div>
          </div>
        </div>

        {/* Amount & Status Badge */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pl-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
          <div className="font-mono text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
            ₹{proposal.amount.toLocaleString("en-IN")}
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] font-medium transition-colors ${
              showSelection && !isSelected
                ? "text-slate-500 dark:text-slate-400 border-slate-300/60 dark:border-slate-700/60 bg-slate-100/80 dark:bg-slate-800/50"
                : "text-amber-600 dark:text-amber-400 border-amber-300/80 dark:border-amber-800/60 bg-amber-500/10"
            }`}
          >
            {showSelection && !isSelected ? "Unselected" : "Awaiting Approval"}
          </Badge>
        </div>
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
        <div className="space-y-2.5">
          {/* Metadata Chips (Clean, Responsive, Non-Truncating) */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium text-[11px] border border-slate-200/50 dark:border-slate-700/50">
              <CreditCard className="h-3 w-3 text-slate-400" />
              <span>{proposal.paymentMethod || "UPI"}</span>
            </span>

            {proposal.contactName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-200/50 dark:border-blue-800/50">
                <User className="h-3 w-3 text-blue-500" />
                <span>{proposal.contactName}</span>
              </span>
            )}

            {proposal.groupName && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium text-[11px] border border-indigo-200/50 dark:border-indigo-800/50">
                <Users className="h-3 w-3 text-indigo-500" />
                <span>{proposal.groupName}</span>
              </span>
            )}
          </div>

          {/* Full Notes & Details Container without Truncation */}
          {proposal.notes && (
            <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 break-words leading-relaxed">
              {proposal.notes}
            </div>
          )}
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
              className="h-6 text-[11px] px-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              onClick={handleCancelEdit}
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
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="h-8 pl-6 text-xs font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Transaction Type</Label>
              <select
                value={editType}
                onChange={(e) => handleTypeChange(e.target.value as any)}
                className="w-full h-8 px-2 rounded-xl border border-input bg-background font-medium text-xs cursor-pointer"
              >
                <option value="paid">Expense</option>
                <option value="received">Income</option>
                <option value="lent">Receivable</option>
                <option value="borrowed">Payable</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Title / Item Name *</Label>
              <Input
                value={editTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="h-8 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Category</Label>
              <select
                value={editCategoryName}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full h-8 px-2 rounded-xl border border-input bg-background font-medium text-xs cursor-pointer"
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
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold">Payment Method</Label>
              <select
                value={editPaymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full h-8 px-2 rounded-xl border border-input bg-background font-medium text-xs cursor-pointer"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Wallet">Wallet</option>
              </select>
            </div>

            <div className="space-y-1 col-span-full">
              <Label className="text-[11px] font-semibold">Notes / Purpose</Label>
              <Input
                value={editNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="e.g. Water bottle for trip, Team dinner..."
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold rounded-xl px-3"
              onClick={handleCancelEdit}
            >
              Cancel Edit
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs font-bold rounded-xl px-3 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSaveEdit}
            >
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Action Bar (Prominent, High-Contrast & Unmissable across all screen sizes) */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Primary Unmissable Approve Button */}
        <Button
          type="button"
          size="sm"
          className={`w-full h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold gap-2 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            showSelection && !isSelected
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300/50 dark:border-slate-700/50"
              : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/20 active:scale-[0.98]"
          }`}
          onClick={handleApprove}
          disabled={isApproving || (showSelection && !isSelected)}
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Recording Transaction...</span>
            </>
          ) : showSelection && !isSelected ? (
            <>
              <AlertTriangle className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Transaction Deselected (Check to Approve)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              <span>Approve & Create (₹{proposal.amount.toLocaleString("en-IN")})</span>
            </>
          )}
        </Button>

        {/* Secondary Edit & Cancel Controls */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-slate-200 dark:border-slate-800 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            onClick={() => setIsEditing((prev) => !prev)}
            disabled={isApproving}
          >
            <Edit3 className="h-3.5 w-3.5 text-primary" />
            <span>{isEditing ? "Close Edit" : "Edit Details"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-rose-200/80 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-all cursor-pointer"
            onClick={handleCancel}
            disabled={isApproving}
          >
            <X className="h-3.5 w-3.5" />
            <span>Reject</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Bulk Approval Container for multiple transactions (Requirements 2 & 3)
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

  // Single source of truth for pending transaction drafts
  const [drafts, setDrafts] = useState<PendingTransactionDraft[]>(() =>
    proposals.map((p, idx) => ({
      id: p.tempId || `draft-${idx}-${Date.now()}`,
      selected: true,
      values: { ...p },
      originalExtraction: { ...p },
      status: p.status || "draft",
      createdPublicId: p.createdPublicId || null,
    }))
  );

  const [forceEditAll, setForceEditAll] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Keep drafts synced if proposals prop changes, preserving user edits and selections
  useEffect(() => {
    setDrafts((prevDrafts) => {
      const prevMap = new Map(prevDrafts.map((d) => [d.id, d]));
      return proposals.map((p, idx) => {
        const id = p.tempId || `draft-${idx}`;
        const existing = prevMap.get(id);
        if (existing) {
          return {
            ...existing,
            status: p.status && p.status !== "draft" ? p.status : existing.status,
            createdPublicId: p.createdPublicId || existing.createdPublicId,
          };
        }
        return {
          id,
          selected: true,
          values: { ...p },
          originalExtraction: { ...p },
          status: p.status || "draft",
          createdPublicId: p.createdPublicId || null,
        };
      });
    });
  }, [proposals]);

  const activeDrafts = useMemo(
    () => drafts.filter((d) => d.status === "draft"),
    [drafts]
  );

  const approvedDrafts = useMemo(
    () => drafts.filter((d) => d.status === "approved"),
    [drafts]
  );

  const selectedDrafts = useMemo(
    () => activeDrafts.filter((d) => d.selected),
    [activeDrafts]
  );

  const allSelected = activeDrafts.length > 0 && activeDrafts.every((d) => d.selected);

  // Live recalculation derived strictly from currently selected active drafts
  const totals = useMemo(() => calculateApprovalSummary(drafts), [drafts]);

  const handleToggleSelect = (id: string, selected: boolean) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selected } : d))
    );
  };

  const handleToggleSelectAll = () => {
    const nextSelected = !allSelected;
    setDrafts((prev) =>
      prev.map((d) => (d.status === "draft" ? { ...d, selected: nextSelected } : d))
    );
  };

  const handleUpdateDraft = (id: string, updatedValues: ProposedTransaction) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, values: updatedValues } : d))
    );
  };

  const handleIndividualApproved = (id: string, publicId: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, status: "approved", createdPublicId: publicId } : d
      )
    );
  };

  const handleIndividualCancelled = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "cancelled" } : d))
    );
  };

  const handleIndividualUndoCancel = (id: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "draft" } : d))
    );
  };

  const handleApproveSelected = async () => {
    if (selectedDrafts.length === 0) {
      toast.error("Please select at least one transaction to approve.");
      return;
    }
    setIsBulkApproving(true);
    try {
      const proposalsToApprove = selectedDrafts.map((d) => d.values);
      const res = await approveBatchConversationalTransactions(proposalsToApprove);
      const resultMap = new Map<string, string>();
      selectedDrafts.forEach((draft, idx) => {
        const matching = res.results && res.results[idx];
        if (matching) {
          resultMap.set(draft.id, matching.publicId);
        }
      });

      setDrafts((prev) =>
        prev.map((d) => {
          if (d.selected && d.status === "draft") {
            return {
              ...d,
              status: "approved",
              createdPublicId: resultMap.get(d.id) || d.createdPublicId,
            };
          }
          return d;
        })
      );

      emitFinancialEvent("transaction:created");
      emitFinancialEvent("expense:created");
      toast.success(`Successfully approved and recorded ${selectedDrafts.length} transaction(s)!`);
      if (onAllApproved) onAllApproved();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve selected transactions.");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleRejectSelected = () => {
    if (selectedDrafts.length === 0) return;
    const count = selectedDrafts.length;
    setDrafts((prev) =>
      prev.map((d) =>
        d.selected && d.status === "draft" ? { ...d, status: "cancelled" } : d
      )
    );
    toast.info(`Rejected ${count} selected transaction proposal(s).`);
  };

  return (
    <div className="space-y-3 pt-1">
      {/* 1. Render Individual Cards FIRST (Each transitions dynamically to Approved Live in Ledger state) */}
      <div className="space-y-3">
        {drafts.map((draft) => (
          <TransactionApprovalCard
            key={draft.id}
            proposal={draft.values}
            categories={categories}
            showSelection={drafts.length > 1}
            isSelected={draft.selected}
            onToggleSelect={(checked) => handleToggleSelect(draft.id, checked)}
            onUpdate={(updated) => handleUpdateDraft(draft.id, updated)}
            forceEdit={forceEditAll}
            onApproved={(_txId, publicId) => handleIndividualApproved(draft.id, publicId)}
            onCancelled={() => handleIndividualCancelled(draft.id)}
            onUndoCancel={() => handleIndividualUndoCancel(draft.id)}
          />
        ))}
      </div>

      {/* All Transactions Approved Success Banner */}
      {drafts.length > 1 && activeDrafts.length === 0 && approvedDrafts.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold truncate">
              All {drafts.length} transactions have been approved and saved to your live ledger.
            </span>
          </div>
          <Link
            href="/dashboard/transactions"
            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Ledger</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* 2. Bulk Actions Bar AT THE BOTTOM if multiple transactions exist (Requirement 3) */}
      {drafts.length > 1 && activeDrafts.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-100/90 via-emerald-50/20 to-slate-100/90 dark:from-slate-900/90 dark:via-emerald-950/10 dark:to-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 mt-3">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0">
              <SplitLedgerAiIcon size={16} className="text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                Approval Summary ({totals.selectedCount} of {activeDrafts.length} selected)
              </span>
            </div>
            <motion.div
              key={totals.selectedAmount}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
            >
              <Badge
                variant="outline"
                className={`font-mono font-bold text-xs shrink-0 transition-colors ${
                  totals.selectedAmount > 0
                    ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                }`}
              >
                ₹{totals.selectedAmount.toLocaleString("en-IN")}
              </Badge>
            </motion.div>
          </div>

          {/* Live Summary Panel (9 Continuously Recalculated Metrics) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            {/* Selected Count & Approval Count */}
            <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Selected Count</span>
              <div className="flex items-baseline justify-between gap-1 pt-0.5">
                <motion.span
                  key={totals.selectedCount}
                  initial={{ opacity: 0.7, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs"
                >
                  {totals.selectedCount}
                </motion.span>
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-normal">
                  Approve ({totals.approvalCount})
                </span>
              </div>
            </div>

            {/* Selected Amount */}
            <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Selected Amount</span>
              <motion.span
                key={totals.selectedAmount}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs pt-0.5"
              >
                ₹{totals.selectedAmount.toLocaleString("en-IN")}
              </motion.span>
            </div>

            {/* Income Total */}
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Income Total</span>
              <motion.span
                key={totals.incomeTotal}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs pt-0.5"
              >
                ₹{totals.incomeTotal.toLocaleString("en-IN")}
              </motion.span>
            </div>

            {/* Expense Total */}
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between">
              <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Expense Total</span>
              <motion.span
                key={totals.expenseTotal}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono font-bold text-rose-700 dark:text-rose-400 text-xs pt-0.5"
              >
                ₹{totals.expenseTotal.toLocaleString("en-IN")}
              </motion.span>
            </div>

            {/* Net Cashflow */}
            <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Net Cashflow</span>
              <motion.span
                key={totals.netCashflow}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className={`font-mono font-bold text-xs pt-0.5 ${
                  totals.netCashflow > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : totals.netCashflow < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {totals.netCashflow > 0 ? "+" : ""}{totals.netCashflow < 0 ? "-" : ""}₹{Math.abs(totals.netCashflow).toLocaleString("en-IN")}
              </motion.span>
            </div>

            {/* Receivable Total */}
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">Receivable Total</span>
              <motion.span
                key={totals.receivableTotal}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono font-bold text-blue-700 dark:text-blue-400 text-xs pt-0.5"
              >
                ₹{totals.receivableTotal.toLocaleString("en-IN")}
              </motion.span>
            </div>

            {/* Payable Total */}
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
              <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">Payable Total</span>
              <motion.span
                key={totals.payableTotal}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono font-bold text-purple-700 dark:text-purple-400 text-xs pt-0.5"
              >
                ₹{totals.payableTotal.toLocaleString("en-IN")}
              </motion.span>
            </div>

            {/* Category Count */}
            <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Category Count</span>
              <motion.span
                key={totals.categoryCount}
                initial={{ opacity: 0.7, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs pt-0.5"
              >
                {totals.categoryCount} {totals.categoryCount === 1 ? "Category" : "Categories"}
              </motion.span>
            </div>
          </div>

          <div className="space-y-2 pt-0.5">
            {/* Primary Dynamic Approve Button */}
            <Button
              type="button"
              size="sm"
              className={`w-full h-9.5 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                totals.selectedCount === 0
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300/50 dark:border-slate-700/50 shadow-none"
                  : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs cursor-pointer active:scale-[0.99]"
              }`}
              onClick={handleApproveSelected}
              disabled={isBulkApproving || totals.selectedCount === 0}
            >
              {isBulkApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Recording {totals.selectedCount} Transaction{totals.selectedCount === 1 ? "" : "s"}...</span>
                </>
              ) : totals.selectedCount === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>No transactions selected</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-100 shrink-0" />
                  <span>Approve Selected ({totals.selectedCount}) • ₹{totals.selectedAmount.toLocaleString("en-IN")}</span>
                </>
              )}
            </Button>

            {/* Secondary Controls: 3-column clean utility row */}
            <div className="grid grid-cols-3 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8 px-1 text-[11px] font-semibold rounded-xl text-emerald-700 dark:text-emerald-400 border-emerald-300/80 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer touch-press transition-all flex items-center justify-center gap-1"
                onClick={handleToggleSelectAll}
                disabled={isBulkApproving}
              >
                <CheckCircle2 className="h-3 w-3 shrink-0 opacity-70" />
                <span className="truncate">{allSelected ? "Deselect All" : "Select All"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8 px-1 text-[11px] font-semibold rounded-xl text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer touch-press transition-all flex items-center justify-center gap-1"
                onClick={() => setForceEditAll((prev) => !prev)}
                disabled={isBulkApproving}
              >
                <Edit3 className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{forceEditAll ? "Done" : "Edit All"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8 px-1 text-[11px] font-semibold rounded-xl text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer touch-press transition-all flex items-center justify-center gap-1"
                onClick={handleRejectSelected}
                disabled={isBulkApproving || totals.selectedCount === 0}
              >
                <X className="h-3 w-3 shrink-0" />
                <span className="truncate sm:hidden">Reject ({totals.selectedCount})</span>
                <span className="truncate hidden sm:inline">Reject Selected ({totals.selectedCount})</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

