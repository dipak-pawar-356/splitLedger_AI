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
    <Card className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700/80 transition-all duration-300 bg-card/90 backdrop-blur-md group/card">
      {/* Top Luminous Shimmer Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary transition-transform duration-200 group-hover/card:scale-110 group-hover/card:rotate-6" />
          <span>Regional & Currency Settings</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure default currency standard (INR ₹), Indian number formats, time zone, and date structures
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl" suppressHydrationWarning>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Currency */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                <IndianRupee className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                <span>Primary Currency Standard</span>
              </Label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-bold transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                <option value="INR">INR (₹) - Indian Rupee (Default Standard)</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
              </select>
            </div>

            {/* Language */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Language</Label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
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
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                <span>Time Zone</span>
              </Label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30 - Standard)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="America/New_York">America/New_York (EST -5:00)</option>
                <option value="Europe/London">Europe/London (GMT +0:00)</option>
              </select>
            </div>

            {/* Date Format */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                <span>Date Format</span>
              </Label>
              <select
                value={formData.dateFormat}
                onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value as any })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 30/08/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/30/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-30)</option>
              </select>
            </div>

            {/* Time Format */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Time Format</Label>
              <select
                value={formData.timeFormat}
                onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as any })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
              >
                <option value="12h">12-Hour (e.g. 11:45 PM)</option>
                <option value="24h">24-Hour (e.g. 23:45)</option>
              </select>
            </div>

            {/* First Day of Week */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group" suppressHydrationWarning>
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">First Day of Week</Label>
              <select
                value={formData.firstDayOfWeek}
                onChange={(e) => setFormData({ ...formData, firstDayOfWeek: e.target.value as any })}
                className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-medium"
              >
                <option value="monday">Monday (Standard)</option>
                <option value="sunday">Sunday</option>
              </select>
            </div>
          </div>

          {/* Indian Number System Switch */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
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
              className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-primary px-5 h-10 sm:h-9 min-h-[38px] shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group"
              disabled={isPending}
            >
              <Save className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${isPending ? "animate-spin" : ""}`} />
              <span>{isPending ? "Saving..." : "Save Regional Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
