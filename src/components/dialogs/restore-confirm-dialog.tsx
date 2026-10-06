"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { restoreTransaction } from "@/actions/transactions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RestoreConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionPublicId: string;
  transactionTitle: string;
  onSuccess?: () => void;
}

export function RestoreConfirmDialog({
  open,
  onOpenChange,
  transactionPublicId,
  transactionTitle,
  onSuccess,
}: RestoreConfirmDialogProps) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreTransaction(transactionPublicId);
      toast.success("Transaction restored successfully!");
      onOpenChange(false);
      onSuccess?.();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore transaction");
      console.error("Restore error:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-2xl border shadow-xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Restore Transaction</DialogTitle>
              <p className="text-xs text-slate-500">Reinstate transaction to active records</p>
            </div>
          </div>
          <DialogDescription className="text-sm text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">
            Are you sure you want to restore <strong className="font-semibold text-slate-900 dark:text-slate-100">{transactionTitle}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Restoring will reinstate this transaction into active balances, settlement calculations, reports, and timeline.
          </span>
        </div>

        <DialogFooter className="flex flex-row items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
            className="rounded-xl px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring}
            className="rounded-xl px-5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isRestoring ? "Restoring..." : "Restore"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
