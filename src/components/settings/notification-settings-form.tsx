"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateNotificationSettings } from "@/actions/settings";
import { toast } from "sonner";

interface NotificationSettingsFormProps {
  initialData: {
    notificationsEnabled?: boolean;
    emailNotifications?: boolean;
    whatsappNotifications?: boolean;
  };
}

export function NotificationSettingsForm({ initialData }: NotificationSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    notificationsEnabled: initialData.notificationsEnabled ?? true,
    emailNotifications: initialData.emailNotifications ?? true,
    whatsappNotifications: initialData.whatsappNotifications ?? false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateNotificationSettings(formData);
      toast.success("Notification settings updated successfully");
    } catch (error) {
      toast.error("Failed to update notification settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Enable Notifications</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Receive notifications for important events
          </p>
        </div>
        <input
          type="checkbox"
          checked={formData.notificationsEnabled}
          onChange={(e) => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
          className="h-5 w-5"
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Email Notifications</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Receive notifications via email
          </p>
        </div>
        <input
          type="checkbox"
          checked={formData.emailNotifications}
          onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
          className="h-5 w-5"
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">WhatsApp Notifications</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Receive notifications via WhatsApp
          </p>
        </div>
        <input
          type="checkbox"
          checked={formData.whatsappNotifications}
          onChange={(e) => setFormData({ ...formData, whatsappNotifications: e.target.checked })}
          className="h-5 w-5"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Notifications"}
      </Button>
    </form>
  );
}
