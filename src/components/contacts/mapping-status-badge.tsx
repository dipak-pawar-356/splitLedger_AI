"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sparkles, Check, AlertTriangle, AlertCircle, Ban } from "lucide-react";

export type MappingStatusType =
  | "auto_mapped"
  | "user_selected"
  | "duplicate"
  | "required_missing"
  | "ignored";

export interface MappingStatusBadgeProps {
  status: MappingStatusType;
  confidenceScore?: number;
  duplicateWithLabels?: string[];
  currentMapped?: string;
}

export const MappingStatusBadge = React.memo(function MappingStatusBadge({
  status,
  confidenceScore = 100,
  duplicateWithLabels = [],
  currentMapped = "",
}: MappingStatusBadgeProps) {
  switch (status) {
    case "duplicate":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] border-amber-400/80 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold py-0.5 px-2 gap-1 animate-pulse hover:scale-105 transition-all duration-200 cursor-help"
            >
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
              <span>Duplicate</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              Column &ldquo;{currentMapped}&rdquo; is mapped to multiple fields:{" "}
              {duplicateWithLabels.join(", ")}
            </p>
          </TooltipContent>
        </Tooltip>
      );

    case "required_missing":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] border-rose-400/80 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold py-0.5 px-2 gap-1 animate-pulse hover:scale-105 transition-all duration-200 cursor-help"
            >
              <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
              <span>Required Missing</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              This field is required. Full Name or First Name must be mapped to proceed.
            </p>
          </TooltipContent>
        </Tooltip>
      );

    case "user_selected":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] border-blue-400/80 bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold py-0.5 px-2.5 gap-1 hover:scale-105 transition-all duration-200 cursor-help shadow-2xs"
            >
              <Check className="h-3 w-3 text-blue-500 shrink-0" />
              <span>✓ User Selected</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              Manually mapped to column &ldquo;{currentMapped}&rdquo;
            </p>
          </TooltipContent>
        </Tooltip>
      );

    case "auto_mapped":
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-400/80 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold py-0.5 px-2.5 gap-1 hover:scale-105 transition-all duration-200 cursor-help shadow-2xs"
            >
              <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
              <span>✓ Auto Mapped ({confidenceScore}%)</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              Intelligently matched with {confidenceScore}% confidence based on column header and sample data
            </p>
          </TooltipContent>
        </Tooltip>
      );

    case "ignored":
    default:
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium py-0.5 px-2 gap-1 hover:scale-105 transition-all duration-200 cursor-help"
            >
              <Ban className="h-3 w-3 text-slate-400 shrink-0" />
              <span>Ignored</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">Field will be skipped during import</p>
          </TooltipContent>
        </Tooltip>
      );
  }
});

