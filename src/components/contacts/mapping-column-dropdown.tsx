"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Search,
  Check,
  Ban,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  X,
} from "lucide-react";
import type { MappingConfidence } from "@/lib/contacts/contact-parser";

export interface MappingColumnDropdownProps {
  fieldKey: string;
  fieldLabel: string;
  currentValue: string; // Column name from file, or "" for Do Not Map
  detectedHeaders: string[];
  suggestedColumn?: string;
  confidence?: MappingConfidence;
  isUserOverridden?: boolean;
  duplicateWithFields?: string[];
  columnSamplesMap: Map<string, string[]>;
  onSelect: (column: string) => void;
}

export function MappingColumnDropdown({
  fieldKey,
  fieldLabel,
  currentValue,
  detectedHeaders,
  suggestedColumn,
  confidence,
  isUserOverridden,
  duplicateWithFields = [],
  columnSamplesMap,
  onSelect,
}: MappingColumnDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filter headers by search query
  const filteredHeaders = useMemo(() => {
    if (!searchQuery.trim()) return detectedHeaders;
    const q = searchQuery.toLowerCase().trim();
    return detectedHeaders.filter((h) => {
      const samples = columnSamplesMap.get(h) || [];
      return (
        h.toLowerCase().includes(q) ||
        samples.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [detectedHeaders, searchQuery, columnSamplesMap]);

  const hasDuplicate = duplicateWithFields.length > 0;
  const isAutoMapped = Boolean(currentValue && !isUserOverridden && confidence);

  const handleSelectColumn = (col: string) => {
    onSelect(col);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 text-left ${
          isOpen
            ? "border-primary ring-2 ring-primary/20 bg-background shadow-sm"
            : hasDuplicate
            ? "border-amber-400 dark:border-amber-600 bg-amber-500/[0.04] hover:border-amber-500"
            : currentValue
            ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs"
            : "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-slate-400 hover:border-slate-400"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentValue ? (
            <>
              <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentValue}
              </span>
              {hasDuplicate ? (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold shrink-0"
                >
                  Duplicate
                </Badge>
              ) : isAutoMapped ? (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold shrink-0 gap-0.5"
                >
                  <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                  <span>{confidence?.confidence || 100}%</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shrink-0"
                >
                  Selected
                </Badge>
              )}
            </>
          ) : (
            <>
              <Ban className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 italic truncate font-normal">
                [ Do Not Map / Ignore ]
              </span>
            </>
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-full sm:min-w-[320px] max-w-sm rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card/95 backdrop-blur-xl shadow-2xl p-1.5 animate-in fade-in-50 zoom-in-95 duration-150 space-y-1">
          {/* Sticky Search Header */}
          <div className="relative p-1">
            <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter spreadsheet columns..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Scrollable Column Options */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 p-0.5">
            {/* Option: [ Do Not Map / Ignore ] */}
            <button
              type="button"
              onClick={() => handleSelectColumn("")}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-xs text-left transition-colors ${
                !currentValue
                  ? "bg-primary/10 text-primary font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div>
                  <span className="block font-medium">[ Do Not Map / Ignore ]</span>
                  <span className="text-[10px] text-slate-400 block font-normal">
                    Do not import data for this field
                  </span>
                </div>
              </div>
              {!currentValue && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
            </button>

            {/* Suggested Column Group (if confident match exists) */}
            {suggestedColumn &&
              confidence &&
              detectedHeaders.includes(suggestedColumn) &&
              (!searchQuery ||
                suggestedColumn.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Recommended Match</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectColumn(suggestedColumn)}
                    className={`w-full flex items-start justify-between p-2 rounded-xl text-xs text-left transition-colors ${
                      currentValue === suggestedColumn
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-emerald-500/[0.08] dark:hover:bg-emerald-950/30"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {suggestedColumn}
                        </span>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] py-0 px-1 border-0 font-bold">
                          {confidence.confidence}% Match
                        </Badge>
                      </div>
                      {columnSamplesMap.get(suggestedColumn)?.[0] && (
                        <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                          e.g. "{columnSamplesMap.get(suggestedColumn)![0]}"
                        </span>
                      )}
                    </div>
                    {currentValue === suggestedColumn && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 ml-2" />
                    )}
                  </button>
                </div>
              )}

            {/* All Detected Spreadsheet Columns */}
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Available Columns ({filteredHeaders.length})
              </div>

              {filteredHeaders.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  No columns match "{searchQuery}"
                </div>
              ) : (
                filteredHeaders.map((header) => {
                  const samples = columnSamplesMap.get(header) || [];
                  const isSelected = currentValue === header;

                  return (
                    <button
                      key={header}
                      type="button"
                      onClick={() => handleSelectColumn(header)}
                      className={`w-full flex items-start justify-between p-2 rounded-xl text-xs text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                          {header}
                        </span>
                        {samples.length > 0 ? (
                          <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                            e.g. "{samples[0]}"
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">
                            No sample values
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
