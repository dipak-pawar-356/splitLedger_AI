"use client";

import { useState, useEffect } from "react";
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
  Sparkles,
  UtensilsCrossed,
  Bus,
  Zap,
  HeartPulse,
  ShoppingBag,
  Film,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TransactionApprovalCardProps {
  proposal: ProposedTransaction;
  categories?: Array<{ id: number; name: string }>;
  onApproved?: (txId: number, publicId: string) => void;
  onCancelled?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (selected: boolean) => void;
  showSelection?: boolean;
  forceEdit?: boolean;
}

export function TransactionApprovalCard({
  proposal: initialProposal,
  categories = [],
  onApproved,
  onCancelled,
  isSelected = true,
  onToggleSelect,
  showSelection = false,
  forceEdit,
}: TransactionApprovalCardProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposedTransaction>(initialProposal);
  const [isEditing, setIsEditing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(proposal.status === "approved");
  const [isCancelled, setIsCancelled] = useState(proposal.status === "cancelled");
  const [createdPublicId, setCreatedPublicId] = useState<string | null>(null);
  const [duplicateDismissed, setDuplicateDismissed] = useState(false);

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
    toast.info("Transaction proposal cancelled (no database changes).");
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
          Proposed {typeLabel}: ₹{proposal.amount.toLocaleString("en-IN")} ({proposal.description || proposal.title})
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
            onClick={() => {
              setIsCancelled(false);
              setProposal((prev) => ({ ...prev, status: "draft" }));
            }}
          >
            Undo Cancel
          </Button>
        </div>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/95 hover:border-primary/50 hover:shadow-md transition-all duration-200 relative overflow-hidden group shadow-2xs space-y-3"
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
                className="h-4 w-4 rounded-md data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 cursor-pointer"
                aria-label={`Select ${proposal.title}`}
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
          <div className="font-mono text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
            ₹{proposal.amount.toLocaleString("en-IN")}
          </div>
          <Badge variant="outline" className="text-[10px] font-medium text-amber-600 dark:text-amber-400 border-amber-300/80 dark:border-amber-800/60 bg-amber-500/10">
            Awaiting Approval
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
              <Label className="text-[11px] font-semibold">Title / Item Name *</Label>
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

            <div className="space-y-1 col-span-full">
              <Label className="text-[11px] font-semibold">Notes / Purpose</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Water bottle for trip, Team dinner..."
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
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
          className="w-full h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/20 active:scale-[0.98] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
          onClick={handleApprove}
          disabled={isApproving}
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Recording Transaction...</span>
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
  const [items, setItems] = useState<ProposedTransaction[]>(proposals);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(proposals.map((p) => p.tempId))
  );
  const [forceEditAll, setForceEditAll] = useState(false);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const activeDrafts = items.filter((item) => item.status === "draft");
  const selectedDrafts = activeDrafts.filter((item) => selectedIds.has(item.tempId));
  const totalAmount = activeDrafts.reduce((sum, item) => sum + item.amount, 0);

  const handleApproveAll = async () => {
    if (activeDrafts.length === 0) return;
    setIsBulkApproving(true);
    try {
      await approveBatchConversationalTransactions(activeDrafts);
      setItems((prev) => prev.map((item) => ({ ...item, status: "approved" })));
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

  const handleApproveSelected = async () => {
    if (selectedDrafts.length === 0) {
      toast.error("Please select at least one transaction to approve.");
      return;
    }
    setIsBulkApproving(true);
    try {
      await approveBatchConversationalTransactions(selectedDrafts);
      const approvedIds = new Set(selectedDrafts.map((s) => s.tempId));
      setItems((prev) =>
        prev.map((item) => (approvedIds.has(item.tempId) ? { ...item, status: "approved" } : item))
      );
      emitFinancialEvent("transaction:created");
      emitFinancialEvent("expense:created");
      toast.success(`Successfully approved ${selectedDrafts.length} selected transaction(s)!`);
      if (onAllApproved) onAllApproved();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve selected transactions.");
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
      {/* 1. Render Individual Cards FIRST (Requirement 2: each with own approval, edit, cancel) */}
      <div className="space-y-3">
        {items.map((proposal) => (
          <TransactionApprovalCard
            key={proposal.tempId}
            proposal={proposal}
            categories={categories}
            showSelection={items.length > 1}
            isSelected={selectedIds.has(proposal.tempId)}
            onToggleSelect={(checked) => {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (checked) next.add(proposal.tempId);
                else next.delete(proposal.tempId);
                return next;
              });
            }}
            forceEdit={forceEditAll}
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

      {/* 2. Bulk Actions Bar AT THE BOTTOM if multiple transactions exist (Requirement 3) */}
      {items.length > 1 && activeDrafts.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-100/90 via-emerald-50/20 to-slate-100/90 dark:from-slate-900/90 dark:via-emerald-950/10 dark:to-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3 mt-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="h-4 w-4 text-emerald-500 shrink-0 animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                Bulk Actions ({activeDrafts.length} transactions pending)
              </span>
            </div>
            <Badge variant="outline" className="font-mono font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-xs shrink-0">
              ₹{totalAmount.toLocaleString("en-IN")}
            </Badge>
          </div>

          <div className="space-y-2 pt-0.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                className="w-full h-9 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                onClick={handleApproveAll}
                disabled={isBulkApproving}
              >
                {isBulkApproving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-100 shrink-0" />
                )}
                <span className="truncate">Approve All ({activeDrafts.length})</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-9 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-all flex items-center justify-center gap-1.5"
                onClick={handleApproveSelected}
                disabled={isBulkApproving || selectedDrafts.length === 0}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">Approve Selected ({selectedDrafts.length})</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all flex items-center justify-center gap-1.5 px-3"
                onClick={() => setForceEditAll((prev) => !prev)}
                disabled={isBulkApproving}
              >
                <Edit3 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{forceEditAll ? "Done Editing" : "Edit Individually"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-8.5 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-all flex items-center justify-center gap-1.5 px-3"
                onClick={handleDiscardAll}
                disabled={isBulkApproving}
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Reject All</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

