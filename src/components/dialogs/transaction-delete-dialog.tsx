"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { deleteTransaction } from "@/actions/transactions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TransactionDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionPublicId: string;
  transactionTitle?: string | null;
  onSuccess?: () => void;
}

export function TransactionDeleteDialog({
  open,
  onOpenChange,
  transactionPublicId,
  transactionTitle,
  onSuccess,
}: TransactionDeleteDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionPublicId, "Deleted by group admin");
      toast.success("Transaction deleted. Group ledger and settlements recalculated.");
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-3xl border shadow-2xl p-6 bg-card">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Delete this transaction?
              </DialogTitle>
              {transactionTitle && (
                <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                  {transactionTitle}
                </p>
              )}
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 pt-1 leading-relaxed space-y-2">
            <span className="block font-medium">
              Deleting this transaction will automatically recalculate
            </span>
            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1 pl-1">
              <li>Member balances</li>
              <li>Group balances</li>
              <li>Settlement suggestions</li>
              <li>Reports</li>
              <li>Analytics</li>
            </ul>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 pt-1">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-xl px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl px-5 text-xs font-bold bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
