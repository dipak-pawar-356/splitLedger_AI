"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, Phone, IndianRupee, Hash } from "lucide-react";

export interface MappingSampleChipsProps {
  fieldKey: string;
  samples: string[];
  isMapped: boolean;
  maxChips?: number;
}

function getChipStyleAndIcon(fieldKey: string, sample: string) {
  if (fieldKey === "phone" || /^\+?[0-9\s\-()]{7,}$/.test(sample)) {
    return {
      classes:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-mono",
      icon: <Phone className="h-2.5 w-2.5 text-emerald-500 shrink-0" />,
    };
  }

  if (fieldKey === "email" || sample.includes("@")) {
    return {
      classes:
        "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20 font-mono",
      icon: <Mail className="h-2.5 w-2.5 text-sky-500 shrink-0" />,
    };
  }

  if (
    fieldKey === "openingBalance" ||
    fieldKey === "currency" ||
    /^[₹$€£]?\s*[-+]?[0-9,]+(\.[0-9]+)?$/.test(sample)
  ) {
    const isNegative = sample.trim().startsWith("-");
    return {
      classes: isNegative
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20 font-mono font-semibold"
        : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 font-mono font-semibold",
      icon:
        fieldKey === "openingBalance" ? (
          <IndianRupee className="h-2.5 w-2.5 text-teal-500 shrink-0" />
        ) : (
          <Hash className="h-2.5 w-2.5 text-cyan-500 shrink-0" />
        ),
    };
  }

  return {
    classes:
      "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70",
    icon: null,
  };
}

export const MappingSampleChips = React.memo(function MappingSampleChips({
  fieldKey,
  samples,
  isMapped,
  maxChips = 3,
}: MappingSampleChipsProps) {
  if (!isMapped) {
    return (
      <span className="text-slate-400 dark:text-slate-500 italic text-[11px] font-normal select-none">
        [ Do Not Map ] — field will be ignored
      </span>
    );
  }

  if (samples.length === 0) {
    return (
      <span className="text-slate-400 dark:text-slate-500 italic text-[11px] font-normal select-none">
        No sample data in this column
      </span>
    );
  }

  const visibleSamples = samples.slice(0, maxChips);
  const remainingSamples = samples.slice(maxChips);

  return (
    <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
      {visibleSamples.map((sample, idx) => {
        const { classes, icon } = getChipStyleAndIcon(fieldKey, sample);
        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] border truncate max-w-[140px] shadow-2xs hover:border-primary/50 transition-colors cursor-default ${classes}`}
              >
                {icon}
                <span className="truncate">{sample}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="font-mono text-xs">{sample}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}

      {remainingSamples.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/60 cursor-help hover:text-foreground transition-colors">
              +{remainingSamples.length} more
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs space-y-1">
            <p className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">
              Additional Samples:
            </p>
            <div className="flex flex-wrap gap-1">
              {remainingSamples.map((rem, rIdx) => (
                <span
                  key={rIdx}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-mono"
                >
                  {rem}
                </span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});
