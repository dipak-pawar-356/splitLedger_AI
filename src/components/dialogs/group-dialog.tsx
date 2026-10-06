"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Shield, Globe, Lock, DollarSign } from "lucide-react";
import { groupSchema, type GroupFormData } from "@/validators";
import { createGroup } from "@/actions/groups";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const CURRENCIES = [{ value: "INR", label: "₹ INR (Indian Rupee)" }];

const GROUP_TYPES = [
  { value: "trip", label: "Trip / Vacation" },
  { value: "home", label: "Home / Flatmates" },
  { value: "friends", label: "Friends" },
  { value: "family", label: "Family" },
  { value: "couples", label: "Couples" },
  { value: "office", label: "Office / Project" },
  { value: "event", label: "Event / Party" },
  { value: "custom", label: "Custom / Other" },
];

const SPLIT_METHODS = [
  { value: "equal", label: "Equal Split (Default)" },
  { value: "exact", label: "Exact Amount" },
  { value: "percentage", label: "Percentage Split" },
  { value: "shares", label: "Shares / Ratio" },
];

interface GroupDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function GroupDialog({ trigger, onSuccess }: GroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "friends",
      currency: "INR",
      splitMethod: "equal",
      coverImage: "",
      notes: "",
    },
  });

  const onSubmit = async (data: GroupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const created = await createGroup({
        name: data.name.trim(),
        description: data.description?.trim(),
        type: data.type as any,
        currency: "INR",
        splitMethod: data.splitMethod as any,
        coverImage: data.coverImage?.trim(),
        notes: data.notes?.trim(),
      });

      toast.success(`Group "${created.name}" created successfully!`);
      reset();
      setOpen(false);
      onSuccess?.();
      router.push(`/dashboard/groups/${created.publicId}`);
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create group";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Users className="h-5 w-5 text-primary" />
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g. Goa Trip 2025, Flat 402 Expenses"
              disabled={isLoading}
              className="w-full"
            />
            {errors.name && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="What is this group for? Add a short description..."
              rows={2}
              disabled={isLoading}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-sm font-medium">Category / Type *</Label>
              <Select
                defaultValue="friends"
                onValueChange={(value: any) => setValue("type", value)}
                disabled={isLoading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-sm font-medium">Currency *</Label>
              <Select defaultValue="INR" disabled>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="INR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="splitMethod" className="text-sm font-medium">Default Split Method *</Label>
            <Select
              defaultValue="equal"
              onValueChange={(value: any) => setValue("splitMethod", value)}
              disabled={isLoading}
            >
              <SelectTrigger id="splitMethod">
                <SelectValue placeholder="Select default split method" />
              </SelectTrigger>
              <SelectContent>
                {SPLIT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coverImage" className="text-sm font-medium">Cover Image URL (Optional)</Label>
            <Input
              id="coverImage"
              type="url"
              {...register("coverImage")}
              placeholder="https://images.unsplash.com/photo-..."
              disabled={isLoading}
            />
            {errors.coverImage && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.coverImage.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">Notes / House Rules (Optional)</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="e.g. Settle balances by end of month; Keep all original receipts..."
              rows={2}
              disabled={isLoading}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating Group..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
