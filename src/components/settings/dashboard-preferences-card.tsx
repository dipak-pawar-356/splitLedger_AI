"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LayoutDashboard, Save, Eye } from "lucide-react";
import { DashboardPreferences, updateDashboardPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface DashboardPreferencesCardProps {
  initialData: DashboardPreferences;
  onRefresh?: () => void;
}

export function DashboardPreferencesCard({ initialData, onRefresh }: DashboardPreferencesCardProps) {
  const [formData, setFormData] = useState<DashboardPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleWidget = (key: keyof DashboardPreferences["visibleCards"]) => {
    setFormData((prev) => ({
      ...prev,
      visibleCards: {
        ...prev.visibleCards,
        [key]: !prev.visibleCards[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDashboardPreferences(formData);
      toast.success("Dashboard widget preferences saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update dashboard preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <span>Dashboard Card & Widget Preferences</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Select which analytics, summaries, and financial widgets are displayed on your main dashboard
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Financial Summary</p>
                <p className="text-[11px] text-slate-500">12 financial metrics including receivable, payable, and net spend</p>
              </div>
              <Switch
                checked={formData.visibleCards.financialSummary}
                onCheckedChange={() => toggleWidget("financialSummary")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Quick Actions</p>
                <p className="text-[11px] text-slate-500">Shortcuts for adding expenses, settling balances, and inviting members</p>
              </div>
              <Switch
                checked={formData.visibleCards.quickActions}
                onCheckedChange={() => toggleWidget("quickActions")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Financial Analytics & AI Health</p>
                <p className="text-[11px] text-slate-500">Visual trend charts, category distributions, and health score gauge</p>
              </div>
              <Switch
                checked={formData.visibleCards.analyticsWidget}
                onCheckedChange={() => toggleWidget("analyticsWidget")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Budget Monitoring Widget</p>
                <p className="text-[11px] text-slate-500">Threshold alerts and remaining category spending allowances</p>
              </div>
              <Switch
                checked={formData.visibleCards.budgetWidget}
                onCheckedChange={() => toggleWidget("budgetWidget")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Settlement Status Widget</p>
                <p className="text-[11px] text-slate-500">Pending debt reconciliations and direct UPI settlement triggers</p>
              </div>
              <Switch
                checked={formData.visibleCards.settlementWidget}
                onCheckedChange={() => toggleWidget("settlementWidget")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Recent Activity Timeline</p>
                <p className="text-[11px] text-slate-500">Real-time chronological events from personal and group ledgers</p>
              </div>
              <Switch
                checked={formData.visibleCards.recentActivity}
                onCheckedChange={() => toggleWidget("recentActivity")}
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
              <span>{isPending ? "Saving..." : "Save Dashboard Layout"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
