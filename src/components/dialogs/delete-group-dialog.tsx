"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, DollarSign, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { deleteGroup } from "@/actions/groups";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: number | string;
  groupName: string;
  memberCount: number;
  totalExpenses: number;
  outstandingBalance: number;
}

export function DeleteGroupDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  memberCount,
  totalExpenses,
  outstandingBalance,
}: DeleteGroupDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteGroup(groupId);
      toast.success("Group deleted successfully");
      onOpenChange(false);
      router.push("/dashboard/groups");
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete group";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Group
          </DialogTitle>
          <DialogDescription className="pt-2">
            This action will archive the group and preserve financial history. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Group Name</span>
              <span className="font-semibold">{groupName}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Users className="h-4 w-4" />
                <span>Total Members</span>
              </div>
              <span className="font-semibold">{memberCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <DollarSign className="h-4 w-4" />
                <span>Total Expenses</span>
              </div>
              <span className="font-semibold text-green-600">
                {formatCurrency(totalExpenses / 100)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <DollarSign className="h-4 w-4" />
                <span>Outstanding Balance</span>
              </div>
              <span className={`font-semibold ${outstandingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(outstandingBalance) / 100)}
              </span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Warning:</strong> This action will archive the group and preserve financial history. All members will lose access to the group.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
