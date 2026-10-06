"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Globe, Bell, Send, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences } from "@/actions/notifications";
import { toast } from "sonner";

interface ChannelBrowserCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function ChannelBrowserCard({ initialData, onRefresh }: ChannelBrowserCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported in this browser environment.");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        toast.success("Browser notifications permitted!");
        setFormData((prev) => ({
          ...prev,
          browserSettings: { ...prev.browserSettings, enabled: true },
        }));
      } else {
        toast.error("Notification permission was denied.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestBrowserNotification = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported.");
      return;
    }

    if (Notification.permission !== "granted") {
      toast.error("Please grant browser notification permission first.");
      return;
    }

    new Notification("SplitLedger AI Alert", {
      body: "Test notification: ₹ 1,250.00 expense added to Goa Trip 2026.",
      icon: "/favicon.ico",
    });
    toast.success("Test browser popup notification dispatched!");
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        browserSettings: formData.browserSettings,
      });
      toast.success("Browser notification settings saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update browser settings");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span>Web Browser Push & Desktop Notifications</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure native system notifications for Chrome, Edge, Safari, and Firefox
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          {/* Permission Status Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Browser Permission Status:
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    permission === "granted"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                      : permission === "denied"
                      ? "bg-rose-500/10 text-rose-600 border-rose-300"
                      : "bg-amber-500/10 text-amber-600 border-amber-300"
                  }`}
                >
                  ● {permission}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {permission === "granted"
                  ? "Your browser is fully authorized to receive desktop popups."
                  : "Click below to grant notification display rights to this origin."}
              </p>
            </div>

            {permission !== "granted" ? (
              <Button
                type="button"
                size="sm"
                className="rounded-xl text-xs bg-primary"
                onClick={handleRequestPermission}
              >
                <Bell className="h-3.5 w-3.5 mr-1" />
                <span>Allow Browser Alerts</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs gap-1"
                onClick={handleTestBrowserNotification}
              >
                <Send className="h-3 w-3" />
                <span>Test Desktop Popup</span>
              </Button>
            )}
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Enable Desktop Popups</p>
                <p className="text-[11px] text-slate-500">Show floating desktop alerts when SplitLedger AI tab is in background</p>
              </div>
              <Switch
                checked={formData.browserSettings.enabled}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    browserSettings: { ...formData.browserSettings, enabled: val },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Notification Sound</p>
                <p className="text-[11px] text-slate-500">Play subtle chime on incoming transactional alerts</p>
              </div>
              <Switch
                checked={formData.browserSettings.sound}
                onCheckedChange={(val) =>
                  setFormData({
                    ...formData,
                    browserSettings: { ...formData.browserSettings, sound: val },
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
              <span>{isPending ? "Saving..." : "Save Browser Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
