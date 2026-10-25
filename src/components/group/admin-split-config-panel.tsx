"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { 
  Calculator, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Sparkles, 
  ArrowRightLeft, 
  Info, 
  PieChart, 
  Layers, 
  Check, 
  Scale, 
  Save, 
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { 
  getGroupSplitConfigAction, 
  saveGroupSplitConfigAction 
} from "@/actions/group-split-config";
import { 
  calculateExactAmountGroupPayables, 
  calculatePercentageGroupPayables, 
  calculateSharesGroupPayables,
  type SplitMemberInput
} from "@/lib/settlements/split-calculator";
import { ReceiverAssignmentDialog } from "@/components/dialogs/receiver-assignment-dialog";

export interface AdminSplitConfigPanelProps {
  groupId: number | string;
  publicId: string;
  splitMethod: "equal" | "exact" | "percentage" | "shares";
  onSplitMethodChange?: (method: "equal" | "exact" | "percentage" | "shares") => void;
  isAdmin?: boolean;
  isOwner?: boolean;
  currency?: string;
  compact?: boolean;
  onSuccess?: () => void;
}

interface MemberConfigState {
  key: string;
  id?: number;
  userId?: number;
  contactId?: number;
  name: string;
  avatar: string | null;
  paidPaise: number;
  paidRupees: number;
  fixedAmountRupees: number;
  percentage: number;
  shares: number;
  isLocked: boolean;
}

