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
    <Card className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-300 bg-card/90 backdrop-blur-md group/card">
      {/* Top Luminous Shimmer Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary transition-transform duration-200 group-hover/card:scale-110 group-hover/card:rotate-6" />
          <span>General Preferences</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure application naming, default landing route, and interface behaviors
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                <User className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                <span>Display Name</span>
              </Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g. Dipak Pawar"
                className="mt-1.5 rounded-xl text-base sm:text-xs bg-background transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                required
                suppressHydrationWarning
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Visible to fellow members in shared expense groups.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                <Compass className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                <span>Default Landing Page</span>
              </Label>
              <select
                value={formData.defaultLandingPage}
                onChange={(e) => setFormData({ ...formData, defaultLandingPage: e.target.value })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-medium transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                <option value="/dashboard">Main Dashboard (/dashboard)</option>
                <option value="/dashboard/groups">My Groups (/dashboard/groups)</option>
                <option value="/dashboard/transactions">Transactions (/dashboard/transactions)</option>
                <option value="/dashboard/activity">Activity Timeline (/dashboard/activity)</option>
                <option value="/dashboard/analytics">Financial Analytics (/dashboard/analytics)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Target page when launching the application.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-3.5">
            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                  <Zap className="h-3.5 w-3.5 text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
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

            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                  <LayoutTemplate className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
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

            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
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
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-primary px-5 h-10 sm:h-9 min-h-[38px] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group"
              disabled={isPending}
            >
              <Save className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${isPending ? "animate-spin" : ""}`} />
              <span>{isPending ? "Saving..." : "Save Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
