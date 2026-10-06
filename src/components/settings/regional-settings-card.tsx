"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, IndianRupee, Clock, Calendar, Save } from "lucide-react";
import { RegionalPreferences, updateRegionalPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface RegionalSettingsCardProps {
  initialData: RegionalPreferences;
  onRefresh?: () => void;
}

export function RegionalSettingsCard({ initialData, onRefresh }: RegionalSettingsCardProps) {
  const [formData, setFormData] = useState<RegionalPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateRegionalPreferences(formData);
      toast.success("Regional and currency preferences saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update regional preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <span>Regional & Currency Settings</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure default currency standard (INR ₹), Indian number formats, time zone, and date structures
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Currency */}
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5 text-primary" />
                <span>Primary Currency Standard</span>
              </Label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden font-bold"
              >
                <option value="INR">INR (₹) - Indian Rupee (Default Standard)</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
              </select>
            </div>

            {/* Language */}
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Language</Label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="en">English (Default)</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Time Zone</Label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30 - Standard)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="America/New_York">America/New_York (EST -5:00)</option>
                <option value="Europe/London">Europe/London (GMT +0:00)</option>
              </select>
            </div>

            {/* Date Format */}
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Date Format</Label>
              <select
                value={formData.dateFormat}
                onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 30/08/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/30/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-30)</option>
              </select>
            </div>

            {/* Time Format */}
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">Time Format</Label>
              <select
                value={formData.timeFormat}
                onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="12h">12-Hour (e.g. 11:45 PM)</option>
                <option value="24h">24-Hour (e.g. 23:45)</option>
              </select>
            </div>

            {/* First Day of Week */}
            <div className="space-y-1.5" suppressHydrationWarning>
              <Label className="text-xs font-semibold">First Day of Week</Label>
              <select
                value={formData.firstDayOfWeek}
                onChange={(e) => setFormData({ ...formData, firstDayOfWeek: e.target.value as any })}
                className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
              >
                <option value="monday">Monday (Standard)</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </div>

          {/* Indian Number System Switch */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Indian Numbering Format (Lakhs / Crores)
                </p>
                <p className="text-[11px] text-slate-500">
                  Format values like ₹ 1,50,000 instead of ₹ 150,000
                </p>
              </div>
              <Switch
                checked={formData.useIndianNumberSystem}
                onCheckedChange={(val) => setFormData({ ...formData, useIndianNumberSystem: val })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs gap-1.5 bg-primary"
              disabled={isPending}
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isPending ? "Saving..." : "Save Regional Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
