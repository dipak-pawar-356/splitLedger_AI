"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FileText, Save } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface ReportNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function ReportNotificationsCard({ initialData, onRefresh }: ReportNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleTrigger = (key: keyof NotificationPreferences["reportsTriggers"]) => {
    setFormData((prev) => ({
      ...prev,
      reportsTriggers: {
        ...prev.reportsTriggers,
        [key]: !prev.reportsTriggers[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        reportsTriggers: formData.reportsTriggers,
      });
      toast.success("Report notification triggers saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update report triggers");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>Financial Reports & Export Alerts</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Get notified when financial statements, automated PDF receipts, and CSV exports are generated
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">PDF Statement Ready</p>
                <p className="text-[11px] text-slate-500">When requested PDF report generation completes</p>
              </div>
              <Switch
                checked={formData.reportsTriggers.pdfReady}
                onCheckedChange={() => toggleTrigger("pdfReady")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">CSV & JSON Exports</p>
                <p className="text-[11px] text-slate-500">When data archives are ready for download</p>
              </div>
              <Switch
                checked={formData.reportsTriggers.csvReady}
                onCheckedChange={() => toggleTrigger("csvReady")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Monthly Auto-Statements</p>
                <p className="text-[11px] text-slate-500">Scheduled 1st of month summary statements</p>
              </div>
              <Switch
                checked={formData.reportsTriggers.monthlyReport}
                onCheckedChange={() => toggleTrigger("monthlyReport")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Annual Tax & Spend Statement</p>
                <p className="text-[11px] text-slate-500">Year-end aggregated financial report in INR (₹)</p>
              </div>
              <Switch
                checked={formData.reportsTriggers.annualReport}
                onCheckedChange={() => toggleTrigger("annualReport")}
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Report Triggers"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
