"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  FinancialIntelligenceData,
  getFinancialIntelligence,
} from "@/actions/financial-intelligence";
import { subscribeFinancialEvents } from "@/lib/events/financial-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  TrendingUp,
  ShieldCheck,
  Brain,
  Camera,
  RefreshCw,
  Repeat,
  Mic,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";
import { SplitLedgerAiIcon } from "@/components/ai/split-ledger-ai-icon";
import { FinancialIntelligenceControlCenter, PeriodFilter } from "@/components/ai/financial-intelligence-control-center";
import { FinancialForecastingEnterpriseView } from "@/components/ai/financial-forecasting-enterprise-view";
import { AIFinancialAssistantCard } from "@/components/ai/ai-financial-assistant-card";
import { AIBudgetAndRemindersHub, ReminderItem } from "@/components/ai/ai-budget-and-reminders-hub";
import { AIBudgetEnterpriseDashboard } from "@/components/ai/ai-budget-enterprise-dashboard";
import { AISubscriptionsCard } from "@/components/ai/ai-subscriptions-card";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { VoiceAssistantPanel } from "@/components/ai/voice-assistant-panel";
import { AutomationRulesBuilder } from "@/components/ai/automation-rules-builder";
import { AIReceiptScannerModal } from "@/components/receipts/ai-receipt-scanner-modal";
import { SharedMonthSelector } from "@/components/common/shared-month-selector";
import { useMonthSync } from "@/hooks/use-month-sync";
import { toast } from "sonner";

interface FinancialIntelligenceClientViewProps {
  initialData: FinancialIntelligenceData;
  categories: Array<{ id: number; name: string }>;
  groups: Array<{ id: number; name: string }>;
  initialReminders?: ReminderItem[];
  initialMonth?: string;
}

