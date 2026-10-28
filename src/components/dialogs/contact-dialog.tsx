"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
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

  // Initial balance relationship state
  const initialOpening = contact?.openingBalance ? contact.openingBalance / 100 : 0;
  const [balanceType, setBalanceType] = useState<"owed_to_you" | "you_owe" | "none">(
    initialOpening > 0 ? "owed_to_you" : initialOpening < 0 ? "you_owe" : "none"
  );
  const [balanceAmount, setBalanceAmount] = useState<string>(
    initialOpening !== 0 ? Math.abs(initialOpening).toString() : ""
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      currency: contact?.currency || "INR",
      openingBalance: initialOpening,
      notes: contact?.notes || "",
    },
  });

  const selectedCurrency = watch("currency") || "INR";

  useEffect(() => {
    if (open) {
      const opening = contact?.openingBalance ? contact.openingBalance / 100 : 0;
      const type: "owed_to_you" | "you_owe" | "none" =
        opening > 0 ? "owed_to_you" : opening < 0 ? "you_owe" : "none";
      setBalanceType(type);
      setBalanceAmount(opening !== 0 ? Math.abs(opening).toString() : "");
      reset({
        name: contact?.name || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
        currency: contact?.currency || "INR",
        openingBalance: opening,
        notes: contact?.notes || "",
      });
      setError(null);
    }
  }, [contact, open, reset]);

  const handleSelectBalanceType = (type: "owed_to_you" | "you_owe" | "none") => {
    setBalanceType(type);
    if (type === "none") {
      setValue("openingBalance", 0);
    } else {
      const num = parseFloat(balanceAmount);
      if (!isNaN(num) && num > 0) {
        const signed = type === "owed_to_you" ? Math.abs(num) : -Math.abs(num);
        setValue("openingBalance", signed);
      } else {
        setValue("openingBalance", 0);
      }
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      let finalOpeningBalance = 0;
      if (balanceType === "owed_to_you") {
        const val = parseFloat(balanceAmount);
        finalOpeningBalance = !isNaN(val) ? Math.abs(val) : 0;
      } else if (balanceType === "you_owe") {
        const val = parseFloat(balanceAmount);
        finalOpeningBalance = !isNaN(val) ? -Math.abs(val) : 0;
      } else {
        finalOpeningBalance = 0;
      }

      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        currency: data.currency,
        openingBalance: finalOpeningBalance,
        notes: data.notes,
      };

      if (isEditing && contact) {
        await updateContact(contact.publicId, payload);
        toast.success("Contact updated successfully!");
      } else {
        await createContact(payload);
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
      <DialogContent className="sm:max-w-[540px] rounded-3xl p-6 bg-card border border-slate-200/80 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
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

          {/* Name Field */}
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

          {/* Email & Phone */}
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

          {/* Currency Field */}
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
                    {currency} (Indian Rupee)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.currency.message}</p>
            )}
          </div>

          {/* Starting Balance & Relationship Selector */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Starting Balance & Settlement
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Define who owes whom at the time of adding this contact
                </p>
              </div>
            </div>

            {/* 3 Interactive Selector Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Option 1: They Owe You (Receivable) */}
              <button
                type="button"
                onClick={() => handleSelectBalanceType("owed_to_you")}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  balanceType === "owed_to_you"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-card hover:border-emerald-300 dark:hover:border-emerald-800/60 hover:bg-emerald-50/20"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`p-1.5 rounded-xl ${
                      balanceType === "owed_to_you"
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      balanceType === "owed_to_you"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    + Receivable
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">They Owe You</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Contact pays<br />You receive
                </div>
              </button>

              {/* Option 2: You Owe Them (Payable) */}
              <button
                type="button"
                onClick={() => handleSelectBalanceType("you_owe")}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  balanceType === "you_owe"
                    ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-card hover:border-rose-300 dark:hover:border-rose-800/60 hover:bg-rose-50/20"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`p-1.5 rounded-xl ${
                      balanceType === "you_owe"
                        ? "bg-rose-500 text-white"
                        : "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <TrendingDown className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      balanceType === "you_owe"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    - Payable
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">You Owe Them</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  You pay<br />Contact receives
                </div>
              </button>

              {/* Option 3: Settled / No Balance */}
              <button
                type="button"
                onClick={() => handleSelectBalanceType("none")}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  balanceType === "none"
                    ? "border-primary/60 bg-primary/10 text-slate-900 dark:text-slate-100 ring-2 ring-primary/20 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-card hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div
                    className={`p-1.5 rounded-xl ${
                      balanceType === "none"
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      balanceType === "none"
                        ? "bg-primary/20 text-primary dark:text-primary-foreground"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    ₹0.00
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 dark:text-slate-100">No Balance</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  Settled up<br />Starts at ₹0.00
                </div>
              </button>
            </div>

            {/* Kept Open Balance Amount Section when owed or owe is selected */}
            {balanceType !== "none" ? (
              <div className="p-3.5 rounded-2xl border bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/90 dark:border-slate-800 space-y-3 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <Label htmlFor="balanceAmountInput" className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {balanceType === "owed_to_you"
                      ? "Balance Amount Owed to You (₹)"
                      : "Balance Amount You Owe (₹)"}
                  </Label>
                  <div
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                      balanceType === "owed_to_you"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {balanceType === "owed_to_you" ? "+₹" : "-₹"}
                    {balanceAmount && !isNaN(parseFloat(balanceAmount))
                      ? Number(balanceAmount).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "0.00"}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
                    ₹
                  </span>
                  <Input
                    id="balanceAmountInput"
                    type="number"
                    step="0.01"
                    min="0"
                    value={balanceAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBalanceAmount(val);
                      const parsed = parseFloat(val);
                      const signed = isNaN(parsed)
                        ? 0
                        : balanceType === "owed_to_you"
                        ? Math.abs(parsed)
                        : -Math.abs(parsed);
                      setValue("openingBalance", signed);
                    }}
                    placeholder="0.00"
                    disabled={isLoading}
                    className="pl-8 pr-3 rounded-xl font-mono text-sm font-semibold h-10 border-slate-200 dark:border-slate-800 bg-background"
                    autoFocus
                  />
                </div>

                {/* Quick Increment Suggestion Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                    Quick Add:
                  </span>
                  {[100, 250, 500, 1000, 2500, 5000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => {
                        const curr = parseFloat(balanceAmount) || 0;
                        const updated = curr + quick;
                        setBalanceAmount(String(updated));
                        const signed = balanceType === "owed_to_you" ? updated : -updated;
                        setValue("openingBalance", signed);
                      }}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      +₹{quick}
                    </button>
                  ))}
                  {balanceAmount && (
                    <button
                      type="button"
                      onClick={() => {
                        setBalanceAmount("");
                        setValue("openingBalance", 0);
                      }}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-auto transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {balanceType === "owed_to_you" ? (
                    <>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Receiver mode:</span> Contact owes you this initial amount. It will be recorded as a net receivable (+).
                    </>
                  ) : (
                    <>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">Payer mode:</span> You owe this contact this initial amount. It will be recorded as a net payable (-).
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  ✓ Contact starts settled with zero balance (₹0.00). Future transactions will build the ledger.
                </p>
              </div>
            )}
          </div>

          {/* Notes Field */}
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

          {/* Dialog Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs h-9 cursor-pointer"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-xl text-xs h-9 font-semibold cursor-pointer">
              {isLoading ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Changes" : "Create Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
