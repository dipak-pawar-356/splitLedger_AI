"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, Sun, Moon, Monitor, Check, Sparkles, Save } from "lucide-react";
import { AppearancePreferences, updateAppearancePreferences } from "@/actions/settings";
import { useTheme } from "next-themes";
import { toast } from "sonner";

interface AppearanceAdvancedCardProps {
  initialData: AppearancePreferences;
  onRefresh?: () => void;
}

const ACCENT_COLORS = [
  { id: "indigo", name: "Indigo", bg: "bg-indigo-600", text: "text-indigo-600" },
  { id: "emerald", name: "Emerald", bg: "bg-emerald-600", text: "text-emerald-600" },
  { id: "violet", name: "Violet", bg: "bg-violet-600", text: "text-violet-600" },
  { id: "rose", name: "Rose", bg: "bg-rose-600", text: "text-rose-600" },
  { id: "amber", name: "Amber", bg: "bg-amber-500", text: "text-amber-600" },
  { id: "cyan", name: "Cyan", bg: "bg-cyan-600", text: "text-cyan-600" },
];

export function AppearanceAdvancedCard({ initialData, onRefresh }: AppearanceAdvancedCardProps) {
  const [formData, setFormData] = useState<AppearancePreferences>(initialData);
  const { setTheme } = useTheme();
  const [isPending, setIsPending] = useState(false);

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    setFormData((prev) => ({ ...prev, theme }));
    setTheme(theme);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateAppearancePreferences(formData);
      toast.success("Appearance preferences updated!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update appearance");
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
          <Palette className="h-4 w-4 text-primary transition-transform duration-200 group-hover/card:scale-110 group-hover/card:rotate-6" />
          <span>Appearance & Visual Theme</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Customize interface themes, accent palettes, corner radiuses, and density
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {/* Theme Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Theme Mode</Label>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`group p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-pointer ${
                formData.theme === "light"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30 font-bold"
                  : "border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Sun className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-45" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`group p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-pointer ${
                formData.theme === "dark"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30 font-bold"
                  : "border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Moon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-12" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              className={`group p-3.5 sm:p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-95 cursor-pointer ${
                formData.theme === "system"
                  ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30 font-bold"
                  : "border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900/70 text-slate-600 dark:text-slate-400"
              }`}
            >
              <Monitor className="h-5 w-5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Accent Color Palette */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Brand Accent Color</Label>
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {ACCENT_COLORS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setFormData({ ...formData, accentColor: col.id as any })}
                className={`w-9.5 h-9.5 rounded-2xl ${col.bg} flex items-center justify-center text-white transition-all duration-200 hover:scale-115 hover:shadow-lg active:scale-90 cursor-pointer ${
                  formData.accentColor === col.id ? "scale-110 ring-2 ring-offset-2 ring-primary shadow-md" : "opacity-80 hover:opacity-100"
                }`}
                aria-label={`Select ${col.name} accent`}
              >
                {formData.accentColor === col.id && <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" />}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Density & Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Corner Radius</Label>
            <select
              value={formData.borderRadius}
              onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value as any })}
              className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-medium transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              <option value="sharp">Sharp (Modern Clean)</option>
              <option value="rounded">Rounded (Default 12px)</option>
              <option value="pill">Pill (Curved 24px)</option>
            </select>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">Table & Data Density</Label>
            <select
              value={formData.tableDensity}
              onChange={(e) => setFormData({ ...formData, tableDensity: e.target.value as any })}
              className="mt-1.5 w-full h-10 sm:h-9 px-3 rounded-xl border border-input text-base sm:text-xs bg-background focus:outline-hidden font-medium transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              <option value="compact">Compact (High Information)</option>
              <option value="comfortable">Comfortable (Balanced Default)</option>
              <option value="relaxed">Relaxed (Spacious Touch)</option>
            </select>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900/60 dark:to-slate-900/40 border border-slate-200/80 dark:border-slate-800 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-2 max-w-xl group">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-primary transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
              <span>Live UI Preview</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-mono whitespace-nowrap">₹ 14,500.00 Net Balance</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Preview showing dynamic theme rendering with standard INR (₹) formatting.
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto rounded-xl text-xs gap-1.5 bg-primary h-10 sm:h-9 min-h-[38px] px-5 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group"
            onClick={handleSave}
            disabled={isPending}
          >
            <Save className={`h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110 ${isPending ? "animate-spin" : ""}`} />
            <span>{isPending ? "Saving..." : "Save Appearance"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
