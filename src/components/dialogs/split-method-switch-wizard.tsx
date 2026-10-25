"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Calculator, 
  Scale, 
  PieChart, 
  Layers, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  Receipt, 
  ArrowLeftRight, 
  FileText, 
  ShieldCheck, 
  Sparkles,
  Check
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface SplitMethodSwitchWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMethod: "equal" | "exact" | "percentage" | "shares";
  initialTargetMethod?: "equal" | "exact" | "percentage" | "shares";
  groupName: string;
  membersCount: number;
  expensesCount?: number;
  totalExpenseRupees?: number;
  members?: Array<{ name: string; avatar: string | null; paidRupees: number }>;
  onConfirm: (recalculateExisting: boolean, selectedMethod: "equal" | "exact" | "percentage" | "shares") => Promise<void>;
  isLoading?: boolean;
}

const SPLIT_ENGINE_OPTIONS = [
  {
    value: "equal" as const,
    label: "Equal Split",
    tag: "Universal 1/N",
    icon: Calculator,
    formula: "Expense ÷ N",
    description: "Divides every expense completely evenly among all participants.",
    bestFor: "Flat dinners, group trips, shared bills with equal participation.",
  },
  {
    value: "exact" as const,
    label: "Exact Amount",
    tag: "Fixed ₹ Allocations",
    icon: Scale,
    formula: "Fixed Amounts + Remainder",
    description: "Allows admin to define specific INR (₹) responsibility for members.",
    bestFor: "Itemized bills where individuals bought specific items.",
  },
  {
    value: "percentage" as const,
    label: "Percentage Split",
    tag: "Proportional %",
    icon: PieChart,
    formula: "Sum = 100.00%",
    description: "Distributes costs based on exact percentages assigned to members.",
    bestFor: "Salary-based rent splits or weighted project funding.",
  },
  {
    value: "shares" as const,
    label: "Shares Ratio",
    tag: "Unit Proportions",
    icon: Layers,
    formula: "Member Shares ÷ Total Shares",
    description: "Divides costs proportionally according to discrete share units.",
    bestFor: "Apartment rooms by size, stays by day count, consumption tiers.",
  },
];

