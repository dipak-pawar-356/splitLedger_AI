"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { changePassword } from "@/actions/settings";
import { toast } from "sonner";

export function SecuritySettingsForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await changePassword(formData);
      toast.success("Password changed successfully");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Current Password</label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            className="w-full px-4 py-2 rounded-md border border-input bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">New Password</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            className="w-full px-4 py-2 rounded-md border border-input bg-background"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Confirm New Password</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-2 rounded-md border border-input bg-background"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Changing..." : "Change Password"}
        </Button>
      </form>
      <div className="pt-4 border-t space-y-2">
        <Button variant="outline" className="w-full">
          Enable Two-Factor Authentication
        </Button>
        <Button variant="outline" className="w-full">
          Manage Connected Accounts
        </Button>
        <Button variant="outline" className="w-full">
          View Login History
        </Button>
      </div>
    </div>
  );
}
