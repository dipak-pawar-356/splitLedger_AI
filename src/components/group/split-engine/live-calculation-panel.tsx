"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  RotateCcw, 
  Sparkles, 
  ShieldCheck 
} from "lucide-react";

export interface LiveCalculationPanelProps {
  totalAllocationText: string;
  remainingText: string;
  isValid: boolean;
  warning?: string | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  isSaving: boolean;
  isAdmin: boolean;
  onDistributeEvenly: () => void;
  onSave: () => void;
}

export function LiveCalculationPanel({
  totalAllocationText,
  remainingText,
  isValid,
  warning,
  saveStatus,
  isSaving,
  isAdmin,
  onDistributeEvenly,
  onSave,
}: LiveCalculationPanelProps) {
  return (
    <div className="sticky top-2 z-20 p-3 sm:p-3.5 rounded-2xl border border-slate-800/90 bg-slate-950/90 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-300">
      {/* Left: Allocation & Remaining Status */}
      <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Allocation:
          </span>
          <span className="text-xs font-black text-slate-100 font-mono">
            {totalAllocationText}
          </span>
        </div>

        <span className="text-slate-700 shrink-0">•</span>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Remaining:
          </span>
          <span className={`text-xs font-black font-mono ${
            isValid ? "text-emerald-400" : "text-rose-400"
          }`}>
            {remainingText}
          </span>
        </div>

        <span className="text-slate-700 shrink-0">•</span>

        {/* Validation / Warning Pill */}
        <div className="shrink-0">
          {isValid ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Valid Engine
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20" title={warning || undefined}>
              <AlertTriangle className="w-3 h-3" />
              {warning ? "Action Required" : "Invalid State"}
            </span>
          )}
        </div>
      </div>

      {/* Right: Autosave State & Action Buttons */}
      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {saveStatus === "saving" && (
          <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5 animate-pulse mr-1">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="hidden md:inline">Auto-saving & recomputing...</span>
          </span>
        )}

        {saveStatus === "saved" && (
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mr-1">
            <CheckCircle2 className="h-3 w-3" />
            <span className="hidden md:inline">Live Synced</span>
          </span>
        )}

        {isAdmin && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDistributeEvenly}
              disabled={isSaving}
              className="h-7 text-xs rounded-xl px-2.5 border-slate-800 hover:bg-slate-900 text-slate-300 font-medium"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Distribute Evenly</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving || !isValid}
              className="h-7 text-xs rounded-xl px-3 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              <Save className="h-3 w-3 mr-1" />
              <span>{isSaving ? "Saving..." : "Save Rules"}</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
