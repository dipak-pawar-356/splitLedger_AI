"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  ChevronDown,
  Search,
  Check,
  Ban,
  Sparkles,
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

export const MappingColumnDropdown = React.memo(function MappingColumnDropdown({
  fieldKey: _fieldKey,
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
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Build selectable items list for keyboard navigation
  // Index 0 is always [ Do Not Map / Ignore ]
  // If recommended match exists and matches query, index 1 is recommended match
  const showRecommended = Boolean(
    suggestedColumn &&
      confidence &&
      detectedHeaders.includes(suggestedColumn) &&
      (!searchQuery ||
        suggestedColumn.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const flatOptions = useMemo(() => {
    const list: Array<{ value: string; isIgnore?: boolean }> = [
      { value: "", isIgnore: true },
    ];
    if (showRecommended && suggestedColumn) {
      list.push({ value: suggestedColumn });
    }
    filteredHeaders.forEach((h) => {
      // Don't duplicate recommended if already shown
      if (!showRecommended || h !== suggestedColumn) {
        list.push({ value: h });
      }
    });
    return list;
  }, [showRecommended, suggestedColumn, filteredHeaders]);

  // Reset search and highlight on open/close
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  const handleSelectColumn = useCallback(
    (col: string) => {
      onSelect(col);
      setIsOpen(false);
    },
    [onSelect]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < flatOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : flatOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatOptions[highlightedIndex]) {
        handleSelectColumn(flatOptions[highlightedIndex].value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const listboxId = `mapping-listbox-${_fieldKey}`;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-label={`Select spreadsheet column for ${fieldLabel}`}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 sm:py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary ${
            isOpen
              ? "border-primary ring-2 ring-primary/20 bg-background shadow-md"
              : hasDuplicate
              ? "border-amber-400 dark:border-amber-600 bg-amber-500/[0.06] hover:border-amber-500 shadow-2xs"
              : currentValue
              ? "border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 hover:border-primary/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 hover:shadow-xs shadow-2xs active:scale-[0.99]"
              : "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30 text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100/60 active:scale-[0.99]"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {currentValue ? (
              <>
                <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                  {currentValue}
                </span>
                {hasDuplicate ? (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold shrink-0 animate-pulse"
                  >
                    Duplicate
                  </Badge>
                ) : isAutoMapped ? (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-emerald-300/80 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold shrink-0 gap-0.5 shadow-2xs"
                  >
                    <Sparkles className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{confidence?.confidence || 100}%</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shrink-0 shadow-2xs"
                  >
                    Selected
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Ban className="h-3.5 w-3.5 text-slate-400/80 shrink-0" />
                <span className="text-slate-400 italic truncate font-normal">
                  [ Do Not Map / Ignore ]
                </span>
              </>
            )}
          </div>

          <ChevronDown
            className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen
                ? "rotate-180 text-primary"
                : "group-hover:text-slate-600 dark:group-hover:text-slate-300"
            }`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions={true}
        collisionPadding={16}
        className="z-[80] w-[320px] sm:w-[360px] p-2 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card/95 backdrop-blur-2xl shadow-2xl space-y-1.5 outline-none"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="relative p-0.5">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search spreadsheet columns..."
            aria-label="Search spreadsheet columns"
            className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Column Options */}
        <div
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label="Available spreadsheet columns"
          className="max-h-[260px] overflow-y-auto space-y-1 p-0.5 pr-1 scrollbar-thin"
        >
          {/* Option: [ Do Not Map / Ignore ] */}
          <button
            type="button"
            role="option"
            aria-selected={!currentValue}
            onClick={() => handleSelectColumn("")}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
              highlightedIndex === 0 ? "ring-1 ring-primary/40" : ""
            } ${
              !currentValue
                ? "bg-primary/10 text-primary font-bold shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Ban className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="block font-semibold">[ Do Not Map / Ignore ]</span>
                <span className="text-[10px] text-slate-400 block font-normal">
                  Leave unmapped during import
                </span>
              </div>
            </div>
            {!currentValue && <Check className="h-4 w-4 text-primary shrink-0" />}
          </button>

          {/* Suggested Column Group (if confident match exists) */}
          {showRecommended && suggestedColumn && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>Recommended Match</span>
              </div>
              <button
                type="button"
                role="option"
                aria-selected={currentValue === suggestedColumn}
                onClick={() => handleSelectColumn(suggestedColumn)}
                className={`w-full flex items-start justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                  highlightedIndex === 1 ? "ring-1 ring-primary/40" : ""
                } ${
                  currentValue === suggestedColumn
                    ? "bg-primary/10 text-primary font-bold shadow-2xs"
                    : "hover:bg-emerald-500/[0.08] dark:hover:bg-emerald-950/30"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {suggestedColumn}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 border-emerald-400 text-emerald-700 dark:text-emerald-300 font-bold"
                    >
                      {confidence?.confidence || 100}% Confidence
                    </Badge>
                  </div>
                  {columnSamplesMap.get(suggestedColumn)?.length ? (
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5 font-mono">
                      e.g. {columnSamplesMap.get(suggestedColumn)!.slice(0, 2).join(", ")}
                    </span>
                  ) : null}
                </div>
                {currentValue === suggestedColumn && (
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5 ml-2" />
                )}
              </button>
            </div>
          )}

          {/* All Detected Spreadsheet Columns */}
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Available Columns ({filteredHeaders.length})
            </div>
            {filteredHeaders.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                No matching columns found
              </div>
            ) : (
              filteredHeaders.map((header, idx) => {
                const isSelected = currentValue === header;
                const samples = columnSamplesMap.get(header) || [];
                const itemIdx = showRecommended ? idx + 2 : idx + 1;
                const isHighlighted = highlightedIndex === itemIdx;

                return (
                  <button
                    key={header}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectColumn(header)}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      isHighlighted ? "ring-1 ring-primary/40" : ""
                    } ${
                      isSelected
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
                        : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {header}
                        </span>
                      </div>
                      {samples.length > 0 && (
                        <span className="text-[10px] text-slate-400 block truncate mt-0.5 font-mono">
                          e.g. {samples.slice(0, 2).join(", ")}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