export function FinancialIntelligenceClientView({
  initialData,
  categories,
  groups,
  initialReminders = [],
  initialMonth,
}: FinancialIntelligenceClientViewProps) {
  const router = useRouter();
  const [data, setData] = useState<FinancialIntelligenceData>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("current_month");
  const [periodCache, setPeriodCache] = useState<Record<string, FinancialIntelligenceData>>({
    current_month: initialData,
  });
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("assistant");
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Shared synchronized month state
  const {
    selectedMonth,
    monthInfo,
    setMonth,
    goToPrevMonth,
    goToNextMonth,
    goToCurrentMonth,
  } = useMonthSync({
    initialMonth,
    onMonthChange: (newMonth) => {
      fetchDataForMonth(newMonth);
    },
  });

  const fetchDataForMonth = useCallback(async (monthStr: string) => {
    setIsPeriodLoading(true);
    try {
      const freshData = await getFinancialIntelligence(monthStr, undefined, undefined, monthStr);
      setPeriodCache((prev) => ({ ...prev, [monthStr]: freshData }));
      setData(freshData);
    } catch {
      toast.error(`Failed to load intelligence metrics for ${monthStr}`);
    } finally {
      setIsPeriodLoading(false);
    }
  }, []);

  const subSubjects = [
    { id: "assistant", label: "AI Financial Assistant", icon: SplitLedgerAiIcon, color: "text-primary" },
    { id: "insights", label: "Financial Intelligence", icon: ShieldCheck, color: "text-amber-500" },
    { id: "voice-automation", label: "Voice & Automation", icon: Mic, color: "text-indigo-500" },
    { id: "subscriptions", label: "Subscriptions", icon: Repeat, color: "text-purple-500" },
    {
      id: "budgets",
      label: "Budget Intelligence",
      badge: data.budgets.length,
      icon: Target,
      color: "text-emerald-500",
    },
    { id: "forecasting", label: "Forecasting & Charts", icon: TrendingUp, color: "text-blue-500" },
    { id: "ocr", label: "Receipt OCR", icon: Camera, color: "text-rose-500" },
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keyboard navigation across tabs for WAI-ARIA compliance
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % subSubjects.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + subSubjects.length) % subSubjects.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = subSubjects.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const target = subSubjects[nextIndex];
      setActiveTab(target.id);
      const btn = tabRefs.current[target.id];
      if (btn) {
        btn.focus();
        btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  };

  // Period switching within selected month
  const handlePeriodChange = useCallback(
    async (period: PeriodFilter, customStart?: string, customEnd?: string) => {
      setSelectedPeriod(period);
      const cacheKey = period === "custom" ? `custom_${customStart}_${customEnd}_${selectedMonth}` : `${period}_${selectedMonth}`;
      if (periodCache[cacheKey]) {
        setData(periodCache[cacheKey]);
        return;
      }
      setIsPeriodLoading(true);
      try {
        const freshData = await getFinancialIntelligence(period, customStart, customEnd, selectedMonth);
        setPeriodCache((prev) => ({ ...prev, [cacheKey]: freshData }));
        setData(freshData);
      } catch {
        toast.error("Failed to calculate metrics for selected period");
      } finally {
        setIsPeriodLoading(false);
      }
    },
    [periodCache, selectedMonth]
  );

  // Reload fresh data from database for current selected month
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const freshData = await getFinancialIntelligence(selectedMonth, undefined, undefined, selectedMonth);
      setPeriodCache((prev) => ({ ...prev, [selectedMonth]: freshData }));
      setData(freshData);
      toast.success(`Intelligence synchronized for ${monthInfo.label}`);
    } catch {
      toast.error("Failed to refresh financial intelligence data");
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedMonth, monthInfo.label]);

  // Subscribe to universal real-time events across windows & tabs
  useEffect(() => {
    const unsubscribe = subscribeFinancialEvents((payload) => {
      console.log("Real-time financial update received in AI dashboard:", payload.type);
      handleRefresh();
    });

    return () => {
      unsubscribe();
    };
  }, [handleRefresh]);

  if (!isMounted) {
    return (
      <div className="space-y-6 pb-12 animate-pulse" aria-busy="true" aria-label="Loading AI intelligence dashboard">
        <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl w-2/3" />
        <div className="h-11 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-3xl w-full" />
      </div>
    );
  }

  const tabMotionProps = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      };

  return (
    <div className="space-y-6 pb-12 ai-module-scope" suppressHydrationWarning>
      {/* Screen Reader Live Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isRefreshing ? "Synchronizing database records..." : `Financial intelligence dashboard updated for ${monthInfo.label}`}
      </div>

      {/* 1. AI Financial Intelligence Header with Synchronized Month Selector */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              AI Financial Intelligence & Assistant
            </h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary font-bold text-xs flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>₹ INR Live</span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Realtime database-driven financial health, spending patterns, forecasting & intelligent recommendations
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Shared Month Selector */}
          <SharedMonthSelector
            monthInfo={monthInfo}
            onSelectMonth={(m) => setMonth(m)}
            onPrevMonth={goToPrevMonth}
            onNextMonth={goToNextMonth}
            onCurrentMonth={goToCurrentMonth}
          />

          <Button
            size="sm"
            variant="outline"
            className="ai-btn-premium rounded-xl text-xs font-semibold gap-1.5 h-9 min-h-[36px] sm:min-h-[38px] px-3.5 focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? "Synchronizing database records" : "Refresh financial intelligence"}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </Button>
        </div>
      </header>

      {/* 2. Selected Month Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:px-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-md text-xs shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-slate-200">
            Analysing: <span className="font-mono text-primary font-bold">{monthInfo.label}</span>
          </span>
          <span className="text-slate-400 hidden xs:inline">•</span>
          <span className="text-slate-400">
            {monthInfo.isCurrentMonth
              ? `${monthInfo.elapsedDays} of ${monthInfo.totalDays} days elapsed (${monthInfo.remainingDays} days left)`
              : monthInfo.isPastMonth
              ? `Completed period (${monthInfo.totalDays} days recorded)`
              : `Upcoming planned cycle (${monthInfo.totalDays} days)`}
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/budgets?month=${selectedMonth}`)}
          className="h-7 px-2.5 rounded-xl text-primary font-bold text-xs hover:bg-primary/10 gap-1 self-start sm:self-auto group"
        >
          <span>Open Budget Center</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>

      {/* Main Feature Tabs */}
      <div className="space-y-6">
        {/* Responsive Horizontal Scrollable Sub-Subjects Bar with Linear Edge Masks */}
        <div className="relative">
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-background to-transparent z-10 sm:hidden" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />

          <div
            role="tablist"
            aria-label="Financial Intelligence Modules"
            className="p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar backdrop-blur-md shadow-xs touch-pan-x"
          >
            {subSubjects.map((sub, idx) => {
              const isActive = activeTab === sub.id;
              const Icon = sub.icon;

              return (
                <button
                  key={sub.id}
                  ref={(el) => {
                    tabRefs.current[sub.id] = el;
                  }}
                  id={`ai-tab-${sub.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`ai-tabpanel-${sub.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  onClick={() => setActiveTab(sub.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    isActive
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-ai-subsubject-capsule"
                      className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/90 dark:border-slate-700/80"
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 450, damping: 32 }
                      }
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${sub.color} shrink-0`} />
                    <span>{sub.label}</span>
                    {sub.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isActive
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {sub.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* TAB 1: AI Assistant & Q&A */}
          {activeTab === "assistant" && (
            <motion.div
              key="assistant"
              role="tabpanel"
              id="ai-tabpanel-assistant"
              aria-labelledby="ai-tab-assistant"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              {/* Executive Budget Intelligence Snapshot & Velocity Guardrails */}
              <AIBudgetAndRemindersHub
                budgets={data.budgets}
                reminders={initialReminders}
                monthInfo={monthInfo}
              />

              <AIFinancialAssistantCard categories={categories} />
            </motion.div>
          )}

          {/* TAB 2: Multilingual Voice Assistant & Automation Rules */}
          {activeTab === "voice-automation" && (
            <motion.div
              key="voice-automation"
              role="tabpanel"
              id="ai-tabpanel-voice-automation"
              aria-labelledby="ai-tab-voice-automation"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              <VoiceAssistantPanel onCommandExecuted={() => handleRefresh()} />
              <AutomationRulesBuilder />
            </motion.div>
          )}

          {/* TAB 3: Financial Intelligence Real-Time Control Center */}
          {activeTab === "insights" && (
            <motion.div
              key="insights"
              role="tabpanel"
              id="ai-tabpanel-insights"
              aria-labelledby="ai-tab-insights"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              <FinancialIntelligenceControlCenter
                data={data}
                selectedPeriod={selectedPeriod}
                onSelectPeriod={handlePeriodChange}
                isPeriodLoading={isPeriodLoading}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            </motion.div>
          )}

          {/* TAB 4: Subscriptions */}
          {activeTab === "subscriptions" && (
            <motion.div
              key="subscriptions"
              role="tabpanel"
              id="ai-tabpanel-subscriptions"
              aria-labelledby="ai-tab-subscriptions"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              <ErrorBoundary fallbackText="Subscriptions service temporarily unavailable">
                <AISubscriptionsCard />
              </ErrorBoundary>
            </motion.div>
          )}

          {/* TAB 5: AI Budget Intelligence & Category Analytics */}
          {activeTab === "budgets" && (
            <motion.div
              key="budgets"
              role="tabpanel"
              id="ai-tabpanel-budgets"
              aria-labelledby="ai-tab-budgets"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              <AIBudgetEnterpriseDashboard
                budgets={data.budgets}
                intelligence={data}
                monthInfo={monthInfo}
              />
            </motion.div>
          )}

          {/* TAB 6: Forecasting & Live Interactive Charts */}
          {activeTab === "forecasting" && (
            <motion.div
              key="forecasting"
              role="tabpanel"
              id="ai-tabpanel-forecasting"
              aria-labelledby="ai-tab-forecasting"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              <FinancialForecastingEnterpriseView
                data={data}
              />
            </motion.div>
          )}

          {/* TAB 7: Enterprise Document AI & Receipt Intelligence Center */}
          {activeTab === "ocr" && (
            <motion.div
              key="ocr"
              role="tabpanel"
              id="ai-tabpanel-ocr"
              aria-labelledby="ai-tab-ocr"
              tabIndex={0}
              {...tabMotionProps}
              className="space-y-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl"
            >
              <AIReceiptScannerModal
                isOpen={true}
                onOpenChange={() => {}}
                isEmbedded={true}
                onExpenseCreated={() => handleRefresh()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OCR Scanner Modal */}
      <AIReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onOpenChange={setIsReceiptModalOpen}
        onExpenseCreated={() => handleRefresh()}
      />
    </div>
  );
}
