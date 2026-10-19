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
  ExternalLink 
} from "lucide-react";
import Link from "next/link";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";
import { TransactionDeleteDialog } from "@/components/dialogs/transaction-delete-dialog";

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

  if (expenses.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-2">
        <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-1" />
        <p className="font-semibold text-sm">No expenses added to this group yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {expenses.map((exp) => {
          const canManage =
            isGroupOwner ||
            isCurrentUserAdmin ||
            exp.createdBy === currentUserId ||
            exp.paidBy === currentUserId;

          const payerDisplay =
            exp.paidByName || exp.paidByContactName || "Group Member";

          return (
            <div
              key={exp.id}
              className="group p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all duration-200"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/transactions/${exp.publicId}`}
                    className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate block"
                  >
                    {exp.title || exp.description || "Expense"}
                  </Link>
                  {exp.receiptUrl && (
                    <a
                      href={exp.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-primary transition-colors"
                      title="View Receipt Attachment"
                    >
                      <Paperclip className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {exp.categoryName || "General"}
                  </span>
                  {" • "}Paid by{" "}
                  <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                    {payerDisplay}
                  </strong>
                  {" • "}
                  {formatDate(exp.date)}
                </p>
              </div>

              {/* Amount & Manage Actions */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100 block">
                    {formatCurrency(exp.amount / 100, exp.currency || groupCurrency)}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {exp.paymentMethod || "UPI"}
                  </span>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    {/* FEATURE 1: Admin can edit any transaction */}
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

                    {/* FEATURE 2: Admin can delete any transaction */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
                      title="Delete transaction"
                      onClick={() => setDeleteTarget(exp)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
