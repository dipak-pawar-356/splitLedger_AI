"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, RotateCcw, Ban, CheckCircle2 } from "lucide-react";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";
import { DeleteConfirmDialog } from "@/components/dialogs/delete-confirm-dialog";
import { RestoreConfirmDialog } from "@/components/dialogs/restore-confirm-dialog";
import { deleteTransaction, updateTransaction } from "@/actions/transactions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TransactionActionButtonsProps {
  transaction: {
    id: number;
    publicId: string;
    title?: string | null;
    description: string;
    type: string;
    amount: number;
    currency: string;
    date: Date | string;
    contactId?: number | null;
    categoryId?: number | null;
    groupId?: number | null;
    paymentMethod?: string | null;
    status: string;
    receiptUrl?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    location?: string | null;
    isDeleted: boolean;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canRestore: boolean;
  };
}

export function TransactionActionButtons({
  transaction,
  permissions,
}: TransactionActionButtonsProps) {
  const router = useRouter();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  const handleDelete = async () => {
    await deleteTransaction(transaction.publicId);
    router.refresh();
  };

  const handleVoid = async () => {
    try {
      await updateTransaction(transaction.publicId, {
        status: "cancelled",
        reason: "Transaction marked as cancelled / voided",
      });
      toast.success("Transaction voided");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to void transaction");
    }
  };

  if (transaction.isDeleted) {
    return (
      <div className="flex items-center gap-2">
        {permissions.canRestore && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setRestoreModalOpen(true)}
            className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-semibold"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Restore Transaction</span>
          </Button>
        )}

        <RestoreConfirmDialog
          open={restoreModalOpen}
          onOpenChange={setRestoreModalOpen}
          transactionPublicId={transaction.publicId}
          transactionTitle={transaction.title || transaction.description}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {permissions.canEdit && (
        <EditTransactionDialog
          transactionPublicId={transaction.publicId}
          initialData={{
            title: transaction.title,
            description: transaction.description,
            type: transaction.type as any,
            amount: transaction.amount,
            currency: transaction.currency,
            date: transaction.date,
            contactId: transaction.contactId,
            categoryId: transaction.categoryId,
            groupId: transaction.groupId,
            paymentMethod: transaction.paymentMethod,
            status: transaction.status as any,
            receiptUrl: transaction.receiptUrl,
            notes: transaction.notes,
            tags: transaction.tags,
            location: transaction.location,
          }}
        />
      )}

      {permissions.canEdit && transaction.status !== "cancelled" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleVoid}
          className="rounded-xl text-xs gap-1.5"
        >
          <Ban className="h-4 w-4" />
          <span>Void</span>
        </Button>
      )}

      {permissions.canDelete && (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteModalOpen(true)}
          className="rounded-xl text-xs gap-1.5 bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </Button>
      )}

      <DeleteConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        itemName={transaction.title || transaction.description}
        itemType="Transaction"
      />
    </div>
  );
}
