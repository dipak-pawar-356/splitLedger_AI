"use client";

import React from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Lock } from "lucide-react";

export interface PermissionCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  dependency?: string;
  hoverExplanation?: string;
  required?: boolean;
  categoryAccent?: string;
}

export function PermissionCard({
  id,
  icon,
  title,
  description,
  checked,
  onChange,
  disabled = false,
  dependency,
  hoverExplanation,
  required = false,
  categoryAccent = "indigo",
}: PermissionCardProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={`group relative p-3.5 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3.5 ${
          checked
            ? "bg-slate-900/90 dark:bg-slate-900/90 border-indigo-500/40 shadow-sm shadow-indigo-500/5 ring-1 ring-indigo-500/20"
            : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/40"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => {
          if (!disabled) {
            onChange(!checked);
          }
        }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 transition-colors ${
              checked
                ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30"
                : "bg-slate-800/60 text-slate-400 group-hover:bg-slate-800"
            }`}
          >
            {icon}
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-100 tracking-tight">
                {title}
              </span>

              {checked && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  Active
                </span>
              )}

              {required && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-500/30 text-amber-400 bg-amber-500/10">
                  Required
                </Badge>
              )}

              {dependency && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-medium bg-slate-800/80 px-1.5 py-0.2 rounded cursor-help">
                      <Lock className="w-2.5 h-2.5" />
                      Requires: {dependency}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-[11px]">This permission automatically depends on {dependency}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {hoverExplanation && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-[11px] leading-relaxed">{hoverExplanation}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
              {description}
            </p>
          </div>
        </div>

        <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={checked}
            disabled={disabled}
            onCheckedChange={onChange}
            className="data-[state=checked]:bg-indigo-600 scale-90"
            aria-label={`Toggle ${title}`}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
