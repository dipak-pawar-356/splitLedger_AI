"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Clock, 
  Moon, 
  Save, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface QuickNotificationControlsCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
  onSelectTab?: (tabId: string) => void;
}

export function QuickNotificationControlsCard({
  initialData,
  onRefresh,
  onSelectTab,
}: QuickNotificationControlsCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (updater: (prev: NotificationPreferences) => NotificationPreferences) => {
    setFormData((prev) => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        masterEnabled: formData.masterEnabled,
        channels: formData.channels,
        categories: formData.categories,
        quietHours: formData.quietHours,
      });
      toast.success("Notification preferences updated successfully!");
      setHasChanges(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update notification preferences");
    } finally {
      setIsPending(false);
    }
  };

  const isEmailActive = formData.masterEnabled && formData.channels.email;
  const isRemindersActive = formData.masterEnabled && formData.categories.reminders;
  const isWhatsAppActive = formData.masterEnabled && formData.channels.whatsapp;

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-gradient-to-b from-card to-slate-50/50 dark:to-slate-900/20">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Quick Notification Controls
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider rounded-lg border-primary/30 text-primary">
                Instant Overview
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Manage your critical email delivery, payment reminder nudges, and WhatsApp alerts immediately.
            </CardDescription>
          </div>

          <Button
            type="button"
            onClick={() => handleSave()}
            disabled={isPending || !hasChanges}
            size="sm"
            className="rounded-xl text-xs gap-1.5 bg-primary shrink-0 transition-all shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isPending ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. Email Notifications */}
          <div className="p-4 rounded-2xl bg-background border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${isEmailActive ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Email Notifications</p>
                  <p className="text-[11px] text-slate-500">Settlements, expenses & invites</p>
                </div>
              </div>
              <Switch
                checked={formData.channels.email}
                onCheckedChange={(val) =>
                  handleToggle((prev) => ({
                    ...prev,
                    channels: { ...prev.channels, email: val },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className={`inline-flex items-center gap-1 font-semibold ${formData.channels.email ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {formData.channels.email ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {formData.channels.email ? "Enabled" : "Silenced"}
              </span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("email")}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  Configure Email →
                </button>
              )}
            </div>
          </div>

          {/* 2. Settlement Reminders & Payment Nudges */}
          <div className="p-4 rounded-2xl bg-background border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${isRemindersActive ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Payment Reminders</p>
                  <p className="text-[11px] text-slate-500">Debtor & creditor nudges</p>
                </div>
              </div>
              <Switch
                checked={formData.categories.reminders}
                onCheckedChange={(val) =>
                  handleToggle((prev) => ({
                    ...prev,
                    categories: { ...prev.categories, reminders: val },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className={`inline-flex items-center gap-1 font-semibold ${formData.categories.reminders ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {formData.categories.reminders ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {formData.categories.reminders ? "Reminders On" : "Reminders Muted"}
              </span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("reminders")}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  Adjust Cadence →
                </button>
              )}
            </div>
          </div>

          {/* 3. WhatsApp Alerts */}
          <div className="p-4 rounded-2xl bg-background border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${isWhatsAppActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">WhatsApp Alerts</p>
                  <p className="text-[11px] text-slate-500">Instant UPI payment links</p>
                </div>
              </div>
              <Switch
                checked={formData.channels.whatsapp}
                onCheckedChange={(val) =>
                  handleToggle((prev) => ({
                    ...prev,
                    channels: { ...prev.channels, whatsapp: val },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className={`inline-flex items-center gap-1 font-semibold ${formData.channels.whatsapp ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                {formData.channels.whatsapp ? "WhatsApp Active" : "WhatsApp Off"}
              </span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("whatsapp")}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  View Details →
                </button>
              )}
            </div>
          </div>

          {/* 4. Master Notifications Switch */}
          <div className="p-4 rounded-2xl bg-background border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${formData.masterEnabled ? "bg-primary/10 text-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Master Switch</p>
                  <p className="text-[11px] text-slate-500">All non-critical alerts</p>
                </div>
              </div>
              <Switch
                checked={formData.masterEnabled}
                onCheckedChange={(val) =>
                  handleToggle((prev) => ({
                    ...prev,
                    masterEnabled: val,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className={`inline-flex items-center gap-1 font-semibold ${formData.masterEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                {formData.masterEnabled ? "Notifications On" : "All Paused"}
              </span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("general")}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  General Settings →
                </button>
              )}
            </div>
          </div>

          {/* 5. Quiet Hours Mode */}
          <div className="p-4 rounded-2xl bg-background border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all sm:col-span-2 lg:col-span-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${formData.quietHours.enabled ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  <Moon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Quiet Hours (Overnight Rest)</p>
                  <p className="text-[11px] text-slate-500">
                    Mute sound & push alerts from {formData.quietHours.start || "22:00"} to {formData.quietHours.end || "07:00"}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.quietHours.enabled}
                onCheckedChange={(val) =>
                  handleToggle((prev) => ({
                    ...prev,
                    quietHours: { ...prev.quietHours, enabled: val },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className={`inline-flex items-center gap-1 font-semibold ${formData.quietHours.enabled ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`}>
                {formData.quietHours.enabled ? "Quiet Hours Active" : "Disabled (Alerts 24/7)"}
              </span>
              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => onSelectTab("quiet_hours")}
                  className="text-primary hover:underline font-medium text-[11px]"
                >
                  Set Custom Hours →
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
