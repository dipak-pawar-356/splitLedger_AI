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
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <span>Privacy & Data Visibility</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Control who can view your profile, contact details, shared group history, and financial metrics
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="space-y-1.5" suppressHydrationWarning>
            <Label className="text-xs font-semibold">Profile Baseline Visibility</Label>
            <select
              value={formData.profileVisibility}
              onChange={(e) => setFormData({ ...formData, profileVisibility: e.target.value as any })}
              className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold max-w-md"
            >
              <option value="group_only">Group Members Only (Recommended)</option>
              <option value="public">Public (Searchable by Email / Username)</option>
              <option value="private">Strict Private (Hidden from Direct Search)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Display Email to Group Members</p>
                <p className="text-[11px] text-slate-500">Allow members of shared groups to view your primary contact email</p>
              </div>
              <Switch
                checked={formData.showEmail}
                onCheckedChange={(val) => setFormData({ ...formData, showEmail: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Display Mobile Number</p>
                <p className="text-[11px] text-slate-500">Show verified mobile contact to group peers for direct UPI payments</p>
              </div>
              <Switch
                checked={formData.showPhone}
                onCheckedChange={(val) => setFormData({ ...formData, showPhone: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Show Bio & Occupational Details</p>
                <p className="text-[11px] text-slate-500">Display professional company and biography on group member cards</p>
              </div>
              <Switch
                checked={formData.showBio}
                onCheckedChange={(val) => setFormData({ ...formData, showBio: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Show Shared Group Memberships</p>
                <p className="text-[11px] text-slate-500">Display mutual group counts on user profile previews</p>
              </div>
              <Switch
                checked={formData.showGroups}
                onCheckedChange={(val) => setFormData({ ...formData, showGroups: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Display Financial Metrics</p>
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
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Privacy Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
