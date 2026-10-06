"use client";

import { useState, useEffect } from "react";
import { Search, X, FileText, Users, CreditCard, Tag, MessageSquare, Calendar, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { globalSearch, type SearchResultItem } from "@/actions/search";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await globalSearch(query.trim());
        setResults(res || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 250);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleResultClick = (result: SearchResultItem) => {
    router.push(result.link);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "contact":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "group":
        return <Users className="h-4 w-4 text-emerald-500" />;
      case "transaction":
        return <CreditCard className="h-4 w-4 text-indigo-500" />;
      case "category":
        return <Tag className="h-4 w-4 text-amber-500" />;
      case "settlement":
        return <Activity className="h-4 w-4 text-teal-500" />;
      default:
        return <FileText className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 w-44 sm:w-64 justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span>Search...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-background border rounded-md text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in-0 duration-150">
          <div className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Search Input Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <Search className="h-5 w-5 text-primary shrink-0" />
              <input
                type="text"
                placeholder="Search transactions, groups, members, public IDs (txn_...)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="w-full bg-transparent border-none text-sm outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Searching records...
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleResultClick(item)}
                      className="p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 flex items-center justify-between cursor-pointer transition-colors gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                          {getIcon(item.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors truncate">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {item.amount !== undefined && item.amount > 0 && (
                          <p className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {formatCurrency(item.amount / 100, item.currency || "INR")}
                          </p>
                        )}
                        <span className="text-[10px] uppercase font-mono text-slate-400">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : query.trim().length >= 2 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-semibold">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px]">Try searching by Transaction ID, description, amount, or group name.</p>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  Type at least 2 characters to search across all records
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-4">
              <span>Navigate with mouse or keyboard</span>
              <kbd className="text-[10px] px-1.5 py-0.5 border rounded bg-background">ESC to close</kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
