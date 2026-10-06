"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { updateSettlementSettings } from "@/actions/settings";
import { toast } from "sonner";

interface SettlementSettingsFormProps {
  initialData: {
    autoSettlement?: boolean;
  };
}

export function SettlementSettingsForm({ initialData }: SettlementSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    autoSettlement: initialData.autoSettlement ?? false,
    defaultPaymentMethod: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateSettlementSettings(formData);
      toast.success("Settlement settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settlement settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Auto-Settlement</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Automatically calculate and suggest settlements
          </p>
        </div>
        <input
          type="checkbox"
          checked={formData.autoSettlement}
          onChange={(e) => setFormData({ ...formData, autoSettlement: e.target.checked })}
          className="h-5 w-5"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Default Payment Method</label>
        <select
          value={formData.defaultPaymentMethod}
          onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value })}
          className="w-full px-4 py-2 rounded-md border border-input bg-background"
        >
          <option value="">Select payment method</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="upi">UPI</option>
          <option value="paypal">PayPal</option>
          <option value="cash">Cash</option>
        </select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Settlement Settings"}
      </Button>
    </form>
  );
}
