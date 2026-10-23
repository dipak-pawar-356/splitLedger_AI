"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Settings,
  IndianRupee,
  ShieldCheck,
  Lock,
  Bell,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function SettingsWorkspace() {
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [approvalCeiling, setApprovalCeiling] = useState(5000);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30);
  const [defaultSplit, setDefaultSplit] = useState("equal");

  const handleSaveSettings = () => {
    toast.success("Travel OS Operating Policies updated successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-card border border-slate-200/80 dark:border-slate-800/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-500/10 text-slate-600 dark:text-slate-400 shrink-0">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Operating System Policies & Settings
              </h2>
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase">
                Compliance Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Financial governance, strict currency policy enforcement, expense authorization rules and alert triggers
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleSaveSettings}
          className="rounded-xl text-xs font-bold gap-1.5 h-9 bg-primary text-primary-foreground shadow-xs self-end sm:self-center"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Save Policies</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Currency Enforcement Card */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Universal Currency Policy
                </h4>
              </div>
              <p className="text-xs text-slate-500">
                Operating currency locked to national standard per enterprise charter.
              </p>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase font-bold shrink-0">
              <Lock className="h-3 w-3 mr-1" /> Locked
            </Badge>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-base">
                ₹
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Indian Rupee (INR)</p>
                <span className="text-[10px] text-slate-400">Code: INR • Symbol: ₹</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              Strictly Enforced
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            Note: All travel modules, budgets, expenses, and settlements are strictly computed in INR.
          </span>
        </Card>

        {/* Financial Governance & Alert Threshold */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Budget Alert Threshold
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Triggers warning notices when aggregate trip expenses exceed threshold.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">Warning Trigger</span>
              <span className="font-mono font-bold text-primary">{alertThreshold}% of Allocated Budget</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>50% (Conservative)</span>
              <span>80% (Recommended)</span>
              <span>100% (Strict)</span>
            </div>
          </div>
        </Card>

        {/* Expense Authorization Rule */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-500" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Expense Approval Ceiling
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Transactions exceeding this amount require dual-organizer sign-off.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
              <Input
                type="number"
                value={approvalCeiling}
                onChange={(e) => setApprovalCeiling(Number(e.target.value))}
                className="pl-7 h-10 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <span className="text-xs text-slate-500">Dual Authorization</span>
          </div>
        </Card>

        {/* Operating System Heartbeat & Auto-Save */}
        <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 bg-card space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Auto-Save Heartbeat Sync
              </h4>
            </div>
            <p className="text-xs text-slate-500">
              Local cache synchronization frequency for forms and state changes.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[15, 30, 60].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setAutoSaveInterval(sec)}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all ${
                  autoSaveInterval === sec
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                Every {sec}s
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
