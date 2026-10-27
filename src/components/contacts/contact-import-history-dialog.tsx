"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  RotateCcw,
  Download,
  Loader2,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  getContactImportHistoryAction,
  rollbackContactImportAction,
} from "@/actions/contact-import";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ContactImportHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactImportHistoryDialog({
  open,
  onOpenChange,
}: ContactImportHistoryDialogProps) {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const data = await getContactImportHistoryAction();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load import history:", err);
      toast.error("Failed to load contact import history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const handleRollback = async (importItem: any) => {
    if (
      !confirm(
        `Are you sure you want to rollback import '${importItem.fileName}'? This will revert ${importItem.importedRecords} imported contact(s).`
      )
    ) {
      return;
    }

    setRollingBackId(importItem.publicId);
    try {
      const res = await rollbackContactImportAction(importItem.publicId);
      toast.success(`Rolled back ${res.rolledBackCount} contact(s) successfully!`);
      await fetchHistory();
      router.refresh();
    } catch (err) {
      console.error("Rollback error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to rollback import");
    } finally {
      setRollingBackId(null);
    }
  };

  const handleDownloadErrors = (item: any) => {
    if (!item.errorReport || item.errorReport.length === 0) return;
    const csvContent =
      "Row Number,Contact Name,Error Reason\r\n" +
      item.errorReport
        .map((e: any) => `"${e.row}","${(e.name || "").replace(/"/g, '""')}","${e.error.replace(/"/g, '""')}"`)
        .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `error-report-${item.publicId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-card border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <History className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Contact Import History
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Audit log and rollback management of all contact import sessions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Loading import history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 w-12 h-12 mx-auto flex items-center justify-center text-slate-400">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                No past imports found
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Any contacts imported via Excel, CSV, Google Contacts, or vCard will be tracked here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const isRolledBack = item.status === "rolled_back";

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                          {item.fileName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                            isRolledBack
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 shrink-0">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.createdAt)}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{(item.durationMs / 1000).toFixed(1)}s</span>
                        </span>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="p-1.5 rounded-xl bg-card border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="font-black text-slate-800 dark:text-slate-200">
                          {item.totalRecords}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-card border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Imported</span>
                        <span className="font-black text-emerald-600">{item.importedRecords}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-card border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Updated</span>
                        <span className="font-black text-blue-600">{item.updatedRecords}</span>
                      </div>
                      <div className="p-1.5 rounded-xl bg-card border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Skipped/Failed</span>
                        <span className="font-black text-slate-600">
                          {item.skippedRecords + item.failedRecords}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-[10px] text-slate-400">
                        ID: {item.publicId}
                      </span>

                      <div className="flex items-center gap-2">
                        {item.errorReport && item.errorReport.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadErrors(item)}
                            className="rounded-xl text-[11px] h-7 gap-1 font-semibold text-rose-600 hover:bg-rose-50"
                          >
                            <Download className="h-3 w-3" />
                            <span>Error Report</span>
                          </Button>
                        )}

                        {!isRolledBack && item.importedRecords > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={rollingBackId === item.publicId}
                            onClick={() => handleRollback(item)}
                            className="rounded-xl text-[11px] h-7 gap-1 font-semibold text-amber-600 hover:bg-amber-50 hover:border-amber-400"
                          >
                            {rollingBackId === item.publicId ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                            <span>Rollback</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
