"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload } from "lucide-react";
import { transactionSchema, type TransactionFormData } from "@/validators";
import { createTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller } from "react-hook-form";
import { toast } from "sonner";

const CURRENCIES = ["INR"];
const TRANSACTION_TYPES = [
  { value: "paid", label: "Expense (Debit / Paid)" },
  { value: "received", label: "Income / Salary / Credit (Received)" },
  { value: "lent", label: "Lent (Money Given)" },
  { value: "borrowed", label: "Borrowed (Money Taken)" },
  { value: "repaid", label: "Repaid" },
  { value: "adjustment", label: "Adjustment" },
];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Credit Card", "Debit Card", "UPI", "Other"];
const STATUSES = ["pending", "completed", "cancelled"];

const INCOME_PRESETS = [
  { label: "Salary", category: "Salary", desc: "Monthly Salary" },
  { label: "Freelance", category: "Freelance", desc: "Freelance Payment" },
  { label: "Bonus", category: "Bonus", desc: "Performance Bonus" },
  { label: "Refund", category: "Refund", desc: "Refund Received" },
  { label: "Cashback", category: "Cashback", desc: "Cashback Reward" },
  { label: "Interest", category: "Interest", desc: "Bank Interest / Dividend" },
  { label: "Business Income", category: "Business Income", desc: "Client Invoice / Sales" },
  { label: "Gift Received", category: "Gift Received", desc: "Gift from family/friends" },
  { label: "Other Credit", category: "Other Credit", desc: "Miscellaneous Credit" },
];

const EXPENSE_PRESETS = [
  { label: "Food & Dining", category: "Food & Dining", desc: "Food & Dining" },
  { label: "Transportation", category: "Transportation", desc: "Fuel / Commute / Cab" },
  { label: "Groceries", category: "Groceries", desc: "Household Groceries" },
  { label: "Shopping", category: "Shopping", desc: "Personal Shopping" },
  { label: "Utilities", category: "Utilities", desc: "Electricity / Water / Bill" },
  { label: "Rent", category: "Rent", desc: "House Rent" },
  { label: "Healthcare", category: "Healthcare", desc: "Medical & Health" },
  { label: "Entertainment", category: "Entertainment", desc: "Movies / Outing" },
];

const ALL_CATEGORIES = [
  { value: "Salary", label: "Salary (Income)" },
  { value: "Freelance", label: "Freelance (Income)" },
  { value: "Bonus", label: "Bonus (Income)" },
  { value: "Refund", label: "Refund (Income)" },
  { value: "Cashback", label: "Cashback (Income)" },
  { value: "Interest", label: "Interest / Investment (Income)" },
  { value: "Business Income", label: "Business Income" },
  { value: "Gift Received", label: "Gift Received" },
  { value: "Food & Dining", label: "Food & Dining" },
  { value: "Transportation", label: "Transportation" },
  { value: "Groceries", label: "Groceries" },
  { value: "Shopping", label: "Shopping" },
  { value: "Utilities", label: "Utilities" },
  { value: "Rent", label: "Rent" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Education", label: "Education" },
  { value: "Travel", label: "Travel" },
  { value: "Entertainment", label: "Entertainment" },
  { value: "Other", label: "Other" },
];

interface TransactionDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  contactId?: number;
  groupId?: number;
  groupCurrency?: string;
}

export function TransactionDialog({ trigger, onSuccess, contactId, groupId, groupCurrency }: TransactionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "paid",
      amount: 0,
      currency: groupCurrency || "INR",
      description: "",
      date: new Date(),
      contactId: contactId,
      groupId: groupId,
      categoryName: "",
      paymentMethod: "",
      status: "completed",
      receiptUrl: "",
      notes: "",
    },
  });

  const currentType = watch("type");
  const currentCat = watch("categoryName");
  const activePresets = currentType === "received" ? INCOME_PRESETS : EXPENSE_PRESETS;

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Submitting transaction:", data);

      // If receipt file is selected, upload it via /api/upload
      let receiptUrl = data.receiptUrl;
      if (receiptFile) {
        const formData = new FormData();
        formData.append("file", receiptFile);
        formData.append("folder", "receipts");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to upload receipt image");
        }

        const uploadData = await uploadRes.json();
        receiptUrl = uploadData.url;
      }

      const result = await createTransaction({
        ...data,
        receiptUrl,
        categoryName: data.categoryName && data.categoryName !== "none" ? data.categoryName : undefined,
        isSyncedToDashboard: true,
      });
      console.log("Transaction created:", result);

      toast.success("Transaction created successfully!");
      reset();
      setReceiptFile(null);
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err) {
      console.error("Transaction creation error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create transaction";
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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.amount && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* Quick Presets for Income or Expenses */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currentType === "received" ? "Suggested Income Presets:" : "Suggested Expense Presets:"}
              </span>
              <span className="text-[11px] text-slate-400">Tap to auto-fill</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activePresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setValue("categoryName", preset.category);
                    setValue("description", preset.desc);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all font-medium ${
                    currentCat === preset.category
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Input
                    id="date"
                    type="date"
                    value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                    disabled={isLoading}
                  />
                )}
              />
              {errors.date && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Lunch with friends"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Additional details..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMethod && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.paymentMethod.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Controller
              name="categoryName"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {ALL_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt Upload</Label>
            <div className="flex items-center gap-4">
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                disabled={isLoading}
                className="flex-1"
              />
              {receiptFile && (
                <span className="text-sm text-slate-600 dark:text-slate-400">{receiptFile.name}</span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Or enter receipt URL below
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptUrl">Receipt URL</Label>
            <Input
              id="receiptUrl"
              type="url"
              {...register("receiptUrl")}
              placeholder="https://example.com/receipt.jpg"
              disabled={isLoading}
            />
            {errors.receiptUrl && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.receiptUrl.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
