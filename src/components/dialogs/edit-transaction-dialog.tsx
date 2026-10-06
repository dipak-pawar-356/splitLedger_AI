"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Sparkles, MapPin, Tag, Calendar as CalendarIcon, DollarSign, History } from "lucide-react";
import { updateTransaction } from "@/actions/transactions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const TRANSACTION_TYPES = [
  { value: "paid", label: "Paid" },
  { value: "received", label: "Received" },
  { value: "lent", label: "Lent" },
  { value: "borrowed", label: "Borrowed" },
  { value: "repaid", label: "Repaid" },
  { value: "adjustment", label: "Adjustment" },
];

const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "Credit Card", "Debit Card", "Other"];

const EXPENSE_CATEGORIES = [
  { id: 1, name: "Food & Dining" },
  { id: 2, name: "Transportation" },
  { id: 3, name: "Shopping" },
  { id: 4, name: "Entertainment" },
  { id: 5, name: "Utilities & Bills" },
  { id: 6, name: "Rent & Housing" },
  { id: 7, name: "Healthcare" },
  { id: 8, name: "Travel & Trip" },
  { id: 9, name: "Education" },
  { id: 10, name: "Other" },
];

interface EditTransactionDialogProps {
  trigger?: React.ReactNode;
  transactionPublicId: string;
  initialData: {
    title?: string | null;
    description: string;
    type: "paid" | "received" | "lent" | "borrowed" | "repaid" | "adjustment";
    amount: number; // in paise
    currency?: string;
    date: Date | string;
    contactId?: number | null;
    categoryId?: number | null;
    groupId?: number | null;
    paymentMethod?: string | null;
    status?: "pending" | "completed" | "cancelled";
    receiptUrl?: string | null;
    notes?: string | null;
    tags?: string[] | null;
    location?: string | null;
    paidBy?: number | null;
    paidByContact?: number | null;
    splitMethod?: "equal" | "exact" | "percentage" | "shares";
  };
  onSuccess?: () => void;
}

export function EditTransactionDialog({
  trigger,
  transactionPublicId,
  initialData,
  onSuccess,
}: EditTransactionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState(initialData.title || initialData.description || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [amount, setAmount] = useState((initialData.amount / 100).toString());
  const [type, setType] = useState<any>(initialData.type || "paid");
  const [categoryId, setCategoryId] = useState<string>(initialData.categoryId ? String(initialData.categoryId) : "");
  const [paymentMethod, setPaymentMethod] = useState(initialData.paymentMethod || "UPI");
  const [date, setDate] = useState(
    initialData.date 
      ? new Date(initialData.date).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );
  const [location, setLocation] = useState(initialData.location || "");
  const [notes, setNotes] = useState(initialData.notes || "");
  const [tagsInput, setTagsInput] = useState(initialData.tags?.join(", ") || "");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsLoading(true);

    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await updateTransaction(transactionPublicId, {
        title: title.trim() || description.trim(),
        description: description.trim(),
        amount: parsedAmount,
        type,
        categoryId: categoryId ? Number(categoryId) : null,
        paymentMethod: paymentMethod || null,
        date: new Date(date),
        location: location.trim() || null,
        notes: notes.trim() || null,
        tags: parsedTags.length > 0 ? parsedTags : null,
        reason: reason.trim() || "Transaction updated via editor",
      });

      toast.success("Transaction updated successfully!");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto rounded-2xl border shadow-xl">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Edit className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Edit Transaction</DialogTitle>
              <p className="text-xs text-slate-500">Every change creates an auditable version record</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Amount & Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Amount (INR ₹) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">₹</span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 rounded-xl font-semibold text-base"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs font-semibold">
                Transaction Type *
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" className="rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold">
              Title / Short Summary
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner with team, Groceries"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              Description *
            </Label>
            <Input
              id="description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of transaction"
              className="rounded-xl"
            />
          </div>

          {/* Category & Payment Method Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold">
                Category
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category" className="rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod" className="text-xs font-semibold">
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod" className="rounded-xl">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PAYMENT_METHODS.map((pm) => (
                    <SelectItem key={pm} value={pm}>
                      {pm}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs font-semibold">
                Transaction Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-semibold">
                Location (Optional)
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bangalore, Starbucks"
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags" className="text-xs font-semibold">
              Tags (comma separated)
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. vacation, project, recurring"
                className="pl-9 rounded-xl"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes or terms"
              className="rounded-xl min-h-[60px]"
            />
          </div>

          {/* Reason for Edit (Section 7) */}
          <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 dark:text-indigo-300">
              <History className="h-4 w-4 text-indigo-600" />
              <Label htmlFor="reason" className="cursor-pointer">
                Reason for Edit (Recorded in Version History)
              </Label>
            </div>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Added parking charges, corrected amount, updated category"
              className="rounded-xl bg-background text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl px-5 font-semibold"
            >
              {isLoading ? "Saving Version..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
