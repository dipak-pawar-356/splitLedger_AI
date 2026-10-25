"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PermissionGroupProps {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  activeCount: number;
  totalCount: number;
  defaultExpanded?: boolean;
  onSelectAll?: () => void;
  onClearAll?: () => void;
  children: React.ReactNode;
}

export function PermissionGroup({
  id,
  title,
  description,
  icon,
  activeCount,
  totalCount,
  defaultExpanded = true,
  onSelectAll,
  onClearAll,
  children,
}: PermissionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden transition-all duration-200">
      {/* Header */}
      <div
        className="px-4 py-3 bg-slate-900/70 hover:bg-slate-900/90 cursor-pointer flex items-center justify-between gap-3 border-b border-slate-800/60 select-none transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-indigo-400 p-1.5 rounded-xl bg-indigo-500/10">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                {title}
              </h4>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 font-bold ${
                  activeCount > 0
                    ? "bg-indigo-950/80 text-indigo-300 border-indigo-700/60"
                    : "bg-slate-900 text-slate-400 border-slate-800"
                }`}
              >
                {activeCount} / {totalCount} active
              </Badge>
            </div>
            {description && (
              <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onSelectAll && onClearAll && (
            <div className="hidden sm:flex items-center gap-1 mr-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-slate-200"
                onClick={onSelectAll}
              >
                <Check className="w-2.5 h-2.5 mr-1" />
                All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-slate-200"
                onClick={onClearAll}
              >
                <X className="w-2.5 h-2.5 mr-1" />
                None
              </Button>
            </div>
          )}

          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse group" : "Expand group"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-2.5 animate-in fade-in-50 duration-150">
          {children}
        </div>
      )}
    </div>
  );
}
