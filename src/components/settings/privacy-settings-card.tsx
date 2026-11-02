"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Lock, Save } from "lucide-react";
import { PrivacyPreferences, updatePrivacyPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface PrivacySettingsCardProps {
  initialData: PrivacyPreferences;
  onRefresh?: () => void;
}

export function PrivacySettingsCard({ initialData, onRefresh }: PrivacySettingsCardProps) {
  const [formData, setFormData] = useState<PrivacyPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updatePrivacyPreferences(formData);
      toast.success("Privacy preferences updated!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update privacy settings");
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
          <Lock className="h-4 w-4 text-primary transition-transform duration-200 group-hover/card:scale-110 group-hover/card:rotate-6" />
          <span>Privacy & Data Visibility</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Control who can view your profile, contact details, shared group history, and financial metrics
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Profile Baseline Visibility</Label>
            <select
              value={formData.profileVisibility}
              onChange={(e) => setFormData({ ...formData, profileVisibility: e.target.value as any })}
              className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-bold transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 max-w-md"
            >
              <option value="group_only">Group Members Only (Recommended)</option>
              <option value="public">Public (Searchable by Email / Username)</option>
              <option value="private">Strict Private (Hidden from Direct Search)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-3.5">
            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Display Email to Group Members</p>
                <p className="text-[11px] text-slate-500">Allow members of shared groups to view your primary contact email</p>
              </div>
              <Switch
                checked={formData.showEmail}
                onCheckedChange={(val) => setFormData({ ...formData, showEmail: val })}
              />
            </div>

            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Display Mobile Number</p>
                <p className="text-[11px] text-slate-500">Show verified mobile contact to group peers for direct UPI payments</p>
              </div>
              <Switch
                checked={formData.showPhone}
                onCheckedChange={(val) => setFormData({ ...formData, showPhone: val })}
              />
            </div>

            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Show Bio & Occupational Details</p>
                <p className="text-[11px] text-slate-500">Display professional company and biography on group member cards</p>
              </div>
              <Switch
                checked={formData.showBio}
                onCheckedChange={(val) => setFormData({ ...formData, showBio: val })}
              />
            </div>

            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Show Shared Group Memberships</p>
                <p className="text-[11px] text-slate-500">Display mutual group counts on user profile previews</p>
              </div>
              <Switch
                checked={formData.showGroups}
                onCheckedChange={(val) => setFormData({ ...formData, showGroups: val })}
              />
            </div>

            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">Display Financial Metrics</p>
                <p className="text-[11px] text-slate-500">Allow group members to see collective contribution ratios</p>
              </div>
              <Switch
                checked={formData.showFinancials}
                onCheckedChange={(val) => setFormData({ ...formData, showFinancials: val })}
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
              <span>{isPending ? "Saving..." : "Save Privacy Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
