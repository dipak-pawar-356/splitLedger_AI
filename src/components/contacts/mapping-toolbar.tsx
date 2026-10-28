"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, AlertTriangle } from "lucide-react";

export interface MappingToolbarProps {
  totalRows: number;
  mappedCount: number;
  totalFields: number;
  isNameMapped: boolean;
  hasEmailOrPhone: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  duplicateCount: number;
  onAutoMapAll: () => void;
  onResetAll: () => void;
}

export const MappingToolbar = React.memo(function MappingToolbar({
  totalRows,
  mappedCount,
  totalFields,
  isNameMapped,
  hasEmailOrPhone,
  hasEmail,
  hasPhone,
  duplicateCount,
  onAutoMapAll,
  onResetAll,
}: MappingToolbarProps) {
  const percentage = Math.round((mappedCount / totalFields) * 100);
  const remaining = Math.max(0, totalFields - mappedCount);

  return (
    <div className="sticky top-0 z-20 p-3 sm:p-3.5 rounded-2xl bg-slate-900/95 text-white dark:bg-slate-900/95 dark:text-white shadow-xl border border-slate-800 backdrop-blur-md flex flex-col lg:flex-row lg:items-center justify-between gap-3 animate-in fade-in-50">
      {/* Metrics & Progress Section */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap text-xs">
        {/* Total Spreadsheet Rows */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className="text-slate-400">Rows:</span>
          <span className="font-mono text-sm text-slate-100">{totalRows}</span>
        </div>

        <div className="h-3 w-px bg-slate-700 hidden sm:block" />

        {/* Progress & Percentage */}
        <div className="flex items-center gap-2 font-bold">
          <span className="text-slate-400">Mapped:</span>
          <span className="font-mono text-sm text-slate-100">
            {mappedCount}/{totalFields}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">({percentage}%)</span>
          <div className="w-16 sm:w-24 h-2 rounded-full bg-slate-800 overflow-hidden ml-1">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {remaining > 0 ? (
            <span className="text-[10px] text-slate-400 font-medium hidden md:inline-block">
              • {remaining} unmapped
            </span>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] py-0 px-1 border-0 font-bold">
              All Mapped
            </Badge>
          )}
        </div>

        <div className="h-3 w-px bg-slate-700 hidden sm:block" />

        {/* Required Name Validation */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-bold">Name:</span>
          {isNameMapped ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] py-0 px-1.5 border-0 font-bold">
              ✓ Mapped
            </Badge>
          ) : (
            <Badge className="bg-rose-500/20 text-rose-300 text-[10px] py-0 px-1.5 border-0 font-bold animate-pulse">
              ✖ Missing
            </Badge>
          )}
        </div>

        <div className="h-3 w-px bg-slate-700 hidden sm:block" />

        {/* Communication Channels Validation */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-bold">Channels:</span>
          {hasEmailOrPhone ? (
            <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] py-0 px-1.5 border-0 font-bold">
              {hasEmail && hasPhone
                ? "✓ Email & Phone"
                : hasEmail
                ? "✓ Email"
                : "✓ Phone"}
            </Badge>
          ) : (
            <Badge className="bg-amber-500/20 text-amber-300 text-[10px] py-0 px-1.5 border-0 font-bold">
              ⚠ No Email/Phone
            </Badge>
          )}
        </div>

        {/* Duplicate Mapping Alert */}
        {duplicateCount > 0 && (
          <>
            <div className="h-3 w-px bg-slate-700 hidden sm:block" />
            <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] py-0 px-2 font-bold animate-pulse flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-400" />
              <span>{duplicateCount} Duplicate Mapping(s)</span>
            </Badge>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onAutoMapAll}
          className="group text-xs font-bold gap-1.5 h-8 px-2.5 text-slate-100 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
          title="Re-run intelligent auto-detection on all columns"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-12 transition-transform duration-200" />
          <span>Auto-Map All</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onResetAll}
          className="group text-xs font-bold gap-1.5 h-8 px-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
          title="Set all columns to [ Do Not Map ]"
        >
          <RotateCcw className="h-3.5 w-3.5 group-hover:-rotate-45 transition-transform duration-200" />
          <span>Reset All</span>
        </Button>
      </div>
    </div>
  );
});
