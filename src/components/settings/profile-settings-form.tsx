"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateProfileSettings } from "@/actions/settings";
import { toast } from "sonner";

interface ProfileSettingsFormProps {
  initialData: {
    name?: string;
    email?: string;
    phone?: string;
    defaultCurrency?: string;
  };
}

export function ProfileSettingsForm({ initialData }: ProfileSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    phone: initialData.phone || "",
    defaultCurrency: initialData.defaultCurrency || "INR",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateProfileSettings(formData);
      toast.success("Profile settings updated successfully");
    } catch (error) {
      toast.error("Failed to update profile settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          defaultValue={initialData.email || ""}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
          disabled
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Default Currency</label>
        <select
          value={formData.defaultCurrency}
          onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
        >
          <option value="INR">INR - Indian Rupee</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
          <option value="GBP">GBP - British Pound</option>
          <option value="CAD">CAD - Canadian Dollar</option>
          <option value="AUD">AUD - Australian Dollar</option>
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  );
}
