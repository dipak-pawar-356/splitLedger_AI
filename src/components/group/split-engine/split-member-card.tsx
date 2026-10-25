"use client";

import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { 
  Lock, 
  Unlock, 
  ArrowRightLeft, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Minus, 
  Scale, 
  Sparkles,
  Shield,
  UserCheck
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ReceiverAssignmentDialog } from "@/components/dialogs/receiver-assignment-dialog";

export interface SplitMemberCardProps {
  memberKey: string;
  name: string;
  avatar: string | null;
  role?: string;
  userId?: number;
  contactId?: number;
  groupId: number | string;
  groupPublicId: string;
  splitMethod: "equal" | "exact" | "percentage" | "shares";
  alreadyPaidRupees: number;
  calculatedPayableRupees: number;
  totalExpenseRupees: number;
  averageExpensePerMember: number;
  fixedAmountRupees: number;
  percentage: number;
  shares: number;
  isLocked: boolean;
  isAdmin: boolean;
  onFixedAmountChange: (key: string, val: string) => void;
  onPercentageChange: (key: string, val: string) => void;
  onSharesChange: (key: string, val: string) => void;
  onLockToggle: (key: string, locked: boolean) => void;
  eligibleReceivers: Array<{
    userId?: number;
    contactId?: number;
    name: string;
    avatar: string | null;
    willReceive: number;
  }>;
}

