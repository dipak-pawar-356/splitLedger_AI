"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Volume2, Moon, Save } from "lucide-react";
import { NotificationPreferences, updateNotificationPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface NotificationPreferencesCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function NotificationPreferencesCard({ initialData, onRefresh }: NotificationPreferencesCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const toggleChannel = (channel: keyof NotificationPreferences["channels"]) => {
    setFormData((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const toggleCategory = (cat: keyof NotificationPreferences["categories"]) => {
    setFormData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [cat]: !prev.categories[cat],
      },
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateNotificationPreferences(formData);
      toast.success("Notification preferences saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update notification preferences");
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
          <Bell className="h-4 w-4 text-primary transition-transform duration-200 group-hover/card:scale-110 group-hover/card:rotate-6" />
          <span>Notification & Alert Channels</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure real-time notification delivery channels, category alert thresholds, and quiet hours
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          {/* SECTION 1: Delivery Channels */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Channels</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                  <Bell className="h-4 w-4 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                  <span>In-App Notifications</span>
                </span>
                <Switch
                  checked={formData.channels.inApp}
                  onCheckedChange={() => toggleChannel("inApp")}
                />
              </div>

              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 transition-colors">
                  <Mail className="h-4 w-4 text-indigo-500 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6" />
                  <span>Email Notifications</span>
                </span>
                <Switch
                  checked={formData.channels.email}
                  onCheckedChange={() => toggleChannel("email")}
                />
              </div>

              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                  <MessageSquare className="h-4 w-4 text-emerald-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                  <span>WhatsApp Alerts</span>
                </span>
                <Switch
                  checked={formData.channels.whatsapp}
                  onCheckedChange={() => toggleChannel("whatsapp")}
                />
              </div>

              <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="text-xs font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                  <Volume2 className="h-4 w-4 text-amber-500 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
                  <span>Sound Effects</span>
                </span>
                <Switch
                  checked={formData.soundEnabled}
                  onCheckedChange={(val) => setFormData({ ...formData, soundEnabled: val })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Category Switches */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Category Alert Triggers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">New Expenses Added</span>
                <Switch
                  checked={formData.categories.expenses}
                  onCheckedChange={() => toggleCategory("expenses")}
                />
              </div>
              <div className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">Settlements & Repayments</span>
                <Switch
                  checked={formData.categories.settlements}
                  onCheckedChange={() => toggleCategory("settlements")}
                />
              </div>
              <div className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">Group Invitations</span>
                <Switch
                  checked={formData.categories.invitations}
                  onCheckedChange={() => toggleCategory("invitations")}
                />
              </div>
              <div className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">Debt Payment Reminders</span>
                <Switch
                  checked={formData.categories.reminders}
                  onCheckedChange={() => toggleCategory("reminders")}
                />
              </div>
              <div className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">Budget Threshold Exceeded</span>
                <Switch
                  checked={formData.categories.budgets}
                  onCheckedChange={() => toggleCategory("budgets")}
                />
              </div>
              <div className="group flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">Critical Security Alerts</span>
                <Switch
                  checked={formData.categories.security}
                  onCheckedChange={() => toggleCategory("security")}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Quiet Hours */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-primary transition-colors">
                  <Moon className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
                  <span>Quiet Hours (Mute Non-Critical Alerts)</span>
                </p>
                <p className="text-[11px] text-slate-500">Silence push and sound notifications during designated rest hours</p>
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

            {formData.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-3 pt-2 max-w-sm">
                <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/30 transition-all space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.quietHours.start}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quietHours: { ...formData.quietHours, start: e.target.value },
                      })
                    }
                    className="h-8 rounded-xl text-xs bg-background transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/30 transition-all space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">End Time</Label>
                  <Input
                    type="time"
                    value={formData.quietHours.end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quietHours: { ...formData.quietHours, end: e.target.value },
                      })
                    }
                    className="h-8 rounded-xl text-xs bg-background transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-primary px-5 h-10 sm:h-9 min-h-[38px] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group"
              disabled={isPending}
            >
              <Save className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${isPending ? "animate-spin" : ""}`} />
              <span>{isPending ? "Saving..." : "Save Notification Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
