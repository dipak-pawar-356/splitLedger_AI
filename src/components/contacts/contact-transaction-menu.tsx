"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Eye,
  Edit2,
  SlidersHorizontal,
  Copy,
  Download,
  Trash2,
  Loader2,
  LayoutDashboard,
  MinusCircle,
} from "lucide-react";
import Link from "next/link";
import { EditTransactionDialog } from "@/components/dialogs/edit-transaction-dialog";
import { TransactionDeleteDialog } from "@/components/dialogs/transaction-delete-dialog";
import {
  createTransaction,
  syncTransactionToDashboard,
  removeTransactionFromDashboard,
} from "@/actions/transactions";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface ContactTransactionItem {
  id: number;
  publicId: string;
  title?: string | null;
  description: string;
  type: "paid" | "received" | "lent" | "borrowed" | "repaid" | "adjustment";
  amount: number; // in paise
  currency: string;
  date: Date | string;
  contactId?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  status?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  paymentMethod?: string | null;
  createdByName?: string | null;
  tags?: any;
  isSyncedToDashboard?: boolean;
  syncedAt?: Date | string | null;
}

interface ContactTransactionMenuProps {
  transaction: ContactTransactionItem;
  contactPublicId: string;
  contactName: string;
  onOpenAdjust?: () => void;
  onSuccess?: () => void;
}