export function SplitMemberCard({
  memberKey,
  name,
  avatar,
  role = "member",
  userId,
  contactId,
  groupId,
  groupPublicId,
  splitMethod,
  alreadyPaidRupees,
  calculatedPayableRupees,
  totalExpenseRupees,
  averageExpensePerMember,
  fixedAmountRupees,
  percentage,
  shares,
  isLocked,
  isAdmin,
  onFixedAmountChange,
  onPercentageChange,
  onSharesChange,
  onLockToggle,
  eligibleReceivers,
}: SplitMemberCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Sync internal input display
  useEffect(() => {
    if (splitMethod === "exact") {
      setInputValue(fixedAmountRupees > 0 ? String(fixedAmountRupees) : "");
    } else if (splitMethod === "percentage") {
      setInputValue(percentage > 0 ? String(percentage) : "");
    } else if (splitMethod === "shares") {
      setInputValue(shares > 0 ? String(shares) : "1");
    }
  }, [splitMethod, fixedAmountRupees, percentage, shares]);

  // Derived financial math
  const netBalance = alreadyPaidRupees - calculatedPayableRupees;
  const isDebtor = netBalance < -0.01;
  const isCreditor = netBalance > 0.01;
  const isSettled = Math.abs(netBalance) <= 0.01;

  const contributionPercent =
    totalExpenseRupees > 0
      ? Math.round((calculatedPayableRupees / totalExpenseRupees) * 100)
      : 0;

  // Difference vs average responsibility
  const differenceFromAverage = calculatedPayableRupees - averageExpensePerMember;

  // Validation State
  const isInputValid =
    splitMethod === "exact"
      ? fixedAmountRupees >= 0 && fixedAmountRupees <= totalExpenseRupees
      : splitMethod === "percentage"
      ? percentage >= 0 && percentage <= 100
      : shares >= 0;

  // Stepper handlers
  const handleStep = (direction: "up" | "down") => {
    if (!isAdmin) return;
    setIsEditing(true);

    if (splitMethod === "exact") {
      const step = 100;
      const current = parseFloat(inputValue) || 0;
      const next = direction === "up" ? current + step : Math.max(0, current - step);
      setInputValue(String(next));
      onFixedAmountChange(memberKey, String(next));
    } else if (splitMethod === "percentage") {
      const step = 5;
      const current = parseFloat(inputValue) || 0;
      const next = direction === "up" ? Math.min(100, current + step) : Math.max(0, current - step);
      setInputValue(String(next));
      onPercentageChange(memberKey, String(next));
    } else if (splitMethod === "shares") {
      const step = 1;
      const current = parseFloat(inputValue) || 0;
      const next = direction === "up" ? current + step : Math.max(0, current - step);
      setInputValue(String(next));
      onSharesChange(memberKey, String(next));
    }

    setTimeout(() => setIsEditing(false), 800);
  };

  // Mouse wheel adjustment
  const handleWheel = (e: React.WheelEvent) => {
    if (!isAdmin || isLocked) return;
    e.preventDefault();
    handleStep(e.deltaY < 0 ? "up" : "down");
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleStep("up");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleStep("down");
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="group relative p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
          {/* 1. Member Profile & Identity (4 Cols) */}
          <div className="lg:col-span-4 flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-10 w-10 border border-slate-700/80 bg-slate-800 shadow-sm">
                <AvatarImage src={avatar || undefined} alt={name} />
                <AvatarFallback className="font-bold text-xs bg-indigo-500/10 text-indigo-400">
                  {name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {role === "owner" && (
                <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-500 text-slate-950 ring-2 ring-slate-900" title="Group Owner">
                  <Shield className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-100 truncate">
                  {name}
                </p>
                <Badge
                  variant="outline"
                  className={`text-[9px] py-0 px-1 font-bold uppercase tracking-wider ${
                    role === "owner"
                      ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      : role === "admin"
                      ? "border-indigo-500/30 text-indigo-400 bg-indigo-500/10"
                      : "border-slate-700 text-slate-400"
                  }`}
                >
                  {role}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="font-mono text-indigo-400 font-semibold">
                  {contributionPercent}% share
                </span>
                <span className="text-slate-600">•</span>
                <span>Paid: <strong className="text-slate-200 font-mono">{formatCurrency(alreadyPaidRupees)}</strong></span>
              </div>
            </div>
          </div>

          {/* 2. Interactive Enterprise Numeric Stepper (4 Cols) */}
          <div className="lg:col-span-4 flex items-center justify-center">
            {splitMethod !== "equal" ? (
              <div className="flex items-center gap-1.5 w-full max-w-[240px]">
                {/* Decrement Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStep("down")}
                  disabled={!isAdmin || isLocked}
                  className="h-8 w-8 rounded-xl border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 shrink-0"
                  aria-label="Decrease value"
                >
                  <Minus className="h-3 w-3" />
                </Button>

                {/* Numeric Formatted Input */}
                <div className="relative flex-1">
                  {splitMethod === "exact" && (
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                      ₹
                    </span>
                  )}

                  <Input
                    type="number"
                    value={inputValue}
                    placeholder="0"
                    onWheel={handleWheel}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => {
                      setIsEditing(true);
                      setInputValue(e.target.value);
                      if (splitMethod === "exact") onFixedAmountChange(memberKey, e.target.value);
                      if (splitMethod === "percentage") onPercentageChange(memberKey, e.target.value);
                      if (splitMethod === "shares") onSharesChange(memberKey, e.target.value);
                    }}
                    onBlur={() => setIsEditing(false)}
                    disabled={!isAdmin || isLocked}
                    className={`h-8 text-xs font-mono font-bold text-center rounded-xl transition-all ${
                      splitMethod === "exact" ? "pl-6 pr-3" : splitMethod === "percentage" ? "pl-3 pr-6" : "pl-3 pr-10"
                    } ${
                      !isInputValid
                        ? "border-rose-500/80 bg-rose-500/10 text-rose-300 ring-2 ring-rose-500/20"
                        : isEditing
                        ? "border-amber-500/80 bg-amber-500/10 text-amber-200 ring-2 ring-amber-500/20"
                        : "border-slate-700 bg-slate-950/80 text-slate-100 hover:border-slate-600 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20"
                    }`}
                  />

                  {splitMethod === "percentage" && (
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                      %
                    </span>
                  )}
                  {splitMethod === "shares" && (
                    <span className="absolute right-2 top-2 text-[10px] font-semibold text-slate-400 pointer-events-none">
                      Shares
                    </span>
                  )}
                </div>

                {/* Increment Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleStep("up")}
                  disabled={!isAdmin || isLocked}
                  className="h-8 w-8 rounded-xl border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 shrink-0"
                  aria-label="Increase value"
                >
                  <Plus className="h-3 w-3" />
                </Button>

                {/* Exact Mode: Lock Toggle */}
                {splitMethod === "exact" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onLockToggle(memberKey, !isLocked)}
                        className={`h-8 w-8 rounded-xl shrink-0 transition-colors ${
                          isLocked
                            ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-[11px]">{isLocked ? "Fixed amount locked from auto-adjustment" : "Click to lock fixed amount"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>1/N Equal Allocation</span>
              </div>
            )}
          </div>

          {/* 3. Right Side: Interactive Calculation & Net Position (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Payable:
              </span>
              <span className="text-sm font-black text-slate-100 font-mono">
                {formatCurrency(calculatedPayableRupees)}
              </span>

              {/* Dynamic diff vs average */}
              {Math.abs(differenceFromAverage) > 0.01 && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    differenceFromAverage > 0
                      ? "text-amber-400 bg-amber-500/10"
                      : "text-emerald-400 bg-emerald-500/10"
                  }`}
                  title="Difference compared to group equal average"
                >
                  {differenceFromAverage > 0 ? "+" : ""}
                  {formatCurrency(differenceFromAverage)}
                </span>
              )}
            </div>

            {/* Premium Status Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isDebtor ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="text-[10px] font-bold py-0.5 px-2 bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-400" />
                      <span>Outstanding: {formatCurrency(Math.abs(netBalance))}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-[11px]">Member has paid less than their assigned responsibility.</p>
                  </TooltipContent>
                </Tooltip>
              ) : isCreditor ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="text-[10px] font-bold py-0.5 px-2 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      <span>Receiver: {formatCurrency(netBalance)}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-[11px]">Member paid in advance and is owed funds from group debtors.</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] font-bold py-0.5 px-2 bg-slate-800 text-slate-300 border-slate-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Fully Settled</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-[11px]">Already paid amount perfectly matches responsibility.</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Direct Receiver Assignment Dialog Trigger */}
              {isDebtor && isAdmin && splitMethod !== "equal" && eligibleReceivers.length > 0 && (
                <ReceiverAssignmentDialog
                  groupId={Number(groupId)}
                  groupPublicId={groupPublicId}
                  debtor={{
                    userId,
                    contactId,
                    name,
                    avatar,
                    totalPaid: alreadyPaidRupees,
                    ownShare: calculatedPayableRupees,
                    needToPay: Math.abs(netBalance),
                  }}
                  eligibleReceivers={eligibleReceivers}
                  trigger={
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 font-bold rounded-lg border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/40 hover:text-indigo-200"
                    >
                      <ArrowRightLeft className="h-2.5 w-2.5 mr-1" />
                      Assign Receiver
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
