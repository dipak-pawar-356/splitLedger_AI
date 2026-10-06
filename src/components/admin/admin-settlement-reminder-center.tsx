"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BellRing,
  Send,
  Eye,
  Pause,
  Play,
  Calendar,
  Clock,
  Globe,
  Hash,
  Users,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  updateSettlementReminderSettings,
  toggleReminderPause,
  sendSettlementRemindersNow,
} from "@/actions/admin-settlements";
import { SettlementEmailPreviewModal } from "./settlement-email-preview-modal";

interface ReminderSettings {
  id?: number;
  groupId?: number;
  isEnabled: boolean;
  frequency: any;
  customIntervalDays?: number | null;
  reminderTime: string;
  timezone: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  maxReminderCount: number;
  isPaused: boolean;
  lastRunAt?: string | Date | null;
  nextScheduledAt?: string | Date | null;
}

interface AdminSettlementReminderCenterProps {
  groupId: number;
  groupPublicId: string;
  groupName: string;
  initialSettings: ReminderSettings;
  debtorsCount: number;
  totalPendingAmount: number;
  onRefresh?: () => void;
}

export function AdminSettlementReminderCenter({
  groupId,
  groupPublicId,
  groupName,
  initialSettings,
  debtorsCount,
  totalPendingAmount,
  onRefresh,
}: AdminSettlementReminderCenterProps) {
  const [settings, setSettings] = useState<ReminderSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const [debtorPreviews, setDebtorPreviews] = useState<any[]>([]);
  const [creditorPreviews, setCreditorPreviews] = useState<any[]>([]);

  // Format date helper for inputs
  const toDateInputVal = (d: string | Date | null | undefined) => {
    if (!d) return "";
    try {
      return new Date(d).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateSettlementReminderSettings(groupId, {
        isEnabled: settings.isEnabled,
        frequency: settings.frequency,
        customIntervalDays: settings.customIntervalDays || 1,
        reminderTime: settings.reminderTime,
        timezone: settings.timezone,
        startDate: settings.startDate ? new Date(settings.startDate) : null,
        endDate: settings.endDate ? new Date(settings.endDate) : null,
        maxReminderCount: Number(settings.maxReminderCount) || 3,
      });
      toast.success("Reminder schedule settings updated successfully");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update reminder settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pause/Resume
  const handleTogglePause = async () => {
    try {
      setIsPausing(true);
      const res = await toggleReminderPause(groupId);
      setSettings((prev) => ({ ...prev, isPaused: res.isPaused }));
      toast.success(res.isPaused ? "Settlement reminders paused" : "Settlement reminders resumed");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to toggle pause status");
    } finally {
      setIsPausing(false);
    }
  };

  // Stop Reminders (Disable)
  const handleStopReminders = async () => {
    try {
      setIsSaving(true);
      await updateSettlementReminderSettings(groupId, {
        isEnabled: false,
      });
      setSettings((prev) => ({ ...prev, isEnabled: false }));
      toast.info("Settlement reminders have been stopped");
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to stop reminders");
    } finally {
      setIsSaving(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async () => {
    try {
      setIsLoadingPreview(true);
      const res = await sendSettlementRemindersNow(groupId, true);
      setDebtorPreviews(res.debtorPreviews || []);
      setCreditorPreviews(res.creditorPreviews || []);
      setIsPreviewOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate email previews");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Send Reminders Now
  const handleSendImmediately = async () => {
    try {
      setIsSending(true);
      const res = await sendSettlementRemindersNow(groupId, false);
      toast.success(
        `Dispatched: ${res.sentCount} sent, ${res.failedCount} failed (${res.totalRecipients} total recipients)`
      );
      setIsPreviewOpen(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reminders");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Reminder Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    !settings.isEnabled
                      ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                      : settings.isPaused
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {!settings.isEnabled ? "Disabled" : settings.isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Debtors Pending</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {debtorsCount} {debtorsCount === 1 ? "member" : "members"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Outstanding Debt</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalPendingAmount)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Last Dispatched</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {settings.lastRunAt ? formatDate(new Date(settings.lastRunAt)) : "Never"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Form & Action Bar */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-base font-bold">
                  Settlement Reminder Engine Settings
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Automated reminders calculate real-time debts and notify debtors and creditors
              </CardDescription>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenPreview}
                disabled={isLoadingPreview}
                className="rounded-xl text-xs gap-1.5 h-8 border-slate-200 dark:border-slate-700"
              >
                <Eye className="h-3.5 w-3.5 text-blue-500" />
                <span>{isLoadingPreview ? "Rendering..." : "Preview Email"}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSendImmediately}
                disabled={isSending || debtorsCount === 0}
                className="rounded-xl text-xs gap-1.5 h-8 bg-[#0F9D58] hover:bg-[#0d874b] text-white shadow-sm transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? "Sending..." : "Send Immediately"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Main Activation Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Enable Automatic Reminders
                {settings.isEnabled && (
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Enabled
                  </Badge>
                )}
              </Label>
              <p className="text-xs text-slate-500">
                When enabled, SplitLedger AI will trigger reminder emails on the configured schedule.
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(val) => setSettings((prev) => ({ ...prev, isEnabled: val }))}
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Frequency */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Frequency
              </Label>
              <Select
                value={settings.frequency}
                onValueChange={(val: any) => setSettings((prev) => ({ ...prev, frequency: val }))}
                disabled={!settings.isEnabled}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="every_2_days">Every 2 Days</SelectItem>
                  <SelectItem value="every_3_days">Every 3 Days</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="custom">Custom Interval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Interval if selected */}
            {settings.frequency === "custom" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-slate-400" />
                  Interval (in days)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.customIntervalDays || 1}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      customIntervalDays: Number(e.target.value) || 1,
                    }))
                  }
                  disabled={!settings.isEnabled}
                  className="h-9 rounded-xl text-xs"
                />
              </div>
            )}

            {/* Reminder Time */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Daily Send Time
              </Label>
              <Input
                type="time"
                value={settings.reminderTime || "09:00"}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, reminderTime: e.target.value }))
                }
                disabled={!settings.isEnabled}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                Timezone
              </Label>
              <Select
                value={settings.timezone || "Asia/Kolkata"}
                onValueChange={(val) => setSettings((prev) => ({ ...prev, timezone: val }))}
                disabled={!settings.isEnabled}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="Asia/Kolkata">India Standard Time (IST - Asia/Kolkata)</SelectItem>
                  <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (US - New York)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (US - Los Angeles)</SelectItem>
                  <SelectItem value="Europe/London">British Summer Time (London)</SelectItem>
                  <SelectItem value="Asia/Dubai">Gulf Standard Time (Dubai)</SelectItem>
                  <SelectItem value="Asia/Singapore">Singapore Time (SGT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Reminder Count */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                Max Reminders Per Member
              </Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={settings.maxReminderCount || 3}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxReminderCount: Number(e.target.value) || 3,
                  }))
                }
                disabled={!settings.isEnabled}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Start Date (Optional)
              </Label>
              <Input
                type="date"
                value={toDateInputVal(settings.startDate)}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, startDate: e.target.value || null }))
                }
                disabled={!settings.isEnabled}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                End Date (Optional)
              </Label>
              <Input
                type="date"
                value={toDateInputVal(settings.endDate)}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, endDate: e.target.value || null }))
                }
                disabled={!settings.isEnabled}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Action Bar Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {settings.isEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePause}
                  disabled={isPausing}
                  className="rounded-xl text-xs h-9 gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  {settings.isPaused ? (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Resume Reminders</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause Reminders</span>
                    </>
                  )}
                </Button>
              )}

              {settings.isEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleStopReminders}
                  disabled={isSaving}
                  className="rounded-xl text-xs h-9 gap-1.5 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                >
                  <PowerOff className="h-3.5 w-3.5" />
                  <span>Stop Reminders</span>
                </Button>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="rounded-xl text-xs font-semibold h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Email Preview Modal */}
      <SettlementEmailPreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        debtorPreviews={debtorPreviews}
        creditorPreviews={creditorPreviews}
        onSendNow={handleSendImmediately}
        isSending={isSending}
      />
    </div>
  );
}
