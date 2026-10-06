"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar, Save, Clock, Sun, Moon } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface NotificationScheduleCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function NotificationScheduleCard({ initialData, onRefresh }: NotificationScheduleCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        schedule: formData.schedule,
      });
      toast.success("Notification delivery schedules saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update notification schedule");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Automated Notification Cadence & Scheduling</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Set regular times for automated balance digests, weekly group reports, and debt reminders
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="space-y-3">
            {/* Morning Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Morning Summary</p>
                  <p className="text-[11px] text-slate-500">Overnight group expense updates and pending balances</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={formData.schedule.morningSummary.time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule: {
                        ...formData.schedule,
                        morningSummary: {
                          ...formData.schedule.morningSummary,
                          time: e.target.value,
                        },
                      },
                    })
                  }
                  className="h-8 w-24 text-xs rounded-xl bg-background"
                  disabled={!formData.schedule.morningSummary.enabled}
                  suppressHydrationWarning
                />
                <Switch
                  checked={formData.schedule.morningSummary.enabled}
                  onCheckedChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: {
                        ...formData.schedule,
                        morningSummary: {
                          ...formData.schedule.morningSummary,
                          enabled: val,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Evening Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Evening Summary</p>
                  <p className="text-[11px] text-slate-500">Daytime expense wrap-up and debt simplification recap</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={formData.schedule.eveningSummary.time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule: {
                        ...formData.schedule,
                        eveningSummary: {
                          ...formData.schedule.eveningSummary,
                          time: e.target.value,
                        },
                      },
                    })
                  }
                  className="h-8 w-24 text-xs rounded-xl bg-background"
                  disabled={!formData.schedule.eveningSummary.enabled}
                  suppressHydrationWarning
                />
                <Switch
                  checked={formData.schedule.eveningSummary.enabled}
                  onCheckedChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: {
                        ...formData.schedule,
                        eveningSummary: {
                          ...formData.schedule.eveningSummary,
                          enabled: val,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* Weekly Report on Sunday */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Weekly Digest (Sundays)</p>
                  <p className="text-[11px] text-slate-500">Comprehensive weekly spending and receivable report</p>
                </div>
              </div>

              <Switch
                checked={formData.schedule.weeklyReport.enabled}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    schedule: {
                      ...formData.schedule,
                      weeklyReport: {
                        ...formData.schedule.weeklyReport,
                        enabled: val,
                      },
                    },
                  })
                }
              />
            </div>

            {/* Settlement Friday Reminder */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="font-bold text-xs text-slate-900 dark:text-slate-100">Settlement Friday Reminder</p>
                  <p className="text-[11px] text-slate-500">Weekend debt clearing nudges before Friday evening</p>
                </div>
              </div>

              <Switch
                checked={formData.schedule.settlementReminder.enabled}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    schedule: {
                      ...formData.schedule,
                      settlementReminder: {
                        ...formData.schedule.settlementReminder,
                        enabled: val,
                      },
                    },
                  })
                }
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
              <span>{isPending ? "Saving..." : "Save Schedule Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
