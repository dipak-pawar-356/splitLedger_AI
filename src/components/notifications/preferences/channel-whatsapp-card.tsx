"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MessageSquare, Save, CheckCircle2, Sparkles, Send } from "lucide-react";
import { NotificationPreferences } from "@/lib/types/settings";
import { updateDetailedNotificationPreferences, testSendNotification } from "@/actions/notifications";
import { toast } from "sonner";

interface ChannelWhatsAppCardProps {
  initialData: NotificationPreferences;
  onRefresh?: () => void;
}

export function ChannelWhatsAppCard({ initialData, onRefresh }: ChannelWhatsAppCardProps) {
  const [formData, setFormData] = useState<NotificationPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateDetailedNotificationPreferences({
        whatsappSettings: formData.whatsappSettings,
      });
      toast.success("WhatsApp notification settings saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update WhatsApp settings");
    } finally {
      setIsPending(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setIsTesting(true);
    try {
      await testSendNotification("whatsapp", "settlement");
      toast.success("Sample WhatsApp notification message formatted in INR (₹) sent!");
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger WhatsApp test");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>WhatsApp Cloud API Notifications</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Receive direct UPI repayment links, expense summaries, and debt settlement pings on WhatsApp
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Enable WhatsApp Delivery
              </p>
              <p className="text-[11px] text-slate-500">
                Receive transactional alerts directly on your verified WhatsApp account
              </p>
            </div>
            <Switch
              checked={formData.whatsappSettings.enabled}
              onCheckedChange={(val) =>
                setFormData({
                  ...formData,
                  whatsappSettings: { ...formData.whatsappSettings, enabled: val },
                })
              }
            />
          </div>

          <div className="space-y-1.5" suppressHydrationWarning>
            <Label className="text-xs font-semibold">Verified WhatsApp Phone Number</Label>
            <Input
              value={formData.whatsappSettings.verifiedNumber}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  whatsappSettings: {
                    ...formData.whatsappSettings,
                    verifiedNumber: e.target.value,
                  },
                })
              }
              placeholder="+91 98765 43210"
              className="rounded-xl text-xs bg-background font-mono max-w-sm"
              suppressHydrationWarning
            />
          </div>

          {/* Interactive WhatsApp Message Template Preview */}
          <div className="p-4 rounded-2xl bg-emerald-900/5 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Live WhatsApp Template Preview</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Verified Business</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs border text-xs space-y-2 max-w-md font-sans">
              <p className="text-slate-800 dark:text-slate-200">
                👋 Hello <strong>Dipak</strong>,
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                You have a pending debt settlement of <strong className="text-emerald-600 font-bold">₹ 466.67</strong> in <strong>Goa Trip 2026</strong>.
              </p>
              <div className="pt-2 border-t flex items-center justify-center">
                <span className="text-xs font-bold text-primary flex items-center gap-1">
                  Pay Now via UPI (GPay / PhonePe) →
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-xs gap-1 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
              onClick={handleTestWhatsApp}
              disabled={isTesting}
            >
              <Send className="h-3 w-3" />
              <span>{isTesting ? "Sending..." : "Test WhatsApp Alert"}</span>
            </Button>

            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save WhatsApp Settings"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
