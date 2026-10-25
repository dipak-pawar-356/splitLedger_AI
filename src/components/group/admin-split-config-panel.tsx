"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { RefreshCw, Calculator, ShieldCheck } from "lucide-react";
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
import { CalculationSummaryBar } from "./split-engine/calculation-summary-bar";
import { LiveCalculationPanel } from "./split-engine/live-calculation-panel";
import { SplitMemberCard } from "./split-engine/split-member-card";

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
  role?: string;
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
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active group split config & member transaction totals
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getGroupSplitConfigAction(publicId);
      setTotalExpensePaise(res.totalExpensePaise);
      
      const mapped = res.members.map((m: any) => ({
        key: m.key,
        id: m.id,
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        avatar: m.avatar,
        role: m.role || (m.userId === res.isOwner ? "owner" : m.isAdmin ? "admin" : "member"),
        paidPaise: m.paidPaise ?? 0,
        paidRupees: m.paidRupees ?? 0,
        fixedAmountRupees: (m.fixedAmountPaise ?? 0) / 100,
        percentage: Number(m.percentage ?? 0),
        shares: Number(m.shares ?? 1),
        isLocked: Boolean(m.isLocked),
      }));

      setMembers(mapped);
      setLastUpdated(new Date());
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
  const averageExpensePerMember = members.length > 0 ? totalExpenseRupees / members.length : 0;

  // Pure live calculation derived states
  const liveCalculation = useMemo(() => {
    const payablesMap = new Map<string, number>();

    if (members.length === 0) {
      return {
        payables: payablesMap,
        isValid: true,
        warning: null as string | null,
        totalAllocationText: "₹0.00",
        remainingText: "₹0.00",
        remainingAllocationValue: "₹0.00",
        remainingAllocationLabel: "Remaining",
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
        totalAllocationText: formatCurrency(res.allocatedFixedRupees),
        remainingText: formatCurrency(res.remainingUnallocatedRupees),
        remainingAllocationValue: formatCurrency(res.remainingUnallocatedRupees),
        remainingAllocationLabel: "Unallocated Fixed",
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
        totalAllocationText: `${res.totalPercentage}%`,
        remainingText: `${res.remainingPercentage}%`,
        remainingAllocationValue: `${res.remainingPercentage}%`,
        remainingAllocationLabel: "Remaining %",
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
        totalAllocationText: `${totalShares} Shares`,
        remainingText: `1 Share = ${formatCurrency(res.shareValueRupees)}`,
        remainingAllocationValue: `${totalShares} Shares`,
        remainingAllocationLabel: "Total Shares",
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
      totalAllocationText: "100%",
      remainingText: "Even Share",
      remainingAllocationValue: formatCurrency(equalSharePaise / 100),
      remainingAllocationLabel: "Per Member Share",
    };
  }, [members, totalExpensePaise, splitMethod]);

  // Total already paid and pending settlement
  const totalAlreadyPaidRupees = useMemo(() => {
    return members.reduce((sum, m) => sum + m.paidRupees, 0);
  }, [members]);

  const totalCalculatedPayableRupees = useMemo(() => {
    let sumPaise = 0;
    for (const p of liveCalculation.payables.values()) {
      sumPaise += p;
    }
    return sumPaise / 100;
  }, [liveCalculation.payables]);

  const pendingSettlementRupees = useMemo(() => {
    let debt = 0;
    for (const m of members) {
      const payable = (liveCalculation.payables.get(m.key) ?? 0) / 100;
      const diff = m.paidRupees - payable;
      if (diff < -0.01) {
        debt += Math.abs(diff);
      }
    }
    return debt;
  }, [members, liveCalculation.payables]);

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
          setLastUpdated(new Date());
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

  // Eligible receivers for debtor assignment
  const eligibleReceivers = useMemo(() => {
    return members
      .filter((m) => {
        const payable = (liveCalculation.payables.get(m.key) ?? 0) / 100;
        return m.paidRupees - payable > 0.01;
      })
      .map((m) => ({
        userId: m.userId,
        contactId: m.contactId,
        name: m.name,
        avatar: m.avatar,
        willReceive: m.paidRupees - ((liveCalculation.payables.get(m.key) ?? 0) / 100),
      }));
  }, [members, liveCalculation.payables]);

  if (loading) {
    return (
      <Card className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center space-y-3">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400" />
        <p className="text-xs font-semibold text-slate-400">Loading calculation engine parameters...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Enterprise Calculation Summary Bar */}
      <CalculationSummaryBar
        totalExpenseRupees={totalExpenseRupees}
        participantsCount={members.length}
        totalAlreadyPaidRupees={totalAlreadyPaidRupees}
        totalCalculatedPayableRupees={totalCalculatedPayableRupees}
        remainingAllocationValue={liveCalculation.remainingAllocationValue}
        remainingAllocationLabel={liveCalculation.remainingAllocationLabel}
        pendingSettlementRupees={pendingSettlementRupees}
        splitMethod={splitMethod}
        isValid={liveCalculation.isValid}
        validationError={liveCalculation.warning}
        lastUpdated={lastUpdated}
      />

      {/* 2. Floating Live Calculation Panel */}
      <LiveCalculationPanel
        totalAllocationText={liveCalculation.totalAllocationText}
        remainingText={liveCalculation.remainingText}
        isValid={liveCalculation.isValid}
        warning={liveCalculation.warning}
        saveStatus={saveStatus}
        isSaving={saving}
        isAdmin={isAdmin}
        onDistributeEvenly={handleDistributeEvenly}
        onSave={() => executeSave(members, true)}
      />

      {/* 3. Intelligent Member Financial Cards List */}
      <div className="space-y-2.5">
        {members.map((member) => {
          const calculatedPayablePaise = liveCalculation.payables.get(member.key) ?? 0;
          const calculatedPayableRupees = calculatedPayablePaise / 100;

          return (
            <SplitMemberCard
              key={member.key}
              memberKey={member.key}
              name={member.name}
              avatar={member.avatar}
              role={member.role}
              userId={member.userId}
              contactId={member.contactId}
              groupId={groupId}
              groupPublicId={publicId}
              splitMethod={splitMethod}
              alreadyPaidRupees={member.paidRupees}
              calculatedPayableRupees={calculatedPayableRupees}
              totalExpenseRupees={totalExpenseRupees}
              averageExpensePerMember={averageExpensePerMember}
              fixedAmountRupees={member.fixedAmountRupees}
              percentage={member.percentage}
              shares={member.shares}
              isLocked={member.isLocked}
              isAdmin={isAdmin}
              onFixedAmountChange={handleFixedAmountChange}
              onPercentageChange={handlePercentageChange}
              onSharesChange={handleSharesChange}
              onLockToggle={handleLockToggle}
              eligibleReceivers={eligibleReceivers.filter((r) => r.userId !== member.userId || r.contactId !== member.contactId)}
            />
          );
        })}
      </div>
    </div>
  );
}
