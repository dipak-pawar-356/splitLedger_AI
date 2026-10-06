"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Save, ShieldCheck } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface QuietHoursCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function QuietHoursCard({ initialData, onRefresh }: QuietHoursCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        quietHours: formData.quietHours,
      });
      toast.success("Quiet hours schedule saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update quiet hours");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Moon className="h-4 w-4 text-indigo-500" />
          <span>Quiet Hours & Rest Schedule</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Mute sound, vibration, and non-critical push notifications during designated sleep or focus periods
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Enable Quiet Hours
              </p>
              <p className="text-[11px] text-slate-500">
                Automatically silence daily pings between scheduled times
              </p>
            </div>
            <Switch
              checked={formData.quietHours.enabled}
              onCheckedChange={(val) =>
                setFormData({
                  ...formData,
                  quietHours: { ...formData.quietHours, enabled: val },
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Start Quiet Hours</Label>
              <Input
                type="time"
                value={formData.quietHours.start}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quietHours: { ...formData.quietHours, start: e.target.value },
                  })
                }
                className="rounded-xl text-xs bg-background"
                disabled={!formData.quietHours.enabled}
                suppressHydrationWarning
              />
            </div>

            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">End Quiet Hours</Label>
              <Input
                type="time"
                value={formData.quietHours.end}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quietHours: { ...formData.quietHours, end: e.target.value },
                  })
                }
                className="rounded-xl text-xs bg-background"
                disabled={!formData.quietHours.enabled}
                suppressHydrationWarning
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Weekdays Only</p>
                <p className="text-[11px] text-slate-500">Apply schedule from Monday through Friday only</p>
              </div>
              <Switch
                checked={formData.quietHours.weekdaysOnly}
                disabled={!formData.quietHours.enabled}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    quietHours: { ...formData.quietHours, weekdaysOnly: val },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Allow Emergency & Critical Security Alerts</span>
                </p>
                <p className="text-[11px] text-slate-500">Security breach or login alerts will break through quiet hours</p>
              </div>
              <Switch
                checked={formData.quietHours.emergencyOnly}
                disabled={!formData.quietHours.enabled}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    quietHours: { ...formData.quietHours, emergencyOnly: val },
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
              <span>{isPending ? "Saving..." : "Save Quiet Hours"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
