"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  RotateCcw, 
  HardDrive, 
  FileJson, 
  FileSpreadsheet, 
  AlertTriangle 
} from "lucide-react";
import { DataBackupPreferences, resetSettingsToDefault } from "@/actions/settings";
import { exportPersonalData } from "@/actions/account";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DataAndBackupCardProps {
  initialData: DataBackupPreferences;
  onRefresh?: () => void;
}

export function DataAndBackupCard({ initialData, onRefresh }: DataAndBackupCardProps) {
  const [formData, setFormData] = useState<DataBackupPreferences>(initialData);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
        toast.success(`Personal data archive downloaded as ${format.toUpperCase()}!`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsPending(true);
    try {
      await resetSettingsToDefault();
      toast.success("All preferences reset to factory defaults!");
      setIsResetOpen(false);
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to reset preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <span>Data Export & Backup Schedules</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Download local archive snapshots of your financial ledgers and configure automated backup intervals
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Instant Personal Data Export
              </h4>
              <p className="text-[11px] text-slate-500">
                Export complete transactions, settlements, and audit logs formatted in INR (₹)
              </p>
            </div>

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

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Automatic Backup Cadence</Label>
              <select
                value={formData.autoBackupSchedule}
                onChange={(e) => setFormData({ ...formData, autoBackupSchedule: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="weekly">Weekly Automated Backup (Recommended)</option>
                <option value="daily">Daily Snapshot</option>
                <option value="monthly">Monthly Snapshot</option>
                <option value="off">Off (Manual Only)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Data Retention Period</Label>
              <select
                value={formData.retentionPeriodDays}
                onChange={(e) => setFormData({ ...formData, retentionPeriodDays: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value={365}>1 Year (365 Days)</option>
                <option value={730}>2 Years (730 Days)</option>
                <option value={1825}>5 Years (Permanent Ledger)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Preferences Card */}
      <Card className="rounded-3xl border border-rose-200/80 dark:border-rose-900/60 shadow-sm overflow-hidden bg-rose-50/20 dark:bg-rose-950/10">
        <CardHeader className="border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-900/20">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Reset Preferences</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Revert all appearance, notification, and regional customizations back to original factory defaults
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Restore Factory Settings
            </h4>
            <p className="text-[11px] text-slate-500">
              This does NOT delete your financial transactions, groups, or settlement ledger history.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs gap-1.5 text-rose-600 border-rose-300 hover:bg-rose-50 shrink-0"
            onClick={() => setIsResetOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset to Factory Defaults</span>
          </Button>
        </CardContent>
      </Card>

      {/* Reset Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600">Reset All Settings?</DialogTitle>
            <DialogDescription className="text-xs">
              This will restore all visual themes, notification thresholds, and dashboard card preferences back to default. Your financial transactions and group records will remain untouched.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setIsResetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white"
              onClick={handleResetDefaults}
              disabled={isPending}
            >
              <span>{isPending ? "Resetting..." : "Confirm Factory Reset"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