export function AdminSplitConfigPanel({
  groupId,
  publicId,
  splitMethod,
  onSplitMethodChange,
  isAdmin = true,
  isOwner = true,
  currency = "INR",
  compact = false,
  onSuccess,
}: AdminSplitConfigPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [totalExpensePaise, setTotalExpensePaise] = useState(0);
  const [members, setMembers] = useState<MemberConfigState[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active group split config & member transaction totals
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGroupSplitConfigAction(publicId);
      setTotalExpensePaise(res.totalExpensePaise);
      
      const mapped = res.members.map((m) => ({
        key: m.key,
        id: m.id,
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        avatar: m.avatar,
        paidPaise: m.paidPaise ?? 0,
        paidRupees: m.paidRupees ?? 0,
        fixedAmountRupees: (m.fixedAmountPaise ?? 0) / 100,
        percentage: Number(m.percentage ?? 0),
        shares: Number(m.shares ?? 1),
        isLocked: Boolean(m.isLocked),
      }));

      setMembers(mapped);
    } catch (err: any) {
      console.error("Failed to load split config:", err);
      toast.error(err.message || "Failed to load group calculation config");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Total expense in INR
  const totalExpenseRupees = totalExpensePaise / 100;

  // Pure live calculation derived states
  const liveCalculation = useMemo(() => {
    const payablesMap = new Map<string, number>();

    if (members.length === 0) {
      return {
        payables: payablesMap,
        isValid: true,
        warning: null as string | null,
      };
    }

    if (splitMethod === "exact") {
      const inputs: SplitMemberInput[] = members.map((m) => ({
        key: m.key,
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        fixedAmountPaise: Math.max(0, Math.round((m.fixedAmountRupees || 0) * 100)),
        isLocked: m.isLocked,
      }));

      const res = calculateExactAmountGroupPayables(totalExpensePaise, inputs);
      res.payables.forEach((p) => payablesMap.set(p.key, p.amountPaise));

      const sumFixedPaise = inputs.reduce((sum, i) => sum + (i.fixedAmountPaise || 0), 0);
      const remainingUnallocatedPaise = Math.max(0, totalExpensePaise - sumFixedPaise);
      const isValid = res.isValid && sumFixedPaise <= totalExpensePaise;

      return {
        payables: payablesMap,
        isValid,
        sumFixedRupees: res.allocatedFixedRupees,
        remainingUnallocatedRupees: res.remainingUnallocatedRupees,
        equalRemainderShareRupees: res.perMemberRemainingPaise / 100,
        warning: res.validationError || (!isValid ? "Total allocated fixed amounts exceed group total expense!" : null),
      };
    }

    if (splitMethod === "percentage") {
      const inputs: SplitMemberInput[] = members.map((m) => ({
        key: m.key,
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        percentage: m.percentage,
      }));

      const res = calculatePercentageGroupPayables(totalExpensePaise, inputs);
      res.payables.forEach((p) => payablesMap.set(p.key, p.amountPaise));

      const sumPercentage = Math.round(inputs.reduce((sum, i) => sum + (i.percentage || 0), 0) * 100) / 100;
      const isValid = res.isValid;

      return {
        payables: payablesMap,
        isValid,
        sumPercentage: res.totalPercentage,
        remainingPercentage: res.remainingPercentage,
        warning: res.validationError || (!isValid ? `Total percentages must equal exactly 100%. Current: ${sumPercentage}%.` : null),
      };
    }

    if (splitMethod === "shares") {
      const inputs: SplitMemberInput[] = members.map((m) => ({
        key: m.key,
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        shares: Math.max(0, m.shares || 0),
      }));

      const res = calculateSharesGroupPayables(totalExpensePaise, inputs);
      res.payables.forEach((p) => payablesMap.set(p.key, p.amountPaise));

      const totalShares = res.totalShares;
      const isValid = res.isValid;

      return {
        payables: payablesMap,
        isValid,
        totalShares,
        singleShareValueRupees: res.shareValueRupees,
        warning: res.validationError || (!isValid ? "Total shares must be greater than 0." : null),
      };
    }

    // Default Equal Split
    const equalSharePaise = members.length > 0 ? Math.round(totalExpensePaise / members.length) : 0;
    members.forEach((m) => payablesMap.set(m.key, equalSharePaise));

    return {
      payables: payablesMap,
      isValid: true,
      equalShareRupees: equalSharePaise / 100,
      warning: null as string | null,
    };
  }, [members, totalExpensePaise, splitMethod]);

  // Persist to backend and recalculate settlements
  const executeSave = useCallback(
    async (currentMembers: MemberConfigState[], showToast = false) => {
      if (!isAdmin) return;

      try {
        setSaving(true);
        setSaveStatus("saving");

        const payload = {
          groupIdOrPublicId: publicId,
          splitMethod,
          membersConfig: currentMembers.map((m) => ({
            userId: m.userId,
            contactId: m.contactId,
            name: m.name,
            fixedAmountPaise: Math.round((m.fixedAmountRupees || 0) * 100),
            percentage: Number(m.percentage || 0),
            shares: Number(m.shares || 1),
            isLocked: Boolean(m.isLocked),
          })),
          recalculateExisting: true,
        };

        const res = await saveGroupSplitConfigAction(payload);
        if (res.success) {
          setSaveStatus("saved");
          if (showToast) {
            toast.success("Group calculation rules updated and settlements recalculated!");
          }
          onSuccess?.();
          router.refresh();
        }
      } catch (err: any) {
        setSaveStatus("error");
        console.error("Failed to save split config:", err);
        if (showToast) {
          toast.error(err.message || "Failed to save configuration");
        }
      } finally {
        setSaving(false);
      }
    },
    [publicId, splitMethod, isAdmin, onSuccess, router]
  );

  // Trigger debounced autosave when valid changes occur
  const triggerDebouncedSave = useCallback(
    (updatedMembers: MemberConfigState[]) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setSaveStatus("saving");
      debounceTimerRef.current = setTimeout(() => {
        executeSave(updatedMembers, false);
      }, 750);
    },
    [executeSave]
  );

  // Handler for fixed amount in exact mode
  const handleFixedAmountChange = (key: string, valueStr: string) => {
    const num = parseFloat(valueStr) || 0;
    const clamped = Math.max(0, num);
    const updated = members.map((m) =>
      m.key === key ? { ...m, fixedAmountRupees: clamped } : m
    );
    setMembers(updated);
    triggerDebouncedSave(updated);
  };

  // Handler for percentage in percentage mode
  const handlePercentageChange = (key: string, valueStr: string) => {
    const num = parseFloat(valueStr) || 0;
    const clamped = Math.max(0, Math.min(100, num));
    const updated = members.map((m) =>
      m.key === key ? { ...m, percentage: clamped } : m
    );
    setMembers(updated);
    triggerDebouncedSave(updated);
  };

  // Handler for shares in shares mode
  const handleSharesChange = (key: string, valueStr: string) => {
    const num = parseFloat(valueStr) || 0;
    const clamped = Math.max(0, num);
    const updated = members.map((m) =>
      m.key === key ? { ...m, shares: clamped } : m
    );
    setMembers(updated);
    triggerDebouncedSave(updated);
  };

  // Handler for lock toggle in exact mode
  const handleLockToggle = (key: string, locked: boolean) => {
    const updated = members.map((m) =>
      m.key === key ? { ...m, isLocked: locked } : m
    );
    setMembers(updated);
    triggerDebouncedSave(updated);
  };

  // Quick Distribute Evenly helper
  const handleDistributeEvenly = () => {
    if (members.length === 0) return;

    if (splitMethod === "percentage") {
      const base = Math.floor((100 / members.length) * 100) / 100;
      const remainder = Math.round((100 - base * members.length) * 100) / 100;
      const updated = members.map((m, idx) => ({
        ...m,
        percentage: idx === 0 ? base + remainder : base,
      }));
      setMembers(updated);
      executeSave(updated, true);
    } else if (splitMethod === "shares") {
      const updated = members.map((m) => ({ ...m, shares: 1 }));
      setMembers(updated);
      executeSave(updated, true);
    } else if (splitMethod === "exact") {
      const updated = members.map((m) => ({ ...m, fixedAmountRupees: 0, isLocked: false }));
      setMembers(updated);
      executeSave(updated, true);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary mb-2" />
        <p className="text-xs text-slate-500">Loading calculation engine parameters...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Engine Overview Header & Status Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              {splitMethod === "exact" ? (
                <Scale className="h-4 w-4" />
              ) : splitMethod === "percentage" ? (
                <PieChart className="h-4 w-4" />
              ) : splitMethod === "shares" ? (
                <Layers className="h-4 w-4" />
              ) : (
                <Calculator className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>
                  {splitMethod === "exact"
                    ? "Exact Amount Engine (₹ INR)"
                    : splitMethod === "percentage"
                    ? "Percentage Split Engine (%)"
                    : splitMethod === "shares"
                    ? "Shares Ratio Engine"
                    : "Equal Split Engine (1/N)"}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-bold ${
                    liveCalculation.isValid
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300"
                      : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300"
                  }`}
                >
                  {liveCalculation.isValid ? "Valid Engine State" : "Validation Required"}
                </Badge>
              </h3>
              <p className="text-[11px] text-slate-500">
                {splitMethod === "exact"
                  ? "Define fixed payable responsibility for members. Unallocated remainder is distributed equally."
                  : splitMethod === "percentage"
                  ? "Assign exact percentage shares. Total sum must equal exactly 100%."
                  : splitMethod === "shares"
                  ? "Assign proportional shares. Final payables are calculated on share unit values."
                  : "Even distribution across all active group members."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {saveStatus === "saving" && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Auto-saving & recomputing...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Live Synchronized
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDistributeEvenly}
              disabled={saving || !isAdmin}
              className="text-xs h-7 px-2.5 rounded-lg gap-1 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Distribute Evenly</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => executeSave(members, true)}
              disabled={saving || !isAdmin || !liveCalculation.isValid}
              className="text-xs h-7 px-3 rounded-lg gap-1 bg-primary font-bold shadow-xs"
            >
              <Save className="h-3 w-3" />
              <span>{saving ? "Saving..." : "Save Rules"}</span>
            </Button>
          </div>
        </div>

        {/* Dynamic Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Group Total Expense</span>
            <span className="text-sm font-black text-slate-900 dark:text-slate-100 font-mono">
              {formatCurrency(totalExpenseRupees)}
            </span>
          </div>

          {splitMethod === "exact" && (
            <>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Fixed Allocated</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatCurrency((liveCalculation as any).sumFixedRupees || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Remaining Unallocated</span>
                <span className={`text-sm font-black font-mono ${
                  ((liveCalculation as any).remainingUnallocatedRupees || 0) < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {formatCurrency((liveCalculation as any).remainingUnallocatedRupees || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Auto Equal Remainder</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono">
                  + {formatCurrency((liveCalculation as any).equalRemainderShareRupees || 0)}/ea
                </span>
              </div>
            </>
          )}

          {splitMethod === "percentage" && (
            <>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Allocated %</span>
                <span className={`text-sm font-black font-mono ${
                  (liveCalculation as any).sumPercentage === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : (liveCalculation as any).sumPercentage < 100
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}>
                  {(liveCalculation as any).sumPercentage}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Remaining %</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono">
                  {(liveCalculation as any).remainingPercentage}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Allocation Progress</span>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      (liveCalculation as any).sumPercentage === 100
                        ? "bg-emerald-500"
                        : (liveCalculation as any).sumPercentage < 100
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (liveCalculation as any).sumPercentage || 0))}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {splitMethod === "shares" && (
            <>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Shares</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {(liveCalculation as any).totalShares} Shares
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">1 Share Value</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency((liveCalculation as any).singleShareValueRupees || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 shadow-2xs">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Active Participants</span>
                <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono">
                  {members.length} Members
                </span>
              </div>
            </>
          )}
        </div>

        {/* Inline Warning if calculation invalid */}
        {liveCalculation.warning && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{liveCalculation.warning}</span>
          </div>
        )}
      </div>

      {/* Member Configuration Rows */}
      <div className="space-y-2.5">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-4">Member</div>
          <div className="col-span-2 text-right">Already Paid</div>
          <div className="col-span-3 text-center">
            {splitMethod === "exact"
              ? "Fixed Share (₹)"
              : splitMethod === "percentage"
              ? "Percentage (%)"
              : splitMethod === "shares"
              ? "Shares (Units)"
              : "Allocation"}
          </div>
          <div className="col-span-3 text-right">Calculated Payable</div>
        </div>

        {members.map((member) => {
          const calculatedPayablePaise = liveCalculation.payables.get(member.key) ?? 0;
          const calculatedPayableRupees = calculatedPayablePaise / 100;
          const netBalanceRupees = member.paidRupees - calculatedPayableRupees;
          const isDebtor = netBalanceRupees < -0.01;
          const isCreditor = netBalanceRupees > 0.01;
          const contributionPercent =
            totalExpenseRupees > 0
              ? Math.round((calculatedPayableRupees / totalExpenseRupees) * 100)
              : 0;

          return (
            <div
              key={member.key}
              className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-primary/40 transition-all duration-200 space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* 1. Member Avatar & Name */}
                <div className="sm:col-span-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700 shrink-0">
                    <AvatarImage src={member.avatar || undefined} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary text-xs">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {member.name}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {contributionPercent}% of group
                    </span>
                  </div>
                </div>

                {/* 2. Current Paid Amount */}
                <div className="sm:col-span-2 text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 sm:hidden block font-medium">Already Paid: </span>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                    {formatCurrency(member.paidRupees)}
                  </span>
                </div>

                {/* 3. Editable Input based on Active Engine */}
                <div className="sm:col-span-3 flex items-center gap-2 justify-center">
                  {splitMethod === "exact" && (
                    <div className="flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">₹</span>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max={totalExpenseRupees}
                          value={member.fixedAmountRupees === 0 ? "" : member.fixedAmountRupees}
                          placeholder="0"
                          onChange={(e) => handleFixedAmountChange(member.key, e.target.value)}
                          disabled={!isAdmin || member.isLocked}
                          className="h-8 pl-6 pr-2 text-xs font-mono font-bold"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLockToggle(member.key, !member.isLocked)}
                        title={member.isLocked ? "Unlock allocation" : "Lock fixed allocation"}
                        className="h-8 w-8 p-0 shrink-0"
                      >
                        {member.isLocked ? (
                          <Lock className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  )}

                  {splitMethod === "percentage" && (
                    <div className="relative w-full max-w-[140px]">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={member.percentage === 0 ? "" : member.percentage}
                        placeholder="0"
                        onChange={(e) => handlePercentageChange(member.key, e.target.value)}
                        disabled={!isAdmin}
                        className="h-8 pr-7 text-xs font-mono font-bold text-right"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                    </div>
                  )}

                  {splitMethod === "shares" && (
                    <div className="relative w-full max-w-[140px]">
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        value={member.shares === 0 ? "" : member.shares}
                        placeholder="1"
                        onChange={(e) => handleSharesChange(member.key, e.target.value)}
                        disabled={!isAdmin}
                        className="h-8 pr-12 text-xs font-mono font-bold text-right"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] font-semibold text-slate-400">Shares</span>
                    </div>
                  )}

                  {splitMethod === "equal" && (
                    <span className="text-xs font-mono text-slate-500">1/N Even Share</span>
                  )}
                </div>

                {/* 4. Calculated Payable Preview & Net Position */}
                <div className="sm:col-span-3 flex flex-col items-start sm:items-end justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 sm:hidden">Target Payable: </span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100 font-mono">
                      {formatCurrency(calculatedPayableRupees)}
                    </span>
                  </div>

                  {/* Net Settlement Status Badge */}
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {isDebtor ? (
                      <Badge className="text-[10px] py-0 px-1.5 font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200">
                        Needs to Pay {formatCurrency(Math.abs(netBalanceRupees))}
                      </Badge>
                    ) : isCreditor ? (
                      <Badge className="text-[10px] py-0 px-1.5 font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200">
                        Will Receive {formatCurrency(netBalanceRupees)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500">
                        Settled (₹0)
                      </Badge>
                    )}

                    {/* Direct Receiver Assignment Option for Debtors */}
                    {isDebtor && isAdmin && splitMethod !== "equal" && (
                      <ReceiverAssignmentDialog
                        groupId={Number(groupId)}
                        groupPublicId={publicId}
                        debtor={{
                          userId: member.userId,
                          contactId: member.contactId,
                          name: member.name,
                          avatar: member.avatar,
                          totalPaid: member.paidRupees,
                          ownShare: calculatedPayableRupees,
                          needToPay: Math.abs(netBalanceRupees),
                        }}
                        eligibleReceivers={members
                          .filter(
                            (m) =>
                              m.key !== member.key &&
                              m.paidRupees - ((liveCalculation.payables.get(m.key) ?? 0) / 100) > 0.01
                          )
                          .map((m) => ({
                            userId: m.userId,
                            contactId: m.contactId,
                            name: m.name,
                            avatar: m.avatar,
                            willReceive:
                              m.paidRupees - ((liveCalculation.payables.get(m.key) ?? 0) / 100),
                          }))}
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 text-[10px] px-1.5 font-semibold rounded-md border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50"
                          >
                            <ArrowRightLeft className="h-2.5 w-2.5 mr-0.5" />
                            Assign Receiver
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Exact Mode: Show remaining share preview inline */}
              {splitMethod === "exact" && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span>
                    Fixed Allocation:{" "}
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {formatCurrency(member.fixedAmountRupees)}
                    </strong>
                  </span>
                  <span>
                    Auto Distribute:{" "}
                    <strong className="text-primary font-mono">
                      + {formatCurrency((liveCalculation as any).equalRemainderShareRupees || 0)}
                    </strong>
                  </span>
                  <span>
                    Final Payable:{" "}
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {formatCurrency(calculatedPayableRupees)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
