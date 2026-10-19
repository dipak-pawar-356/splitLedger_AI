"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TransactionDeleteDialog } from "@/components/dialogs/transaction-delete-dialog";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";
import { FileText, Trash2, Edit, ArrowUpRight, ArrowDownLeft, Paperclip } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ExpenseItemProps {
  id: number;
  publicId: string;
  description: string;
  amount: number;
  currency?: string;
  type: string;
  date: Date | string;
  userName?: string;
  contactName?: string;
  creatorName?: string;
  receiptUrl?: string | null;
  canEdit: boolean;
}

export function ExpenseItem({
  id,
  publicId,
  description,
  amount,
  currency = "INR",
  type,
  date,
  userName,
  contactName,
  creatorName,
  receiptUrl,
  canEdit,
}: ExpenseItemProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isPositive = type === "received" || type === "lent";
  const payerDisplayName = userName || contactName || "Group Member";

  return (
    <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}>
          {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{description}</p>
            {receiptUrl && (
              <a 
                href={receiptUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-slate-400 hover:text-primary transition-colors"
                title="View Receipt"
              >
                <Paperclip className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">Paid by:</span> {payerDisplayName}
            {creatorName && creatorName !== payerDisplayName && (
              <span> • Added by: {creatorName}</span>
            )}
            {" • "}{formatDate(date)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-2">
        <div className="text-right">
          <p className={`font-bold text-sm ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {isPositive ? "+" : "-"}
            {formatCurrency(amount / 100)}
          </p>
          <p className="text-[10px] text-slate-400 capitalize">{type}</p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <EditTransactionDialog
              transactionPublicId={publicId}
              initialData={{
                description,
                type: type as any,
                amount,
                currency,
                date,
              }}
              trigger={
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <Link href={`/dashboard/transactions/${publicId}`}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" title="View Details">
                <FileText className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDeleteDialogOpen(true)}
              title="Delete Transaction"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <TransactionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        transactionPublicId={publicId}
        transactionTitle={description}
      />
    </div>
  );
}
