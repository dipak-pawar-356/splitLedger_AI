"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Save } from "lucide-react";
import { GroupPreferences, updateGroupPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface GroupPreferencesCardProps {
  initialData: GroupPreferences;
  onRefresh?: () => void;
}

export function GroupPreferencesCard({ initialData, onRefresh }: GroupPreferencesCardProps) {
  const [formData, setFormData] = useState<GroupPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateGroupPreferences(formData);
      toast.success("Group default preferences saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update group preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>Group Defaults & Policies</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure baseline splitting algorithms, guest member rules, and reminder cadences for new groups
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Split Method</Label>
              <select
                value={formData.defaultSplitType}
                onChange={(e) => setFormData({ ...formData, defaultSplitType: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="equal">Equal Split (1/N)</option>
                <option value="percentage">Percentage Split (%)</option>
                <option value="exact">Exact Amount Split (₹)</option>
                <option value="shares">Shares Ratio Split</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Reminder Interval</Label>
              <select
                value={formData.defaultReminderDays}
                onChange={(e) => setFormData({ ...formData, defaultReminderDays: Number(e.target.value) })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value={3}>Every 3 Days</option>
                <option value={7}>Every 7 Days (Weekly)</option>
                <option value={15}>Every 15 Days (Bi-weekly)</option>
                <option value={30}>Every 30 Days (Monthly)</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Guest Member Policy</Label>
              <select
                value={formData.guestMemberPolicy}
                onChange={(e) => setFormData({ ...formData, guestMemberPolicy: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="allow">Allow Temporary Guest Members</option>
                <option value="require_approval">Require Admin Approval</option>
                <option value="disallow">Strict (Registered Users Only)</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Default Settlement Mode</Label>
              <select
                value={formData.defaultSettlementMethod}
                onChange={(e) => setFormData({ ...formData, defaultSettlementMethod: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="upi">UPI (GPay / PhonePe / Paytm - Standard)</option>
                <option value="bank_transfer">IMPS / NEFT Bank Transfer</option>
                <option value="cash">Direct Cash Handover</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Auto-Generate Shareable Invite Link</p>
              <p className="text-[11px] text-slate-500">Automatically produce encrypted invite token upon group creation</p>
            </div>
            <Switch
              checked={formData.autoInvite}
              onCheckedChange={(val) => setFormData({ ...formData, autoInvite: val })}
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Group Defaults"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
