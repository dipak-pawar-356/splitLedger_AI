"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  FileJson, 
  FileSpreadsheet, 
  PauseCircle, 
  Trash2, 
  AlertTriangle 
} from "lucide-react";
import { exportPersonalData, deactivateAccount, deleteAccount } from "@/actions/account";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function DataExportAndDeletionCard() {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleExport = async (format: "json" | "csv") => {
    setIsExporting(true);
    try {
      const res = await exportPersonalData(format);
      if (res.success && res.content) {
        const blob = new Blob([res.content], { type: res.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success(`Personal data exported as ${format.toUpperCase()}!`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeactivate = async () => {
    setIsPending(true);
    try {
      await deactivateAccount("User temporary deactivation");
      toast.success("Your account has been temporarily deactivated.");
      setIsDeactivateOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to deactivate account");
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }

    setIsPending(true);
    try {
      await deleteAccount("permanent", "User requested account deletion");
      toast.success("Your account has been scheduled for permanent deletion.");
      setIsDeleteOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export Card (SECTION 11) */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <span>Export Personal Data</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Download a complete machine-readable copy of your personal transactions, groups, settlements, and audit history
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Export includes personal ledger entries, group expense shares, receipts metadata, and immutable audit logs.
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={() => handleExport("json")}
                disabled={isExporting}
              >
                <FileJson className="h-3.5 w-3.5 text-amber-500" />
                <span>Export JSON</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1.5"
                onClick={() => handleExport("csv")}
                disabled={isExporting}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Deactivation & Deletion (SECTIONS 12 & 13) */}
      <Card className="rounded-3xl border border-rose-200/80 dark:border-rose-900/60 shadow-sm overflow-hidden bg-rose-50/20 dark:bg-rose-950/10">
        <CardHeader className="border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/20">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Danger Zone</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Temporary deactivation and permanent account deletion controls
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Temporary Account Deactivation
              </h4>
              <p className="text-[11px] text-slate-500">
                Temporarily pause your account. You can reactivate anytime by logging back in.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50 shrink-0"
              onClick={() => setIsDeactivateOpen(true)}
            >
              <PauseCircle className="h-3.5 w-3.5" />
              <span>Deactivate Account</span>
            </Button>
          </div>

          <div className="pt-4 border-t border-rose-200/60 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">
                Permanently Delete Account
              </h4>
              <p className="text-[11px] text-slate-500">
                Permanently anonymize your profile. Shared group ledger history is preserved with &quot;Deleted User&quot;.
              </p>
            </div>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="rounded-xl text-xs gap-1.5 shrink-0 bg-rose-600 hover:bg-rose-700"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Account</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deactivate Dialog */}
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Temporarily Deactivate Account?</DialogTitle>
            <DialogDescription className="text-xs">
              Your profile will be hidden from groups, but all past financial records and settlements will remain intact.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setIsDeactivateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              <span>{isPending ? "Deactivating..." : "Confirm Deactivation"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">Delete SplitLedger Account</DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. Type <strong className="font-mono text-rose-600">DELETE</strong> below to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full h-9 px-3 rounded-xl border border-input text-xs font-mono bg-background"
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700"
              onClick={handleDelete}
              disabled={isPending || deleteConfirmText !== "DELETE"}
            >
              <span>{isPending ? "Deleting..." : "Permanently Delete"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
