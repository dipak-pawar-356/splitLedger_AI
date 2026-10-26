"use client";

import { useState, useEffect, useRef } from "react";
import { globalSearch, SearchResultItem } from "@/actions/search";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Receipt,
  Users,
  Target,
  FileText,
  CreditCard,
  ArrowUpRight,
  Loader2,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export function GlobalAISearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearch(query.trim());
        setResults(res);
        setIsOpen(true);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredResults =
    selectedFilter === "all"
      ? results
      : results.filter((r) => r.type === selectedFilter);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "transaction":
        return <Receipt className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
      case "group":
      case "trip":
        return <Users className="h-4 w-4 text-indigo-500" aria-hidden="true" />;
      case "budget":
        return <Target className="h-4 w-4 text-amber-500" aria-hidden="true" />;
      case "document":
      case "note":
        return <FileText className="h-4 w-4 text-blue-500" aria-hidden="true" />;
      case "settlement":
        return <CreditCard className="h-4 w-4 text-purple-500" aria-hidden="true" />;
      default:
        return <Receipt className="h-4 w-4 text-primary" aria-hidden="true" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center group">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none" aria-hidden="true" />
        <Input
          ref={inputRef}
          value={query}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="ai-search-results-list"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-label="Global AI Search across transactions, groups, budgets, notes, and settlements"
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Global AI Search across transactions, groups, budgets, notes, and settlements..."
          className="rounded-2xl pl-10 pr-20 h-11 text-xs sm:text-sm bg-background border-slate-200/80 dark:border-slate-800 focus-visible:ring-primary/40 focus-visible:ring-2 shadow-xs transition-all"
          suppressHydrationWarning
        />
        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isSearching ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" aria-label="Searching database..." />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              aria-label="Focus search input (Shortcut: Ctrl+K or Cmd+K)"
              className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Ctrl+K
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (results.length > 0 || (query.trim() && !isSearching)) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-popover/95 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Filter Pills */}
          {results.length > 0 && (
            <div
              role="radiogroup"
              aria-label="Filter search results by type"
              className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
            >
              {[
                { key: "all", label: "All" },
                { key: "transaction", label: "Transactions" },
                { key: "group", label: "Groups" },
                { key: "budget", label: "Budgets" },
                { key: "document", label: "Notes" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={selectedFilter === f.key}
                  onClick={() => setSelectedFilter(f.key)}
                  className={`px-2.5 py-1 min-h-[30px] rounded-xl text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    selectedFilter === f.key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-[10px] text-slate-400 ml-auto font-mono shrink-0">
                {filteredResults.length} match{filteredResults.length === 1 ? "" : "es"}
              </span>
            </div>
          )}

          {/* Results List */}
          <div
            id="ai-search-results-list"
            role="listbox"
            aria-label="Matching search results"
            className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
          >
            {filteredResults.length > 0 ? (
              filteredResults.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.link}
                  role="option"
                  aria-selected="false"
                  onClick={() => setIsOpen(false)}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-900/50 outline-none transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getEntityIcon(item.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.subtitle || item.type.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.amount !== undefined && (
                      <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.amount, "INR")}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {item.type}
                    </Badge>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-slate-500 space-y-1">
                <p className="font-semibold">No records found for &quot;{query}&quot;</p>
                <p className="text-[11px] text-slate-400">
                  Try searching by merchant, group name, category, or note title.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
