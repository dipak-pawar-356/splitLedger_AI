"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Save, Sparkles, Shield } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface GeneralNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function GeneralNotificationsCard({ initialData, onRefresh }: GeneralNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        masterEnabled: formData.masterEnabled,
        realTime: formData.realTime,
        dailySummary: formData.dailySummary,
        weeklySummary: formData.weeklySummary,
        monthlySummary: formData.monthlySummary,
        importantOnly: formData.importantOnly,
        productUpdates: formData.productUpdates,
      });
      toast.success("General notification preferences updated!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <span>General Notification Preferences</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Control master notification toggles, real-time event alerts, and periodic summary frequency
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Master Notifications Switch
              </p>
              <p className="text-[11px] text-slate-500">
                Globally enable or pause all non-critical notifications
              </p>
            </div>
            <Switch
              checked={formData.masterEnabled}
              onCheckedChange={(val) => setFormData({ ...formData, masterEnabled: val })}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Real-Time Instant Alerts</p>
                <p className="text-[11px] text-slate-500">Push notifications immediately via SSE when expenses and settlements are logged</p>
              </div>
              <Switch
                checked={formData.realTime}
                onCheckedChange={(val) => setFormData({ ...formData, realTime: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Daily Morning & Evening Digests</p>
                <p className="text-[11px] text-slate-500">Consolidated breakdown of pending debts and group updates</p>
              </div>
              <Switch
                checked={formData.dailySummary}
                onCheckedChange={(val) => setFormData({ ...formData, dailySummary: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Weekly Financial Overview</p>
                <p className="text-[11px] text-slate-500">Sunday report of weekly expenditure and simplified net balance in INR (₹)</p>
              </div>
              <Switch
                checked={formData.weeklySummary}
                onCheckedChange={(val) => setFormData({ ...formData, weeklySummary: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Monthly Statement Summary</p>
                <p className="text-[11px] text-slate-500">1st of the month financial ledger and spending analytics statement</p>
              </div>
              <Switch
                checked={formData.monthlySummary}
                onCheckedChange={(val) => setFormData({ ...formData, monthlySummary: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Important & High Priority Only</p>
                <p className="text-[11px] text-slate-500">Filter out informational pings; receive only critical settlements and security alerts</p>
              </div>
              <Switch
                checked={formData.importantOnly}
                onCheckedChange={(val) => setFormData({ ...formData, importantOnly: val })}
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
              <span>{isPending ? "Saving..." : "Save General Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
