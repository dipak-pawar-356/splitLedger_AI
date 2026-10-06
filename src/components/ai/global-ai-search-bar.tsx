"use client";

import { useState, useEffect, useRef } from "react";
import { globalSearch, SearchResultItem } from "@/actions/search";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Sparkles,
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
        return <Receipt className="h-4 w-4 text-emerald-500" />;
      case "group":
      case "trip":
        return <Users className="h-4 w-4 text-indigo-500" />;
      case "budget":
        return <Target className="h-4 w-4 text-amber-500" />;
      case "document":
      case "note":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "settlement":
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <Receipt className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Global AI Search across transactions, groups, budgets, notes, and settlements..."
          className="rounded-2xl pl-10 pr-10 h-11 text-xs bg-background border-slate-200/80 dark:border-slate-800 shadow-sm"
          suppressHydrationWarning
        />
        {isSearching ? (
          <Loader2 className="absolute right-3.5 h-4 w-4 text-primary animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3.5 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      {isOpen && (results.length > 0 || (query.trim() && !isSearching)) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-popover border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Filter Pills */}
          {results.length > 0 && (
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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
                  onClick={() => setSelectedFilter(f.key)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    selectedFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="text-[10px] text-slate-400 ml-auto font-mono">
                {filteredResults.length} match{filteredResults.length === 1 ? "" : "es"}
              </span>
            </div>
          )}

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredResults.length > 0 ? (
              filteredResults.map((item, idx) => (
                <Link
                  key={idx}
                  href={item.link}
                  onClick={() => setIsOpen(false)}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
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
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.amount, "INR")}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {item.type}
                    </Badge>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
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
