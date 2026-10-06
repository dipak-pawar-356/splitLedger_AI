"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sliders, Check, LayoutDashboard, Clock, Save } from "lucide-react";
import { GeneralPreferences, updateGeneralSettings } from "@/actions/settings";
import { toast } from "sonner";

interface GeneralSettingsCardProps {
  initialData: GeneralPreferences;
  onRefresh?: () => void;
}

export function GeneralSettingsCard({ initialData, onRefresh }: GeneralSettingsCardProps) {
  const [formData, setFormData] = useState<GeneralPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateGeneralSettings(formData);
      toast.success("General settings saved successfully!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update general settings");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span>General Preferences</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure application naming, default landing route, refresh cadence, and session behaviors
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Display Name</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g. Dipak Pawar"
                className="rounded-xl text-xs bg-background"
                suppressHydrationWarning
              />
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Landing Page</Label>
              <select
                value={formData.defaultLandingPage}
                onChange={(e) => setFormData({ ...formData, defaultLandingPage: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="/dashboard">Main Dashboard (/dashboard)</option>
                <option value="/dashboard/groups">My Groups (/dashboard/groups)</option>
                <option value="/dashboard/transactions">Transactions (/dashboard/transactions)</option>
                <option value="/dashboard/activity">Activity Timeline (/dashboard/activity)</option>
                <option value="/dashboard/analytics">Financial Analytics (/dashboard/analytics)</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Auto-Refresh Cadence</Label>
              <select
                value={formData.autoRefreshInterval}
                onChange={(e) => setFormData({ ...formData, autoRefreshInterval: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value={0}>Off (Manual Refresh Only)</option>
                <option value={15}>Every 15 Seconds (Live)</option>
                <option value={30}>Every 30 Seconds (Default)</option>
                <option value={60}>Every 60 Seconds</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Session Timeout</Label>
              <select
                value={formData.sessionTimeoutMinutes}
                onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour (Default)</option>
                <option value={120}>2 Hours</option>
                <option value={480}>8 Hours</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Auto-Save Drafts</p>
                <p className="text-[11px] text-slate-500">Automatically save in-progress expenses and split ledgers</p>
              </div>
              <Switch
                checked={formData.autoSaveDrafts}
                onCheckedChange={(val) => setFormData({ ...formData, autoSaveDrafts: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Compact Sidebar</p>
                <p className="text-[11px] text-slate-500">Use space-saving compact navigation bar by default</p>
              </div>
              <Switch
                checked={formData.compactSidebar}
                onCheckedChange={(val) => setFormData({ ...formData, compactSidebar: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Smooth Animations</p>
                <p className="text-[11px] text-slate-500">Enable fluid micro-interactions and transitions</p>
              </div>
              <Switch
                checked={formData.enableAnimations}
                onCheckedChange={(val) => setFormData({ ...formData, enableAnimations: val })}
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
              <span>{isPending ? "Saving..." : "Save Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
