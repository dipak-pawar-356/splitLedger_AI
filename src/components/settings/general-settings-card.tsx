"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sliders, Save, User, Compass, Zap, LayoutTemplate, Sparkles } from "lucide-react";
import { GeneralPreferences, updateGeneralSettings } from "@/actions/settings";
import { useSidebar } from "@/components/layout/sidebar-context";
import { toast } from "sonner";

interface GeneralSettingsCardProps {
  initialData: GeneralPreferences;
  onRefresh?: () => void;
}

export function GeneralSettingsCard({ initialData, onRefresh }: GeneralSettingsCardProps) {
  const [formData, setFormData] = useState<GeneralPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);
  const { setCollapsed } = useSidebar();

  const handleCompactSidebarToggle = (val: boolean) => {
    setFormData((prev) => ({ ...prev, compactSidebar: val }));
    setCollapsed(val);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateGeneralSettings(formData);
      try {
        localStorage.setItem("splitledger_autosave_drafts", String(formData.autoSaveDrafts));
      } catch {}
      toast.success("General preferences saved successfully!");
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
          Configure application naming, default landing route, and interface behaviors
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                <span>Display Name</span>
              </Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g. Dipak Pawar"
                className="rounded-xl text-xs bg-background"
                required
                suppressHydrationWarning
              />
              <p className="text-[11px] text-slate-500">
                Visible to fellow members in shared expense groups.
              </p>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-primary" />
                <span>Default Landing Page</span>
              </Label>
              <select
                value={formData.defaultLandingPage}
                onChange={(e) => setFormData({ ...formData, defaultLandingPage: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-medium"
              >
                <option value="/dashboard">Main Dashboard (/dashboard)</option>
                <option value="/dashboard/groups">My Groups (/dashboard/groups)</option>
                <option value="/dashboard/transactions">Transactions (/dashboard/transactions)</option>
                <option value="/dashboard/activity">Activity Timeline (/dashboard/activity)</option>
                <option value="/dashboard/analytics">Financial Analytics (/dashboard/analytics)</option>
              </select>
              <p className="text-[11px] text-slate-500">
                Target page when launching the application.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>Auto-Save Drafts</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Automatically preserve in-progress expenses and split ledgers locally
                </p>
              </div>
              <Switch
                checked={formData.autoSaveDrafts}
                onCheckedChange={(val) => setFormData({ ...formData, autoSaveDrafts: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
                  <span>Compact Sidebar</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Use space-saving icon-only navigation bar for larger screen area
                </p>
              </div>
              <Switch
                checked={formData.compactSidebar}
                onCheckedChange={handleCompactSidebarToggle}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Smooth Animations</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Enable fluid micro-interactions, modal transitions, and chart animations
                </p>
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
              className="rounded-xl text-xs gap-1.5 bg-primary px-5"
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