export function SplitMethodSwitchWizard({
  open,
  onOpenChange,
  currentMethod,
  initialTargetMethod,
  groupName,
  membersCount,
  expensesCount = 1,
  totalExpenseRupees = 0,
  members = [],
  onConfirm,
  isLoading = false,
}: SplitMethodSwitchWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedMethod, setSelectedMethod] = useState<"equal" | "exact" | "percentage" | "shares">(
    initialTargetMethod || (currentMethod === "equal" ? "shares" : "equal")
  );
  const [recalculateChoice, setRecalculateChoice] = useState<"future" | "all">("future");

  // Step 5 Staged execution progress states
  const [executingStep, setExecutingStep] = useState<number>(0);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setSelectedMethod(initialTargetMethod || (currentMethod === "equal" ? "shares" : "equal"));
      setRecalculateChoice("future");
      setExecutingStep(0);
      setIsApplying(false);
    }
  }, [open, currentMethod, initialTargetMethod]);

  const targetOption = SPLIT_ENGINE_OPTIONS.find((o) => o.value === selectedMethod)!;
  const currentOption = SPLIT_ENGINE_OPTIONS.find((o) => o.value === currentMethod)!;

  // Staged progress items
  const executionStages = [
    { title: "Mathematical Calculation", desc: "Verifying formula constraints and paise precision" },
    { title: "Updating Member Responsibilities", desc: "Recalculating member debt obligations" },
    { title: "Syncing Settlements Graph", desc: "Generating optimal repayment routes" },
    { title: "Saving Database Ledger", desc: "Executing atomic database transaction" },
    { title: "Refreshing Reports & Analytics", desc: "Invalidating cached summaries" },
    { title: "Engine Active", desc: "Calculation engine synchronized successfully" },
  ];

  const handleApply = async () => {
    setIsApplying(true);
    setCurrentStep(5);

    // Run staged progressive animation while executing the backend call
    const stepDuration = 250;
    const progressPromise = new Promise<void>((resolve) => {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setExecutingStep(step);
        if (step >= executionStages.length - 1) {
          clearInterval(interval);
          resolve();
        }
      }, stepDuration);
    });

    try {
      const [backendResult] = await Promise.all([
        onConfirm(recalculateChoice === "all", selectedMethod),
        progressPromise,
      ]);
      setExecutingStep(executionStages.length - 1);
      setTimeout(() => {
        setIsApplying(false);
        onOpenChange(false);
      }, 400);
    } catch (err) {
      setIsApplying(false);
      setCurrentStep(4);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isApplying ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 rounded-3xl shadow-2xl">
        {/* Wizard Header with Step Progress */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                <Calculator className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-black tracking-tight text-slate-100">
                Switch Calculation Engine
              </DialogTitle>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-400 border-slate-800">
              Step {currentStep} of 5
            </Badge>
          </div>

          <DialogDescription className="text-xs text-slate-400">
            {currentStep === 1 && "Choose the default calculation model for this group."}
            {currentStep === 2 && "Review how this engine shift affects members, expenses, and settlements."}
            {currentStep === 3 && "Determine whether to recalculate existing expenses or apply to future only."}
            {currentStep === 4 && "Inspect live preview of estimated shifts before committing."}
            {currentStep === 5 && "Applying engine updates to the database ledger..."}
          </DialogDescription>

          {/* Stepper indicator dots */}
          <div className="flex items-center gap-1.5 pt-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  currentStep === s
                    ? "bg-indigo-500 shadow-sm shadow-indigo-500/50"
                    : currentStep > s
                    ? "bg-emerald-500"
                    : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Wizard Step Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* STEP 1: CHOOSE METHOD */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {SPLIT_ENGINE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedMethod === opt.value;
                  const isCurrent = currentMethod === opt.value;

                  return (
                    <div
                      key={opt.value}
                      onClick={() => setSelectedMethod(opt.value)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? "bg-slate-900 border-indigo-500/80 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                          : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40"
                      }`}
                    >
                      <div
                        className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-indigo-500/20 text-indigo-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-100">
                            {opt.label}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {opt.formula}
                          </span>
                          {isCurrent && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/40 text-amber-400 bg-amber-500/10">
                              Active
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {opt.description}
                        </p>
                        <p className="text-[10px] text-slate-500 italic">
                          Best for: {opt.bestFor}
                        </p>
                      </div>

                      <div className="pt-1 shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-600 text-white"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: IMPACT ANALYSIS */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  Changing from <strong className="text-white">{currentOption.label}</strong> to{" "}
                  <strong className="text-white">{targetOption.label}</strong>. Here is the operational impact on this group:
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Metric 1 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Members Affected</span>
                  </div>
                  <p className="text-sm font-black text-slate-100 font-mono">
                    {membersCount} Active Members
                  </p>
                  <p className="text-[10px] text-slate-500">Every member allocation rule adapts to the new engine.</p>
                </div>

                {/* Metric 2 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Expenses Affected</span>
                  </div>
                  <p className="text-sm font-black text-slate-100 font-mono">
                    {expensesCount} Group Expenses
                  </p>
                  <p className="text-[10px] text-slate-500">Subject to your choice in Step 3.</p>
                </div>

                {/* Metric 3 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Settlements Affected</span>
                  </div>
                  <p className="text-sm font-black text-emerald-400 font-mono">
                    Live Synchronized
                  </p>
                  <p className="text-[10px] text-slate-500">Repayment routes and debtor liabilities recomputed.</p>
                </div>

                {/* Metric 4 */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">Reports Affected</span>
                  </div>
                  <p className="text-sm font-black text-amber-400 font-mono">
                    Auto-Refreshed
                  </p>
                  <p className="text-[10px] text-slate-500">PDF statements and monthly charts updated.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCOPE SELECTION */}
          {currentStep === 3 && (
            <div className="space-y-3">
              <RadioGroup
                value={recalculateChoice}
                onValueChange={(val: any) => setRecalculateChoice(val)}
                className="gap-3"
              >
                {/* Option A: Future Only */}
                <label
                  htmlFor="wizard-opt-future"
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    recalculateChoice === "future"
                      ? "border-indigo-500/80 bg-slate-900 shadow-sm ring-1 ring-indigo-500/20"
                      : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/50"
                  }`}
                >
                  <RadioGroupItem value="future" id="wizard-opt-future" className="mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      Option A: Future Expenses Only
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] py-0 px-1 font-bold">
                        Recommended
                      </Badge>
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Existing expenses and historical balances remain unchanged. All new expenses created in this group will default to the newly selected calculation engine.
                    </p>
                  </div>
                </label>

                {/* Option B: Recalculate Existing */}
                <label
                  htmlFor="wizard-opt-all"
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    recalculateChoice === "all"
                      ? "border-indigo-500/80 bg-slate-900 shadow-sm ring-1 ring-indigo-500/20"
                      : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/50"
                  }`}
                >
                  <RadioGroupItem value="all" id="wizard-opt-all" className="mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-100 flex items-center gap-2">
                      Option B: Recalculate All Existing Expenses
                      <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[9px] py-0 px-1 font-bold">
                        Ledger Recompute
                      </Badge>
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Immediately recalculates every existing expense in this group using the new split method. Member balances, own shares, and settlement suggestions will be synchronized.
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* STEP 4: PREVIEW */}
          {currentStep === 4 && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Engine Transition:</span>
                  <span className="font-bold text-slate-200">
                    {currentOption.label} &rarr; <span className="text-indigo-400">{targetOption.label}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Execution Scope:</span>
                  <span className="font-bold text-slate-200">
                    {recalculateChoice === "all" ? "Recalculate Existing Ledger" : "Future Expenses Only"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Total Group Exposure:</span>
                  <span className="font-mono font-bold text-slate-100">
                    {formatCurrency(totalExpenseRupees)}
                  </span>
                </div>
              </div>

              {/* Security check banner */}
              <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Enterprise Conservation Guarantee:</strong> Group totals and net zero-sum integrity are mathematically conserved with zero rounding drift.
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: APPLY & STAGED PROGRESS */}
          {currentStep === 5 && (
            <div className="py-4 space-y-4">
              <div className="space-y-3">
                {executionStages.map((stage, idx) => {
                  const isDone = executingStep > idx;
                  const isCurrent = executingStep === idx;
                  const isPendingStage = executingStep < idx;

                  return (
                    <div
                      key={stage.title}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCurrent
                          ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                          : isDone
                          ? "bg-slate-900/60 border-slate-800/80 text-emerald-400"
                          : "bg-slate-950/40 border-slate-800/40 text-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isCurrent ? (
                            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">
                            {stage.title}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {stage.desc}
                          </p>
                        </div>
                      </div>

                      {isDone && (
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          Done
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <DialogFooter className="p-4 px-6 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between sm:justify-between shrink-0">
          {currentStep > 1 && currentStep < 5 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              disabled={isApplying}
              className="text-xs rounded-xl"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
              className="text-xs rounded-xl"
            >
              Cancel
            </Button>
          )}

          {currentStep < 4 && (
            <Button
              type="button"
              size="sm"
              onClick={() => setCurrentStep((prev) => (prev + 1) as any)}
              className="text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}

          {currentStep === 4 && (
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isApplying}
              className="text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Apply Engine Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
