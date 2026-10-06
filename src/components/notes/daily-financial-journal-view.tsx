"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  Save,
  CheckCircle2,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Target,
  Trophy,
  Download,
  Filter,
  Search,
  CalendarDays,
  ListChecks,
  X,
  CreditCard,
  HandCoins,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getDailyFinancialJournal, saveDailyJournalReflection } from "@/actions/notes";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MOODS = [
  { id: "great", emoji: "🤩", label: "Optimistic" },
  { id: "good", emoji: "😊", label: "Good" },
  { id: "neutral", emoji: "😐", label: "Balanced" },
  { id: "stressed", emoji: "😟", label: "Cautious" },
  { id: "frustrated", emoji: "😤", label: "Stressed" },
];

export function DailyFinancialJournalView() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [journalData, setJournalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingReflection, setIsSavingReflection] = useState(false);

  // Mobile Bottom Sheet Date Picker Dialog State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "expenses" | "incomes">("all");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Reflection Form State
  const [mood, setMood] = useState("good");
  const [dailyGoal, setDailyGoal] = useState("");
  const [dailyAchievement, setDailyAchievement] = useState("");
  const [financialReflection, setFinancialReflection] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchJournal = async (dStr: string) => {
    setIsLoading(true);
    try {
      const res = await getDailyFinancialJournal(dStr);
      setJournalData(res);
      if (res.reflection) {
        setMood(res.reflection.mood || "good");
        setDailyGoal(res.reflection.dailyGoal || "");
        setDailyAchievement(res.reflection.dailyAchievement || "");
        setFinancialReflection(res.reflection.financialReflection || "");
      } else {
        setMood("good");
        setDailyGoal("");
        setDailyAchievement("");
        setFinancialReflection("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load daily financial journal");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal(currentDate);
  }, [currentDate]);

  const changeDate = (days: number) => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + days);
    const newStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    setCurrentDate(newStr);
  };

  const jumpToToday = () => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setCurrentDate(today);
    setIsDatePickerOpen(false);
  };

  const handleSaveReflection = async () => {
    setIsSavingReflection(true);
    try {
      await saveDailyJournalReflection(currentDate, {
        mood,
        dailyGoal,
        dailyAchievement,
        financialReflection,
      });
      toast.success("Daily reflection saved to database!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save reflection");
    } finally {
      setIsSavingReflection(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format: "txt" | "json") => {
    if (!journalData) return;
    let content = "";
    let mimeType = "text/plain";
    let ext = "txt";

    if (format === "json") {
      content = JSON.stringify(journalData, null, 2);
      mimeType = "application/json";
      ext = "json";
    } else {
      content = `SPLITLEdger AI - DAILY FINANCIAL JOURNAL\nDate: ${currentDate}\n\n` +
        `Income: ${journalData.income || 0}\n` +
        `Expense: ${journalData.expense || 0}\n` +
        `Net: ${journalData.net || 0}\n` +
        `Receivables: ${journalData.receivables || 0}\n` +
        `Payables: ${journalData.payables || 0}\n\n` +
        `Reflection Goal: ${dailyGoal}\n` +
        `Achievement: ${dailyAchievement}\n` +
        `Reflection: ${financialReflection}\n`;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Financial_Journal_${currentDate}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported journal as ${ext.toUpperCase()}`);
  };

  // Filtered transactions
  const filteredTransactions = (journalData?.transactions || []).filter((tx: any) => {
    if (filterType === "expenses" && tx.type !== "expense") return false;
    if (filterType === "incomes" && tx.type !== "income") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = (tx.description || tx.category || "").toLowerCase();
      return desc.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5" suppressHydrationWarning>
      {/* Top Header Card */}
      <Card className="rounded-2xl border shadow-sm p-3.5 sm:p-5 bg-card space-y-3.5">
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                Automated Daily Financial Journal
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                Aggregated ledger transactions, receivables, payables, and daily financial reflection.
              </p>
            </div>
          </div>

          {/* Desktop / Tablet Date Selector */}
          <div className="hidden sm:flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => changeDate(-1)}
              className="h-7 w-7 p-0 rounded-lg"
              title="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Input
              type="date"
              value={currentDate}
              onChange={(e) => e.target.value && setCurrentDate(e.target.value)}
              className="h-7 w-32 border-none bg-transparent text-xs font-mono font-bold text-center px-1 shadow-none focus-visible:ring-0"
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => changeDate(1)}
              className="h-7 w-7 p-0 rounded-lg"
              title="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Responsive Toolbar Chips (No Wrapping on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 no-print">
          {/* Mobile Date Picker Trigger Chip */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDatePickerOpen(true)}
            className="flex sm:hidden h-7 text-xs rounded-xl px-2.5 gap-1 shrink-0 font-mono font-bold text-primary border-primary/30"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{currentDate}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={jumpToToday}
            className="h-7 text-xs rounded-xl px-2.5 shrink-0 font-semibold"
          >
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-7 text-xs rounded-xl px-2.5 gap-1 shrink-0"
          >
            <Printer className="h-3 w-3" />
            <span>Print</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport("txt")}
            className="h-7 text-xs rounded-xl px-2.5 gap-1 shrink-0"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </Button>

          {/* Filter Chips */}
          <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900 shrink-0">
            {(["all", "expenses", "incomes"] as const).map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => setFilterType(ft)}
                className={`px-2 py-0.5 text-xs rounded-lg font-medium transition-all capitalize ${
                  filterType === ft ? "bg-white dark:bg-slate-800 text-primary shadow-xs font-bold" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {ft}
              </button>
            ))}
          </div>

          {/* Search Toggle */}
          {isSearchVisible ? (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 h-7 shrink-0">
              <Search className="h-3 w-3 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="bg-transparent text-xs w-28 sm:w-36 outline-hidden border-none text-slate-700 dark:text-slate-200"
                autoFocus
              />
              <button type="button" onClick={() => { setSearchQuery(""); setIsSearchVisible(false); }}>
                <X className="h-3 w-3 text-slate-400" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSearchVisible(true)}
              className="h-7 w-7 p-0 rounded-xl shrink-0"
              title="Search transactions"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Real-time Daily Financial KPI Cards (2 Columns on Mobile, 4 on Desktop, Never 1 Stretching) */}
        {journalData && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            {/* 1. Income */}
            <div className="p-3 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1 flex items-center gap-1">
                <ArrowDownLeft className="h-3 w-3" /> Income Received
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(journalData.income || 0)}
              </span>
            </div>

            {/* 2. Expense */}
            <div className="p-3 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block mb-1 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Expense Paid
              </span>
              <span className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300">
                {formatCurrency(journalData.expense || 0)}
              </span>
            </div>

            {/* 3. Net Cashflow */}
            <div className="p-3 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Net Cashflow
              </span>
              <span
                className={`text-base sm:text-lg font-bold ${
                  (journalData.net || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatCurrency(journalData.net || 0)}
              </span>
            </div>

            {/* 4. Receivables */}
            <div className="p-3 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block mb-1 flex items-center gap-1">
                <HandCoins className="h-3 w-3" /> Receivables
              </span>
              <span className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(journalData.receivables || 0)}
              </span>
            </div>

            {/* 5. Payables */}
            <div className="p-3 rounded-2xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block mb-1 flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Payables
              </span>
              <span className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-300">
                {formatCurrency(journalData.payables || 0)}
              </span>
            </div>

            {/* 6. Transactions Count */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Transactions
              </span>
              <span className="text-base sm:text-lg font-bold text-primary">
                {journalData.txCount || 0} items
              </span>
            </div>

            {/* 7. Notes Recorded */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Notes
              </span>
              <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                {journalData.notes?.length || 0} recorded
              </span>
            </div>

            {/* 8. Tasks Due */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
                <ListChecks className="h-3 w-3" /> Tasks
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {journalData.tasksCount || 0} active
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Main Journal Body: Transactions + Reflection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* LEFT 7 COLS: Daily Transactions & Linked Notes */}
        <div className="lg:col-span-7 space-y-4">
          {/* Daily Ledger Transactions */}
          <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                Ledger Entries for {formatDate(currentDate)} ({filteredTransactions.length})
              </h4>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredTransactions.map((tx: any) => {
                const isExpense = tx.type === "expense";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isExpense ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        {isExpense ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {tx.description || tx.category || "Transaction"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {tx.accountName || "Main Account"} {tx.category ? `• ${tx.category}` : ""}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`font-bold font-mono text-xs shrink-0 ml-2 ${
                        isExpense ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}

              {filteredTransactions.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <DollarSign className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">No matching transactions recorded for this day</p>
                </div>
              )}
            </div>
          </Card>

          {/* Daily Notes List */}
          <Card className="rounded-2xl border shadow-sm p-4 space-y-3 bg-card">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              Journal Notes for {formatDate(currentDate)} ({journalData?.notes?.length || 0})
            </h4>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {journalData?.notes?.map((n: any) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{n.title}</span>
                    {n.categoryName && (
                      <Badge variant="outline" className="text-[10px]">
                        {n.categoryName}
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2 text-[11px]">
                    {n.plainText || "No content"}
                  </p>
                </div>
              ))}

              {(!journalData?.notes || journalData.notes.length === 0) && (
                <div className="py-6 text-center text-slate-400 text-xs bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="h-6 w-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="font-medium text-slate-600 dark:text-slate-400">No notes written on this date</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT 5 COLS: Daily Mindset, Goals & Financial Reflection */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="rounded-2xl border shadow-sm p-4 sm:p-5 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Daily Mindset & Reflection
              </h4>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                DB-Backed
              </Badge>
            </div>

            {/* Financial Sentiment / Mood Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Financial Sentiment & Mood
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMood(m.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      mood === m.id
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs scale-105"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600"
                    }`}
                  >
                    <span className="text-xl mb-0.5">{m.emoji}</span>
                    <span className="text-[9px] truncate w-full text-center">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Goal */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-blue-500" /> Daily Financial Target
              </label>
              <Input
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="e.g., Keep total spending under ₹1,500; follow budget."
                className="h-8 text-xs rounded-xl"
              />
            </div>

            {/* Daily Achievement */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" /> Daily Win / Achievement
              </label>
              <Input
                value={dailyAchievement}
                onChange={(e) => setDailyAchievement(e.target.value)}
                placeholder="e.g., Avoided impulse purchase; closed invoice #204."
                className="h-8 text-xs rounded-xl"
              />
            </div>

            {/* Reflection Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                End-of-Day Financial Reflection
              </label>
              <textarea
                value={financialReflection}
                onChange={(e) => setFinancialReflection(e.target.value)}
                placeholder="How did your financial decisions feel today? Any key takeaways or upcoming cash commitments?"
                rows={4}
                className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Save Button */}
            <Button
              type="button"
              onClick={handleSaveReflection}
              disabled={isSavingReflection}
              className="w-full rounded-xl text-xs font-semibold gap-1.5 h-9 bg-primary text-white"
            >
              {isSavingReflection ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isSavingReflection ? "Saving Reflection..." : "Save Today's Reflection"}</span>
            </Button>
          </Card>
        </div>
      </div>

      {/* MOBILE BOTTOM SHEET DATE PICKER DIALOG */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="sm:max-w-xs rounded-2xl p-4">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-2">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span>Select Journal Date</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Quick Days Selector */}
            <div className="flex items-center justify-between gap-1 border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50 dark:bg-slate-900">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => changeDate(-1)}
                className="h-8 flex-1 text-xs rounded-lg"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => changeDate(1)}
                className="h-8 flex-1 text-xs rounded-lg"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            {/* Explicit Date Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">Pick Specific Date</label>
              <Input
                type="date"
                value={currentDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setCurrentDate(e.target.value);
                    setIsDatePickerOpen(false);
                  }
                }}
                className="h-9 text-xs rounded-xl text-center font-mono font-bold"
              />
            </div>

            {/* Jump To Today */}
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={jumpToToday}
              className="w-full text-xs rounded-xl h-8 font-semibold bg-primary text-white"
            >
              Jump To Today
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
