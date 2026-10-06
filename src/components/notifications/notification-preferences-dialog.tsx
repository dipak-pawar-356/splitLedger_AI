"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Volume2, 
  Monitor, 
  Receipt, 
  CheckCircle2, 
  Users, 
  Target, 
  Clock 
} from "lucide-react";
import { 
  getNotificationPreferences, 
  updateNotificationPreferences, 
  NotificationPreferences 
} from "@/actions/notifications";
import { toast } from "sonner";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notificationsEnabled: true,
    emailNotifications: true,
    whatsappNotifications: false,
    expenseNotifications: true,
    settlementNotifications: true,
    groupNotifications: true,
    invitationNotifications: true,
    budgetNotifications: true,
    reminderNotifications: true,
    soundEnabled: true,
    desktopNotifications: false,
  });

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await getNotificationPreferences();
      setPrefs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(prefs);
      toast.success("Notification preferences saved");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl border shadow-2xl p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Notification Preferences</DialogTitle>
              <DialogDescription className="text-xs">
                Manage alerts, delivery channels, and category notification subscriptions
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {/* Master Toggle */}
          <div className="p-3.5 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Allow In-App Notifications
              </Label>
              <p className="text-[11px] text-slate-500">Enable real-time notification alerts</p>
            </div>
            <Switch
              checked={prefs.notificationsEnabled}
              onCheckedChange={(val: boolean) => setPrefs({ ...prefs, notificationsEnabled: val })}
            />
          </div>

          {/* Delivery Channels */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Delivery Channels
            </span>

            <div className="space-y-2 border rounded-2xl p-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Email Notifications</span>
                </div>
                <Switch
                  checked={prefs.emailNotifications}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, emailNotifications: val })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">WhatsApp Alerts</span>
                </div>
                <Switch
                  checked={prefs.whatsappNotifications}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, whatsappNotifications: val })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-purple-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Sound Notifications</span>
                </div>
                <Switch
                  checked={prefs.soundEnabled}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, soundEnabled: val })}
                />
              </div>
            </div>
          </div>

          {/* Activity Category Subscriptions */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Event Categories
            </span>

            <div className="space-y-2 border rounded-2xl p-3 bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Expenses & Transactions</span>
                </div>
                <Switch
                  checked={prefs.expenseNotifications}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, expenseNotifications: val })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Settlements & Payments</span>
                </div>
                <Switch
                  checked={prefs.settlementNotifications}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, settlementNotifications: val })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Groups & Invitations</span>
                </div>
                <Switch
                  checked={prefs.groupNotifications}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, groupNotifications: val })}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Budget Warning Alerts</span>
                </div>
                <Switch
                  checked={prefs.budgetNotifications}
                  onCheckedChange={(val: boolean) => setPrefs({ ...prefs, budgetNotifications: val })}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            className="rounded-xl text-xs font-semibold bg-primary"
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
