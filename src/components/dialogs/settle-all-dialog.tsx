"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, AlertCircle, History, Undo, FileText, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateGroupSettlements, type SettlementResult } from "@/lib/settlements/calculator";
import { createSettlementsBatch } from "@/actions/settlements";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const settleAllSchema = z.object({
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

type SettleAllFormData = z.infer<typeof settleAllSchema>;

interface SettleAllDialogProps {
  trigger?: React.ReactNode;
  groupId?: number;
  balances?: Array<{ userId: number; contactId?: number; amount: number }>;
  currency?: string;
  onSuccess?: () => void;
}

export function SettleAllDialog({ 
  trigger, 
  groupId, 
  balances = [], 
  currency = "INR",
  onSuccess 
}: SettleAllDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(null);
  const [selectedSettlements, setSelectedSettlements] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettleAllFormData>({
    resolver: zodResolver(settleAllSchema),
    defaultValues: {
      notes: "",
    },
  });

  const calculateSettlements = () => {
    if (balances.length === 0) {
      setError("No balances to settle");
      return;
    }

    // Convert balances to Expense format for the calculator
    const expenses = balances.map(b => ({
      paidBy: b.userId || 0,
      paidByContact: b.contactId,
      amount: Math.abs(b.amount),
      currency,
      splitType: "equal" as const,
      splits: [{ userId: b.userId, contactId: b.contactId }],
    }));

    const result = calculateGroupSettlements(expenses);
    setSettlementResult(result);
    
    // Select all settlements by default
    setSelectedSettlements(new Set(result.settlements.map(s => 
      `${s.fromUserId || 0}-${s.toUserId || 0}`
    )));
  };

  const toggleSettlement = (fromUserId?: number, toUserId?: number) => {
    const key = `${fromUserId || 0}-${toUserId || 0}`;
    const newSet = new Set(selectedSettlements);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedSettlements(newSet);
  };

  const onSubmit = async (data: SettleAllFormData) => {
    if (!settlementResult || selectedSettlements.size === 0) {
      setError("Please select at least one settlement");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create settlements for selected items
      const settlementsToCreate = settlementResult.settlements.filter(s =>
        selectedSettlements.has(`${s.fromUserId || 0}-${s.toUserId || 0}`)
      );

      // Use batch insert for better performance
      await createSettlementsBatch(
        settlementsToCreate.map(settlement => ({
          fromUserId: settlement.fromUserId || 0,
          fromContactId: settlement.fromContactId,
          toUserId: settlement.toUserId || 0,
          toContactId: settlement.toContactId,
          amount: settlement.amount,
          currency: settlement.currency,
          notes: data.notes,
          groupId: groupId,
        }))
      );

      toast.success(`${selectedSettlements.size} settlements created successfully!`);
      reset();
      setOpen(false);
      setSettlementResult(null);
      setSelectedSettlements(new Set());
      onSuccess?.();
      router.refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create settlements";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectAll = () => {
    if (settlementResult) {
      setSelectedSettlements(new Set(settlementResult.settlements.map(s => 
        `${s.fromUserId || 0}-${s.toUserId || 0}`
      )));
    }
  };

  const deselectAll = () => {
    setSelectedSettlements(new Set());
  };

  const selectedTotal = settlementResult 
    ? settlementResult.settlements
        .filter(s => selectedSettlements.has(`${s.fromUserId || 0}-${s.toUserId || 0}`))
        .reduce((sum, s) => sum + s.amount, 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Settle All
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settle All Debts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {!settlementResult ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold">Optimal Debt Simplification</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  This will calculate the minimum number of transactions needed to settle all debts using an optimal algorithm.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Total Balances</p>
                    <p className="font-semibold">{balances.length}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Currency</p>
                    <p className="font-semibold">{currency}</p>
                  </div>
                </div>
              </div>

              <Button onClick={calculateSettlements} className="w-full">
                Calculate Settlements
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Settlement Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Total Amount</p>
                      <p className="text-lg font-bold">{formatCurrency(settlementResult.totalAmount / 100)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Transactions</p>
                      <p className="text-lg font-bold">{settlementResult.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Savings</p>
                      <p className="text-lg font-bold text-green-600">{settlementResult.savings} fewer</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Selection Controls */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                  className="ml-auto"
                >
                  <History className="h-4 w-4 mr-2" />
                  {showHistory ? "Hide" : "Show"} History
                </Button>
              </div>

              {/* Settlements List */}
              <div className="space-y-2">
                <Label>Settlements to Execute</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {settlementResult.settlements.map((settlement, index) => {
                    const key = `${settlement.fromUserId || 0}-${settlement.toUserId || 0}`;
                    const isSelected = selectedSettlements.has(key);
                    return (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-slate-50 dark:bg-slate-900"
                        }`}
                        onClick={() => toggleSettlement(settlement.fromUserId, settlement.toUserId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              isSelected ? "bg-green-600 border-green-600" : "border-slate-300"
                            }`}>
                              {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">User {settlement.fromUserId}</span>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                              <span className="font-medium">User {settlement.toUserId}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(settlement.amount / 100)}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{settlement.currency}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Total */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Selected Total:</span>
                  <span className="text-lg font-bold">{formatCurrency(selectedTotal / 100)}</span>
                </div>
              </div>

              {/* Notes and Receipt */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Add any notes about this settlement..."
                    rows={2}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setOpen(false);
                      setSettlementResult(null);
                      setSelectedSettlements(new Set());
                      reset();
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading || selectedSettlements.size === 0}
                  >
                    {isLoading ? "Processing..." : `Execute ${selectedSettlements.size} Settlements`}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
