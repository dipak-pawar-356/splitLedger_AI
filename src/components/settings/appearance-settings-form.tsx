"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateAppearanceSettings } from "@/actions/settings";
import { toast } from "sonner";

interface AppearanceSettingsFormProps {
  initialData: {
    theme?: string;
    language?: string;
    timezone?: string;
  };
}

export function AppearanceSettingsForm({ initialData }: AppearanceSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    theme: initialData.theme || "system",
    language: initialData.language || "en",
    timezone: initialData.timezone || "UTC",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateAppearanceSettings(formData);
      toast.success("Appearance settings updated successfully");
    } catch (error) {
      toast.error("Failed to update appearance settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Theme</label>
        <select
          value={formData.theme}
          onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Language</label>
        <select
          value={formData.language}
          onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="hi">Hindi</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Timezone</label>
        <select
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
        >
          <option value="UTC">UTC</option>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
          <option value="Europe/London">London</option>
          <option value="Asia/Kolkata">India (IST)</option>
          <option value="Asia/Tokyo">Japan (JST)</option>
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Appearance"}
      </Button>
    </form>
  );
}
