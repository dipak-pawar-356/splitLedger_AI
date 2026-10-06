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
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          <span>Appearance & Visual Theme</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Customize interface themes, accent palettes, corner radiuses, and density
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Theme Selector */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">Theme Mode</Label>
          <div className="grid grid-cols-3 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                formData.theme === "light"
                  ? "border-primary bg-primary/5 text-primary shadow-xs"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <Sun className="h-5 w-5" />
              <span>Light</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                formData.theme === "dark"
                  ? "border-primary bg-primary/5 text-primary shadow-xs"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <Moon className="h-5 w-5" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              onClick={() => handleThemeChange("system")}
              className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold transition-all ${
                formData.theme === "system"
                  ? "border-primary bg-primary/5 text-primary shadow-xs"
                  : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              }`}
            >
              <Monitor className="h-5 w-5" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Accent Color Palette */}
        <div className="space-y-2">
          <Label className="text-xs font-bold">Brand Accent Color</Label>
          <div className="flex items-center gap-3 flex-wrap">
            {ACCENT_COLORS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setFormData({ ...formData, accentColor: col.id as any })}
                className={`w-9 h-9 rounded-2xl ${col.bg} flex items-center justify-center text-white transition-transform ${
                  formData.accentColor === col.id ? "scale-110 ring-2 ring-offset-2 ring-primary" : "opacity-80 hover:opacity-100"
                }`}
              >
                {formData.accentColor === col.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Layout Density & Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Corner Radius</Label>
            <select
              value={formData.borderRadius}
              onChange={(e) => setFormData({ ...formData, borderRadius: e.target.value as any })}
              className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
            >
              <option value="sharp">Sharp (Modern Clean)</option>
              <option value="rounded">Rounded (Default 12px)</option>
              <option value="pill">Pill (Curved 24px)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Table & Data Density</Label>
            <select
              value={formData.tableDensity}
              onChange={(e) => setFormData({ ...formData, tableDensity: e.target.value as any })}
              className="w-full h-9 px-3 rounded-xl border border-input text-xs bg-background focus:outline-hidden"
            >
              <option value="compact">Compact (High Information)</option>
              <option value="comfortable">Comfortable (Balanced Default)</option>
              <option value="relaxed">Relaxed (Spacious Touch)</option>
            </select>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2 max-w-xl">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Live UI Preview</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-mono">₹ 14,500.00 Net Balance</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Preview showing dynamic theme rendering with standard INR (₹) formatting.
          </p>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button
            type="button"
            size="sm"
            className="rounded-xl text-xs gap-1.5 bg-primary"
            onClick={handleSave}
            disabled={isPending}
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isPending ? "Saving..." : "Save Appearance"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
