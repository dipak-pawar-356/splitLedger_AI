"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
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

export function MappingColumnDropdown({
  fieldKey: _fieldKey,
  fieldLabel: _fieldLabel,
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
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition-all duration-200 text-left cursor-pointer group ${
          isOpen
            ? "border-primary ring-2 ring-primary/20 bg-background shadow-md"
            : hasDuplicate
            ? "border-amber-400 dark:border-amber-600 bg-amber-500/[0.06] hover:border-amber-500 shadow-2xs"
            : currentValue
            ? "border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900/90 hover:border-primary/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 hover:shadow-xs shadow-2xs"
            : "border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100/50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {currentValue ? (
            <>
              <div className="p-1 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform">
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
            isOpen ? "rotate-180 text-primary" : "group-hover:text-slate-600 dark:group-hover:text-slate-300"
          }`}
        />
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-full sm:min-w-[340px] max-w-sm rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card/95 backdrop-blur-2xl shadow-2xl p-2 animate-in fade-in-50 zoom-in-95 duration-150 space-y-1.5">
          {/* Search Header */}
          <div className="relative p-0.5">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spreadsheet columns..."
              className="w-full pl-8 pr-7 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Scrollable Column Options */}
          <div className="max-h-64 overflow-y-auto space-y-1 p-0.5 pr-1">
            {/* Option: [ Do Not Map / Ignore ] */}
            <button
              type="button"
              onClick={() => handleSelectColumn("")}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
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
            {suggestedColumn &&
              confidence &&
              detectedHeaders.includes(suggestedColumn) &&
              (!searchQuery ||
                suggestedColumn.toLowerCase().includes(searchQuery.toLowerCase())) && (
                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Recommended Match</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectColumn(suggestedColumn)}
                    className={`w-full flex items-start justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      currentValue === suggestedColumn
                        ? "bg-primary/10 text-primary font-bold shadow-2xs"
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
                          e.g. &ldquo;{columnSamplesMap.get(suggestedColumn)![0]}&rdquo;
                        </span>
                      )}
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
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  No columns match &ldquo;{searchQuery}&rdquo;
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
                      className={`w-full flex items-start justify-between p-2.5 rounded-xl text-xs text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 text-primary font-bold shadow-2xs"
                          : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                          {header}
                        </span>
                        {samples.length > 0 ? (
                          <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                            e.g. &ldquo;{samples[0]}&rdquo;
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">
                            No sample values
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
        </div>
      )}
    </div>
  );
}
