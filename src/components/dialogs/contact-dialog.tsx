"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { contactSchema, type ContactFormData } from "@/validators";
import { createContact, updateContact } from "@/actions/contacts";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const CURRENCIES = ["INR"];

export interface ContactDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  contact?: {
    id: number;
    publicId: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    currency?: string;
    openingBalance?: number;
    notes?: string | null;
  } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ContactDialog({
  trigger,
  onSuccess,
  contact,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ContactDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (isControlled) {
      setControlledOpen?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const isEditing = Boolean(contact);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      currency: contact?.currency || "INR",
      openingBalance: contact?.openingBalance ? contact.openingBalance / 100 : 0,
      notes: contact?.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: contact?.name || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
        currency: contact?.currency || "INR",
        openingBalance: contact?.openingBalance ? contact.openingBalance / 100 : 0,
        notes: contact?.notes || "",
      });
      setError(null);
    }
  }, [contact, open, reset]);

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      if (isEditing && contact) {
        await updateContact(contact.publicId, {
          name: data.name,
          email: data.email,
          phone: data.phone,
          currency: data.currency,
          openingBalance: data.openingBalance,
          notes: data.notes,
        });
        toast.success("Contact updated successfully!");
      } else {
        await createContact(data);
        toast.success("Contact created successfully!");
      }
      reset();
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : isEditing ? "Failed to update contact" : "Failed to create contact";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button className="rounded-xl shadow-xs font-semibold gap-1.5">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="sm:max-w-[500px] rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditing ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="John Doe"
              disabled={isLoading}
              className="rounded-xl"
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
                disabled={isLoading}
                className="rounded-xl"
              />
              {errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="+91 98765 43210"
                disabled={isLoading}
                className="rounded-xl"
              />
              {errors.phone && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                defaultValue={contact?.currency || "INR"}
                onValueChange={(value: string) => setValue("currency", value)}
                disabled={isLoading}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
              <Input
                id="openingBalance"
                type="number"
                step="0.01"
                {...register("openingBalance", { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading}
                className="rounded-xl font-mono font-medium"
              />
              {errors.openingBalance && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.openingBalance.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Optional notes about this contact..."
              rows={3}
              disabled={isLoading}
              className="rounded-xl"
            />
            {errors.notes && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs h-9"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-xl text-xs h-9 font-semibold">
              {isLoading ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
