"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ContactTransactionMenu,
  type ContactTransactionItem,
} from "./contact-transaction-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileText,
  Calendar,
  Filter,
  Paperclip,
  CheckCircle2,
  Clock,
  Ban,
  PlusCircle,
  LayoutDashboard,
  Layers,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface ContactTransactionHistoryProps {
  transactions: ContactTransactionItem[];
  openingBalancePaise: number;
  contactPublicId: string;
  contactName: string;
  currency?: string;
  onOpenAdjust?: () => void;
  onSuccess?: () => void;
}

export function ContactTransactionHistory({
  transactions,
  openingBalancePaise,
  contactPublicId,
  contactName,
  currency = "INR",
  onOpenAdjust,
  onSuccess,
}: ContactTransactionHistoryProps) {
  // Filters & State
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "adjustment">("all");
  const [syncFilter, setSyncFilter] = useState<"all" | "synced" | "unsynced">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Debounce search input (~250ms) without page reload
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 1. Calculate chronological running balance for every transaction
  const transactionsWithRunningBalance = useMemo(() => {
    // Sort oldest to newest first to calculate running balance
    const sortedChronological = [...transactions].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return timeA - timeB;
    });

    let currentLedgerBalance = openingBalancePaise;

    const withBalance = sortedChronological.map((tx) => {
      const isPositive =
        tx.type === "received" ||
        tx.type === "lent" ||
        tx.type === "repaid" ||
        (tx.type === "adjustment" &&
          (JSON.stringify(tx.tags || "").includes("credit") ||
            JSON.stringify(tx.tags || "").includes("increase")));

      const delta = isPositive ? tx.amount : -tx.amount;
      currentLedgerBalance += delta;

      return {
        ...tx,
        isPositive,
        runningBalancePaise: currentLedgerBalance,
      };
    });

    return withBalance;
  }, [transactions, openingBalancePaise]);

  // 2. Filter transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const query = debouncedQuery.toLowerCase().trim();
    const cleanNumericQuery = query.replace(/[₹,\s\+\-]/g, "");

    return transactionsWithRunningBalance.filter((tx) => {
      const txDate = new Date(tx.date);

      // Time Filter
      if (timeFilter === "today" && txDate < startOfToday) return false;
      if (timeFilter === "week" && txDate < startOfWeek) return false;
      if (timeFilter === "month" && txDate < startOfMonth) return false;

      // Type Filter
      if (typeFilter === "income") {
        if (!tx.isPositive) return false;
      } else if (typeFilter === "expense") {
        if (tx.isPositive) return false;
      } else if (typeFilter === "adjustment") {
        if (tx.type !== "adjustment" && !JSON.stringify(tx.tags || "").includes("adjustment")) {
          return false;
        }
      }

      // Sync Filter
      if (syncFilter === "synced" && !tx.isSyncedToDashboard) return false;
      if (syncFilter === "unsynced" && tx.isSyncedToDashboard) return false;

      // Search Query
      if (query) {
        const titleStr = (tx.title || "").toLowerCase();
        const descStr = (tx.description || "").toLowerCase();
        const notesStr = (tx.notes || "").toLowerCase();
        const catStr = (tx.categoryName || "").toLowerCase();
        const methodStr = (tx.paymentMethod || "").toLowerCase();
        const typeStr = tx.type.toLowerCase();
        const statusStr = (tx.status || "completed").toLowerCase();
        const idStr = (tx.publicId || "").toLowerCase();
        const contactStr = contactName.toLowerCase();
        const creatorStr = (tx.createdByName || "").toLowerCase();

        // Amount representations
        const amountNum = tx.amount / 100;
        const amountStr = amountNum.toString();
        const amountFormatted = formatCurrency(amountNum, tx.currency).toLowerCase();
        const signedAmountStr = `${tx.isPositive ? "+" : "-"}${amountNum}`;
        const decimalAmountStr = amountNum.toFixed(2);

        // Running balance representations
        const runNum = tx.runningBalancePaise / 100;
        const runStr = runNum.toString();
        const runFormatted = formatCurrency(runNum, tx.currency).toLowerCase();

        // Date representations
        const formattedDateStr = formatDate(tx.date).toLowerCase();
        const monthShort = txDate.toLocaleString("default", { month: "short" }).toLowerCase();
        const monthLong = txDate.toLocaleString("default", { month: "long" }).toLowerCase();
        const yearStr = txDate.getFullYear().toString();

        const matchesKeyword =
          titleStr.includes(query) ||
          descStr.includes(query) ||
          notesStr.includes(query) ||
          catStr.includes(query) ||
          methodStr.includes(query) ||
          typeStr.includes(query) ||
          statusStr.includes(query) ||
          idStr.includes(query) ||
          contactStr.includes(query) ||
          creatorStr.includes(query) ||
          formattedDateStr.includes(query) ||
          monthShort.includes(query) ||
          monthLong.includes(query) ||
          yearStr.includes(query) ||
          amountStr.includes(query) ||
          amountFormatted.includes(query) ||
          signedAmountStr.includes(query) ||
          decimalAmountStr.includes(query) ||
          runStr.includes(query) ||
          runFormatted.includes(query);

        // Also check if user typed "credit", "debit", "loan", "lent", "repaid", etc.
        const matchesCredit =
          query.includes("credit") && (tx.isPositive || JSON.stringify(tx.tags || "").includes("credit"));
        const matchesDebit =
          query.includes("debit") && (!tx.isPositive || JSON.stringify(tx.tags || "").includes("debit"));

        // Clean numeric match (e.g. searching '300' matches 300, 300.00, 3000)
        const matchesNumeric =
          cleanNumericQuery.length > 0 &&
          (amountStr.includes(cleanNumericQuery) ||
            decimalAmountStr.includes(cleanNumericQuery) ||
            runStr.includes(cleanNumericQuery));

        if (!matchesKeyword && !matchesCredit && !matchesDebit && !matchesNumeric) {
          return false;
        }
      }

      return true;
    });
  }, [transactionsWithRunningBalance, timeFilter, typeFilter, syncFilter, debouncedQuery, contactName]);

  // 3. Sort filtered transactions for display
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortBy === "date_desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "date_asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === "amount_desc") {
        return b.amount - a.amount;
      }
      if (sortBy === "amount_asc") {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [filteredTransactions, sortBy]);

  // 4. Pagination
  const totalItems = sortedTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, validCurrentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search amount (₹300), type (credit), category, notes, date, ID..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10 rounded-2xl text-xs bg-card border-slate-200/80 dark:border-slate-800 focus-visible:ring-primary/20 transition-all"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Filter Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs">
            {(
              [
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTimeFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-xl font-semibold transition-all duration-200 ${
                  timeFilter === tab.id
                    ? "bg-card text-primary shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sync Status Filter */}
          <Select
            value={syncFilter}
            onValueChange={(val: any) => {
              setSyncFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs font-semibold w-36 bg-card border-slate-200/80 dark:border-slate-800">
              <SelectValue placeholder="Dashboard Sync" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="text-xs">
                All Sync States
              </SelectItem>
              <SelectItem value="synced" className="text-xs">
                Synced to Dashboard
              </SelectItem>
              <SelectItem value="unsynced" className="text-xs">
                Not Added to Dashboard
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter Select */}
          <Select
            value={typeFilter}
            onValueChange={(val: any) => {
              setTypeFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs font-semibold w-32 bg-card border-slate-200/80 dark:border-slate-800">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all" className="text-xs">
                All Types
              </SelectItem>
              <SelectItem value="income" className="text-xs">
                Income / Credit (+)
              </SelectItem>
              <SelectItem value="expense" className="text-xs">
                Expense / Debit (-)
              </SelectItem>
              <SelectItem value="adjustment" className="text-xs">
                Adjustments
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Select */}
          <Select
            value={sortBy}
            onValueChange={(val: any) => {
              setSortBy(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-9 rounded-xl text-xs font-semibold w-36 bg-card border-slate-200/80 dark:border-slate-800">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="date_desc" className="text-xs">
                Date: Newest
              </SelectItem>
              <SelectItem value="date_asc" className="text-xs">
                Date: Oldest
              </SelectItem>
              <SelectItem value="amount_desc" className="text-xs">
                Amount: High to Low
              </SelectItem>
              <SelectItem value="amount_asc" className="text-xs">
                Amount: Low to High
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions Table View */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Running Balance</th>
                <th className="py-3.5 px-3 text-center">Dashboard Sync</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3">Created By</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginatedTransactions.map((tx) => {
                const isPositive = tx.isPositive;
                const formattedDate = formatDate(tx.date);

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors group"
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`p-1 rounded-lg ${
                            isPositive
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                          {tx.type}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge
                        variant="secondary"
                        className="rounded-lg text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {tx.categoryName || "General"}
                      </Badge>
                    </td>

                    {/* Description & Notes */}
                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="space-y-0.5">
                        <Link
                          href={`/dashboard/transactions/${tx.publicId}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-primary transition-colors block line-clamp-1"
                        >
                          {tx.title || tx.description}
                        </Link>
                        {tx.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1">
                            <FileText className="h-2.5 w-2.5 shrink-0" />
                            <span>{tx.notes}</span>
                          </p>
                        )}
                        {tx.receiptUrl && (
                          <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                            <Paperclip className="h-2.5 w-2.5" />
                            <span>Attachment attached</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {isPositive ? "+" : "-"}
                        {formatCurrency(tx.amount / 100, tx.currency)}
                      </span>
                    </td>

                    {/* Running Balance */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-xs ${
                          tx.runningBalancePaise > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : tx.runningBalancePaise < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-500"
                        }`}
                      >
                        {formatCurrency(tx.runningBalancePaise / 100, tx.currency)}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-semibold uppercase">
                        {tx.runningBalancePaise > 0
                          ? "Owed to you"
                          : tx.runningBalancePaise < 0
                          ? "You owe"
                          : "Settled"}
                      </span>
                    </td>

                    {/* Synchronization Badge (Requirement 7) */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {tx.dashboardStatus === "reflected" || tx.isSyncedToDashboard ? (
                        <span
                          title="This transaction is included in Dashboard Financial Summary."
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-emerald-500/30 text-emerald-600 bg-emerald-500/10 dark:bg-emerald-950/40 cursor-help transition-all duration-150 hover:scale-105"
                        >
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>✓ Added to Dashboard</span>
                        </span>
                      ) : tx.dashboardStatus === "pending" ? (
                        <span
                          title="Transaction reflection pending confirmation."
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-amber-500/30 text-amber-600 bg-amber-500/10 dark:bg-amber-950/40 cursor-help transition-all duration-150 hover:scale-105"
                        >
                          <Clock className="h-3 w-3 text-amber-600" />
                          <span>Pending</span>
                        </span>
                      ) : (
                        <span
                          title="Stored in contact ledger only. Click menu to add to dashboard."
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-slate-300 dark:border-slate-700 text-slate-500 bg-slate-100/80 dark:bg-slate-800/80 cursor-help transition-all duration-150 hover:scale-105"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          <span>Not Added</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 font-bold uppercase rounded-md ${
                          tx.status === "completed"
                            ? "border-emerald-500/30 text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30"
                            : tx.status === "cancelled"
                            ? "border-rose-500/30 text-rose-600 bg-rose-50/40"
                            : "border-amber-500/30 text-amber-600 bg-amber-50/40"
                        }`}
                      >
                        {tx.status || "Completed"}
                      </Badge>
                    </td>

                    {/* Created By */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 text-[11px] font-medium">
                      {tx.createdByName || "You"}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <ContactTransactionMenu
                        transaction={tx}
                        contactPublicId={contactPublicId}
                        contactName={contactName}
                        onOpenAdjust={onOpenAdjust}
                        onSuccess={onSuccess}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {sortedTransactions.length === 0 && (
          <div className="py-14 px-4 text-center space-y-3">
            <div className="p-3.5 rounded-3xl bg-primary/10 text-primary w-14 h-14 flex items-center justify-center mx-auto">
              <Receipt className="h-7 w-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {debouncedQuery || timeFilter !== "all" || typeFilter !== "all" || syncFilter !== "all"
                  ? "No matching transactions found"
                  : "No transactions recorded yet"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {debouncedQuery || timeFilter !== "all" || typeFilter !== "all" || syncFilter !== "all"
                  ? "Try clearing filters or adjusting your search keywords."
                  : "Start building the financial history by adding a balance or recording an expense."}
              </p>
            </div>
            {onOpenAdjust && (
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={onOpenAdjust}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add First Balance Entry</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span>Showing</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {Math.min(totalItems, (validCurrentPage - 1) * pageSize + 1)}-
                {Math.min(totalItems, validCurrentPage * pageSize)}
              </span>
              <span>of</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span>
              <span>transactions</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Rows Per Page */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg bg-card border border-slate-200 dark:border-slate-800 text-xs py-1 px-1.5 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Prev / Next controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={validCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-lg"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-semibold px-2">
                  {validCurrentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 rounded-lg"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
