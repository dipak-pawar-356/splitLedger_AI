"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Save, Calendar } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface ReminderNotificationsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function ReminderNotificationsCard({ initialData, onRefresh }: ReminderNotificationsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleTrigger = (key: keyof NotificationPreferences["remindersTriggers"]) => {
    if (key === "frequency" || key === "customTime" || key === "customDays") return;
    setFormData((prev) => ({
      ...prev,
      remindersTriggers: {
        ...prev.remindersTriggers,
        [key]: !prev.remindersTriggers[key],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        remindersTriggers: formData.remindersTriggers,
      });
      toast.success("Reminder triggers and schedules saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update reminder triggers");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>Scheduled Reminders & Budget Thresholds</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Automate payment nudges, missing receipt alerts, and monthly category budget tracking
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Pending Payment Reminders</p>
                <p className="text-[11px] text-slate-500">Automated nudges for unsettled group debts</p>
              </div>
              <Switch
                checked={formData.remindersTriggers.pendingPayment}
                onCheckedChange={() => toggleTrigger("pendingPayment")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Pending Receipt Upload</p>
                <p className="text-[11px] text-slate-500">Remind payer when receipt photo is missing</p>
              </div>
              <Switch
                checked={formData.remindersTriggers.pendingReceipt}
                onCheckedChange={() => toggleTrigger("pendingReceipt")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Monthly Budget Threshold</p>
                <p className="text-[11px] text-slate-500">Alerts when spending approaches 80% or 100% cap</p>
              </div>
              <Switch
                checked={formData.remindersTriggers.monthlyBudget}
                onCheckedChange={() => toggleTrigger("monthlyBudget")}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100">Inactive Group Nudges</p>
                <p className="text-[11px] text-slate-500">Pings to archive or settle groups idle for 30+ days</p>
              </div>
              <Switch
                checked={formData.remindersTriggers.inactiveGroups}
                onCheckedChange={() => toggleTrigger("inactiveGroups")}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Reminder Frequency</Label>
              <select
                value={formData.remindersTriggers.frequency}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    remindersTriggers: {
                      ...formData.remindersTriggers,
                      frequency: e.target.value as any,
                    },
                  })
                }
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="daily">Daily (Every Morning)</option>
                <option value="weekly">Weekly (Recommended)</option>
                <option value="monthly">Monthly (End of Month)</option>
              </select>
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Preferred Delivery Time</Label>
              <Input
                type="time"
                value={formData.remindersTriggers.customTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    remindersTriggers: {
                      ...formData.remindersTriggers,
                      customTime: e.target.value,
                    },
                  })
                }
                className="h-9 rounded-xl text-xs bg-background"
                suppressHydrationWarning
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
              <span>{isPending ? "Saving..." : "Save Reminder Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
