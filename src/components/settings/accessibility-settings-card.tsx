"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Eye, Save, Sparkles, Check } from "lucide-react";
import { AccessibilityPreferences, updateAccessibilityPreferences } from "@/actions/settings";
import { toast } from "sonner";

interface AccessibilitySettingsCardProps {
  initialData: AccessibilityPreferences;
  onRefresh?: () => void;
}

export function AccessibilitySettingsCard({ initialData, onRefresh }: AccessibilitySettingsCardProps) {
  const [formData, setFormData] = useState<AccessibilityPreferences>(initialData);
  const [isPending, setIsPending] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsPending(true);
    try {
      await updateAccessibilityPreferences(formData);
      toast.success("Accessibility preferences saved!");
      if (onRefresh) onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update accessibility preferences");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span>Accessibility & WCAG Standards</span>
        </CardTitle>
        <CardDescription className="text-xs">
          Personalize high contrast levels, reduced motion transitions, focus outlines, and screen reader labels
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl" suppressHydrationWarning>
          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">High Contrast Mode</p>
                <p className="text-[11px] text-slate-500">Enhance border definition and color contrast ratios for maximum legibility</p>
              </div>
              <Switch
                checked={formData.highContrast}
                onCheckedChange={(val) => setFormData({ ...formData, highContrast: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Reduced Motion</p>
                <p className="text-[11px] text-slate-500">Minimize page transitions, complex chart movements, and pulsing animations</p>
              </div>
              <Switch
                checked={formData.reducedMotion}
                onCheckedChange={(val) => setFormData({ ...formData, reducedMotion: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Enlarged UI Text</p>
                <p className="text-[11px] text-slate-500">Scale base typography up for comfortable reading across dashboards</p>
              </div>
              <Switch
                checked={formData.largeText}
                onCheckedChange={(val) => setFormData({ ...formData, largeText: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Enhanced Focus Indicators</p>
                <p className="text-[11px] text-slate-500">Display prominent high-visibility rings on active buttons and keyboard inputs</p>
              </div>
              <Switch
                checked={formData.focusIndicators}
                onCheckedChange={(val) => setFormData({ ...formData, focusIndicators: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Screen Reader Enhanced ARIA</p>
                <p className="text-[11px] text-slate-500">Provide verbose currency expansions (e.g. &quot;Ten thousand Indian Rupees&quot;)</p>
              </div>
              <Switch
                checked={formData.screenReaderOptimized}
                onCheckedChange={(val) => setFormData({ ...formData, screenReaderOptimized: val })}
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
              <span>{isPending ? "Saving..." : "Save Accessibility Preferences"}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
