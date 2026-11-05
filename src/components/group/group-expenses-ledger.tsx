"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  Paperclip, 
  Edit, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Maximize2
} from "lucide-react";
import Link from "next/link";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";
import { TransactionDeleteDialog } from "@/components/dialogs/transaction-delete-dialog";
import { ExpenseDetailsModal } from "./expense-details-modal";

export interface GroupExpenseItemData {
  id: number;
  publicId: string;
  title: string | null;
  description?: string | null;
  type: string;
  amount: number; // in paise
  currency: string;
  date: Date | string;
  status: string;
  receiptUrl?: string | null;
  paymentMethod?: string | null;
  categoryName?: string | null;
  categoryId?: number | null;
  notes?: string | null;
  paidByName?: string | null;
  paidByContactName?: string | null;
  paidBy?: number | null;
  paidByContact?: number | null;
  createdBy?: number | null;
  splitMethod?: string | null;
}

interface GroupExpensesLedgerProps {
  expenses: GroupExpenseItemData[];
  groupId: number;
  groupPublicId: string;
  groupCurrency?: string;
  members: Array<{
    id: number;
    userId?: number | null;
    contactId?: number | null;
    name?: string;
    userName?: string;
  }>;
  currentUserId: number;
  isCurrentUserAdmin: boolean;
  isGroupOwner: boolean;
}

export function GroupExpensesLedger({
  expenses,
  groupId,
  groupPublicId,
  groupCurrency = "INR",
  members,
  currentUserId,
  isCurrentUserAdmin,
  isGroupOwner,
}: GroupExpensesLedgerProps) {
  const [deleteTarget, setDeleteTarget] = useState<GroupExpenseItemData | null>(null);
  const [inspectTarget, setInspectTarget] = useState<GroupExpenseItemData | null>(null);

  if (expenses.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-2">
        <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-1" />
        <p className="font-semibold text-sm">No expenses added to this group yet</p>
      </div>
    );
  }

  const getCategoryTheme = (categoryName?: string | null) => {
    const c = (categoryName || "").toLowerCase();
    if (c.includes("food") || c.includes("dining") || c.includes("meal")) {
      return {
        borderHover: "hover:border-emerald-500/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]",
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        accent: "text-emerald-500",
      };
    }
    if (c.includes("travel") || c.includes("trip") || c.includes("fuel")) {
      return {
        borderHover: "hover:border-purple-500/70 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
        badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        accent: "text-purple-500",
      };
    }
    if (c.includes("bill") || c.includes("util") || c.includes("rent")) {
      return {
        borderHover: "hover:border-amber-500/70 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        accent: "text-amber-500",
      };
    }
    return {
      borderHover: "hover:border-indigo-500/70 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]",
      badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      accent: "text-indigo-500",
    };
  };

  return (
    <>
      <div className="p-4 space-y-3">
        {expenses.map((exp) => {
          const canManage =
            isGroupOwner ||
            isCurrentUserAdmin ||
            exp.createdBy === currentUserId ||
            exp.paidBy === currentUserId;

          const payerDisplay =
            exp.paidByName || exp.paidByContactName || "Group Member";

          const theme = getCategoryTheme(exp.categoryName);

          return (
            <div
              key={exp.id}
              onClick={() => setInspectTarget(exp)}
              className={`group p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 ${theme.borderHover} hover:-translate-y-1 hover:scale-[1.008] hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-4`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate block">
                    {exp.title || exp.description || "Expense"}
                  </span>
                  <Badge variant="outline" className={`text-[10px] py-0 px-2 font-semibold ${theme.badge}`}>
                    {exp.categoryName || "General"}
                  </Badge>
                  {exp.receiptUrl && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(exp.receiptUrl!, "_blank");
                      }}
                      className="text-slate-400 hover:text-primary transition-colors flex items-center gap-0.5 text-[10px]"
                      title="View Receipt Attachment"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>Receipt</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>Paid by <strong className="text-slate-700 dark:text-slate-300 font-semibold">{payerDisplay}</strong></span>
                  <span>•</span>
                  <span>{formatDate(exp.date)}</span>
                  {exp.splitMethod && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        {exp.splitMethod === "exact"
                          ? "Exact (₹)"
                          : exp.splitMethod === "percentage"
                          ? "Percent (%)"
                          : exp.splitMethod === "shares"
                          ? "Shares"
                          : "Equal (1/N)"}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Amount & Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 block font-mono">
                    {formatCurrency(exp.amount / 100, exp.currency || groupCurrency)}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {exp.paymentMethod || "UPI"}
                  </span>
                </div>

                <div 
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {canManage && (
                    <>
                      {/* Edit transaction */}
                      <EditTransactionDialog
                        transactionPublicId={exp.publicId}
                        initialData={{
                          title: exp.title,
                          description: exp.description || exp.title || "Expense",
                          type: (exp.type as any) || "paid",
                          amount: exp.amount,
                          currency: exp.currency || groupCurrency,
                          date: exp.date,
                          groupId: groupId,
                          categoryId: exp.categoryId || null,
                          paymentMethod: exp.paymentMethod || "UPI",
                          paidBy: exp.paidBy || null,
                          paidByContact: exp.paidByContact || null,
                          notes: exp.notes || null,
                          receiptUrl: exp.receiptUrl || null,
                        }}
                        members={members}
                        trigger={
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl"
                            title="Edit transaction"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />

                      {/* Delete transaction */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                        title="Delete transaction"
                        onClick={() => setDeleteTarget(exp)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-primary rounded-xl"
                    title="Inspect expense record"
                    onClick={() => setInspectTarget(exp)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pop-up Expense Details Modal */}
      <ExpenseDetailsModal
        isOpen={inspectTarget !== null}
        onClose={() => setInspectTarget(null)}
        expense={inspectTarget}
        groupId={groupId}
        groupCurrency={groupCurrency}
        members={members}
        canManage={
          Boolean(inspectTarget) &&
          (isGroupOwner ||
            isCurrentUserAdmin ||
            inspectTarget?.createdBy === currentUserId ||
            inspectTarget?.paidBy === currentUserId)
        }
        onDeleteRequest={(exp) => setDeleteTarget(exp)}
      />

      {deleteTarget && (
        <TransactionDeleteDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          transactionPublicId={deleteTarget.publicId}
          transactionTitle={deleteTarget.title || deleteTarget.description}
          onSuccess={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