export function ContactTransactionMenu({
  transaction,
  contactPublicId,
  contactName,
  onOpenAdjust,
  onSuccess,
}: ContactTransactionMenuProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync to Dashboard
  const handleSyncToDashboard = async () => {
    setIsSyncing(true);
    try {
      await syncTransactionToDashboard(transaction.publicId);
      toast.success("Transaction added to Dashboard! Totals and reports recalculated.");
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add transaction to dashboard");
    } finally {
      setIsSyncing(false);
    }
  };

  // Remove from Dashboard
  const handleRemoveFromDashboard = async () => {
    setIsSyncing(true);
    try {
      await removeTransactionFromDashboard(transaction.publicId);
      setIsConfirmRemoveOpen(false);
      toast.success("Transaction removed from Dashboard", {
        action: {
          label: "Undo",
          onClick: () => handleSyncToDashboard(),
        },
      });
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove transaction from dashboard");
    } finally {
      setIsSyncing(false);
    }
  };

  // Duplicate handler
  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const normalAmountRupees = transaction.amount / 100;
      await createTransaction({
        title: `Copy: ${transaction.title || transaction.description}`,
        description: transaction.description,
        type: transaction.type,
        amount: normalAmountRupees,
        currency: transaction.currency,
        contactId: transaction.contactId || undefined,
        categoryId: transaction.categoryId || undefined,
        date: new Date(),
        notes: transaction.notes || undefined,
        receiptUrl: transaction.receiptUrl || undefined,
        paymentMethod: transaction.paymentMethod || undefined,
        status: "completed",
        isSyncedToDashboard: false,
      });
      toast.success("Transaction duplicated successfully!");
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      console.error("Duplicate transaction error:", err);
      toast.error(err?.message || "Failed to duplicate transaction");
    } finally {
      setIsDuplicating(false);
    }
  };

  // Export / copy transaction summary
  const handleExport = () => {
    try {
      const summary = `
========================================
SPLITLEdger AI - TRANSACTION RECEIPT
========================================
Reference ID: ${transaction.publicId}
Contact:      ${contactName}
Date:         ${formatDate(transaction.date)}
Type:         ${transaction.type.toUpperCase()}
Amount:       ${formatCurrency(transaction.amount / 100, transaction.currency)}
Status:       ${transaction.status || "Completed"}
Dashboard:    ${transaction.isSyncedToDashboard ? "Synced to Dashboard" : "Not Added to Dashboard"}
Description:  ${transaction.description}
${transaction.categoryName ? `Category:     ${transaction.categoryName}\n` : ""}${
        transaction.notes ? `Notes:        ${transaction.notes}\n` : ""
      }========================================
Generated from SplitLedger AI Ledger
========================================`.trim();

      navigator.clipboard.writeText(summary);
      toast.success("Transaction receipt copied to clipboard!");
    } catch {
      toast.error("Failed to copy receipt");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Transaction options"
          >
            {isDuplicating || isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-52 rounded-2xl p-1.5 shadow-xl bg-card border border-slate-200/80 dark:border-slate-800"
        >
          {/* View Details */}
          <DropdownMenuItem asChild>
            <Link
              href={`/dashboard/transactions/${transaction.publicId}`}
              className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5"
            >
              <Eye className="h-4 w-4 text-primary" />
              <span>View Details</span>
            </Link>
          </DropdownMenuItem>

          {/* Edit Transaction */}
          <DropdownMenuItem
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5"
          >
            <Edit2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <span>Edit Entry</span>
          </DropdownMenuItem>

          {/* Adjust Balance */}
          {onOpenAdjust && (
            <DropdownMenuItem
              onClick={onOpenAdjust}
              className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5"
            >
              <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
              <span>Adjust Balance</span>
            </DropdownMenuItem>
          )}

          {/* Financial Synchronization Section */}
          <DropdownMenuSeparator />
          {!transaction.isSyncedToDashboard ? (
            <DropdownMenuItem
              onClick={handleSyncToDashboard}
              disabled={isSyncing}
              className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5 text-emerald-600 dark:text-emerald-400 focus:text-emerald-700"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Add to Dashboard</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setIsConfirmRemoveOpen(true)}
              disabled={isSyncing}
              className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5 text-amber-600 dark:text-amber-400 focus:text-amber-700"
            >
              <MinusCircle className="h-4 w-4" />
              <span>Remove from Dashboard</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />

          {/* Duplicate Transaction */}
          <DropdownMenuItem
            onClick={handleDuplicate}
            disabled={isDuplicating}
            className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5"
          >
            <Copy className="h-4 w-4 text-amber-600" />
            <span>Duplicate Entry</span>
          </DropdownMenuItem>

          {/* Export Receipt */}
          <DropdownMenuItem
            onClick={handleExport}
            className="flex items-center gap-2 cursor-pointer rounded-xl text-xs font-semibold py-1.5"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>Export Receipt</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Delete Transaction */}
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer focus:bg-rose-50 dark:focus:bg-rose-950/40 rounded-xl text-xs font-semibold py-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Entry</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Confirmation Dialog before removing synchronization */}
      <Dialog open={isConfirmRemoveOpen} onOpenChange={setIsConfirmRemoveOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl w-12 h-12 flex items-center justify-center">
              <MinusCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Remove this transaction from Dashboard?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              This will immediately update dashboard balances, reports and AI calculations.
              The transaction will remain inside Contact History.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmRemoveOpen(false)}
              className="rounded-xl text-xs font-semibold h-10"
              disabled={isSyncing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRemoveFromDashboard}
              disabled={isSyncing}
              className="rounded-xl text-xs font-bold h-10 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSyncing ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      {isEditDialogOpen && (
        <EditTransactionDialog
          transactionPublicId={transaction.publicId}
          initialData={{
            title: transaction.title,
            description: transaction.description,
            type: transaction.type,
            amount: transaction.amount,
            currency: transaction.currency,
            date: transaction.date,
            contactId: transaction.contactId,
            categoryId: transaction.categoryId,
            paymentMethod: transaction.paymentMethod,
            status: (transaction.status as any) || "completed",
            receiptUrl: transaction.receiptUrl,
            notes: transaction.notes,
          }}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            onSuccess?.();
            router.refresh();
          }}
        />
      )}

      {/* Delete Transaction Dialog */}
      <TransactionDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        transactionPublicId={transaction.publicId}
        transactionTitle={transaction.title || transaction.description}
        onSuccess={() => {
          onSuccess?.();
          router.refresh();
        }}
      />
    </>
  );
}
