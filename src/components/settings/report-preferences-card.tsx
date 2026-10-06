"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FileText, Save } from "lucide-react";
import { ReportPreferences, updateReportPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface ReportPreferencesCardProps {
  initialData: ReportPreferences;
  onRefresh?: () => void;
}

export function ReportPreferencesCard({ initialData, onRefresh }: ReportPreferencesCardProps) {
  const [formData, setFormData] = useState<ReportPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateReportPreferences(formData);
      toast.success("Report and export preferences saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update report preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>Report & Export Preferences</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure default document formats, reporting cycles, visual chart inclusions, and paper dimensions
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Format</Label>
              <select
                value={formData.defaultFormat}
                onChange={(e) => setFormData({ ...formData, defaultFormat: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="csv">CSV Spreadsheet (.csv)</option>
                <option value="json">JSON Archive (.json)</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Reporting Period</Label>
              <select
                value={formData.defaultPeriod}
                onChange={(e) => setFormData({ ...formData, defaultPeriod: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="monthly">Monthly Cycle</option>
                <option value="quarterly">Quarterly Cycle</option>
                <option value="yearly">Annual Statement</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Paper Dimension</Label>
              <select
                value={formData.defaultPaperSize}
                onChange={(e) => setFormData({ ...formData, defaultPaperSize: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="A4">A4 (Standard ISO)</option>
                <option value="Letter">Letter (US)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Include Analytics Charts</p>
                <p className="text-[11px] text-slate-500">Embed category distribution pie charts and spend curves in PDF</p>
              </div>
              <Switch
                checked={formData.includeCharts}
                onCheckedChange={(val) => setFormData({ ...formData, includeCharts: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Include Debt Settlements</p>
                <p className="text-[11px] text-slate-500">Attach simplified net debt settlement breakdown table</p>
              </div>
              <Switch
                checked={formData.includeSettlements}
                onCheckedChange={(val) => setFormData({ ...formData, includeSettlements: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Include Activity Timeline</p>
                <p className="text-[11px] text-slate-500">Include chronological audit snapshot of group actions</p>
              </div>
              <Switch
                checked={formData.includeTimeline}
                onCheckedChange={(val) => setFormData({ ...formData, includeTimeline: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Show SplitLedger AI Branding</p>
                <p className="text-[11px] text-slate-500">Include header logo and verification watermark on generated statements</p>
              </div>
              <Switch
                checked={formData.showBrandingWatermark}
                onCheckedChange={(val) => setFormData({ ...formData, showBrandingWatermark: val })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Report Defaults"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
