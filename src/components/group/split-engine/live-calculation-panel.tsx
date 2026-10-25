"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  RotateCcw,
  Sparkles
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
    <div className="sticky top-2 z-20 p-3 sm:p-3.5 rounded-2xl border border-slate-800/90 bg-slate-950/95 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-300">
      {/* Left: Allocation & Remaining Status Pills (No scrollbars, graceful flex-wrap) */}
      <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 w-full sm:w-auto">
        {/* Allocation Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Allocation:
          </span>
          <span className="font-black text-slate-100">
            {totalAllocationText}
          </span>
        </div>

        {/* Remaining Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Remaining:
          </span>
          <span className={`font-black ${
            isValid ? "text-emerald-400" : "text-rose-400"
          }`}>
            {remainingText}
          </span>
        </div>

        {/* Validation / Engine Status Badge */}
        <div>
          {isValid ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/25 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Valid Engine</span>
            </span>
          ) : (
            <span 
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/25 shadow-xs" 
              title={warning || undefined}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{warning ? "Action Required" : "Invalid State"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right: Autosave State & Action Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
        <div className="flex items-center">
          {saveStatus === "saving" && (
            <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="hidden md:inline">Auto-saving...</span>
            </span>
          )}

          {saveStatus === "saved" && (
            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span className="hidden md:inline">Live Synced</span>
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDistributeEvenly}
              disabled={isSaving}
              className="h-8 text-xs font-semibold rounded-xl px-3 border-slate-700/80 bg-slate-900/70 hover:bg-slate-800 text-slate-200 hover:text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1.5 text-slate-400" />
              <span>Distribute Evenly</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={onSave}
              disabled={isSaving || !isValid}
              className="h-8 text-xs font-bold rounded-xl px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              <Save className="h-3 w-3 mr-1.5" />
              <span>{isSaving ? "Saving..." : "Save Rules"}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
