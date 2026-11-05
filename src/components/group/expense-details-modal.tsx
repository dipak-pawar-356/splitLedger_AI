"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt,
  Tag,
  Calendar,
  CreditCard,
  User,
  Split,
  FileText,
  ExternalLink,
  Edit,
  Trash2,
  Paperclip,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { type GroupExpenseItemData } from "./group-expenses-ledger";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: GroupExpenseItemData | null;
  groupCurrency?: string;
  groupId: number;
  members: Array<{
    id: number;
    userId?: number | null;
    contactId?: number | null;
    name?: string;
    userName?: string;
  }>;
  canManage: boolean;
  onDeleteRequest: (exp: GroupExpenseItemData) => void;
}

export function ExpenseDetailsModal({
  isOpen,
  onClose,
  expense,
  groupCurrency = "INR",
  groupId,
  members,
  canManage,
  onDeleteRequest,
}: ExpenseDetailsModalProps) {
  if (!expense) return null;

  const categoryLower = (expense.categoryName || "").toLowerCase();
  let theme = {
    borderClass: "border-2 border-indigo-500/70 ring-1 ring-indigo-500/40",
    glowClass: "shadow-[0_0_40px_rgba(99,102,241,0.25)]",
    topGradient: "from-indigo-500 via-blue-500 to-cyan-400",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  };

  if (categoryLower.includes("food") || categoryLower.includes("dining") || categoryLower.includes("meal")) {
    theme = {
      borderClass: "border-2 border-emerald-500/70 ring-1 ring-emerald-500/40",
      glowClass: "shadow-[0_0_40px_rgba(16,185,129,0.25)]",
      topGradient: "from-emerald-500 via-teal-400 to-cyan-400",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    };
  } else if (categoryLower.includes("travel") || categoryLower.includes("trip") || categoryLower.includes("fuel")) {
    theme = {
      borderClass: "border-2 border-purple-500/70 ring-1 ring-purple-500/40",
      glowClass: "shadow-[0_0_40px_rgba(168,85,247,0.25)]",
      topGradient: "from-purple-500 via-indigo-500 to-pink-500",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    };
  } else if (categoryLower.includes("bill") || categoryLower.includes("util") || categoryLower.includes("rent")) {
    theme = {
      borderClass: "border-2 border-amber-500/70 ring-1 ring-amber-500/40",
      glowClass: "shadow-[0_0_40px_rgba(245,158,11,0.25)]",
      topGradient: "from-amber-500 via-orange-400 to-yellow-400",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    };
  }

  const payerDisplay = expense.paidByName || expense.paidByContactName || "Group Member";
  const amountInRupees = expense.amount / 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`sm:max-w-[580px] max-h-[92vh] overflow-y-auto p-0 rounded-3xl ${theme.borderClass} ${theme.glowClass} bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-2xl text-slate-100`}
      >
        {/* Animated Top Accent Bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${theme.topGradient} animate-pulse`} />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-primary">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{expense.title || expense.description || "Expense Record"}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  Verified ledger entry recorded on {formatDate(expense.date)}
                </DialogDescription>
              </div>
            </div>

            <Badge variant="outline" className={`text-xs py-1 px-2.5 font-bold rounded-xl ${theme.badgeClass}`}>
              {expense.categoryName || "General"}
            </Badge>
          </div>

          {/* Amount Display Bar */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Total Transaction Value
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono block mt-0.5">
                {formatCurrency(amountInRupees, expense.currency || groupCurrency)}
              </span>
            </div>
            <div className="text-right">
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Ledger Verified
              </Badge>
              <span className="text-[10px] text-slate-400 block mt-1">
                Method: <strong className="text-slate-200">{expense.paymentMethod || "UPI"}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Payer Card */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <User className="h-3 w-3 text-slate-400" />
                Paid By
              </span>
              <p className="text-sm font-bold text-white mt-1 truncate">
                {payerDisplay}
              </p>
              <span className="text-[10px] text-slate-400">Fronted entire bill amount</span>
            </div>

            {/* Split Method */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <Split className="h-3 w-3 text-slate-400" />
                Split Model
              </span>
              <p className="text-sm font-bold text-white mt-1 capitalize">
                {expense.splitMethod === "exact"
                  ? "Exact Share (₹)"
                  : expense.splitMethod === "percentage"
                  ? "Percentage (%)"
                  : expense.splitMethod === "shares"
                  ? "Weighted Shares"
                  : "Equally Divided (1/N)"}
              </p>
              <span className="text-[10px] text-slate-400">Auto-balanced across members</span>
            </div>
          </div>

          {/* Description or Notes */}
          {(expense.description || expense.notes) && (
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-slate-400" />
                Transaction Notes
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {expense.description || expense.notes}
              </p>
            </div>
          )}

          {/* Receipt Attachment Preview if available */}
          {expense.receiptUrl && (
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                  <Paperclip className="h-3 w-3 text-slate-400" />
                  Attached Bill / Receipt
                </span>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open Full Image</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="rounded-xl overflow-hidden max-h-48 border border-slate-700">
                <img
                  src={expense.receiptUrl}
                  alt="Receipt Preview"
                  className="w-full object-cover object-top hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          )}

          {/* Transaction Metadata Footer */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
            <span className="font-mono">ID: {expense.publicId}</span>
            <Link
              href={`/dashboard/transactions/${expense.publicId}`}
              className="text-primary hover:underline font-bold flex items-center gap-1"
            >
              <span>Full Audit Trail</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 pt-3 border-t border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs text-slate-400 hover:text-white"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <EditTransactionDialog
                  transactionPublicId={expense.publicId}
                  initialData={{
                    title: expense.title,
                    description: expense.description || expense.title || "Expense",
                    type: (expense.type as any) || "paid",
                    amount: expense.amount,
                    currency: expense.currency || groupCurrency,
                    date: expense.date,
                    groupId: groupId,
                    categoryId: expense.categoryId || null,
                    paymentMethod: expense.paymentMethod || "UPI",
                    paidBy: expense.paidBy || null,
                    paidByContact: expense.paidByContact || null,
                    notes: expense.notes || null,
                    receiptUrl: expense.receiptUrl || null,
                  }}
                  members={members}
                  trigger={
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5 border-slate-700 text-slate-200 hover:bg-slate-800"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  }
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onDeleteRequest(expense);
                  }}
                  className="rounded-xl text-xs gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              </>
            )}

            <Link href={`/dashboard/transactions/${expense.publicId}`}>
              <Button
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md"
              >
                <span>Inspect Ledger Entry</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
