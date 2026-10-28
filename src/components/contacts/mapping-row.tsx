"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { MappingColumnDropdown } from "./mapping-column-dropdown";
import { MappingSampleChips } from "./mapping-sample-chips";
import {
  MappingStatusBadge,
  type MappingStatusType,
} from "./mapping-status-badge";
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Tag,
  Coins,
  DollarSign,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import type { MappingConfidence } from "@/lib/contacts/contact-parser";

export interface SystemFieldDef {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

export interface MappingRowProps {
  field: SystemFieldDef;
  currentMapped: string;
  samples: string[];
  isOverridden: boolean;
  confidence?: MappingConfidence;
  isDuplicate: boolean;
  duplicateFieldLabels: string[];
  isRequiredMissing: boolean;
  detectedHeaders: string[];
  suggestedColumn?: string;
  columnSamplesMap: Map<string, string[]>;
  onSelectColumn: (fieldKey: string, column: string) => void;
}

export function getFieldMeta(key: string) {
  switch (key) {
    case "name":
      return {
        icon: <User className="h-4 w-4" />,
        bg: "bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "firstName":
    case "lastName":
      return {
        icon: <User className="h-4 w-4" />,
        bg: "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      };
    case "email":
      return {
        icon: <Mail className="h-4 w-4" />,
        bg: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
      };
    case "phone":
      return {
        icon: <Phone className="h-4 w-4" />,
        bg: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    case "company":
      return {
        icon: <Building2 className="h-4 w-4" />,
        bg: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    case "address":
      return {
        icon: <MapPin className="h-4 w-4" />,
        bg: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20",
      };
    case "tags":
      return {
        icon: <Tag className="h-4 w-4" />,
        bg: "bg-pink-500/10 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/20",
      };
    case "openingBalance":
      return {
        icon: <Coins className="h-4 w-4" />,
        bg: "bg-teal-500/10 dark:bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
      };
    case "currency":
      return {
        icon: <DollarSign className="h-4 w-4" />,
        bg: "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      };
    case "notes":
      return {
        icon: <FileText className="h-4 w-4" />,
        bg: "bg-slate-500/10 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
      };
    default:
      return {
        icon: <FileSpreadsheet className="h-4 w-4" />,
        bg: "bg-primary/10 text-primary border-primary/20",
      };
  }
}

export const MappingRow = React.memo(function MappingRow({
  field,
  currentMapped,
  samples,
  isOverridden,
  confidence,
  isDuplicate,
  duplicateFieldLabels,
  isRequiredMissing,
  detectedHeaders,
  suggestedColumn,
  columnSamplesMap,
  onSelectColumn,
}: MappingRowProps) {
  const meta = getFieldMeta(field.key);

  const statusType: MappingStatusType = isDuplicate
    ? "duplicate"
    : isRequiredMissing
    ? "required_missing"
    : currentMapped
    ? isOverridden
      ? "user_selected"
      : "auto_mapped"
    : "ignored";

  return (
    <>
      {/* Desktop & Tablet Table Row (>= 768px) */}
      <tr
        className={`group transition-all duration-200 ease-out border-b border-slate-100 dark:border-slate-800/80 ${
          isDuplicate
            ? "bg-amber-500/[0.04] dark:bg-amber-950/20 hover:bg-amber-500/[0.07]"
            : isRequiredMissing
            ? "bg-rose-500/[0.04] dark:bg-rose-950/20 hover:bg-rose-500/[0.07]"
            : currentMapped
            ? "bg-card hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
            : "hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
        }`}
      >
        {/* Column 1: Field Information */}
        <td className="py-3 px-4 align-middle w-[28%]">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none ${meta.bg}`}
            >
              {meta.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                  {field.label}
                </span>
                {field.required ? (
                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] py-0 px-1 border border-rose-500/20 font-bold shadow-2xs">
                    Required
                  </Badge>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Optional
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-1">
                {field.description}
              </p>
              {isDuplicate && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                  ⚠️ Overlaps with {duplicateFieldLabels.join(", ")}
                </span>
              )}
              {isRequiredMissing && (
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                  ✖ Map to proceed
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Column 2: Dropdown Selector */}
        <td className="py-3 px-4 align-middle w-[30%]">
          <MappingColumnDropdown
            fieldKey={field.key}
            fieldLabel={field.label}
            currentValue={currentMapped}
            detectedHeaders={detectedHeaders}
            suggestedColumn={suggestedColumn}
            confidence={confidence}
            isUserOverridden={isOverridden}
            duplicateWithFields={duplicateFieldLabels}
            columnSamplesMap={columnSamplesMap}
            onSelect={(col) => onSelectColumn(field.key, col)}
          />
        </td>

        {/* Column 3: Live Samples from File */}
        <td className="py-3 px-4 align-middle w-[26%]">
          <MappingSampleChips
            fieldKey={field.key}
            samples={samples}
            isMapped={Boolean(currentMapped)}
            maxChips={3}
          />
        </td>

        {/* Column 4: Mapping Status Badge */}
        <td className="py-3 px-4 align-middle w-[16%] text-right">
          <div className="flex justify-end">
            <MappingStatusBadge
              status={statusType}
              confidenceScore={confidence?.confidence}
              duplicateWithLabels={duplicateFieldLabels}
              currentMapped={currentMapped}
            />
          </div>
        </td>
      </tr>

      {/* Mobile Stacked Card View (< 768px) */}
      <tr className="block md:hidden border-none p-0">
        <td colSpan={4} className="block p-0 pb-3">
          <div
            className={`p-3.5 rounded-2xl border space-y-2.5 transition-all duration-200 ${
              isDuplicate
                ? "border-amber-400 bg-amber-500/[0.04] dark:bg-amber-950/20 shadow-xs"
                : isRequiredMissing
                ? "border-rose-400 bg-rose-500/[0.03] dark:bg-rose-950/20 shadow-xs"
                : currentMapped
                ? "border-slate-200 dark:border-slate-800 bg-card hover:border-primary/40 shadow-xs"
                : "border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/30"
            }`}
          >
            {/* Header: Icon, Title, Badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl border shrink-0 ${meta.bg}`}>
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block truncate">
                    {field.label}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {field.description}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                {field.required ? (
                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] py-0 px-1 border border-rose-500/20 font-bold">
                    Required
                  </Badge>
                ) : (
                  <span className="text-[9px] text-slate-400 font-medium">
                    Optional
                  </span>
                )}
                <MappingStatusBadge
                  status={statusType}
                  confidenceScore={confidence?.confidence}
                  duplicateWithLabels={duplicateFieldLabels}
                  currentMapped={currentMapped}
                />
              </div>
            </div>

            {/* Dropdown Selector */}
            <MappingColumnDropdown
              fieldKey={field.key}
              fieldLabel={field.label}
              currentValue={currentMapped}
              detectedHeaders={detectedHeaders}
              suggestedColumn={suggestedColumn}
              confidence={confidence}
              isUserOverridden={isOverridden}
              duplicateWithFields={duplicateFieldLabels}
              columnSamplesMap={columnSamplesMap}
              onSelect={(col) => onSelectColumn(field.key, col)}
            />

            {/* Live Samples Preview */}
            <div className="pt-0.5">
              <MappingSampleChips
                fieldKey={field.key}
                samples={samples}
                isMapped={Boolean(currentMapped)}
                maxChips={3}
              />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
});
